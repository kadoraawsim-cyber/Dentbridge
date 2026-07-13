CREATE OR REPLACE FUNCTION public.complete_patient_file_cleanup(
  p_file_id uuid,
  p_success boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF p_success THEN
    UPDATE public.patient_files
    SET status = 'deleted',
        expires_at = NULL,
        cleanup_claimed_at = NULL,
        cleanup_last_error_at = NULL
    WHERE id = p_file_id
      AND patient_request_id IS NULL
      AND status = 'cleanup_claimed';
  ELSE
    UPDATE public.patient_files
    SET status = 'orphaned',
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
