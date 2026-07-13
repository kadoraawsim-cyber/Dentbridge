-- Phase 5 (File Upload Security): remove the legacy browser-direct Storage
-- write path for patient attachments.
--
-- The application now uses service-created signed upload URLs. The signed token
-- authorizes a single object write, so anon/authenticated INSERT on
-- storage.objects is no longer needed and must not remain available.

DROP POLICY IF EXISTS "patient_uploads_insert" ON storage.objects;

REVOKE INSERT ON TABLE storage.objects FROM anon;
REVOKE INSERT ON TABLE storage.objects FROM authenticated;
REVOKE INSERT ON TABLE storage.objects FROM public;

UPDATE storage.buckets
SET public = false
WHERE id = 'patient-uploads';
