-- Mandatory return-to-pool evidence is committed with the lifecycle mutation.
CREATE OR REPLACE FUNCTION public.admin_return_case_to_pool_with_decision(
  p_case_id uuid,
  p_assigned_department text DEFAULT NULL,
  p_urgency text DEFAULT NULL,
  p_target_student_level text DEFAULT NULL,
  p_clinical_notes text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role text := auth.jwt() -> 'app_metadata' ->> 'role';
  v_actor uuid := auth.uid();
  v_reason text := btrim(regexp_replace(COALESCE(p_reason, ''), '[[:cntrl:]]', '', 'g'));
  v_result jsonb;
BEGIN
  IF v_role NOT IN ('admin', 'faculty') OR v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;
  IF length(v_reason) NOT BETWEEN 3 AND 500 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  v_result := public.admin_return_case_to_pool(
    p_case_id, p_assigned_department, p_urgency, p_target_student_level, p_clinical_notes
  );
  IF v_result ->> 'ok' <> 'true' THEN
    RETURN v_result;
  END IF;

  INSERT INTO public.case_decision_history (
    case_id, request_id, actor_user_id, actor_role, action,
    from_state, to_state, reason_category, reason_summary
  ) VALUES (
    p_case_id, NULLIF(v_result ->> 'request_id', '')::uuid, v_actor, v_role,
    'return_to_pool', v_result ->> 'from_status', 'matched',
    'return_to_pool', v_reason
  );
  RETURN v_result;
END;
$function$;
