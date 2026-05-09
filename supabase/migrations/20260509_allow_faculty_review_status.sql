-- Allow a case to wait for faculty review after a student submits a stage.
--
-- Compatibility goals:
--   - Widen only the existing patient_requests.status CHECK constraint.
--   - Preserve every previously allowed status.
--   - Do not change RLS, tables, indexes, columns, or application behavior.

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
    'faculty_review',
    'completed',
    'rejected',
    'cancelled'
  ));
