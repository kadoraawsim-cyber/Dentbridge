-- Extend student_case_requests status lifecycle so faculty can revoke an
-- approved assignment and safely return the case to the pool.

ALTER TABLE student_case_requests
  DROP CONSTRAINT IF EXISTS student_case_requests_status_check;

ALTER TABLE student_case_requests
  ADD CONSTRAINT student_case_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'revoked'));
