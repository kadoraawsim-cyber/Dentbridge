-- Phase 2 database foundation hardening.
--
-- Add only the missing constraint and basic read-path indexes from the roadmap.
-- Existing constraints, RLS policies, and earlier indexes are left untouched.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_routing_stages_status_check'
      AND conrelid = 'case_routing_stages'::regclass
  ) THEN
    ALTER TABLE case_routing_stages
      ADD CONSTRAINT case_routing_stages_status_check
      CHECK (status IN (
        'draft',
        'released',
        'student_assigned',
        'contacted',
        'appointment_scheduled',
        'in_treatment',
        'faculty_review',
        'completed',
        'cancelled'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patient_requests_status_created_at
  ON patient_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_requests_created_at
  ON patient_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_requests_reviewed_by
  ON patient_requests (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_patient_requests_assigned_department_status
  ON patient_requests (assigned_department, status);

CREATE INDEX IF NOT EXISTS idx_student_case_requests_student_id_created_at
  ON student_case_requests (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_case_requests_case_id_created_at
  ON student_case_requests (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_case_requests_reviewed_by
  ON student_case_requests (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_student_planner_events_student_id_event_date
  ON student_planner_events (student_id, event_date);

CREATE INDEX IF NOT EXISTS idx_student_planner_events_patient_id
  ON student_planner_events (patient_id);

CREATE INDEX IF NOT EXISTS idx_student_planner_events_source_case_id
  ON student_planner_events (source_case_id);

CREATE INDEX IF NOT EXISTS idx_case_routing_stages_created_at
  ON case_routing_stages (created_at DESC);
