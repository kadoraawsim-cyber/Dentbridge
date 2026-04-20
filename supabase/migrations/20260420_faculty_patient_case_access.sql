-- Mirror admin clinical-access policies for faculty users.
-- This opens the shared /admin clinical workflow to faculty without changing
-- the admin-only invitation flow or widening insert permissions beyond what
-- admin already has today.

ALTER TABLE patient_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_case_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- patient_requests: faculty can read and update all patient cases, matching
-- the existing admin clinical workflow.
DROP POLICY IF EXISTS "faculty_can_select_patient_requests" ON patient_requests;
CREATE POLICY "faculty_can_select_patient_requests"
  ON patient_requests
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty');

DROP POLICY IF EXISTS "faculty_can_update_patient_requests" ON patient_requests;
CREATE POLICY "faculty_can_update_patient_requests"
  ON patient_requests
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty');

-- student_case_requests: faculty can review and action student requests for
-- any patient case, matching the existing admin workflow.
DROP POLICY IF EXISTS "faculty_can_read_all_student_requests" ON student_case_requests;
CREATE POLICY "faculty_can_read_all_student_requests"
  ON student_case_requests
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty');

DROP POLICY IF EXISTS "faculty_can_update_student_requests" ON student_case_requests;
CREATE POLICY "faculty_can_update_student_requests"
  ON student_case_requests
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty');

-- storage.objects: faculty can generate signed URLs for patient attachments
-- stored in the private patient-uploads bucket, matching admin read access.
DROP POLICY IF EXISTS "faculty_can_read_patient_uploads" ON storage.objects;
CREATE POLICY "faculty_can_read_patient_uploads"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-uploads'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty'
  );

-- Note: no faculty INSERT policy is added here because admin does not have
-- INSERT policies on these clinical tables today. This keeps faculty access
-- aligned with admin parity without broadening write paths.
