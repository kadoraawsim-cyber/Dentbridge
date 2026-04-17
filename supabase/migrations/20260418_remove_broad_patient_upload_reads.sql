-- Remove broad storage read policies that make patient uploads too visible.
-- Keep the narrow upload/admin/student policies from earlier migrations.

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read patient-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read patient-uploads" ON storage.objects;
