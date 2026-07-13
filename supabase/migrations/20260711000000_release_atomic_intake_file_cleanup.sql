-- Release hardening: atomic patient intake, honest file quarantine, and
-- concurrency-safe orphan cleanup. Service-role only.

ALTER TABLE public.patient_requests
  ADD COLUMN IF NOT EXISTS submission_id uuid NULL;

ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS canonical_route text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS patient_requests_submission_id_uidx
  ON public.patient_requests (submission_id)
  WHERE submission_id IS NOT NULL;

ALTER TABLE public.patient_files
  ADD COLUMN IF NOT EXISTS cleanup_claimed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS cleanup_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleanup_last_error_at timestamptz NULL;

ALTER TABLE public.patient_files
  DROP CONSTRAINT IF EXISTS patient_files_status_chk;

ALTER TABLE public.patient_files
  ADD CONSTRAINT patient_files_status_chk CHECK (status IN (
    'pending','uploaded','scanning','clean','quarantined','rejected',
    'orphaned','cleanup_claimed','deleted'
  ));

CREATE INDEX IF NOT EXISTS patient_files_cleanup_eligibility_idx
  ON public.patient_files (expires_at, status)
  WHERE patient_request_id IS NULL;

-- Fail closed for every function created by this release migration series.
-- Explicit grants are applied only after all function definitions succeed.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.submit_patient_request_atomic(
  p_submission_id uuid,
  p_request jsonb,
  p_consents jsonb,
  p_file_id uuid DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_request_id uuid;
  v_file public.patient_files%ROWTYPE;
  v_accepted_at timestamptz := now();
  v_consent_count integer;
  v_type_count integer;
  v_title_count integer;
BEGIN
  IF p_submission_id IS NULL OR jsonb_typeof(p_request) <> 'object' THEN
    RAISE EXCEPTION 'invalid_intake' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_consents) <> 'array' OR jsonb_array_length(p_consents) <> 2 THEN
    RAISE EXCEPTION 'invalid_consents' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*),
    count(DISTINCT item->>'consent_type'),
    count(DISTINCT item->>'document_title')
  INTO v_consent_count, v_type_count, v_title_count
  FROM jsonb_array_elements(p_consents) AS item
  WHERE item->>'consent_type' IN ('kvkk_acknowledgement', 'explicit_consent')
    AND item->>'consent_status' = 'accepted'
    AND item->>'language' IN ('en', 'tr')
    AND NULLIF(item->>'consent_version', '') IS NOT NULL
    AND NULLIF(item->>'policy_version', '') IS NOT NULL
    AND NULLIF(item->>'document_fingerprint', '') IS NOT NULL
    AND NULLIF(item->>'document_title', '') IS NOT NULL
    AND NULLIF(item->>'canonical_route', '') IS NOT NULL;

  IF v_consent_count <> 2 OR v_type_count <> 2 OR v_title_count <> 2 THEN
    RAISE EXCEPTION 'invalid_consent_evidence' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_request_id
  FROM public.patient_requests
  WHERE submission_id = p_submission_id;

  IF v_request_id IS NOT NULL THEN
    RETURN v_request_id;
  END IF;

  IF p_file_id IS NOT NULL THEN
    SELECT * INTO v_file
    FROM public.patient_files
    WHERE id = p_file_id
    FOR UPDATE;

    IF NOT FOUND
      OR v_file.patient_request_id IS NOT NULL
      OR v_file.status <> 'quarantined'
      OR v_file.scan_state <> 'pending'
      OR v_file.confirmed_at IS NULL THEN
      RAISE EXCEPTION 'file_not_eligible' USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.patient_requests (
    submission_id, full_name, age, gender, phone, preferred_language,
    preferred_university, treatment_type, complaint_text, urgency,
    preferred_days, pain_score, symptom_duration, contact_method,
    best_contact_time, medical_condition, consent, consent_accepted_at,
    consent_version, attachment_path, attachment_name, status
  ) VALUES (
    p_submission_id,
    p_request->>'full_name',
    (p_request->>'age')::integer,
    p_request->>'gender',
    p_request->>'phone',
    NULLIF(p_request->>'preferred_language', ''),
    p_request->>'preferred_university',
    p_request->>'treatment_type',
    p_request->>'complaint_text',
    p_request->>'urgency',
    NULLIF(p_request->>'preferred_days', ''),
    (p_request->>'pain_score')::integer,
    p_request->>'symptom_duration',
    NULLIF(p_request->>'contact_method', ''),
    NULLIF(p_request->>'best_contact_time', ''),
    p_request->>'medical_condition',
    true,
    v_accepted_at,
    p_request->>'consent_version',
    CASE WHEN p_file_id IS NULL THEN NULL ELSE v_file.object_path END,
    CASE WHEN p_file_id IS NULL THEN NULL ELSE v_file.original_filename END,
    'submitted'
  )
  ON CONFLICT (submission_id) WHERE submission_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_request_id;

  IF v_request_id IS NULL THEN
    SELECT id INTO v_request_id
    FROM public.patient_requests
    WHERE submission_id = p_submission_id;
    RETURN v_request_id;
  END IF;

  INSERT INTO public.consent_records (
    patient_request_id, consent_type, consent_version, policy_version,
    language, accepted_at, ip_address, user_agent, source, consent_status,
    document_fingerprint, document_title, jurisdiction, country_code,
    university_key, canonical_route
  )
  SELECT
    v_request_id,
    item->>'consent_type',
    item->>'consent_version',
    item->>'policy_version',
    item->>'language',
    v_accepted_at,
    NULLIF(p_context->>'ip_address', ''),
    NULLIF(p_context->>'user_agent', ''),
    'patient_request',
    'accepted',
    item->>'document_fingerprint',
    item->>'document_title',
    item->>'jurisdiction',
    item->>'country_code',
    item->>'university_key',
    item->>'canonical_route'
  FROM jsonb_array_elements(p_consents) AS item;

  IF p_file_id IS NOT NULL THEN
    UPDATE public.patient_files
    SET patient_request_id = v_request_id,
        expires_at = NULL
    WHERE id = p_file_id
      AND patient_request_id IS NULL
      AND status = 'quarantined'
      AND scan_state = 'pending';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'file_claim_conflict' USING ERRCODE = '40001';
    END IF;
  END IF;

  INSERT INTO public.audit_logs (
    actor_type, action, category, severity, success, entity_type, entity_id,
    metadata_json, ip_address, user_agent, request_id, correlation_id,
    source_service, api_version, metadata_schema, event_version
  ) VALUES (
    'anonymous', 'patient_request_created', 'workflow', 'info', true,
    'patient_request', v_request_id,
    jsonb_build_object(
      'consent_record_count', 2,
      'consent_version', p_request->>'consent_version',
      'has_attachment', p_file_id IS NOT NULL,
      'locale', p_request->>'locale'
    ),
    NULLIF(p_context->>'ip_address', ''),
    NULLIF(p_context->>'user_agent', ''),
    NULLIF(p_context->>'request_id', ''),
    NULLIF(p_context->>'correlation_id', ''),
    COALESCE(NULLIF(p_context->>'source_service', ''), 'dentbridge-web'),
    NULLIF(p_context->>'api_version', ''),
    'audit.v1', 1
  );

  RETURN v_request_id;
END;
$function$;
