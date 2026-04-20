-- Faculty profiles for invited faculty users.
-- Kept separate from student_profiles to avoid cross-role contamination
-- and to allow faculty-only fields later.

CREATE TABLE IF NOT EXISTS faculty_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  department text,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE faculty_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faculty_can_select_own_profile" ON faculty_profiles;
CREATE POLICY "faculty_can_select_own_profile"
  ON faculty_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty'
  );

DROP POLICY IF EXISTS "faculty_can_insert_own_profile" ON faculty_profiles;
CREATE POLICY "faculty_can_insert_own_profile"
  ON faculty_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty'
  );

DROP POLICY IF EXISTS "faculty_can_update_own_profile" ON faculty_profiles;
CREATE POLICY "faculty_can_update_own_profile"
  ON faculty_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty'
  )
  WITH CHECK (
    auth.uid() = id
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'faculty'
  );

DROP POLICY IF EXISTS "admin_can_select_faculty_profiles" ON faculty_profiles;
CREATE POLICY "admin_can_select_faculty_profiles"
  ON faculty_profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "admin_can_update_faculty_profiles" ON faculty_profiles;
CREATE POLICY "admin_can_update_faculty_profiles"
  ON faculty_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
