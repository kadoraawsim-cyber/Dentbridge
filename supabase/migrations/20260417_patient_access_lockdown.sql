-- Lock down the highest-risk patient data paths before launch.
-- This keeps the current workflow intact:
--   * patients can submit new requests
--   * faculty can review and update cases
--   * students can see matched pool cases and their approved active cases
--   * uploaded files stay private, with admin-only signed URL access

-- ── 1. Enable RLS on patient_requests ───────────────────────────────────────

ALTER TABLE patient_requests ENABLE ROW LEVEL SECURITY;

-- ── 2. patient_requests policies ────────────────────────────────────────────

DROP POLICY IF EXISTS "patient_can_insert_request" ON patient_requests;
CREATE POLICY "patient_can_insert_request"
  ON patient_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'submitted');

DROP POLICY IF EXISTS "admin_can_select_patient_requests" ON patient_requests;
CREATE POLICY "admin_can_select_patient_requests"
  ON patient_requests
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin_can_update_patient_requests" ON patient_requests;
CREATE POLICY "admin_can_update_patient_requests"
  ON patient_requests
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "student_can_read_pool_and_own_active_cases" ON patient_requests;
CREATE POLICY "student_can_read_pool_and_own_active_cases"
  ON patient_requests
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND (
      status = 'matched'
      OR EXISTS (
        SELECT 1
        FROM student_case_requests scr
        WHERE scr.case_id = patient_requests.id
          AND scr.student_id = auth.uid()
          AND scr.status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS "student_can_update_own_active_case_status" ON patient_requests;
CREATE POLICY "student_can_update_own_active_case_status"
  ON patient_requests
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND EXISTS (
      SELECT 1
      FROM student_case_requests scr
      WHERE scr.case_id = patient_requests.id
        AND scr.student_id = auth.uid()
        AND scr.status = 'approved'
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND status IN ('contacted', 'appointment_scheduled', 'in_treatment')
    AND EXISTS (
      SELECT 1
      FROM student_case_requests scr
      WHERE scr.case_id = patient_requests.id
        AND scr.student_id = auth.uid()
        AND scr.status = 'approved'
    )
  );

-- ── 3. Keep patient-uploads private and admin-readable ──────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-uploads', 'patient-uploads', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_uploads_insert" ON storage.objects;
CREATE POLICY "patient_uploads_insert"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'patient-uploads');

DROP POLICY IF EXISTS "patient_uploads_admin_read" ON storage.objects;
CREATE POLICY "patient_uploads_admin_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-uploads'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
