-- Phase 6: move sensitive workflow mutations behind DentBridge API/service
-- boundaries.
--
-- This migration intentionally revokes only write paths that now have API
-- replacements. SELECT policies required by current server-rendered UI reads are
-- preserved or added. Do not remove legacy attachment columns here.

-- Student profile completion now goes through
-- POST /api/auth/complete-profile/student using the service role.
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_can_select_own_profile" ON public.student_profiles;
CREATE POLICY "student_can_select_own_profile"
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
  );

REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_profiles FROM authenticated;

-- Faculty profile completion now goes through
-- POST /api/auth/complete-profile/faculty using the service role. Keep existing
-- faculty/admin SELECT policies and the existing admin update policy.
DROP POLICY IF EXISTS "faculty_can_insert_own_profile" ON public.faculty_profiles;
DROP POLICY IF EXISTS "faculty_can_update_own_profile" ON public.faculty_profiles;

REVOKE INSERT, DELETE ON TABLE public.faculty_profiles FROM anon;
REVOKE INSERT, DELETE ON TABLE public.faculty_profiles FROM authenticated;

-- Case triage, lifecycle, routing stage, and student-request decisions now go
-- through /api/admin/cases/[id] backed by admin-case-actions.service.ts.
DROP POLICY IF EXISTS "admin_can_update_patient_requests" ON public.patient_requests;
DROP POLICY IF EXISTS "faculty_can_update_patient_requests" ON public.patient_requests;
DROP POLICY IF EXISTS "student_can_update_own_active_case_status" ON public.patient_requests;

REVOKE UPDATE ON TABLE public.patient_requests FROM anon;
REVOKE UPDATE ON TABLE public.patient_requests FROM authenticated;

DROP POLICY IF EXISTS "student_can_insert_own_request" ON public.student_case_requests;
DROP POLICY IF EXISTS "admin_can_update_student_requests" ON public.student_case_requests;
DROP POLICY IF EXISTS "faculty_can_update_student_requests" ON public.student_case_requests;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_case_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_case_requests FROM authenticated;

DROP POLICY IF EXISTS "admin_faculty_can_insert_case_routing_stages" ON public.case_routing_stages;
DROP POLICY IF EXISTS "admin_faculty_can_update_case_routing_stages" ON public.case_routing_stages;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.case_routing_stages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.case_routing_stages FROM authenticated;

-- Student progress notes now go through /api/student/cases/[id]/progress and
-- lifecycle progress creation in /api/student/cases/[id]/status.
DROP POLICY IF EXISTS "student_can_insert_own_case_progress_entries" ON public.case_progress_entries;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.case_progress_entries FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.case_progress_entries FROM authenticated;

-- Manual planner writes now go through /api/student/planner. Keep own-row
-- SELECT for the server-rendered planner page and planner API reads.
ALTER TABLE public.student_planner_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_can_select_own_planner_events" ON public.student_planner_events;
CREATE POLICY "student_can_select_own_planner_events"
  ON public.student_planner_events
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
  );

REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_planner_events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_planner_events FROM authenticated;

-- File reads now go through /api/v1/files/[id]/signed-url and
-- src/lib/files/files.service.ts. Service-role signed URL creation is not
-- affected by these browser-role Storage policy removals.
DROP POLICY IF EXISTS "patient_uploads_admin_read" ON storage.objects;
DROP POLICY IF EXISTS "faculty_can_read_patient_uploads" ON storage.objects;
DROP POLICY IF EXISTS "student_can_read_patient_uploads" ON storage.objects;
