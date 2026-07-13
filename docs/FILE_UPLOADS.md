# File Uploads

Status: IMPLEMENTED / PHASE 5 COMPLETE. This document records the Phase 5
(File Upload Security) architecture, rollout decisions, QA checklist, and
remaining deferred work.

Update, 12 July 2026: Production patient uploads now use the approved temporary
scannerless image-sanitization policy. New patient image uploads are private
quarantined originals, decoded and re-encoded server-side with Sharp/libvips
into sanitized JPEG derivatives. Only `sanitized_unscanned` derivatives may be
previewed or served; original uploaded bytes are never signed for faculty,
students, or admins and are deleted after successful derivative creation. This
is not malware scanning, and `clean` / `scan_state = clean` remain reserved for
a future real scanner verdict. See
`docs/PATIENT_IMAGE_SANITIZATION_PREVIEW_CHECKLIST.md` for the required Vercel
Preview proof before widening formats beyond JPEG/PNG.

Phase 5 replaces the current browser-direct upload with a server-mediated,
audited, portability-friendly file pipeline. It is the concrete execution of the
`Phase 5 - File Upload Security` section of
[PLATFORM_HARDENING_ROADMAP.md](./PLATFORM_HARDENING_ROADMAP.md) and closes the
storage exposure raised in the Phase 0-4 review.

Related docs: [DATABASE.md](./DATABASE.md), [ENVIRONMENT.md](./ENVIRONMENT.md).

---

## 1. Scope

In scope for the current patient image upload flow:

- Patient intake image attachments uploaded from `patient/request` (JPEG/JPG
  and PNG for the initial production policy).
- The private `patient-uploads` Supabase Storage bucket.
- Admin, faculty, and student read access to those attachments via signed URLs.
- File metadata, validation, server-side image sanitization, orphan prevention,
  retention, and audit.

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
client PUT       browser uploads original bytes directly to Storage using the token
      |
      v
confirm          server verifies object exists, downloads within strict bounds,
                 decodes and re-encodes JPEG/PNG to a metadata-stripped JPEG
                 derivative, deletes the original after success, and sets
                 status = sanitized_unscanned (or rejected/failed)
      |
      v
attach           patient request submit references the confirmed fileId + ticket
```

### 3.1 Why this option

| Option | Scales to 6000+ users and 10-15 MB files | Server can inspect bytes | Vendor portability |
| --- | --- | --- | --- |
| Server proxy (bytes stream through the API) | No: serverless body/bandwidth/time limits, costly at scale | Yes, before storage | Contract-owned but heavy |
| Bare signed upload URL (no confirm) | Yes | No | Thin adapter |
| **Prepare/confirm + signed upload URL (chosen)** | Yes: direct to storage | Yes, at confirm via bounded server download and Sharp re-encode | Contract-owned; only URL minting is Supabase-specific |

Rationale:

- At 6000+ users with multi-MB medical images, proxying bytes through
  serverless functions is the wrong cost/latency/limit profile. Direct-to-storage
  keeps file bytes off the function.
- The `confirm` step restores the server control point (existence, real size,
  full-byte bounded download, decoder limits, metadata stripping, checksum, and
  signed derivative creation) without pre-storage proxy bandwidth.
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

Current fields include:

- `object_path` / `original_object_path`: quarantined original upload path.
- `derivative_object_path`: sanitized JPEG derivative path used for every
  preview/download.
- `status`: `pending`, `original_received`, `structurally_valid`,
  `sanitizing`, `sanitized_unscanned`, `rejected`, `sanitize_failed`,
  `cleanup_eligible`, `cleanup_claimed`, plus legacy scanner states for future
  compatibility.
- `scan_state`: remains `pending` for scannerless derivatives; `clean` is only
  for a future real scanner verdict.
- `source_state`, `derivative_state`, `security_state`: distinguish original
  handling from derivative readiness and avoid representing unscanned files as
  malware-clean.
- `source_mime`, `derivative_mime`, source/derivative sizes, dimensions,
  `pixel_count`, derivative SHA-256, sanitizer version, processing timestamps,
  and failure/rejection reason fields.

The table remains service-role-only with RLS enabled and browser grants revoked.

Transition compatibility: `patient_requests.attachment_path` and
`attachment_name` are retained, but new scannerless submissions write the
sanitized derivative path and a stable `patient-image.jpg` display name. Those
columns are marked legacy and must not be removed during Phase 6; removal
belongs in a later, separately reviewed compatibility cleanup.

---

## 5. Storage paths and the PII rule

- Original key: `patient-requests/{request_or_session_uuid}/original/{file_uuid}.{ext}`.
- Derivative key: `patient-requests/{request_or_session_uuid}/sanitized/{file_uuid}.jpg`.
- All dynamic segments are UUIDs or normalized extensions. No name, no
  timestamp-name.
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
| Size cap | client (UX) -> prepare (declared) -> confirm (real object size) | 10 MB source image cap, hard ceiling enforced before decode |
| Declared MIME allowlist | prepare | `image/jpeg`, `image/png` |
| Extension allowlist | prepare | `jpg`, `jpeg`, `png` |
| Extension matches MIME | prepare | jpg/jpeg <-> image/jpeg, png <-> image/png |
| Magic bytes match accepted image type | confirm | see section 7 |
| Decode / dimension / pixel limits | confirm | Sharp/libvips with `limitInputPixels`, width/height/pixel caps, and processing timeout |
| Derivative SHA-256 checksum | confirm | integrity for the sanitized JPEG derivative |

Filename hygiene: reject path separators, `..`, control characters, and
over-length names; store the sanitized display name only in the DB row.

---

## 7. Magic-byte validation

The signed-upload-URL model still allows byte inspection because `confirm`
downloads the uploaded object server-side through a short-lived service-minted
signed URL, bounded by the hard upload cap. The server sniffs the bytes before
decoder work and then treats the decoder as untrusted input behind strict limits.

Required signatures:

- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- PDF, DICOM, TIFF, BMP, GIF, AVIF, HEIC/HEIF, SVG, ZIP, and other active or
  unsupported formats are detected where practical so they can be rejected with
  specific guidance instead of falling through as malformed JPEG/PNG.

If the detected type is not accepted by the current production policy, set
`status = 'rejected'`, keep the object in a cleanup-eligible state or delete it
immediately when safe, write a `file_rejected` audit event, and return localized
patient guidance.

---

## 8. Scannerless sanitization and future malware scanning

The temporary production policy does not claim malware scanning. It creates a
new sanitized JPEG derivative and makes only that derivative viewable.

```
pending -> original_received -> structurally_valid -> sanitizing
        -> sanitized_unscanned                     (derivative viewable)
        -> rejected                                (unsupported / unsafe input)
        -> sanitize_failed                         (recoverable processing failure)
```

- Nothing renders until `status = 'sanitized_unscanned'`,
  `security_state = 'sanitized_unscanned'`, `derivative_state = 'ready'`, and a
  derivative object path is present.
- `scan_state = 'clean'` and `security_state = 'malware_clean'` remain reserved
  for a future real scanner verdict. A fake/no-op scanner must never set those
  states.
- Launch gate: the server-only `PATIENT_UPLOAD_POLICY` flag (default
  `disabled`) gates `prepare-upload`/`confirm`; the active temporary value is
  `sanitized_images`. `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED` hides the upload
  form only, so uploads can be turned off without disabling patient request
  submission. See
  `docs/ENVIRONMENT.md` and `docs/PRODUCTION_RELEASE_GATES_2026-07-11.md`.
- 5F engine options: a ClamAV worker/container, a scanning API, a background
  job, or a Supabase storage-trigger Edge Function calling
  `POST /api/internal/files/{id}/scan-callback`.
- Future scanner mode can promote sanitized derivatives to malware-clean only
  after a real scanner verdict. PDF/DICOM clinical-document workflows remain
  separate future work.

---

## 9. API endpoints

All routes follow existing conventions: `runtime = 'nodejs'`, same-origin guard,
rate limiting, generic `PublicErrorCode` errors, `Cache-Control: no-store`, and
audit hooks. Public patient endpoints stay anonymous but same-origin-guarded.

| Endpoint | Purpose | Key guards |
| --- | --- | --- |
| `POST /api/v1/files/prepare-upload` | Validate metadata, mint signed upload URL, create `pending` row; return `{ fileId, uploadUrl, expiresAt, ticket }` without a separate raw object path | same-origin, IP rate limit, size/MIME/extension validation; audit `file_upload_prepared` |
| `POST /api/v1/files/{id}/confirm` | Verify object exists, decode/re-encode accepted JPEG/PNG, upload sanitized derivative, mark source cleanup/deleted | same-origin, IP rate limit, ticket check; audit `file_confirmed` / `file_rejected` |
| `POST /api/v1/files/{id}/signed-url` | Role-checked, audited, short-expiry derivative preview/download URL | auth + role + derivative-ready `sanitized_unscanned`; audit `file_signed_url_created` |
| `POST /api/internal/files/cleanup` | Cron orphan/original/retention purge | shared secret |
| `POST /api/internal/files/{id}/scan-callback` (deferred, 5F) | Scanner webhook -> status | signature |
| Modify `POST /api/v1/patient/requests` | Accept a confirmed `fileId` + `ticket` instead of raw `attachmentPath` / `attachmentName`; verify and link | existing guards |

Anonymous-flow integrity: `prepare-upload` returns a signed HMAC `ticket` binding
the `fileId` (and an expiry). The patient request submit and `confirm` verify the
ticket, so a caller cannot claim another session's `fileId` (IDOR defense). The
ticket uses a dedicated server-only secret (`FILE_TICKET_SECRET`) that is not
shared with other integrations.

---

## 10. Storage and RLS policy plan

Proposed migrations (see section 19 for order):

1. Create `patient_files` (section 4): RLS enabled, all browser grants revoked.
2. Drop the anon/authenticated write policy:

```sql
DROP POLICY IF EXISTS "patient_uploads_insert" ON storage.objects;
REVOKE INSERT ON storage.objects FROM anon;   -- if any residual grant exists
```

   With signed upload URLs (`createSignedUploadUrl` server-side -> direct
   browser `PUT` to the signed URL), the signed URL authorizes the single write,
   so no anon INSERT policy is needed. This removes the last unauthenticated
   write path.

3. New scannerless migration adds original/derivative object paths, source and
   derivative states, sanitizer metadata, derivative dimensions/checksum, and
   fail-closed atomic intake checks for `sanitized_unscanned` derivatives.

Deferred policy work (Phase 6):

- Remove direct client storage SELECT policies once all reads go through the
  service, and gate signed-URL minting on derivative-ready states.
- Narrow `faculty_can_read_patient_uploads` from "any object" to case-scoped.

Sequencing rule: do not combine the anon-insert revocation with the Phase 6 read
migration or a large RLS refactor in the same branch or day.

---

## 11. Signed URL audit model

- All signed-URL creation moves into a server-side files service. No more
  client-side `createSignedUrl`.
- A URL is minted only after a role check and derivative-ready checks:
  `status = 'sanitized_unscanned'`, `security_state = 'sanitized_unscanned'`,
  `derivative_state = 'ready'`, and a non-null derivative path.
- Each mint writes `file_signed_url_created` with safe metadata only: `file_id`,
  `patient_request_id`, `actor_role`, `purpose` (`preview` | `download`),
  `expiry_seconds`. Never the path or filename.
- Expiries are shortened: preview 60-120s, download 300s (replacing 3600s).

---

## 12. Orphan prevention

- `prepare` creates a `pending` row with `expires_at`.
- The object is unusable until `confirm` links it to a persisted request.
- The patient request submit accepts only a sanitized derivative `fileId` bound
  by the HMAC ticket; without a ready derivative the submit either fails with an
  actionable upload message or proceeds with no attachment only when the patient
  removed the attachment.
- Any unlinked `pending`, failed, rejected, or cleanup-eligible source object is
  purged by the cleanup job.

Upload-before-submit orphans become impossible by construction.

---

## 13. Cleanup and retention

- Scheduled job (Vercel Cron -> `POST /api/internal/files/cleanup` with a shared
  secret, or pg_cron + Edge Function):
  - purge expired unlinked rows and their original/derivative objects;
  - purge cleanup-eligible originals left behind after a successful derivative
    commit;
  - audit `file_deleted`.
- Clinical retention for linked sanitized derivatives: retain per institutional
  / KVKK policy; purge a defined period after case closure. This value is a
  policy decision to capture here before automation is enabled.
- The same job pattern should later also purge expired `otp_codes` (separate
  ticket).

---

## 14. Access control matrix

Reads are routed through the API/service (service role), with RLS retained as
defense in depth.

| Actor | Access |
| --- | --- |
| anon / patient | No read. Write only via prepare/confirm token. |
| student | Signed URL only for derivative-ready files on cases `approved` to them (post-approval only; no `matched`-pool raw-file access). |
| faculty | Signed URL for derivative-ready files only when current-stage authorization allows it. |
| admin | Signed URL for derivative-ready files; audited. |

Download hardening: force a safe `Content-Disposition`, set explicit
`image/jpeg`, and send `X-Content-Type-Options: nosniff`. Original uploaded
bytes are never served to viewers.

Resolved decision (roadmap 5A): students do not get raw-file access before
approval. The implemented behavior mints signed URLs only for derivative-ready files on
cases that are `approved` to the requesting student (`canActorReadFile` in
`src/lib/files/files.service.ts`) — the stricter, minimum-PHI option. Any future
change to allow pre-approval (`matched` pool) access is a clinical stakeholder
decision and must not be changed unilaterally.

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

Metadata safety: the sanitizer (`SENSITIVE_METADATA_KEYS` in
`src/lib/audit/audit.service.ts`) drops `attachment_name`, `attachment_path`,
`object_path`, `original_filename`, `filename`, `checksum`, and `checksum_sha256`,
plus the fragments `otp|hash|secret|token|password`, so a careless caller cannot
leak file paths or names. Callers should still reference files by `file_id` only.

---

## 16. Manual QA checklist

Happy path:

- [ ] Upload a JPEG and PNG; confirm succeeds; preview renders before submit;
      request submits; admin/faculty preview renders from a JPEG derivative;
      `patient_files.status = 'sanitized_unscanned'` and
      `scan_state = 'pending'`.
- [ ] Submit a request with no attachment; still works.

Validation negatives:

- [ ] Oversized file rejected.
- [ ] Disallowed extension rejected.
- [ ] MIME/extension mismatch rejected.
- [ ] Magic-byte mismatch (e.g. a `.png` that is actually a PDF, or a disguised
      binary) rejected and the object deleted.
- [ ] PDF and DICOM are rejected with clinical-workflow guidance, not accepted
      as patient image uploads.

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

- [ ] Prepare then abandon (no confirm); cleanup claims the row and purges the
      object.
- [ ] Derivative success deletes the original, or marks it cleanup-eligible if
      storage deletion fails.

Reproducibility:

- [ ] `supabase db reset` applies all migrations cleanly.
- [ ] `npm run build`, `npx tsc --noEmit`, `npm run lint` pass.
- [ ] No PII appears in any object key or audit metadata.

---

## 17. Load and performance notes (6000+ users)

- Direct-to-storage signed upload keeps file bytes off serverless functions —
  the primary scalability win over a proxy.
- `prepare` is a small JSON call; `confirm` downloads one bounded object and
  runs Sharp/libvips under byte, pixel, dimension, and timeout limits.
  Rate-limit both.
- Index `patient_files` on `(patient_request_id)`, `(status)`, and a partial
  `(expires_at) WHERE status = 'pending'`.
- Mint signed URLs on demand only; avoid N+1 minting in admin/queue lists.
- Keep expiries short to limit storage egress; consider a CDN later.
- Audit inserts remain non-blocking.

---

## 18. Implemented now vs deferred

Implemented in Phase 5 and the scannerless update: sections 4, 5, 6, 7, 9
(prepare/confirm/signed-url), 10, 11, 12, 13 cleanup, 14 (matrix + hardening),
15 (audit actions), plus the derivative-ready `sanitized_unscanned` gate from
section 8.

Deferred, with structure in place:

- 5E full `file_viewed` / download audit beyond `file_signed_url_created`.
- 5F real malware scanning engine and `scan-callback`.
- Clinical retention automation value after case closure.
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
    prepare -> signed URL `PUT` -> confirm, sending `fileId` + `ticket`.
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

1. Student pre-approval raw-file access: RESOLVED — restricted to post-approval
   only. Signed URLs are minted only for cases `approved` to the student; there
   is no `matched`-pool raw-file access.
2. Size caps: implemented as 10 MB source images with strict dimension and
   pixel caps.
3. Signed-URL expiries: implemented as preview 120s and download 300s.
4. Whether to fold 5C/5D into 5B (recommended) or keep them as separate
   follow-up branches.
5. Clinical retention period for linked sanitized derivatives (institutional /
   KVKK input required).
