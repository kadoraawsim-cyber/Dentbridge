-- Phase 5 (File Upload Security): backfill legacy patient attachment metadata.
--
-- Existing requests keep their legacy attachment_path / attachment_name columns
-- for compatibility with current case read policies, but every attachment also
-- gets a service-role-only patient_files row so signed URL creation can move to
-- the DentBridge files service.

WITH legacy_attachments AS (
  SELECT
    pr.id AS patient_request_id,
    pr.attachment_path AS object_path,
    COALESCE(NULLIF(pr.attachment_name, ''), regexp_replace(pr.attachment_path, '^.*/', '')) AS original_filename,
    lower(regexp_replace(pr.attachment_path, '^.*\.', '')) AS extension,
    pr.created_at
  FROM public.patient_requests pr
  WHERE pr.attachment_path IS NOT NULL
    AND pr.attachment_path <> ''
),
typed_attachments AS (
  SELECT
    gen_random_uuid() AS id,
    patient_request_id,
    object_path,
    left(original_filename, 255) AS original_filename,
    CASE
      WHEN extension IN ('jpg', 'jpeg') THEN 'image/jpeg'
      WHEN extension = 'png' THEN 'image/png'
      WHEN extension = 'pdf' THEN 'application/pdf'
      ELSE NULL
    END AS mime_type,
    extension,
    created_at
  FROM legacy_attachments
  WHERE extension IN ('jpg', 'jpeg', 'png', 'pdf')
)
INSERT INTO public.patient_files (
  id,
  patient_request_id,
  bucket,
  object_path,
  original_filename,
  declared_mime,
  detected_mime,
  extension,
  status,
  scan_state,
  uploaded_by_actor,
  created_at,
  confirmed_at,
  scanned_at
)
SELECT
  id,
  patient_request_id,
  'patient-uploads',
  object_path,
  original_filename,
  mime_type,
  mime_type,
  extension,
  'clean',
  'skipped',
  'legacy_migration',
  COALESCE(created_at, now()),
  COALESCE(created_at, now()),
  now()
FROM typed_attachments
WHERE mime_type IS NOT NULL
ON CONFLICT (object_path) DO UPDATE
SET
  patient_request_id = EXCLUDED.patient_request_id,
  original_filename = EXCLUDED.original_filename,
  declared_mime = EXCLUDED.declared_mime,
  detected_mime = EXCLUDED.detected_mime,
  extension = EXCLUDED.extension,
  status = 'clean',
  scan_state = 'skipped',
  confirmed_at = COALESCE(public.patient_files.confirmed_at, EXCLUDED.confirmed_at),
  scanned_at = COALESCE(public.patient_files.scanned_at, EXCLUDED.scanned_at);
