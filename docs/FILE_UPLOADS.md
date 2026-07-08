# File Uploads

Status: IMPLEMENTED / PHASE 5 COMPLETE. This document records the Phase 5
(File Upload Security) architecture, rollout decisions, QA checklist, and
remaining deferred work.

Phase 5 replaces the current browser-direct upload with a server-mediated,
audited, portability-friendly file pipeline. It is the concrete execution of the
`Phase 5 - File Upload Security` section of
[PLATFORM_HARDENING_ROADMAP.md](./PLATFORM_HARDENING_ROADMAP.md) and closes the
storage exposure raised in the Phase 0-4 review.

Related docs: [DATABASE.md](./DATABASE.md), [ENVIRONMENT.md](./ENVIRONMENT.md).

---

## 1. Scope

In scope for Phase 5:

- Patient intake attachments uploaded from `patient/request` (JPEG, PNG, PDF).
- The private `patient-uploads` Supabase Storage bucket.
- Admin, faculty, and student read access to those attachments via signed URLs.
- File metadata, validation, orphan prevention, retention, and audit.

Out of scope for Phase 5 (tracked elsewhere):

- Moving all other sensitive mutations to the API (Phase 6).
- Durable, cross-instance rate limiting (Phase 12).
- Generated Supabase types (Phase 9).

---

## 2. Previous architecture and risks

### 2.1 How uploads worked before Phase 5

1. The browser selects a file and uploads it directly to Storage using the
   public anon key:
   `supabase.storage.from('patient-uploads').upload(path, file)`
   (`src/app/patient/request/page.tsx`).
2. The object key is derived from the patient name:
   `${nameSlug}-${Date.now()}.${ext}`, stored at the bucket root.
3. The browser then calls `POST /api/v1/patient/requests` with client-supplied
   `attachmentPath` and `attachmentName`, which the API stores on
   `patient_requests` after string-only checks
   (`src/app/api/v1/patient/requests/route.ts`).

### 2.2 How reads worked before Phase 5

- Admin/faculty mint signed URLs client-side
  (`src/app/admin/requests/[id]/detail-client.tsx`,
  `createSignedUrl(path, 3600)` for preview and `createSignedUrl(path, 60)` for
  open), relying on storage RLS SELECT policies.
- Students resolve `attachment_path` client-side
  (`src/app/student/cases/cases-client.tsx`).
- None of this is audited or routed through a service layer.

### 2.3 Current storage policies

| Policy | Role | Effect |
| --- | --- | --- |
| `patient_uploads_insert` (`20260417_patient_access_lockdown.sql`) | anon, authenticated | INSERT with only a `bucket_id` check |
| `patient_uploads_admin_read` (`20260417`) | admin | SELECT any object in bucket |
| `faculty_can_read_patient_uploads` (`20260420000000`) | faculty | SELECT any object in bucket |
| `student_can_read_patient_uploads` (`20260418020000`) | student | SELECT where `patient_requests.attachment_path = storage.objects.name` AND (case `matched` OR student `approved`) |

The bucket is private (`public = false`). Broad anon/authenticated read policies
were already removed in `20260418010000`. Phase 5 additionally removes the
legacy anon/authenticated INSERT policy and routes all new writes through signed
upload tokens created by the files service.

### 2.4 Risks

1. Unauthenticated arbitrary write: the anon INSERT policy allows anyone with
   the public anon key to write unlimited objects; no size, MIME, or rate limit
   at the policy layer.
2. PII in object keys: the patient's full name is embedded in the storage path.
3. Structural orphans: upload happens before request submission; if submission
   fails there is an unreferenced PHI object with no cleanup.
4. Unverified `attachment_path`: client-controlled and stored as-is; no object
   existence, size, MIME, or content check.
5. Unaudited, long-lived signed URLs: client-minted at up to 3600s, with no
   `file_signed_url_created` trail.
6. Active-content risk: PDFs are served without a forced download disposition;
   only client-side extension gating exists.
7. Over-broad faculty read: faculty can read every object in the bucket, not
   only files for cases they are actioning.

---

## 3. Chosen architecture

Two-step **prepare -> direct signed upload -> confirm**, with the transport
being a **signed upload URL** (not a server proxy).

```
prepare-upload   validate metadata, mint signed upload token,
                 create a `pending` patient_files row, return fileId + ticket
      |
      v
client PUT       browser uploads bytes directly to Storage using the token
      |
      v
confirm          server verifies object exists, checks real size, sniffs magic
                 bytes, computes checksum, sets status = clean (or rejected)
      |
      v
attach           patient request submit references the confirmed fileId + ticket
```

### 3.1 Why this option

| Option | Scales to 6000+ users and 10-15 MB files | Server can inspect bytes | Vendor portability |
| --- | --- | --- | --- |
| Server proxy (bytes stream through the API) | No: serverless body/bandwidth/time limits, costly at scale | Yes, before storage | Contract-owned but heavy |
| Bare signed upload URL (no confirm) | Yes | No | Thin adapter |
| **Prepare/confirm + signed upload URL (chosen)** | Yes: direct to storage | Yes, at confirm via a small Range read | Contract-owned; only URL minting is Supabase-specific |

Rationale:

- At 6000+ users with multi-MB medical images/PDFs, proxying bytes through
  serverless functions is the wrong cost/latency/limit profile. Direct-to-storage
  keeps file bytes off the function.
- The `confirm` step restores the server control point (existence, real size,
  checksum, magic-byte sniff on the first bytes) without full-proxy bandwidth.
- The prepare/confirm contract is DentBridge-owned. This honors the roadmap's
  database/storage portability principle: replacing Supabase Storage with S3,
  MinIO, or institution-controlled storage later swaps one adapter, not the API
  contract or the callers.

A server-proxy variant may be added later as an optional high-assurance mode for
small files if pre-storage scanning is ever mandated; it is not the default.

---

## 4. `patient_files` table

Service-role-only, mirroring the access posture of `audit_logs` and
`consent_records`. This is the DentBridge-owned abstraction that makes storage
swappable and reads auditable. Implemented shape:

```sql
CREATE TABLE IF NOT EXISTS public.patient_files (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_request_id uuid NULL REFERENCES public.patient_requests(id) ON DELETE CASCADE,
  upload_session_id  uuid NULL,                 -- pre-submit binding for anon flow
  bucket             text NOT NULL DEFAULT 'patient-uploads',
  object_path        text NOT NULL UNIQUE,      -- opaque UUID key, no PII
  original_filename  text NOT NULL,             -- PII lives HERE, not in the key
  declared_mime      text NOT NULL,
  detected_mime      text NULL,
  extension          text NOT NULL,
  size_bytes         bigint NULL,               -- authoritative value set at confirm
  checksum_sha256    text NULL,
  status             text NOT NULL DEFAULT 'pending',
  scan_state         text NULL,                 -- 'skipped' | 'pending' | 'clean' | 'infected'
  scan_provider      text NULL,
  scanned_at         timestamptz NULL,
  uploaded_by_actor  text NULL,                 -- 'anonymous_patient' | user id
  ip_address         text NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  confirmed_at       timestamptz NULL,
  expires_at         timestamptz NULL,          -- pending TTL for orphan cleanup
  CONSTRAINT patient_files_status_chk CHECK (status IN (
    'pending','uploaded','scanning','clean','quarantined','rejected','orphaned','deleted'
  )),
  CONSTRAINT patient_files_mime_chk CHECK (declared_mime IN (
    'image/jpeg','image/png','application/pdf'
  )),
  CONSTRAINT patient_files_ext_chk CHECK (extension IN ('jpg','jpeg','png','pdf')),
  CONSTRAINT patient_files_size_chk CHECK (size_bytes IS NULL OR size_bytes <= 15728640)
);

CREATE INDEX IF NOT EXISTS patient_files_request_idx
  ON public.patient_files (patient_request_id);
CREATE INDEX IF NOT EXISTS patient_files_status_idx
  ON public.patient_files (status);
CREATE INDEX IF NOT EXISTS patient_files_pending_expiry_idx
  ON public.patient_files (expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS patient_files_created_at_idx
  ON public.patient_files (created_at DESC);

ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.patient_files FROM anon;
REVOKE ALL ON TABLE public.patient_files FROM authenticated;
```

Transition compatibility: `patient_requests.attachment_path` and
`attachment_name` are retained and kept in sync with `object_path` /
`original_filename` at confirm. This keeps the existing admin/faculty/student
read code and the `attachment_path = name` student RLS policy working during the
transition. Those columns are marked legacy and must not be removed during
Phase 6; removal belongs in a later, separately reviewed compatibility cleanup.

---

## 5. Storage paths and the PII rule

- Object key: `patient-requests/{request_or_session_uuid}/{file_uuid}` — all
  UUIDs. No name, no timestamp-name.
- The original filename is stored only in `patient_files.original_filename`,
  protected by RLS. It never appears in the object key.
- The extension may be kept on the key for operability, but it is a normalized,
  validated extension only. Dropping the extension entirely and setting the
  content type explicitly at download is an acceptable stricter option.

Rule: no patient name, phone, or free text ever appears in a storage path.

---

## 6. Validation rules

Enforced in depth. The confirm step is authoritative because client-declared
values are untrusted.

| Check | Where | Notes |
| --- | --- | --- |
| Size cap | client (UX) -> prepare (declared) -> confirm (real object size) | Proposed: 10 MB images, 15 MB PDF, hard ceiling 15 MB |
| Declared MIME allowlist | prepare | `image/jpeg`, `image/png`, `application/pdf` |
| Extension allowlist | prepare | `jpg`, `jpeg`, `png`, `pdf` |
| Extension matches MIME | prepare | jpg/jpeg <-> image/jpeg, png <-> image/png, pdf <-> application/pdf |
| Magic bytes match declared type | confirm | see section 7 |
| SHA-256 checksum | confirm | integrity, dedup |

Filename hygiene: reject path separators, `..`, control characters, and
over-length names; store the sanitized display name only in the DB row.

---

## 7. Magic-byte validation

The signed-upload-URL model still allows byte inspection because `confirm` reads
the first bytes server-side (a Range read of the first ~4 KB via a service-minted
signed URL or the storage API). No full-proxy download is required.

Required signatures:

- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- PDF: `25 50 44 46 2D` (`%PDF-`)

If the detected type does not match the declared type, set
`status = 'rejected'`, delete the storage object, write a `file_rejected` audit
event, and return a generic error to the caller.

This is recommended to ship in the Phase 5B branch (roadmap 5C) rather than as a
separate later branch, because it is cheap once `confirm` exists and it removes
the disguised-content vector.

---

## 8. Malware scanning and quarantine (future)

Ship the status state machine and quarantine gating now; defer the real scanning
engine to 5F.

```
pending -> uploaded -> scanning -> clean          (viewable)
                              \-> quarantined      (never viewable)
                              \-> rejected         (validation / magic-byte fail)
```

- Nothing renders until `status = 'clean'`.
- Interim mode: a no-op scanner sets `clean` and records `scan_state = 'skipped'`
  so gating and audit exist from day one. Turning on a real engine later is a
  configuration change, not a schema or policy change.
- 5F engine options: a ClamAV worker/container, a scanning API, a background
  job, or a Supabase storage-trigger Edge Function calling
  `POST /api/internal/files/{id}/scan-callback`.
- Optional hardening (documented, deferrable): server-side image re-encode to
  strip EXIF/GPS metadata; PDF sanitization.

---

## 9. API endpoints

All routes follow existing conventions: `runtime = 'nodejs'`, same-origin guard,
rate limiting, generic `PublicErrorCode` errors, `Cache-Control: no-store`, and
audit hooks. Public patient endpoints stay anonymous but same-origin-guarded.

| Endpoint | Purpose | Key guards |
| --- | --- | --- |
| `POST /api/v1/files/prepare-upload` | Validate metadata, mint signed upload URL, create `pending` row; return `{ fileId, uploadUrl, objectPath, expiresAt, ticket }` | same-origin, IP rate limit, size/MIME/extension validation; audit `file_upload_prepared` |
| `POST /api/v1/files/{id}/confirm` | Verify object exists, real size, magic bytes, checksum; set status | same-origin, IP rate limit, ticket check; audit `file_confirmed` / `file_rejected` |
| `POST /api/v1/files/{id}/signed-url` | Role-checked, audited, short-expiry download/preview URL | auth + role + `status = clean`; audit `file_signed_url_created` |
| `POST /api/internal/files/cleanup` (deferred) | Cron orphan/retention purge | shared secret |
| `POST /api/internal/files/{id}/scan-callback` (deferred, 5F) | Scanner webhook -> status | signature |
| Modify `POST /api/v1/patient/requests` | Accept a confirmed `fileId` + `ticket` instead of raw `attachmentPath` / `attachmentName`; verify and link | existing guards |

Anonymous-flow integrity: `prepare-upload` returns a signed HMAC `ticket` binding
the `fileId` (and an expiry). The patient request submit and `confirm` verify the
ticket, so a caller cannot claim another session's `fileId` (IDOR defense). The
ticket uses a new server-only secret (`FILE_TICKET_SECRET`), following the same
pattern as `OTP_HASH_SECRET`.

---

## 10. Storage and RLS policy plan

Proposed migrations (see section 19 for order):

1. Create `patient_files` (section 4): RLS enabled, all browser grants revoked.
2. Drop the anon/authenticated write policy:

```sql
DROP POLICY IF EXISTS "patient_uploads_insert" ON storage.objects;
REVOKE INSERT ON storage.objects FROM anon;   -- if any residual grant exists
```

   With signed upload URLs (`createSignedUploadUrl` server-side ->
   `uploadToSignedUrl` client-side), the upload token authorizes the single
   write, so no anon INSERT policy is needed. This removes the last
   unauthenticated write path.

3. Backfill: for existing `patient_requests` rows that have `attachment_path`,
   insert a legacy `patient_files` row with `status = 'clean'`,
   `object_path = attachment_path`, `original_filename = attachment_name`. This
   keeps the `attachment_path = name` student policy valid.

Deferred policy work (Phase 6):

- Remove direct client storage SELECT policies once all reads go through the
  service, and gate signed-URL minting on `status = 'clean'`.
- Narrow `faculty_can_read_patient_uploads` from "any object" to case-scoped.

Sequencing rule: do not combine the anon-insert revocation with the Phase 6 read
migration or a large RLS refactor in the same branch or day.

---

## 11. Signed URL audit model

- All signed-URL creation moves into a server-side files service. No more
  client-side `createSignedUrl`.
- A URL is minted only after a role check and a `status = 'clean'` check.
- Each mint writes `file_signed_url_created` with safe metadata only: `file_id`,
  `patient_request_id`, `actor_role`, `purpose` (`preview` | `download`),
  `expiry_seconds`. Never the path or filename.
- Expiries are shortened: preview 60-120s, download 300s (replacing 3600s).

---

## 12. Orphan prevention

- `prepare` creates a `pending` row with `expires_at`.
- The object is unusable until `confirm` links it to a persisted request.
- The patient request submit accepts only a confirmed `fileId` bound by the HMAC
  ticket; without confirmation the submit either fails or proceeds with no
  attachment.
- Any `pending` or `uploaded`-but-unconfirmed file past `expires_at` becomes
  `orphaned` and is purged by the cleanup job.

Upload-before-submit orphans become impossible by construction.

---

## 13. Cleanup and retention

- Scheduled job (Vercel Cron -> `POST /api/internal/files/cleanup` with a shared
  secret, or pg_cron + Edge Function):
  - purge `pending` / `orphaned` objects and rows past TTL;
  - delete the storage object and the metadata row together; audit
    `file_deleted`.
- Clinical retention for `clean`, linked files: retain per institutional / KVKK
  policy; purge a defined period after case closure. This value is a policy
  decision to capture here before automation is enabled.
- The same job pattern should later also purge expired `otp_codes` (separate
  ticket).

---

## 14. Access control matrix

Reads are routed through the API/service (service role), with RLS retained as
defense in depth.

| Actor | Access |
| --- | --- |
| anon / patient | No read. Write only via prepare/confirm token. |
| student | Signed URL only for `clean` files on cases `matched` (pool) or `approved` to them. |
| faculty | Signed URL for `clean` files (current parity); recommend case-scoping in a follow-up. |
| admin | Signed URL for any `clean` file; audited. |

Download hardening: force `Content-Disposition`, set an explicit content type,
and send `X-Content-Type-Options: nosniff` to neutralize active-content (PDF)
risk.

Open decision (roadmap 5A): should students see raw attachments before approval
(the current `matched` pool behavior)? Recommendation is to restrict pre-approval
students to no raw-file access to minimize PHI exposure. This is a clinical
stakeholder decision and must not be changed unilaterally.

---

## 15. Audit actions and metadata safety

New audit actions to add to `src/lib/audit/audit.service.ts`:

- `file_upload_prepared` (category `security`)
- `file_confirmed` (category `security`)
- `file_rejected` (category `security`)
- `file_signed_url_created` (category `privacy`)
- `file_viewed` (category `privacy`, deferred to 5E)
- `file_deleted` (category `privacy`)

These fit the existing DB CHECK constraints for `category`
(`auth|consent|privacy|security|workflow`) and `actor_type`, so no audit schema
change is required.

Metadata safety: the sanitizer already drops `attachment_name` and
`attachment_path` and the fragments `otp|hash|secret|token|password`. It does not
currently drop `object_path`, `original_filename`, or `filename`. Callers must
therefore reference files by `file_id` only. Recommended small hardening: add
`object_path`, `original_filename`, and `filename` to `SENSITIVE_METADATA_KEYS`
so a future careless caller cannot leak them.

---

## 16. Manual QA checklist

Happy path:

- [ ] Upload a JPEG, a PNG, and a PDF; confirm succeeds; request submits; admin
      preview renders; `patient_files.status = 'clean'`.
- [ ] Submit a request with no attachment; still works.

Validation negatives:

- [ ] Oversized file rejected.
- [ ] Disallowed extension rejected.
- [ ] MIME/extension mismatch rejected.
- [ ] Magic-byte mismatch (e.g. a `.png` that is actually a PDF, or a disguised
      binary) rejected and the object deleted.

Security:

- [ ] Direct anon upload with the anon key is denied (insert policy removed).
- [ ] Reusing another session's `fileId` / ticket is rejected (IDOR).
- [ ] Student pre- vs post-approval read matches the decided policy.
- [ ] Student A cannot obtain a signed URL for student B's case file.
- [ ] Admin and faculty preview each write a `file_signed_url_created` audit row
      with no path or filename in metadata.
- [ ] Signed URL expires at the configured short TTL.
- [ ] Download is served with attachment disposition and `nosniff`.

Orphans and retention:

- [ ] Prepare then abandon (no confirm); cleanup marks the row `orphaned` and
      purges the object.

Reproducibility:

- [ ] `supabase db reset` applies all migrations cleanly.
- [ ] `npm run build`, `npx tsc --noEmit`, `npm run lint` pass.
- [ ] No PII appears in any object key or audit metadata.

---

## 17. Load and performance notes (6000+ users)

- Direct-to-storage signed upload keeps file bytes off serverless functions —
  the primary scalability win over a proxy.
- `prepare` and `confirm` are small JSON calls; `confirm` reads only the first
  ~4 KB for magic bytes. Rate-limit both (durable limiter is Phase 12; the
  current in-memory limiter is per-instance).
- Index `patient_files` on `(patient_request_id)`, `(status)`, and a partial
  `(expires_at) WHERE status = 'pending'`.
- Mint signed URLs on demand only; avoid N+1 minting in admin/queue lists.
- Keep expiries short to limit storage egress; consider a CDN later.
- Audit inserts remain non-blocking.

---

## 18. Implemented now vs deferred

Implemented in Phase 5: sections 4, 5, 6, 7, 9
(prepare/confirm/signed-url), 10 (create table, revoke anon insert, backfill),
11, 12, 14 (matrix + hardening), 15 (audit actions), plus the quarantine status
machine and `clean`-gating from section 8.

Deferred, with structure in place:

- 5E full `file_viewed` / download audit beyond `file_signed_url_created`.
- 5F real malware scanning engine and `scan-callback`.
- Cleanup/retention automation (cron) and the clinical retention value.
- Phase 6: remove client storage SELECT policies after signed URL APIs are
  verified. Case-scoped faculty file authorization and removal of legacy
  `attachment_path` / `attachment_name` remain separate future cleanups.
- Phase 12: durable rate limiting for file endpoints.

---

## 19. Phase 5 execution plan (task breakdown)

### 19.1 Recommended sub-phase mapping

The roadmap defines 5A-5F. Recommendation: fold 5C (MIME + magic bytes) and 5D
(signed-URL audit) into the 5B build, because magic-byte checks are cheap once
`confirm` exists and moving signed-URL creation server-side without auditing it
would be a regression. 5E and 5F remain genuinely deferred.

| Roadmap sub-phase | This plan |
| --- | --- |
| 5A private bucket + student access review | Now (review + this doc + decision) |
| 5B server-side upload validation | Now |
| 5C MIME + magic-byte validation | Now (folded into 5B) |
| 5D signed-URL audit + short expiry | Now (folded into 5B) |
| 5E full file-access audit | Deferred |
| 5F malware scanning engine | Deferred (statuses/gating now) |

Conservative alternative: keep 5C and 5D as separate follow-up branches after
5B. This plan recommends folding them in; the alternative is acceptable if
smaller branches are preferred.

### 19.2 Implementation order

Phase 5A (review and decisions; no app code, at most a documented policy
decision):

1. Verify `patient-uploads` is private and enumerate current policies (done in
   this doc).
2. Decide student pre-approval file access (section 14 open decision).
3. Finalize size caps, allowlists, and expiries (sections 6, 11).

Phase 5B (single dedicated branch, e.g. `file-upload-security`):

1. Migration: create `patient_files` (table, constraints, indexes, RLS,
   revokes).
2. `src/lib/files/file.constants.ts`: allowlists, size caps, status enum,
   expiries.
3. `src/lib/files/magic-bytes.ts`: signature sniffer.
4. `src/lib/files/ticket.ts`: HMAC ticket mint/verify (`FILE_TICKET_SECRET`).
5. `src/lib/files/files.service.ts`: prepare, confirm, validation, magic-byte
   check, checksum, signed-URL minting, status transitions.
6. Audit: add file actions + wrapper helpers to
   `src/lib/audit/audit.service.ts`; optionally extend the sanitizer key set.
7. Endpoints: `POST /api/v1/files/prepare-upload`,
   `POST /api/v1/files/[id]/confirm`, `POST /api/v1/files/[id]/signed-url`.
8. Migration: drop `patient_uploads_insert` (revoke anon write).
9. Migration: backfill `patient_files` from existing `patient_requests` rows.
10. Modify `POST /api/v1/patient/requests` to accept `fileId` + `ticket`, verify
    and link, and set `attachment_path` / `attachment_name` from `patient_files`.
11. Rewrite client upload in `src/app/patient/request/page.tsx` to
    prepare -> `uploadToSignedUrl` -> confirm, sending `fileId` + `ticket`.
12. Replace client `createSignedUrl` in
    `src/app/admin/requests/[id]/detail-client.tsx` and
    `src/app/student/cases/cases-client.tsx` (+ its `page.tsx`) with calls to
    `POST /api/v1/files/[id]/signed-url`.
13. Env: add `FILE_TICKET_SECRET` to `.env.example` and document it in
    `ENVIRONMENT.md`.
14. Docs: add a `patient_files` section to `DATABASE.md`.
15. Verify: `supabase db reset`, build, tsc, lint, and the section 16 QA matrix.

### 19.3 Files that will change (5B)

New files:

- `supabase/migrations/<ts>_patient_files.sql`
- `supabase/migrations/<ts>_revoke_anon_patient_upload_insert.sql`
- `supabase/migrations/<ts>_backfill_patient_files.sql`
- `src/lib/files/file.constants.ts`
- `src/lib/files/magic-bytes.ts`
- `src/lib/files/ticket.ts`
- `src/lib/files/files.service.ts`
- `src/app/api/v1/files/prepare-upload/route.ts`
- `src/app/api/v1/files/[id]/confirm/route.ts`
- `src/app/api/v1/files/[id]/signed-url/route.ts`

Modified files:

- `src/lib/audit/audit.service.ts` (new file audit actions + helpers, optional
  sanitizer additions)
- `src/app/api/v1/patient/requests/route.ts` (accept `fileId` + ticket; link file)
- `src/app/patient/request/page.tsx` (prepare/confirm client flow)
- `src/app/admin/requests/[id]/detail-client.tsx` (signed URL via API)
- `src/app/student/cases/cases-client.tsx` and
  `src/app/student/cases/page.tsx` (signed URL via API)
- `.env.example` and `docs/ENVIRONMENT.md` (`FILE_TICKET_SECRET`)
- `docs/DATABASE.md` (`patient_files` section)

### 19.4 Migrations needed

Now (5B): create `patient_files`; drop `patient_uploads_insert`; backfill
`patient_files`.

Deferred (5F / Phase 6): status-aware read policies; remove client storage
SELECT policies; case-scope faculty; drop legacy `attachment_path` /
`attachment_name`.

### 19.5 Branch and safety rules

- One dedicated branch for Phase 5 file work; do not combine with the Phase 6
  read migration, a broad RLS refactor, or the malware scanner.
- Do not change production storage without a backup (Phase 0).
- End the branch with `supabase db reset` + build + tsc + lint + the QA matrix.

---

## 20. Open decisions to confirm before 5B

1. Student pre-approval raw-file access: keep current (visible on `matched`
   pool) or restrict to post-approval only (recommended)?
2. Size caps: implemented as 10 MB images / 15 MB PDF.
3. Signed-URL expiries: implemented as preview 120s and download 300s.
4. Whether to fold 5C/5D into 5B (recommended) or keep them as separate
   follow-up branches.
5. Clinical retention period for `clean`, linked files (institutional / KVKK
   input required).
