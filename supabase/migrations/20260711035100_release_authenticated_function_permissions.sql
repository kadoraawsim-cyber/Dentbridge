GRANT EXECUTE ON FUNCTION
  public.admin_return_case_to_pool_with_decision(uuid, text, text, text, text, text),
  public.admin_release_next_stage_with_decision(uuid, text, text, text, text, text),
  public.admin_set_case_terminal_state_with_decision(uuid, text, text),
  public.admin_set_student_request_decision(uuid, uuid, text, text),
  public.admin_update_case_triage_with_decision(uuid, text, text, text, text, text)
TO authenticated;
