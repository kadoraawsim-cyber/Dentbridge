CREATE OR REPLACE FUNCTION public.admin_set_case_terminal_state_with_decision(
  p_case_id uuid,
  p_action text,
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
  v_action_name text;
BEGIN
  IF v_role NOT IN ('admin', 'faculty') OR v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;
  IF p_action = 'cancel' AND length(v_reason) NOT BETWEEN 3 AND 500 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  v_result := public.admin_set_case_terminal_state(p_case_id, p_action, p_reason);
  IF v_result ->> 'ok' <> 'true' THEN
    RETURN v_result;
  END IF;

  IF length(v_reason) BETWEEN 3 AND 500 THEN
    v_action_name := CASE WHEN p_action = 'cancel' THEN 'mark_cancelled' ELSE 'mark_completed' END;
    INSERT INTO public.case_decision_history (
      case_id, actor_user_id, actor_role, action,
      from_state, to_state, reason_category, reason_summary
    ) VALUES (
      p_case_id, v_actor, v_role, v_action_name,
      v_result ->> 'from_status', v_result ->> 'case_status',
      v_action_name, v_reason
    );
  END IF;
  RETURN v_result;
END;
$function$;
