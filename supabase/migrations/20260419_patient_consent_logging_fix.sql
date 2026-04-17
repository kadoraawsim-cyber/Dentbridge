ALTER TABLE patient_requests
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text;

ALTER TABLE patient_requests
  ALTER COLUMN consent_accepted_at SET DEFAULT now();

ALTER TABLE patient_requests
  ALTER COLUMN consent_version SET DEFAULT '2026-04-18-v1';
