-- Phase 4: audit logs and consent records.
-- These tables are server/service-role only. Browser roles must not access
-- audit or consent records directly.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NULL,
  actor_email text NULL,
  actor_role text NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_action_created_at_idx
  ON public.audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON public.audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS audit_logs_actor_created_at_idx
  ON public.audit_logs (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.audit_logs FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM authenticated;

CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_request_id uuid NOT NULL REFERENCES public.patient_requests(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  consent_version text NOT NULL,
  policy_version text NULL,
  language text NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text NULL,
  user_agent text NULL,
  source text NOT NULL DEFAULT 'patient_request',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_records_consent_type_chk
    CHECK (consent_type IN ('kvkk_acknowledgement', 'explicit_consent')),
  CONSTRAINT consent_records_source_chk
    CHECK (source = 'patient_request')
);

CREATE INDEX IF NOT EXISTS consent_records_patient_request_id_idx
  ON public.consent_records (patient_request_id);

CREATE INDEX IF NOT EXISTS consent_records_type_accepted_at_idx
  ON public.consent_records (consent_type, accepted_at DESC);

CREATE INDEX IF NOT EXISTS consent_records_created_at_idx
  ON public.consent_records (created_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.consent_records FROM anon;
REVOKE ALL ON TABLE public.consent_records FROM authenticated;
