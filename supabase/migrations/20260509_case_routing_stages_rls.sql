-- RLS policies for case_routing_stages.
--
-- Compatibility goals:
--   - Enable RLS (idempotent if already toggled on via dashboard).
--   - Do not alter existing tables, constraints, indexes, or data.
--   - Do not change any other table's RLS policies.
--   - Follow the exact auth check pattern used project-wide:
--       (auth.jwt() -> 'app_metadata' ->> 'role')

ALTER TABLE case_routing_stages ENABLE ROW LEVEL SECURITY;

-- Admin and faculty: read any routing stage.
DROP POLICY IF EXISTS "admin_faculty_can_select_case_routing_stages" ON case_routing_stages;
CREATE POLICY "admin_faculty_can_select_case_routing_stages"
  ON case_routing_stages
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'faculty'));

-- Admin and faculty: create new routing stages (approve / release_next_stage).
DROP POLICY IF EXISTS "admin_faculty_can_insert_case_routing_stages" ON case_routing_stages;
CREATE POLICY "admin_faculty_can_insert_case_routing_stages"
  ON case_routing_stages
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'faculty'));

-- Admin and faculty: update stage status, assignment, and review fields.
DROP POLICY IF EXISTS "admin_faculty_can_update_case_routing_stages" ON case_routing_stages;
CREATE POLICY "admin_faculty_can_update_case_routing_stages"
  ON case_routing_stages
  FOR UPDATE
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'faculty'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'faculty'));

-- Students: read released stages (pool browsing) or their own assigned stage (dashboard).
DROP POLICY IF EXISTS "student_can_select_case_routing_stages" ON case_routing_stages;
CREATE POLICY "student_can_select_case_routing_stages"
  ON case_routing_stages
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    AND (
      status = 'released'
      OR student_id = auth.uid()
    )
  );
