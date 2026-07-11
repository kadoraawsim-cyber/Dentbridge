CREATE OR REPLACE FUNCTION public.admin_update_case_triage_with_decision(
  p_case_id uuid,
  p_assigned_department text,
  p_urgency text,
  p_target_student_level text,
  p_clinical_notes text,
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
  v_email text := auth.jwt() ->> 'email';
  v_reason text := btrim(regexp_replace(COALESCE(p_reason, ''), '[[:cntrl:]]', '', 'g'));
  v_now timestamptz := now();
  v_case record;
  v_department_changed boolean;
BEGIN
  IF v_role NOT IN ('admin', 'faculty') OR v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  SELECT id, status, assigned_department INTO v_case
    FROM public.patient_requests WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF v_case.status IN ('completed', 'cancelled', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
  END IF;

  v_department_changed := v_case.assigned_department IS DISTINCT FROM p_assigned_department;
  IF v_department_changed AND length(v_reason) NOT BETWEEN 3 AND 500 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  UPDATE public.patient_requests
     SET assigned_department = p_assigned_department,
         urgency = p_urgency,
         target_student_level = p_target_student_level,
         clinical_notes = p_clinical_notes,
         reviewed_by = v_email,
         reviewed_at = v_now
   WHERE id = p_case_id;

  IF v_department_changed THEN
    INSERT INTO public.case_decision_history (
      case_id, actor_user_id, actor_role, action,
      from_state, to_state, reason_category, reason_summary
    ) VALUES (
      p_case_id, v_actor, v_role, 'update_triage',
      v_case.assigned_department, p_assigned_department,
      'department_routing', v_reason
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'code', 'updated', 'case_status', v_case.status,
    'department_changed', v_department_changed,
    'reviewed_by', v_email, 'reviewed_at', v_now
  );
END;
$function$;
