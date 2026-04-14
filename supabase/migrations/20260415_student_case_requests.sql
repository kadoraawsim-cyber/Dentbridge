-- student_case_requests
-- Tracks each student's request to claim a pool case.
-- One row per (case_id, student_id) pair — enforced by UNIQUE constraint.
-- Status lifecycle: pending → approved | rejected
--
-- RLS summary:
--   students  → INSERT own rows, SELECT own rows
--   admin     → SELECT all rows, UPDATE all rows (to approve / reject)
--
-- patient_requests RLS (additive — does not remove existing policies):
--   students can SELECT rows where status = 'matched'
--   Column restriction (full_name, phone) is enforced at application layer;
--   server components only fetch those columns for rows with an approved request.

-- ── 1. Create table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_case_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid        NOT NULL REFERENCES patient_requests(id) ON DELETE CASCADE,
  student_id    uuid        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  student_email text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  clinical_notes text,
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, student_id)
);

-- ── 2. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_scr_case_id    ON student_case_requests (case_id);
CREATE INDEX IF NOT EXISTS idx_scr_student_id ON student_case_requests (student_id);
CREATE INDEX IF NOT EXISTS idx_scr_status     ON student_case_requests (status);

-- ── 3. Enable RLS ────────────────────────────────────────────────────────────

ALTER TABLE student_case_requests ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS policies for student_case_requests ────────────────────────────────

-- Students can insert only their own requests.
-- student_id must equal the authenticated user's id, and the user must be a student.
CREATE POLICY "student_can_insert_own_request"
  ON student_case_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
  );

-- Students can read only their own requests.
CREATE POLICY "student_can_read_own_requests"
  ON student_case_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- Faculty/admin can read all requests for all cases.
CREATE POLICY "admin_can_read_all_student_requests"
  ON student_case_requests
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Faculty/admin can update (approve / reject) any request.
CREATE POLICY "admin_can_update_student_requests"
  ON student_case_requests
  FOR UPDATE
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── 5. Additive RLS policy on patient_requests for students ──────────────────
--
-- Allows authenticated students to SELECT rows where status = 'matched'.
-- This is additive — existing admin / anon / patient policies are unchanged.
-- Column restriction (hiding full_name and phone before approval) is enforced
-- at the application layer: server components only SELECT those columns for
-- cases that have an approved student_case_requests row for the current user.
--
-- NOTE: If RLS is currently disabled on patient_requests, this policy has no
-- effect until RLS is enabled. If other permissive policies already exist for
-- authenticated users, this policy is simply an additional allowed path.

CREATE POLICY "student_can_read_matched_pool_cases"
  ON patient_requests
  FOR SELECT
  TO authenticated
  USING (
    status = 'matched'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
  );
