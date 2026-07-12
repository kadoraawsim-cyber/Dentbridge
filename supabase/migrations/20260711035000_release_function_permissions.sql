-- Expose only the intended release RPCs after every definition has succeeded.
REVOKE EXECUTE ON FUNCTION public.admin_return_case_to_pool(uuid, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_release_next_stage(uuid, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_case_terminal_state(uuid, text, text) FROM authenticated;

DO $permissions$
BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.submit_patient_request_atomic(uuid, jsonb, jsonb, uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.claim_orphan_patient_files(integer) FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.complete_patient_file_cleanup(uuid, boolean) FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_return_case_to_pool_with_decision(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_release_next_stage_with_decision(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_set_case_terminal_state_with_decision(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_set_student_request_decision(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_case_triage_with_decision(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role';

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.submit_patient_request_atomic(uuid, jsonb, jsonb, uuid, jsonb) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_orphan_patient_files(integer) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_patient_file_cleanup(uuid, boolean) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role';
END;
$permissions$;
