-- Backfill one initial routing stage for existing patient cases.
--
-- Compatibility goals:
--   - Add data only; do not change app behavior.
--   - Do not change RLS policies.
--   - Do not drop or alter existing constraints.
--   - Do not change existing status checks.
--   - Avoid duplicates by relying on UNIQUE (case_id, sequence).
--   - Prefer nullable fields over guessing when data is ambiguous.

WITH single_approved_student_requests AS (
  SELECT
    case_id,
    (ARRAY_AGG(id ORDER BY created_at DESC))[1] AS request_id,
    (ARRAY_AGG(student_id ORDER BY created_at DESC))[1] AS student_id,
    (ARRAY_AGG(student_email ORDER BY created_at DESC))[1] AS student_email,
    (ARRAY_AGG(reviewed_by ORDER BY created_at DESC))[1] AS reviewed_by,
    (ARRAY_AGG(reviewed_at ORDER BY created_at DESC))[1] AS reviewed_at
  FROM student_case_requests
  WHERE status = 'approved'
  GROUP BY case_id
  HAVING COUNT(*) = 1
)
INSERT INTO case_routing_stages (
  case_id,
  sequence,
  department,
  target_student_level,
  status,
  faculty_notes,
  student_request_id,
  student_id,
  student_email,
  assigned_by,
  assigned_at
)
SELECT
  pr.id,
  1,
  COALESCE(
    NULLIF(BTRIM(pr.assigned_department), ''),
    NULLIF(BTRIM(pr.treatment_type), ''),
    'general'
  ),
  pr.target_student_level,
  CASE LOWER(COALESCE(pr.status, ''))
    WHEN 'matched' THEN 'released'
    WHEN 'student_approved' THEN 'student_assigned'
    WHEN 'contacted' THEN 'contacted'
    WHEN 'appointment_scheduled' THEN 'appointment_scheduled'
    WHEN 'in_treatment' THEN 'in_treatment'
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'rejected' THEN 'cancelled'
    ELSE 'draft'
  END,
  pr.clinical_notes,
  approved.request_id,
  approved.student_id,
  approved.student_email,
  approved.reviewed_by,
  approved.reviewed_at
FROM patient_requests pr
LEFT JOIN single_approved_student_requests approved
  ON approved.case_id = pr.id
WHERE pr.current_stage_id IS NULL
ON CONFLICT (case_id, sequence) DO NOTHING;

UPDATE patient_requests pr
SET current_stage_id = stage.id
FROM case_routing_stages stage
WHERE pr.current_stage_id IS NULL
  AND stage.case_id = pr.id
  AND stage.sequence = 1;

UPDATE student_case_requests request
SET stage_id = pr.current_stage_id
FROM patient_requests pr
WHERE request.stage_id IS NULL
  AND request.case_id = pr.id
  AND pr.current_stage_id IS NOT NULL;

UPDATE case_progress_entries entry
SET stage_id = pr.current_stage_id
FROM patient_requests pr
WHERE entry.stage_id IS NULL
  AND entry.case_id = pr.id
  AND pr.current_stage_id IS NOT NULL;

UPDATE case_progress_entries entry
SET department_at_time = stage.department
FROM case_routing_stages stage
WHERE entry.department_at_time IS NULL
  AND entry.stage_id = stage.id;

UPDATE student_planner_events event
SET stage_id = pr.current_stage_id
FROM patient_requests pr
WHERE event.stage_id IS NULL
  AND pr.current_stage_id IS NOT NULL
  AND (
    event.source_case_id = pr.id
    OR (
      event.source_case_id IS NULL
      AND event.patient_id = pr.id
    )
  );

UPDATE student_planner_events event
SET lifecycle_state =
  CASE
    WHEN stage.status IN ('completed', 'cancelled') THEN 'historical'
    ELSE 'active'
  END
FROM case_routing_stages stage
WHERE event.lifecycle_state IS NULL
  AND event.stage_id = stage.id;
