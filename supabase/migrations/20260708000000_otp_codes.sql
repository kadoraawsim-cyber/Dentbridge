-- OTP verification foundation for secure patient status lookup
-- (Phase 3, Branch A: patient-status-secure-otp, Commit 1).
--
-- This migration only creates the storage layer for one-time passcodes used to
-- verify that a patient status lookup is performed by someone who controls the
-- phone number on file. It is additive and intentionally inert:
--   * No API, SMS provider, or UI is wired to this table yet.
--   * Nothing in the current workflow reads or writes this table.
--   * The existing phone-only status RPC (get_request_status_by_phone) is left
--     untouched and is revoked in a later Phase 3 commit.
--
-- Dated to sort after the Phase 2 foundation migration
-- (20260707_phase2_database_foundation_constraints_indexes.sql); Phase 3 work
-- follows Phase 2. This table has no dependency on Phase 2 changes.
--
-- Access model: RLS is enabled with NO anon/authenticated policies, so only the
-- service role (server-side, via SUPABASE_SERVICE_ROLE_KEY) can read or write
-- OTP rows. Codes are stored hashed (code_hash) by the future OTP service and
-- must never be stored in plaintext.

CREATE TABLE IF NOT EXISTS otp_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        text NOT NULL,
  code_hash    text NOT NULL,
  purpose      text NOT NULL DEFAULT 'patient_status_lookup',
  attempts     integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz,
  request_ip   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT otp_codes_purpose_check CHECK (purpose = 'patient_status_lookup'),
  CONSTRAINT otp_codes_attempts_check CHECK (attempts >= 0),
  CONSTRAINT otp_codes_max_attempts_check CHECK (max_attempts > 0)
);

-- Verification looks up the newest code issued for a phone number.
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_created_at
  ON otp_codes (phone, created_at DESC);

-- Supports expiry-based cleanup of stale/expired codes.
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at
  ON otp_codes (expires_at);

-- Service-role-only access: enable RLS and intentionally add no anon or
-- authenticated policies. With RLS on and no policies, only the service role
-- (which bypasses RLS) can access OTP rows.
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
