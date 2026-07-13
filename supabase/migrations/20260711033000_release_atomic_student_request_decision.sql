CREATE OR REPLACE FUNCTION public.admin_set_student_request_decision(
  p_case_id uuid,
  p_request_id uuid,
  p_action text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role text := auth.jwt() -> 'app_metadata' ->> 'role';
  v_actor uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_reason text := btrim(regexp_replace(COALESCE(p_reason, ''), '[[:cntrl:]]', '', 'g'));
  v_now timestamptz := now();
  v_case record;
  v_request record;
  v_from text;
  v_to text;
BEGIN
  IF v_role NOT IN ('admin', 'faculty') OR v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;
  IF p_action NOT IN ('reject', 'undo_reject') OR length(v_reason) NOT BETWEEN 3 AND 500 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  SELECT id, status, current_stage_id INTO v_case
    FROM public.patient_requests WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF v_case.status IN ('completed', 'cancelled', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
  END IF;
  IF p_action = 'reject' AND v_case.status <> 'matched' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
  END IF;

  v_from := CASE WHEN p_action = 'reject' THEN 'pending' ELSE 'rejected' END;
  v_to := CASE WHEN p_action = 'reject' THEN 'rejected' ELSE 'pending' END;
  SELECT id, stage_id INTO v_request
    FROM public.student_case_requests
   WHERE id = p_request_id AND case_id = p_case_id AND status = v_from
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'conflict');
  END IF;

  UPDATE public.student_case_requests
     SET status = v_to,
         reviewed_by = CASE WHEN p_action = 'reject' THEN v_email ELSE NULL END,
         reviewed_at = CASE WHEN p_action = 'reject' THEN v_now ELSE NULL END
   WHERE id = p_request_id AND case_id = p_case_id AND status = v_from;

  INSERT INTO public.case_decision_history (
    case_id, stage_id, request_id, actor_user_id, actor_role, action,
    from_state, to_state, reason_category, reason_summary
  ) VALUES (
    p_case_id, COALESCE(v_request.stage_id, v_case.current_stage_id), p_request_id,
    v_actor, v_role,
    CASE WHEN p_action = 'reject' THEN 'reject_student_request' ELSE 'undo_reject_student_request' END,
    v_from, v_to, 'student_request_decision', v_reason
  );

  RETURN jsonb_build_object(
    'ok', true, 'code', v_to, 'case_status', v_case.status,
    'request_status', v_to, 'stage_id', COALESCE(v_request.stage_id, v_case.current_stage_id),
    'reviewed_by', CASE WHEN p_action = 'reject' THEN v_email ELSE NULL END,
    'reviewed_at', CASE WHEN p_action = 'reject' THEN v_now ELSE NULL END
  );
END;
$function$;
