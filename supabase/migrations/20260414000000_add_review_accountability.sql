-- Add admin accountability fields to patient_requests.
-- reviewed_by: email of the admin who last acted on the case (text — no FK needed for display).
-- reviewed_at: timestamp of the last admin action.
--
-- IF NOT EXISTS makes this safe to run more than once.

ALTER TABLE patient_requests
  ADD COLUMN IF NOT EXISTS reviewed_by  text,
  ADD COLUMN IF NOT EXISTS reviewed_at  timestamptz;

COMMENT ON COLUMN patient_requests.reviewed_by IS
  'Email of the faculty administrator who last reviewed this case (Save Draft / Approve / Reject).';

COMMENT ON COLUMN patient_requests.reviewed_at IS
  'Timestamp of the last faculty review action on this case.';
