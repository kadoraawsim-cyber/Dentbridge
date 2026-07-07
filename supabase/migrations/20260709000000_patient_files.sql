-- Phase 5 (File Upload Security), Branch 5B, Commit 1: file metadata table.
--
-- This migration creates the `patient_files` metadata table used by the
-- server-mediated prepare/confirm/signed-url pipeline. Storage policy changes
-- and legacy attachment backfill are kept in separate forward migrations so
-- fresh replay ordering stays explicit and production rollout remains safe.
--
-- Dated to sort after the Phase 4 hardening migration
-- (20260708040000_phase4_enterprise_audit_consent_hardening.sql).
--
-- Access model: service-role only. RLS is enabled with NO anon/authenticated
-- policies, mirroring `otp_codes`, `audit_logs`, and `consent_records`. Only the
-- service role (server-side) reads or writes file metadata; all file access goes
-- through the DentBridge files service/API. This also keeps the storage layer
-- swappable (S3, MinIO, institution-hosted) behind a DentBridge-owned table.
--
-- The original filename (PII) lives here, protected by RLS; it must never appear
-- in the storage object key. `object_path` is an opaque UUID path.

CREATE TABLE IF NOT EXISTS public.patient_files (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_request_id uuid NULL REFERENCES public.patient_requests(id) ON DELETE CASCADE,
  upload_session_id  uuid NULL,
  bucket             text NOT NULL DEFAULT 'patient-uploads',
  object_path        text NOT NULL UNIQUE,
  original_filename  text NOT NULL,
  declared_mime      text NOT NULL,
  detected_mime      text NULL,
  extension          text NOT NULL,
  size_bytes         bigint NULL,
  checksum_sha256    text NULL,
  status             text NOT NULL DEFAULT 'pending',
  scan_state         text NULL,
  scan_provider      text NULL,
  scanned_at         timestamptz NULL,
  uploaded_by_actor  text NULL,
  ip_address         text NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  confirmed_at       timestamptz NULL,
  expires_at         timestamptz NULL,
  CONSTRAINT patient_files_status_chk CHECK (status IN (
    'pending','uploaded','scanning','clean','quarantined','rejected','orphaned','deleted'
  )),
  CONSTRAINT patient_files_scan_state_chk CHECK (
    scan_state IS NULL OR scan_state IN ('skipped','pending','clean','infected')
  ),
  CONSTRAINT patient_files_mime_chk CHECK (
    declared_mime IN ('image/jpeg','image/png','application/pdf')
  ),
  CONSTRAINT patient_files_ext_chk CHECK (extension IN ('jpg','jpeg','png','pdf')),
  CONSTRAINT patient_files_size_chk CHECK (size_bytes IS NULL OR size_bytes <= 15728640),
  CONSTRAINT patient_files_text_lengths_chk CHECK (
    length(object_path) <= 400
    AND length(original_filename) <= 255
    AND length(declared_mime) <= 120
    AND (detected_mime IS NULL OR length(detected_mime) <= 120)
    AND length(extension) <= 12
    AND (checksum_sha256 IS NULL OR length(checksum_sha256) <= 128)
    AND (scan_provider IS NULL OR length(scan_provider) <= 80)
    AND (uploaded_by_actor IS NULL OR length(uploaded_by_actor) <= 120)
    AND (ip_address IS NULL OR length(ip_address) <= 128)
  )
);

-- Files for a given request (admin/faculty/student read paths, cleanup joins).
CREATE INDEX IF NOT EXISTS patient_files_request_idx
  ON public.patient_files (patient_request_id);

-- Status filtering (e.g. only `clean` files are viewable).
CREATE INDEX IF NOT EXISTS patient_files_status_idx
  ON public.patient_files (status);

-- Orphan cleanup scans pending rows past their TTL.
CREATE INDEX IF NOT EXISTS patient_files_pending_expiry_idx
  ON public.patient_files (expires_at)
  WHERE status = 'pending';

-- Pre-submit binding lookups for the anonymous upload flow.
CREATE INDEX IF NOT EXISTS patient_files_upload_session_idx
  ON public.patient_files (upload_session_id)
  WHERE upload_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS patient_files_created_at_idx
  ON public.patient_files (created_at DESC);

-- Service-role-only access: enable RLS and intentionally add no anon or
-- authenticated policies. With RLS on and no policies, only the service role
-- (which bypasses RLS) can access file metadata.
ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.patient_files FROM anon;
REVOKE ALL ON TABLE public.patient_files FROM authenticated;
