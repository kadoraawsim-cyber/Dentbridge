-- Add consent logging fields for patient requests.
-- Small, backwards-compatible change:
--   - store when consent was accepted
--   - store the consent policy version used at submission time

ALTER TABLE patient_requests
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text;

UPDATE patient_requests
SET
  consent_accepted_at = COALESCE(consent_accepted_at, created_at),
  consent_version = COALESCE(consent_version, '2026-04-18-v1')
WHERE consent IS TRUE;

ALTER TABLE patient_requests
  ALTER COLUMN consent_accepted_at SET DEFAULT now();

ALTER TABLE patient_requests
  ALTER COLUMN consent_version SET DEFAULT '2026-04-18-v1';
