-- Release fix lane (part 2): atomic lifecycle / assignment RPCs.
--
-- FORWARD-ONLY and additive. Companion to
-- 20260710000000_release_fix_student_case_access.sql. Provides the atomic,
-- row-locked, conditional lifecycle/assignment operations invoked by the admin
-- case-actions service so that approval, return-to-pool, next-stage release, and
-- terminal transitions cannot be raced or left in contradictory request/case/
-- stage state.
--
-- SECURITY MODEL / ASSUMPTIONS (identical to part 1):
--   * Every function is SECURITY DEFINER and BYPASSES RLS; each performs its own
--     role check via the JWT app_metadata.role claim and derives the reviewer
--     identity from auth.jwt(). Client-supplied identity is never trusted.
--   * search_path is pinned to (public, pg_temp).
--   * EXECUTE is granted only to `authenticated`; the role is re-checked inside.
--   * Each function body is a single implicit transaction: any raised exception
--     rolls back ALL of its writes. Rows are locked FOR UPDATE and mutations use
--     conditional predicates, so concurrent callers serialize on the case row and
--     exactly one approval can win.
--
-- Single-university behavior is preserved; no tenancy columns are added.

-- Each function body is a single implicit transaction. Rows are locked with
-- FOR UPDATE and mutations use conditional predicates, so:
--   * Concurrent callers serialize on the locked case row.
--   * Exactly one approval can win (the losers observe a non-'pending' request).
--   * Illegal from→to transitions and terminal reopening are rejected.
--   * Any raised exception rolls back ALL writes in the function.
-- Actor identity comes from auth.uid()/auth.jwt(); the reviewer email is the JWT
-- email claim, never a client parameter.

-- 6a. Approve a student's claim on a case (assignment).
CREATE OR REPLACE FUNCTION public.admin_approve_student_request(
  p_case_id uuid,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := auth.jwt() -> 'app_metadata' ->> 'role';
  v_email text := auth.jwt() ->> 'email';
  v_now timestamptz := now();
  v_case record;
  v_request record;
  v_stage_id uuid;
BEGIN
  IF v_role NOT IN ('admin', 'faculty') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  -- Lock the case row first to serialize concurrent approvals on this case.
  SELECT id, status, current_stage_id
    INTO v_case
    FROM patient_requests
   WHERE id = p_case_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF v_case.status <> 'matched' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
  END IF;

  -- Lock the target request; it must still be pending for THIS case.
  SELECT id, case_id, student_id, student_email, stage_id
    INTO v_request
    FROM student_case_requests
   WHERE id = p_request_id
     AND case_id = p_case_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    -- Already actioned by a concurrent winner, or never existed for this case.
    RETURN jsonb_build_object('ok', false, 'code', 'conflict');
  END IF;

  v_stage_id := COALESCE(v_case.current_stage_id, v_request.stage_id);

  IF v_stage_id IS NOT NULL THEN
    -- Ensure the stage belongs to the case and is releasable for assignment.
    PERFORM 1
      FROM case_routing_stages
     WHERE id = v_stage_id
       AND case_id = p_case_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'code', 'conflict');
    END IF;
  END IF;

  UPDATE student_case_requests
     SET status = 'approved',
         stage_id = COALESCE(stage_id, v_stage_id),
         reviewed_by = v_email,
         reviewed_at = v_now
   WHERE id = p_request_id
     AND case_id = p_case_id
     AND status = 'pending';

  UPDATE patient_requests
     SET status = 'student_approved',
         current_stage_id = COALESCE(current_stage_id, v_stage_id),
         reviewed_by = v_email,
         reviewed_at = v_now
   WHERE id = p_case_id
     AND status = 'matched';

  IF v_stage_id IS NOT NULL THEN
    UPDATE case_routing_stages
       SET status = 'student_assigned',
           student_request_id = p_request_id,
           student_id = v_request.student_id,
           student_email = v_request.student_email,
           assigned_by = v_email,
           assigned_at = v_now,
           updated_at = v_now
     WHERE id = v_stage_id
       AND case_id = p_case_id;

    -- Reject every OTHER pending request competing for the same stage.
    UPDATE student_case_requests
       SET status = 'rejected',
           reviewed_by = v_email,
           reviewed_at = v_now
     WHERE case_id = p_case_id
       AND id <> p_request_id
       AND status = 'pending'
       AND (stage_id = v_stage_id OR stage_id IS NULL);
  ELSE
    UPDATE student_case_requests
       SET status = 'rejected',
           reviewed_by = v_email,
           reviewed_at = v_now
     WHERE case_id = p_case_id
       AND id <> p_request_id
       AND status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'approved',
    'from_status', 'matched',
    'case_status', 'student_approved',
    'stage_id', v_stage_id,
    'reviewed_by', v_email,
    'reviewed_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_student_request(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_approve_student_request(uuid, uuid) TO authenticated;

-- 6b. Return an assigned case to the matched pool.
CREATE OR REPLACE FUNCTION public.admin_return_case_to_pool(
  p_case_id uuid,
  p_assigned_department text DEFAULT NULL,
  p_urgency text DEFAULT NULL,
  p_target_student_level text DEFAULT NULL,
  p_clinical_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := auth.jwt() -> 'app_metadata' ->> 'role';
  v_email text := auth.jwt() ->> 'email';
  v_now timestamptz := now();
  v_case record;
  v_request record;
BEGIN
  IF v_role NOT IN ('admin', 'faculty') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  SELECT id, status, current_stage_id, assigned_department, urgency,
         target_student_level, clinical_notes
    INTO v_case
    FROM patient_requests
   WHERE id = p_case_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF v_case.status NOT IN ('student_approved', 'contacted', 'appointment_scheduled') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
  END IF;

  SELECT id, student_email
    INTO v_request
    FROM student_case_requests
   WHERE case_id = p_case_id
     AND status = 'approved'
   ORDER BY reviewed_at DESC NULLS LAST
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'conflict');
  END IF;

  UPDATE student_case_requests
     SET status = 'revoked',
         reviewed_by = v_email,
         reviewed_at = v_now
   WHERE id = v_request.id
     AND case_id = p_case_id
     AND status = 'approved';

  -- Reset the current routing stage so another student can claim it: clear the
  -- assignment and release it back to the pool. The former student loses access
  -- because they are no longer the current-stage assignee.
  IF v_case.current_stage_id IS NOT NULL THEN
    UPDATE case_routing_stages
       SET status = 'released',
           student_request_id = NULL,
           student_id = NULL,
           student_email = NULL,
           assigned_by = NULL,
           assigned_at = NULL,
           updated_at = v_now
     WHERE id = v_case.current_stage_id
       AND case_id = p_case_id;
  END IF;

  UPDATE patient_requests
     SET status = 'matched',
         assigned_department = COALESCE(p_assigned_department, v_case.assigned_department),
         urgency = COALESCE(p_urgency, v_case.urgency),
         target_student_level = COALESCE(p_target_student_level, v_case.target_student_level),
         clinical_notes = COALESCE(p_clinical_notes, v_case.clinical_notes),
         reviewed_by = v_email,
         reviewed_at = v_now
   WHERE id = p_case_id
     AND status IN ('student_approved', 'contacted', 'appointment_scheduled');

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'matched',
    'from_status', v_case.status,
    'case_status', 'matched',
    'request_id', v_request.id,
    'student_email', v_request.student_email,
    'reviewed_by', v_email,
    'reviewed_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_return_case_to_pool(uuid, text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_return_case_to_pool(uuid, text, text, text, text) TO authenticated;

-- 6c. Release the next routing stage after a faculty review.
CREATE OR REPLACE FUNCTION public.admin_release_next_stage(
  p_case_id uuid,
  p_department text,
  p_target_student_level text DEFAULT NULL,
  p_urgency text DEFAULT NULL,
  p_clinical_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := auth.jwt() -> 'app_metadata' ->> 'role';
  v_email text := auth.jwt() ->> 'email';
  v_now timestamptz := now();
  v_case record;
  v_next_sequence integer;
  v_next_stage_id uuid;
BEGIN
  IF v_role NOT IN ('admin', 'faculty') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  IF p_department IS NULL OR btrim(p_department) = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  SELECT id, status, current_stage_id, urgency, clinical_notes
    INTO v_case
    FROM patient_requests
   WHERE id = p_case_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF v_case.status <> 'faculty_review' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
  END IF;

  -- Close out the reviewed stage so its former student loses access.
  IF v_case.current_stage_id IS NOT NULL THEN
    UPDATE case_routing_stages
       SET status = 'completed',
           stage_reviewed_by = v_email,
           stage_reviewed_at = v_now,
           completed_at = v_now,
           updated_at = v_now
     WHERE id = v_case.current_stage_id
       AND case_id = p_case_id;
  END IF;

  SELECT COALESCE(MAX(sequence), 0) + 1
    INTO v_next_sequence
    FROM case_routing_stages
   WHERE case_id = p_case_id;

  INSERT INTO case_routing_stages (
    case_id, sequence, department, target_student_level, status,
    faculty_notes, released_by, released_at, created_at, updated_at
  )
  VALUES (
    p_case_id, v_next_sequence, btrim(p_department), p_target_student_level, 'released',
    COALESCE(p_clinical_notes, v_case.clinical_notes), v_email, v_now, v_now, v_now
  )
  RETURNING id INTO v_next_stage_id;

  UPDATE patient_requests
     SET current_stage_id = v_next_stage_id,
         assigned_department = btrim(p_department),
         target_student_level = p_target_student_level,
         clinical_notes = COALESCE(p_clinical_notes, v_case.clinical_notes),
         urgency = COALESCE(p_urgency, v_case.urgency),
         status = 'matched',
         reviewed_by = v_email,
         reviewed_at = v_now
   WHERE id = p_case_id
     AND status = 'faculty_review';

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'matched',
    'from_status', 'faculty_review',
    'case_status', 'matched',
    'stage_id', v_next_stage_id,
    'sequence', v_next_sequence,
    'reviewed_by', v_email,
    'reviewed_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_release_next_stage(uuid, text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_release_next_stage(uuid, text, text, text, text) TO authenticated;

-- 6d. Terminal transition (complete / cancel) — case + current stage together.
CREATE OR REPLACE FUNCTION public.admin_set_case_terminal_state(
  p_case_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := auth.jwt() -> 'app_metadata' ->> 'role';
  v_email text := auth.jwt() ->> 'email';
  v_now timestamptz := now();
  v_case record;
  v_new_status text;
BEGIN
  IF v_role NOT IN ('admin', 'faculty') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  IF p_action NOT IN ('complete', 'cancel') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  SELECT id, status, current_stage_id
    INTO v_case
    FROM patient_requests
   WHERE id = p_case_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  -- Terminal states cannot be reopened or re-terminalized.
  IF v_case.status IN ('completed', 'cancelled', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
  END IF;

  IF p_action = 'complete' THEN
    -- Completion is only valid once a case is actually in/through treatment.
    IF v_case.status NOT IN ('in_treatment', 'faculty_review') THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
    END IF;
    v_new_status := 'completed';
  ELSE
    v_new_status := 'cancelled';
  END IF;

  -- Keep the current routing stage coherent with the case terminal state.
  IF v_case.current_stage_id IS NOT NULL THEN
    UPDATE case_routing_stages
       SET status = v_new_status,
           completed_at = CASE WHEN v_new_status = 'completed' THEN v_now ELSE completed_at END,
           cancelled_at = CASE WHEN v_new_status = 'cancelled' THEN v_now ELSE cancelled_at END,
           updated_at = v_now
     WHERE id = v_case.current_stage_id
       AND case_id = p_case_id;
  END IF;

  -- On cancellation, revoke any live approved assignment so no student retains
  -- access to a cancelled case.
  IF v_new_status = 'cancelled' THEN
    UPDATE student_case_requests
       SET status = 'revoked',
           reviewed_by = v_email,
           reviewed_at = v_now
     WHERE case_id = p_case_id
       AND status = 'approved';
  END IF;

  UPDATE patient_requests
     SET status = v_new_status,
         routing_completed_at = CASE WHEN v_new_status = 'completed' THEN v_now ELSE routing_completed_at END,
         reviewed_by = v_email,
         reviewed_at = v_now
   WHERE id = p_case_id
     AND status NOT IN ('completed', 'cancelled', 'rejected');

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_new_status,
    'from_status', v_case.status,
    'case_status', v_new_status,
    'reviewed_by', v_email,
    'reviewed_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_case_terminal_state(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_case_terminal_state(uuid, text, text) TO authenticated;
