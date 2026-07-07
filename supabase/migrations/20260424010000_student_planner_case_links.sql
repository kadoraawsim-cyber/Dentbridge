-- Link system-created planner events back to case appointments without
-- affecting manual planner items.

ALTER TABLE student_planner_events
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS source_case_id uuid REFERENCES patient_requests(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_planner_events_source_pair_chk'
  ) THEN
    ALTER TABLE student_planner_events
      ADD CONSTRAINT student_planner_events_source_pair_chk
      CHECK (
        (source_kind IS NULL AND source_case_id IS NULL)
        OR
        (source_kind IS NOT NULL AND source_case_id IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_planner_events_source_kind_chk'
  ) THEN
    ALTER TABLE student_planner_events
      ADD CONSTRAINT student_planner_events_source_kind_chk
      CHECK (
        source_kind IS NULL
        OR source_kind = 'case_appointment'
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_planner_events_source_unique
  ON student_planner_events (student_id, source_kind, source_case_id);
