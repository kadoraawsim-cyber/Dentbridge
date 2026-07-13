-- Production scannerless image sanitization.
--
-- Forward-safe additive migration. Existing linked files remain untouched.
-- New patient images use a quarantined original plus a sanitized JPEG
-- derivative. Only the derivative-ready `sanitized_unscanned` state may be
-- linked by intake or signed for viewing. `clean` / scan_state='clean' remain
-- reserved for a future real malware scanner verdict.

ALTER TABLE public.patient_files
  ADD COLUMN IF NOT EXISTS original_object_path text NULL,
  ADD COLUMN IF NOT EXISTS derivative_object_path text NULL,
  ADD COLUMN IF NOT EXISTS source_state text NULL,
  ADD COLUMN IF NOT EXISTS derivative_state text NULL,
  ADD COLUMN IF NOT EXISTS security_state text NULL,
  ADD COLUMN IF NOT EXISTS sanitizer_version text NULL,
  ADD COLUMN IF NOT EXISTS source_mime text NULL,
  ADD COLUMN IF NOT EXISTS derivative_mime text NULL,
  ADD COLUMN IF NOT EXISTS source_size_bytes bigint NULL,
  ADD COLUMN IF NOT EXISTS derivative_size_bytes bigint NULL,
  ADD COLUMN IF NOT EXISTS width integer NULL,
  ADD COLUMN IF NOT EXISTS height integer NULL,
  ADD COLUMN IF NOT EXISTS pixel_count bigint NULL,
  ADD COLUMN IF NOT EXISTS derivative_checksum_sha256 text NULL,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS processing_error_code text NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text NULL;

UPDATE public.patient_files
SET original_object_path = COALESCE(original_object_path, object_path)
WHERE original_object_path IS NULL
  AND derivative_object_path IS NULL;

ALTER TABLE public.patient_files
  DROP CONSTRAINT IF EXISTS patient_files_status_chk,
  DROP CONSTRAINT IF EXISTS patient_files_mime_chk,
  DROP CONSTRAINT IF EXISTS patient_files_ext_chk,
  DROP CONSTRAINT IF EXISTS patient_files_size_chk,
  DROP CONSTRAINT IF EXISTS patient_files_scannerless_state_chk,
  DROP CONSTRAINT IF EXISTS patient_files_scannerless_dimensions_chk,
  DROP CONSTRAINT IF EXISTS patient_files_scannerless_text_lengths_chk;

ALTER TABLE public.patient_files
  ADD CONSTRAINT patient_files_status_chk CHECK (status IN (
    'pending','original_received','structurally_valid','sanitizing',
    'sanitized_unscanned','uploaded','scanning','clean','quarantined',
    'rejected','sanitize_failed','cleanup_eligible','cleanup_claimed',
    'orphaned','deleted'
  )),
  ADD CONSTRAINT patient_files_mime_chk CHECK (
    declared_mime IN (
      'image/jpeg','image/png','image/webp','image/avif','image/heic',
      'image/heif','application/pdf'
    )
  ),
  ADD CONSTRAINT patient_files_ext_chk CHECK (
    extension IN ('jpg','jpeg','png','webp','avif','heic','heif','pdf')
  ),
  ADD CONSTRAINT patient_files_size_chk CHECK (
    (size_bytes IS NULL OR size_bytes <= 15728640)
    AND (source_size_bytes IS NULL OR source_size_bytes <= 15728640)
    AND (derivative_size_bytes IS NULL OR derivative_size_bytes <= 15728640)
  ),
  ADD CONSTRAINT patient_files_scannerless_state_chk CHECK (
    (source_state IS NULL OR source_state IN (
      'pending','original_received','structurally_valid','sanitizing',
      'sanitized_unscanned','rejected','sanitize_failed','cleanup_eligible',
      'cleanup_claimed','deleted'
    ))
    AND (derivative_state IS NULL OR derivative_state IN (
      'pending','ready','failed','cleanup_eligible','cleanup_claimed','deleted'
    ))
    AND (security_state IS NULL OR security_state IN (
      'sanitized_unscanned','malware_clean','rejected'
    ))
  ),
  ADD CONSTRAINT patient_files_scannerless_dimensions_chk CHECK (
    (width IS NULL OR width BETWEEN 1 AND 8192)
    AND (height IS NULL OR height BETWEEN 1 AND 8192)
    AND (pixel_count IS NULL OR pixel_count BETWEEN 1 AND 40000000)
  ),
  ADD CONSTRAINT patient_files_scannerless_text_lengths_chk CHECK (
    (original_object_path IS NULL OR length(original_object_path) <= 400)
    AND (derivative_object_path IS NULL OR length(derivative_object_path) <= 400)
    AND (source_mime IS NULL OR length(source_mime) <= 120)
    AND (derivative_mime IS NULL OR length(derivative_mime) <= 120)
    AND (sanitizer_version IS NULL OR length(sanitizer_version) <= 80)
    AND (derivative_checksum_sha256 IS NULL OR length(derivative_checksum_sha256) <= 128)
    AND (processing_error_code IS NULL OR length(processing_error_code) <= 120)
    AND (rejection_reason IS NULL OR length(rejection_reason) <= 120)
  );

CREATE INDEX IF NOT EXISTS patient_files_derivative_ready_idx
  ON public.patient_files (patient_request_id, status, derivative_state, security_state)
  WHERE derivative_object_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS patient_files_original_cleanup_idx
  ON public.patient_files (source_state, expires_at)
  WHERE original_object_path IS NOT NULL;

-- Keep this function cluster inside one top-level statement for Supabase CLI replay.
DO $migration$
BEGIN
  EXECUTE 'DROP FUNCTION IF EXISTS public.claim_orphan_patient_files(integer)';
  EXECUTE 'DROP FUNCTION IF EXISTS public.complete_patient_file_cleanup(uuid, boolean)';

  EXECUTE $ddl$
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

  SELECT count(*), count(DISTINCT item->>'consent_type'), count(DISTINCT item->>'document_title')
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
      OR v_file.status <> 'sanitized_unscanned'
      OR v_file.security_state <> 'sanitized_unscanned'
      OR v_file.derivative_state <> 'ready'
      OR v_file.derivative_object_path IS NULL
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
    CASE WHEN p_file_id IS NULL THEN NULL ELSE v_file.derivative_object_path END,
    CASE WHEN p_file_id IS NULL THEN NULL ELSE 'patient-image.jpg' END,
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
        expires_at = CASE
          WHEN source_state = 'cleanup_eligible' THEN expires_at
          ELSE NULL
        END
    WHERE id = p_file_id
      AND patient_request_id IS NULL
      AND status = 'sanitized_unscanned'
      AND security_state = 'sanitized_unscanned'
      AND derivative_state = 'ready'
      AND derivative_object_path IS NOT NULL;

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
$ddl$;

  EXECUTE $ddl$
CREATE OR REPLACE FUNCTION public.claim_orphan_patient_files(p_limit integer DEFAULT 50)
RETURNS TABLE(file_id uuid, original_object_path text, derivative_object_path text, cleanup_kind text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH candidates AS (
    SELECT
      pf.id,
      CASE
        WHEN pf.source_state = 'cleanup_eligible'
          AND pf.original_object_path IS NOT NULL
          THEN 'original_only'
        ELSE 'full_row'
      END AS cleanup_kind
    FROM public.patient_files AS pf
    WHERE (
        pf.patient_request_id IS NULL
        AND (
          (
            pf.status IN (
              'pending','uploaded','original_received','structurally_valid',
              'sanitizing','sanitized_unscanned','quarantined','rejected',
              'sanitize_failed','orphaned','cleanup_eligible'
            )
            AND pf.expires_at IS NOT NULL
            AND pf.expires_at <= now()
          )
          OR (
            pf.status = 'cleanup_claimed'
            AND pf.cleanup_claimed_at < now() - interval '15 minutes'
          )
        )
      )
      OR (
        pf.source_state = 'cleanup_eligible'
        AND pf.original_object_path IS NOT NULL
        AND (pf.expires_at IS NULL OR pf.expires_at <= now())
      )
      OR (
        pf.source_state = 'cleanup_claimed'
        AND pf.cleanup_claimed_at < now() - interval '15 minutes'
      )
    ORDER BY pf.expires_at NULLS FIRST, pf.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
  )
  UPDATE public.patient_files AS pf
  SET status = CASE
        WHEN candidates.cleanup_kind = 'full_row' THEN 'cleanup_claimed'
        ELSE pf.status
      END,
      source_state = CASE
        WHEN candidates.cleanup_kind = 'original_only' THEN 'cleanup_claimed'
        ELSE COALESCE(pf.source_state, 'cleanup_claimed')
      END,
      derivative_state = CASE
        WHEN candidates.cleanup_kind = 'full_row'
          AND pf.derivative_object_path IS NOT NULL
          THEN 'cleanup_claimed'
        ELSE pf.derivative_state
      END,
      cleanup_claimed_at = now(),
      cleanup_attempts = pf.cleanup_attempts + 1
  FROM candidates
  WHERE pf.id = candidates.id
  RETURNING
    pf.id,
    CASE WHEN candidates.cleanup_kind = 'original_only'
      THEN pf.original_object_path
      ELSE COALESCE(pf.original_object_path, pf.object_path)
    END,
    CASE WHEN candidates.cleanup_kind = 'full_row'
      THEN pf.derivative_object_path
      ELSE NULL
    END,
    candidates.cleanup_kind;
$function$;
$ddl$;

  EXECUTE $ddl$
CREATE OR REPLACE FUNCTION public.complete_patient_file_cleanup(
  p_file_id uuid,
  p_success boolean,
  p_cleanup_kind text DEFAULT 'full_row'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF p_success AND p_cleanup_kind = 'original_only' THEN
    UPDATE public.patient_files
    SET source_state = 'deleted',
        original_object_path = NULL,
        expires_at = CASE WHEN patient_request_id IS NULL THEN expires_at ELSE NULL END,
        cleanup_claimed_at = NULL,
        cleanup_last_error_at = NULL
    WHERE id = p_file_id
      AND source_state = 'cleanup_claimed';
  ELSIF p_success THEN
    UPDATE public.patient_files
    SET status = 'deleted',
        source_state = 'deleted',
        derivative_state = CASE
          WHEN derivative_object_path IS NULL THEN derivative_state
          ELSE 'deleted'
        END,
        security_state = NULL,
        expires_at = NULL,
        cleanup_claimed_at = NULL,
        cleanup_last_error_at = NULL
    WHERE id = p_file_id
      AND patient_request_id IS NULL
      AND status = 'cleanup_claimed';
  ELSIF p_cleanup_kind = 'original_only' THEN
    UPDATE public.patient_files
    SET source_state = 'cleanup_eligible',
        expires_at = now() + interval '15 minutes',
        cleanup_claimed_at = NULL,
        cleanup_last_error_at = now()
    WHERE id = p_file_id
      AND source_state = 'cleanup_claimed';
  ELSE
    UPDATE public.patient_files
    SET status = 'orphaned',
        source_state = 'cleanup_eligible',
        derivative_state = CASE
          WHEN derivative_object_path IS NULL THEN derivative_state
          ELSE 'cleanup_eligible'
        END,
        expires_at = now() + interval '15 minutes',
        cleanup_claimed_at = NULL,
        cleanup_last_error_at = now()
    WHERE id = p_file_id
      AND patient_request_id IS NULL
      AND status = 'cleanup_claimed';
  END IF;

  RETURN FOUND;
END;
$function$;
$ddl$;

  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.claim_orphan_patient_files(integer) FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.complete_patient_file_cleanup(uuid, boolean, text) FROM PUBLIC, anon, authenticated, service_role';

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_orphan_patient_files(integer) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_patient_file_cleanup(uuid, boolean, text) TO service_role';
END;
$migration$;
