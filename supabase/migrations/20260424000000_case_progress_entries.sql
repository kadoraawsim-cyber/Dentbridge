-- Track simple treatment progress updates for approved student-owned cases.
-- This keeps patient_requests.status as the source of lifecycle truth while
-- adding a separate append-only timeline for appointment and treatment notes.

CREATE TABLE IF NOT EXISTS case_progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES patient_requests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text,
  status_at_time text NOT NULL,
  appointment_date date,
  appointment_time time,
  note text,
  what_was_done text,
  next_step text,
  next_appointment_date date,
  next_appointment_time time,
  needs_faculty_attention boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_progress_entries_has_content CHECK (
    COALESCE(NULLIF(BTRIM(note), ''), NULL) IS NOT NULL
    OR appointment_date IS NOT NULL
    OR COALESCE(NULLIF(BTRIM(what_was_done), ''), NULL) IS NOT NULL
    OR COALESCE(NULLIF(BTRIM(next_step), ''), NULL) IS NOT NULL
    OR next_appointment_date IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_case_progress_entries_case_id_created_at
  ON case_progress_entries (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_progress_entries_student_id
  ON case_progress_entries (student_id);

ALTER TABLE case_progress_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_can_read_own_case_progress_entries" ON case_progress_entries;
CREATE POLICY "student_can_read_own_case_progress_entries"
  ON case_progress_entries
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND EXISTS (
      SELECT 1
      FROM student_case_requests scr
      WHERE scr.case_id = case_progress_entries.case_id
        AND scr.student_id = auth.uid()
        AND scr.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "student_can_insert_own_case_progress_entries" ON case_progress_entries;
CREATE POLICY "student_can_insert_own_case_progress_entries"
  ON case_progress_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND student_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM student_case_requests scr
      WHERE scr.case_id = case_progress_entries.case_id
        AND scr.student_id = auth.uid()
        AND scr.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "faculty_can_read_case_progress_entries" ON case_progress_entries;
CREATE POLICY "faculty_can_read_case_progress_entries"
  ON case_progress_entries
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('faculty', 'admin'));
