-- Full lifecycle status support for patient_requests.
--
-- Changes in this migration:
--   1. Replaces the narrow CHECK constraint on patient_requests.status with
--      one that covers every lifecycle stage.
--   2. Creates the get_request_status_by_phone RPC used by /patient/status.
--   3. Replaces the narrow student RLS policy on patient_requests so students
--      can also SELECT rows for cases they have been approved on (post-pool).
--
-- Status lifecycle:
--   submitted → under_review → matched → student_approved
--   → contacted → appointment_scheduled → in_treatment → completed
--   (or rejected / cancelled at any pre-completion stage)

-- ── 1. Widen the CHECK constraint ────────────────────────────────────────────

ALTER TABLE patient_requests
  DROP CONSTRAINT IF EXISTS patient_requests_status_check;

ALTER TABLE patient_requests
  ADD CONSTRAINT patient_requests_status_check
  CHECK (status IN (
    'submitted',
    'under_review',
    'matched',
    'student_approved',
    'contacted',
    'appointment_scheduled',
    'in_treatment',
    'completed',
    'rejected',
    'cancelled'
  ));

-- ── 2. Create the patient status lookup RPC ──────────────────────────────────
--
-- SECURITY DEFINER so the function runs as the owner and bypasses RLS,
-- allowing unauthenticated patients to look up their own case status by phone.
-- Only non-sensitive fields are returned; full_name and clinical_notes are
-- intentionally excluded.

CREATE OR REPLACE FUNCTION get_request_status_by_phone(lookup_phone text)
RETURNS TABLE (
  id               uuid,
  treatment_type   text,
  status           text,
  created_at       timestamptz,
  preferred_days   text,
  assigned_department text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    treatment_type,
    status,
    created_at,
    preferred_days,
    assigned_department
  FROM patient_requests
  WHERE phone = lookup_phone
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Grant to both anon (patients) and authenticated (edge cases)
GRANT EXECUTE ON FUNCTION get_request_status_by_phone(text) TO anon, authenticated;

-- ── 3. Update student RLS on patient_requests ────────────────────────────────
--
-- Replaces the earlier "matched only" policy with one that also lets a student
-- SELECT the full row for cases where they have an approved request — so they
-- can see post-pool status (student_approved, contacted, etc.) and patient
-- contact details fetched server-side.

DROP POLICY IF EXISTS "student_can_read_matched_pool_cases" ON patient_requests;

CREATE POLICY "student_can_read_pool_and_own_active_cases"
  ON patient_requests
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND (
      -- Case is still in the public pool
      status = 'matched'
      OR
      -- Student has been approved for this specific case
      EXISTS (
        SELECT 1
        FROM student_case_requests scr
        WHERE scr.case_id = patient_requests.id
          AND scr.student_id = auth.uid()
          AND scr.status = 'approved'
      )
    )
  );

-- ── 4. Allow students to update case status for their own approved cases ─────
--
-- Students may advance the lifecycle for cases they own (contacted,
-- appointment_scheduled, in_treatment).  The allowed status values and the
-- requirement to have an approved request are enforced at the application
-- layer in /api/student/cases/[id]/status.  This policy only opens the door.

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
    AND EXISTS (
      SELECT 1
      FROM student_case_requests scr
      WHERE scr.case_id = patient_requests.id
        AND scr.student_id = auth.uid()
        AND scr.status = 'approved'
    )
  );
