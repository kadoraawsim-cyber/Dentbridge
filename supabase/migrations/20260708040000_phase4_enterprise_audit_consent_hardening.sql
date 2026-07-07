-- Phase 4 enterprise hardening for audit logs and consent records.
-- Additive only: preserve existing Phase 4 tables while adding normalized
-- fields needed for compliance reviews, future SIEM export, and multi-tenant
-- operations.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS event_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'workflow',
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS actor_type text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS success boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS correlation_id text NULL,
  ADD COLUMN IF NOT EXISTS request_id text NULL,
  ADD COLUMN IF NOT EXISTS source_service text NOT NULL DEFAULT 'dentbridge-web',
  ADD COLUMN IF NOT EXISTS api_version text NULL,
  ADD COLUMN IF NOT EXISTS metadata_schema text NOT NULL DEFAULT 'audit.v1';

ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS consent_status text NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS document_fingerprint text NULL,
  ADD COLUMN IF NOT EXISTS document_title text NULL,
  ADD COLUMN IF NOT EXISTS jurisdiction text NULL,
  ADD COLUMN IF NOT EXISTS country_code text NULL,
  ADD COLUMN IF NOT EXISTS university_key text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_event_version_chk'
      AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_event_version_chk CHECK (event_version > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_category_chk'
      AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_category_chk
      CHECK (category IN ('auth', 'consent', 'privacy', 'security', 'workflow'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_severity_chk'
      AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_severity_chk
      CHECK (severity IN ('debug', 'info', 'notice', 'warning', 'error', 'critical'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_actor_type_chk'
      AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_actor_type_chk
      CHECK (actor_type IN ('anonymous', 'patient', 'student', 'faculty', 'admin', 'system', 'service'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_text_lengths_chk'
      AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_text_lengths_chk CHECK (
        length(action) <= 120
        AND length(entity_type) <= 120
        AND (actor_email IS NULL OR length(actor_email) <= 320)
        AND (actor_role IS NULL OR length(actor_role) <= 80)
        AND (ip_address IS NULL OR length(ip_address) <= 128)
        AND (user_agent IS NULL OR length(user_agent) <= 512)
        AND (correlation_id IS NULL OR length(correlation_id) <= 128)
        AND (request_id IS NULL OR length(request_id) <= 128)
        AND length(source_service) <= 80
        AND (api_version IS NULL OR length(api_version) <= 40)
        AND length(metadata_schema) <= 80
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_metadata_size_chk'
      AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_metadata_size_chk
      CHECK (octet_length(metadata_json::text) <= 8192);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'consent_records_status_chk'
      AND conrelid = 'public.consent_records'::regclass
  ) THEN
    ALTER TABLE public.consent_records
      ADD CONSTRAINT consent_records_status_chk
      CHECK (consent_status IN ('accepted', 'withdrawn', 'revoked', 'superseded'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'consent_records_text_lengths_chk'
      AND conrelid = 'public.consent_records'::regclass
  ) THEN
    ALTER TABLE public.consent_records
      ADD CONSTRAINT consent_records_text_lengths_chk CHECK (
        length(consent_type) <= 120
        AND length(consent_version) <= 120
        AND (policy_version IS NULL OR length(policy_version) <= 120)
        AND (language IS NULL OR length(language) <= 20)
        AND (source IS NULL OR length(source) <= 80)
        AND (document_fingerprint IS NULL OR length(document_fingerprint) <= 160)
        AND (document_title IS NULL OR length(document_title) <= 200)
        AND (jurisdiction IS NULL OR length(jurisdiction) <= 80)
        AND (country_code IS NULL OR length(country_code) = 2)
        AND (university_key IS NULL OR length(university_key) <= 120)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'consent_records_withdrawal_time_chk'
      AND conrelid = 'public.consent_records'::regclass
  ) THEN
    ALTER TABLE public.consent_records
      ADD CONSTRAINT consent_records_withdrawal_time_chk
      CHECK (
        (consent_status = 'accepted' AND withdrawn_at IS NULL)
        OR (consent_status IN ('withdrawn', 'revoked', 'superseded'))
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS audit_logs_category_created_at_idx
  ON public.audit_logs (category, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_severity_created_at_idx
  ON public.audit_logs (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_correlation_id_idx
  ON public.audit_logs (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_source_service_created_at_idx
  ON public.audit_logs (source_service, created_at DESC);

CREATE INDEX IF NOT EXISTS consent_records_status_created_at_idx
  ON public.consent_records (consent_status, created_at DESC);

CREATE INDEX IF NOT EXISTS consent_records_request_type_status_idx
  ON public.consent_records (patient_request_id, consent_type, consent_status);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.audit_logs FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM authenticated;
REVOKE ALL ON TABLE public.consent_records FROM anon;
REVOKE ALL ON TABLE public.consent_records FROM authenticated;
