-- Release fix lane (part 1): student case-access and current-stage authorization.
--
-- This migration is FORWARD-ONLY and additive/idempotent. It does NOT drop or
-- alter any patient/clinical data, and it does not remove any column. It:
--   1. Replaces broad student SELECT access to patient_requests with allowlisted
--      SECURITY DEFINER RPCs (no direct row access → no PII projection leak).
--   2. Rebases student read authorization on CURRENT-stage assignment instead of
--      any historical approved request (previous-stage students lose access on
--      handoff).
--
-- The atomic lifecycle/assignment RPCs live in the companion migration
-- 20260710000100_release_fix_lifecycle_rpcs.sql.
--
-- SECURITY MODEL / ASSUMPTIONS
--   * Every function below is SECURITY DEFINER and runs with the owner's rights,
--     therefore it BYPASSES RLS. Each function performs its OWN role/ownership
--     checks and derives the actor from auth.uid() / auth.jwt(). Client-supplied
--     identity (student_id, faculty_id, role) is never trusted.
--   * search_path is pinned to (public, pg_temp) so a malicious session-level
--     search_path cannot shadow referenced objects.
--   * EXECUTE is granted only to the `authenticated` role; anon/public are
--     revoked. The functions still verify the JWT role claim internally.
--   * Reads for a non-student return no rows (fail-closed). Writes for a
--     non-faculty/admin return {ok:false, code:'forbidden'} (fail-closed).
--
-- The single-university behavior is preserved; no tenancy columns are added.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Current-stage assignment predicate
-- ─────────────────────────────────────────────────────────────────────────────
-- A student is authorized for a case ONLY while they are the assignee of the
-- case's CURRENT routing stage (patient_requests.current_stage_id) and that
-- stage is in an active (non-terminal) status, backed by an approved request on
-- that same stage. Historical/previous-stage assignments do not qualify.

CREATE OR REPLACE FUNCTION public.student_has_current_stage_assignment(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM patient_requests pr
    JOIN case_routing_stages crs
      ON crs.id = pr.current_stage_id
     AND crs.case_id = pr.id
    WHERE pr.id = p_case_id
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
      AND crs.student_id = auth.uid()
      AND crs.status IN (
        'student_assigned',
        'contacted',
        'appointment_scheduled',
        'in_treatment',
        'faculty_review'
      )
      AND EXISTS (
        SELECT 1
        FROM student_case_requests scr
        WHERE scr.case_id = pr.id
          AND scr.student_id = auth.uid()
          AND scr.status = 'approved'
          AND (scr.stage_id IS NULL OR scr.stage_id = pr.current_stage_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.student_has_current_stage_assignment(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.student_has_current_stage_assignment(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Student POOL read (allowlisted projection, NO PII)
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns matched-pool cases with ONLY the non-identifying fields the existing
-- student pool UI needs. full_name, phone and the raw attachment_path (a file
-- identifier) are intentionally EXCLUDED. Attachment presence is exposed as a
-- boolean so the UI can render its summary without the storage key.

CREATE OR REPLACE FUNCTION public.student_pool_cases()
RETURNS TABLE (
  id uuid,
  age integer,
  treatment_type text,
  complaint_text text,
  urgency text,
  assigned_department text,
  target_student_level text,
  pain_score integer,
  preferred_days text,
  symptom_duration text,
  medical_condition text,
  clinical_notes text,
  created_at timestamptz,
  has_attachment boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    pr.id,
    pr.age,
    pr.treatment_type,
    pr.complaint_text,
    pr.urgency,
    pr.assigned_department,
    pr.target_student_level,
    pr.pain_score,
    pr.preferred_days,
    pr.symptom_duration,
    pr.medical_condition,
    pr.clinical_notes,
    pr.created_at,
    (pr.attachment_path IS NOT NULL) AS has_attachment
  FROM patient_requests pr
  WHERE (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND pr.status = 'matched'
  ORDER BY pr.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.student_pool_cases() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.student_pool_cases() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Student ACTIVE-case read (contact details, current-stage only)
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns full contact/clinical detail ONLY for cases where the caller is the
-- CURRENT-stage assignee. A student who was assigned to a previous, now-handed-
-- off stage receives nothing here.

CREATE OR REPLACE FUNCTION public.student_active_cases()
RETURNS TABLE (
  id uuid,
  treatment_type text,
  assigned_department text,
  status text,
  full_name text,
  phone text,
  current_stage_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    pr.id,
    pr.treatment_type,
    pr.assigned_department,
    pr.status,
    pr.full_name,
    pr.phone,
    pr.current_stage_id
  FROM patient_requests pr
  WHERE (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND public.student_has_current_stage_assignment(pr.id)
  ORDER BY pr.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.student_active_cases() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.student_active_cases() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Student REQUEST OVERVIEW (own request history, minimal case fields)
-- ─────────────────────────────────────────────────────────────────────────────
-- Powers the "my requests" page. Returns the caller's own requests joined to
-- non-identifying case fields plus the request's stage department. No PII.
-- A request whose stage is no longer the case's current stage is reported with
-- an effective status of 'revoked' so the UI cannot imply live access.

CREATE OR REPLACE FUNCTION public.student_requested_case_overview()
RETURNS TABLE (
  request_id uuid,
  case_id uuid,
  stage_id uuid,
  request_status text,
  effective_status text,
  created_at timestamptz,
  treatment_type text,
  assigned_department text,
  urgency text,
  case_status text,
  current_stage_id uuid,
  stage_department text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    scr.id AS request_id,
    scr.case_id,
    scr.stage_id,
    scr.status AS request_status,
    CASE
      WHEN scr.status = 'approved'
        AND scr.stage_id IS NOT NULL
        AND pr.current_stage_id IS NOT NULL
        AND scr.stage_id <> pr.current_stage_id
      THEN 'revoked'
      ELSE scr.status
    END AS effective_status,
    scr.created_at,
    pr.treatment_type,
    pr.assigned_department,
    pr.urgency,
    pr.status AS case_status,
    pr.current_stage_id,
    stage.department AS stage_department
  FROM student_case_requests scr
  JOIN patient_requests pr ON pr.id = scr.case_id
  LEFT JOIN case_routing_stages stage ON stage.id = scr.stage_id
  WHERE (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND scr.student_id = auth.uid()
  ORDER BY scr.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.student_requested_case_overview() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.student_requested_case_overview() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Remove broad student direct-read paths; scope the rest to current stage
-- ─────────────────────────────────────────────────────────────────────────────
-- Students no longer read patient_requests directly at all; all reads go through
-- the allowlisted RPCs above. Admin/faculty policies and service-role access are
-- unchanged.
DROP POLICY IF EXISTS "student_can_read_pool_and_own_active_cases" ON public.patient_requests;
DROP POLICY IF EXISTS "student_can_read_matched_pool_cases" ON public.patient_requests;

-- Progress entries: readable only while the caller is the CURRENT-stage assignee.
DROP POLICY IF EXISTS "student_can_read_own_case_progress_entries" ON public.case_progress_entries;
CREATE POLICY "student_can_read_current_stage_progress_entries"
  ON public.case_progress_entries
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND public.student_has_current_stage_assignment(case_progress_entries.case_id)
  );

-- Routing stages: students may read released stages (pool browsing) or their OWN
-- CURRENT stage only. A previous stage they were assigned to is no longer
-- readable once the case moves on.
DROP POLICY IF EXISTS "student_can_select_case_routing_stages" ON public.case_routing_stages;
CREATE POLICY "student_can_select_case_routing_stages"
  ON public.case_routing_stages
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND (
      status = 'released'
      OR (
        student_id = auth.uid()
        AND id = (
          SELECT pr.current_stage_id
          FROM patient_requests pr
          WHERE pr.id = case_routing_stages.case_id
        )
      )
    )
  );
