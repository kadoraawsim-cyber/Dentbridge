CREATE OR REPLACE FUNCTION public.claim_orphan_patient_files(p_limit integer DEFAULT 50)
RETURNS TABLE(file_id uuid, object_path text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH candidates AS (
    SELECT pf.id
    FROM public.patient_files AS pf
    WHERE pf.patient_request_id IS NULL
      AND (
        (
          pf.status IN ('pending','uploaded','quarantined','rejected','orphaned')
          AND pf.expires_at IS NOT NULL
          AND pf.expires_at <= now()
        )
        OR (
          pf.status = 'cleanup_claimed'
          AND pf.cleanup_claimed_at < now() - interval '15 minutes'
        )
      )
    ORDER BY pf.expires_at NULLS FIRST, pf.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
  )
  UPDATE public.patient_files AS pf
  SET status = 'cleanup_claimed',
      cleanup_claimed_at = now(),
      cleanup_attempts = pf.cleanup_attempts + 1
  FROM candidates
  WHERE pf.id = candidates.id
    AND pf.patient_request_id IS NULL
  RETURNING pf.id, pf.object_path;
$function$;
