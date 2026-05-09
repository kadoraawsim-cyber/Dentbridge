-- Additive foundation for future Sequential Department Routing.
--
-- Compatibility goals:
--   - Do not change existing patient case behavior.
--   - Do not drop or alter existing constraints.
--   - Do not change existing status checks.
--   - Do not change RLS policies.
--   - Do not backfill data in this migration.

CREATE TABLE IF NOT EXISTS case_routing_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES patient_requests(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  department text NOT NULL,
  target_student_level text,
  status text NOT NULL DEFAULT 'draft',
  faculty_notes text,
  student_request_id uuid,
  student_id uuid REFERENCES auth.users(id),
  student_email text,
  released_by text,
  released_at timestamptz,
  assigned_by text,
  assigned_at timestamptz,
  stage_submitted_by uuid REFERENCES auth.users(id),
  stage_submitted_at timestamptz,
  stage_reviewed_by text,
  stage_reviewed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_routing_stages_case_sequence_unique UNIQUE (case_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_case_routing_stages_case_id_sequence
  ON case_routing_stages (case_id, sequence);

CREATE INDEX IF NOT EXISTS idx_case_routing_stages_status
  ON case_routing_stages (status);

CREATE INDEX IF NOT EXISTS idx_case_routing_stages_department_status
  ON case_routing_stages (department, status);

CREATE INDEX IF NOT EXISTS idx_case_routing_stages_student_id_status
  ON case_routing_stages (student_id, status);

CREATE INDEX IF NOT EXISTS idx_case_routing_stages_student_request_id
  ON case_routing_stages (student_request_id);

ALTER TABLE patient_requests
  ADD COLUMN IF NOT EXISTS current_stage_id uuid REFERENCES case_routing_stages(id),
  ADD COLUMN IF NOT EXISTS routing_completed_at timestamptz;

ALTER TABLE student_case_requests
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES case_routing_stages(id) ON DELETE CASCADE;

ALTER TABLE case_progress_entries
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES case_routing_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_at_time text;

ALTER TABLE student_planner_events
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES case_routing_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lifecycle_state text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_planner_events_lifecycle_state_chk'
  ) THEN
    ALTER TABLE student_planner_events
      ADD CONSTRAINT student_planner_events_lifecycle_state_chk
      CHECK (
        lifecycle_state IS NULL
        OR lifecycle_state IN ('active', 'historical', 'stale', 'cancelled')
      );
  END IF;
END $$;
