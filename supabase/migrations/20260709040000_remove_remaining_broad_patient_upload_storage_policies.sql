-- Production readiness: remove any remaining broad browser Storage policies for
-- patient uploads.
--
-- DentBridge now writes patient attachments through service-created signed
-- upload URLs and reads them through /api/v1/files/[id]/signed-url. Browser
-- roles must not retain direct INSERT or SELECT policies on the private
-- patient-uploads bucket.

DROP POLICY IF EXISTS "Allow anon uploads to patient-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to patient-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read patient-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read patient-uploads" ON storage.objects;
DROP POLICY IF EXISTS "admin_can_read_patient_uploads" ON storage.objects;
DROP POLICY IF EXISTS "anon_can_upload_to_patient_requests_prefix" ON storage.objects;
DROP POLICY IF EXISTS "patient_uploads_insert" ON storage.objects;
DROP POLICY IF EXISTS "patient_uploads_admin_read" ON storage.objects;
DROP POLICY IF EXISTS "faculty_can_read_patient_uploads" ON storage.objects;
DROP POLICY IF EXISTS "student_can_read_patient_uploads" ON storage.objects;

REVOKE INSERT ON TABLE storage.objects FROM anon;
REVOKE INSERT ON TABLE storage.objects FROM authenticated;
REVOKE INSERT ON TABLE storage.objects FROM public;

UPDATE storage.buckets
SET public = false
WHERE id = 'patient-uploads';
