# Database

DentBridge uses Supabase Postgres. The schema is managed by chronological SQL
migrations in `supabase/migrations`; do not edit existing migrations after they
have been applied. Add forward-compatible migrations instead.

## Important Tables

### `patient_requests`

Patient intake and lifecycle source of truth.

- Baseline: `20260413_baseline_existing_core_tables.sql`
- Key lifecycle column: `status`
- Later additions include review accountability, consent metadata, gender,
  routing stage links, and routing completion time.
- Current status constraint is managed by:
  - `20260416_lifecycle_statuses.sql`
  - `20260509000000_allow_faculty_review_status.sql`
- Phase 3 Branch B routes public submissions through
  `/api/v1/patient/requests`; browser-role direct table inserts are revoked
  by `20260708020000_revoke_anon_patient_request_insert.sql`.

### `student_profiles`

Student account profile data linked to invited/authenticated users.

- Baseline: `20260413_baseline_existing_core_tables.sql`
- Primary key: `id`
- Unique key: `email`
- Phase 6 routes invitation profile completion through
  `/api/auth/complete-profile/student`; browser clients no longer upsert this
  table directly.

### `faculty_profiles`

Faculty account profile data linked to invited/authenticated users.

- Created by: `20260420010000_faculty_profiles.sql`
- Primary key: `id`
- Unique key: `email`
- Phase 6 routes invitation profile completion through
  `/api/auth/complete-profile/faculty`; browser clients no longer upsert this
  table directly.

### `student_case_requests`

Student requests to claim patient cases.

- Created by: `20260415_student_case_requests.sql`
- Unique key: `(case_id, student_id)`
- Status constraint is created in the table migration and widened by
  `20260421_student_case_requests_revoked.sql`.

### `student_planner_events`

Student planner entries and system-created appointment links.

- Baseline: `20260413_baseline_existing_core_tables.sql`
- Legacy patient link: `patient_id`
- Case appointment link: `source_case_id`
- Routing stage link: `stage_id`
- Source-linking constraints and unique source index are managed by
  `20260424010000_student_planner_case_links.sql`.
- `lifecycle_state` constraint is managed by
  `20260509010000_case_routing_stages_foundation.sql`.
- Phase 6 keeps planner reads available to the owning student but moves planner
  create/update/delete mutations behind `/api/student/planner` service-role
  routes.

### `case_progress_entries`

Append-only case progress notes for approved student-owned cases.

- Created by: `20260424000000_case_progress_entries.sql`
- Linked by `case_id`, `student_id`, and later `stage_id`
- Includes a content check constraint so empty progress entries are rejected.

### `case_routing_stages`

Sequential department routing stages for a patient case.

- Created by: `20260509010000_case_routing_stages_foundation.sql`
- Unique key: `(case_id, sequence)`
- Status constraint is added by
  `20260707_phase2_database_foundation_constraints_indexes.sql`.

### `audit_logs`

Append-only operational audit events for security-relevant patient and workflow
actions.

- Created by: `20260708030000_phase4_audit_logs_consent_records.sql`
- Enterprise hardening: `20260708040000_phase4_enterprise_audit_consent_hardening.sql`
- Access model: service-role/server only.
- RLS is enabled and no `anon` or `authenticated` direct access is granted.
- Events include a typed `action`, `category`, `severity`, `actor_type`,
  `success`, `event_version`, `metadata_schema`, `request_id`,
  `correlation_id`, `source_service`, and optional `api_version`.
- Audit metadata must contain only caller-curated safe fields. Do not log OTP
  codes, OTP hashes, raw secrets, full complaint text, medical details,
  attachment contents, authorization tokens, raw phone numbers, or unnecessary
  patient identifiers.
- Metadata is intentionally size-limited and should stay flat, low-cardinality,
  and export-friendly for future SIEM or queue-based delivery.
- Phase 4 audit coverage includes patient request creation, OTP challenge
  requests, and OTP-protected patient status lookups.

### `consent_records`

Immutable consent acceptance records tied to patient intake submissions.

- Created by: `20260708030000_phase4_audit_logs_consent_records.sql`
- Enterprise hardening: `20260708040000_phase4_enterprise_audit_consent_hardening.sql`
- Linked to `patient_requests(id)` with `ON DELETE CASCADE`.
- Current consent types are `kvkk_acknowledgement` and `explicit_consent`.
- Current source is constrained to `patient_request`.
- Records include `consent_status`, `policy_version`, document metadata,
  jurisdiction, country code, and university key so future legal/version
  changes do not require reshaping the core table.
- Access model: service-role/server only.
- RLS is enabled and no `anon` or `authenticated` direct access is granted.

### `otp_codes`

Server-side storage for one-time passcodes used to verify secure patient status
lookups (Phase 3, Branch A). Codes are stored hashed in `code_hash`, never in
plaintext.

- Created by: `20260708000000_otp_codes.sql`
- Purpose is fixed to `patient_status_lookup` via a CHECK constraint.
- Tracks `attempts` / `max_attempts`, `expires_at`, `consumed_at`, and
  `request_ip` to support attempt limits, expiry, single use, and rate limiting.
- Access is service-role only: RLS is enabled with no anon or authenticated
  policies (see RLS And Policies below).
- Wired by the Phase 3 Branch A patient status OTP endpoints. The public UI
  requests an OTP first, then verifies the OTP before status data is returned.

### `patient_files`

Metadata for patient upload attachments (Phase 5, Branch 5B). One row per
prepared/uploaded file. The storage object key is opaque; the original filename
and other identifying metadata live here, protected by RLS, never in the key.

- Created by: `20260709000000_patient_files.sql`
- Related Phase 5 migrations:
  `20260709010000_revoke_patient_upload_insert.sql` removes the legacy
  anon/authenticated Storage INSERT path, and
  `20260709020000_backfill_patient_files.sql` backfills existing attachment
  metadata.
- Linked to `patient_requests(id)` with `ON DELETE CASCADE` (nullable until a
  file is attached to a submitted request).
- `object_path` is a unique, opaque UUID storage key. No patient name, phone, or
  free text is ever placed in the key.
- Tracks `status` (`pending`, `uploaded`, `scanning`, `clean`, `quarantined`,
  `rejected`, `orphaned`, `deleted`), `scan_state`, `declared_mime` /
  `detected_mime`, `extension`, `size_bytes`, `checksum_sha256`, and
  `expires_at` for pending-upload orphan cleanup.
- Access model: service-role/server only. RLS is enabled with no anon or
  authenticated policies; all file access goes through the DentBridge files
  service/API.
- Patient request submission now accepts only a confirmed `fileId` plus upload
  ticket. The API links `patient_files` to `patient_requests` and keeps legacy
  `attachment_path` / `attachment_name` synchronized for compatibility.
- Signed download/preview URLs are created only by the server-side files
  service, are short-lived, and are audited.
- See `docs/FILE_UPLOADS.md` for the full upload architecture and QA plan.

## Migration Order

Fresh database creation must apply migrations in filename order. The baseline
migration `20260413_baseline_existing_core_tables.sql` intentionally precedes
the older alter-table migrations so that fresh replay can create the tables
before later migrations add columns, constraints, policies, and indexes.

Important ordering rules:

- Do not rewrite existing migration history.
- Do not add constraints to the baseline when later migrations already manage
  those constraints.
- Preserve legacy columns used by later migrations, such as
  `student_planner_events.patient_id`, and let later migrations add newer
  normalized links such as `source_case_id`.
- Use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and
  `CREATE INDEX IF NOT EXISTS` for additive forward migrations when possible.

## Constraints

Status and lifecycle constraints are managed in migrations:

- `patient_requests.status`: `patient_requests_status_check`
- `student_case_requests.status`: `student_case_requests_status_check`
- `case_routing_stages.status`: `case_routing_stages_status_check`
- `student_planner_events.lifecycle_state`:
  `student_planner_events_lifecycle_state_chk`

Other important constraints include:

- `student_case_requests` unique `(case_id, student_id)`
- `case_routing_stages` unique `(case_id, sequence)`
- `case_progress_entries_has_content`
- `student_planner_events_source_pair_chk`
- `student_planner_events_source_kind_chk`
- `otp_codes_purpose_check` (`purpose = 'patient_status_lookup'`)
- `otp_codes_attempts_check` (`attempts >= 0`)
- `otp_codes_max_attempts_check` (`max_attempts > 0`)

## Case Lifecycle Source Of Truth

The database CHECK constraints above are the storage-layer source of truth for
which status values are legal. The application-layer source of truth for case
lifecycle rules — statuses, allowed transitions, actor permissions, and safe
messages — is `src/lib/cases/case-lifecycle.ts` (Phase 7). It mirrors these
constraints and must stay in sync with them; do not add a status in code without
a supporting migration here. See [CASE_LIFECYCLE.md](./CASE_LIFECYCLE.md).

## Indexes

Basic indexes cover the roadmap categories:

- status lookups
- student-owned rows
- patient/case links
- created-at ordering
- reviewer lookups
- assigned department filtering

Existing migrations create the first indexes for `student_case_requests`,
`case_progress_entries`, `student_planner_events` source links, and
`case_routing_stages`. Phase 2 adds missing additive indexes in
`20260707_phase2_database_foundation_constraints_indexes.sql`.

The `otp_codes` table (Phase 3) adds `idx_otp_codes_phone_created_at`
(`(phone, created_at DESC)`) for newest-code lookups and
`idx_otp_codes_expires_at` for expiry-based cleanup.

## RLS And Policies

RLS and policies are intentionally outside this Phase 2 foundation pass unless
an existing migration already manages them. Phase 2 must not change production
access behavior, APIs, auth, patient flow, student flow, admin flow, or UI.

Phase 3 Branch B moves public patient request submission to
`/api/v1/patient/requests`, where validation and insertion happen server-side
with the service role. The old browser insert policy is dropped, and `anon` and
`authenticated` lose direct `INSERT` privileges on `patient_requests`; browser
clients should not insert patient request rows directly.

Phase 3 Branch A adds `otp_codes` with RLS enabled and no anon or
authenticated policies. Only the service role, which bypasses RLS, can read or
write OTP rows; browser clients using the anon key have no access.

The legacy phone-only `get_request_status_by_phone(text)` RPC was created by
`20260416_lifecycle_statuses.sql` for the original patient status page. Phase 3
Branch A keeps the function for history/compatibility but revokes `EXECUTE`
from `anon`, `authenticated`, and `public` in
`20260708010000_revoke_phone_status_rpc.sql`. Browser status lookup must go
through the OTP-protected `/api/v1/patient/status/request-otp` and
`/api/v1/patient/status` endpoints.

Phase 4 adds service-role-only `audit_logs` and `consent_records`. Public
browser clients must not select, insert, update, or delete these records
directly. API routes should create consent records when consent is part of the
required workflow, and audit writes should avoid sensitive payload details and
must not expose internal failures to patients.

Phase 5 adds service-role-only `patient_files` for upload metadata. RLS is
enabled with no anon or authenticated policies; browser clients must not read or
write file metadata directly. The legacy `patient_uploads_insert` Storage policy
is dropped by a forward migration, and INSERT on `storage.objects` is revoked
from anon and authenticated. Browser uploads now use server-created signed upload
tokens only.

Phase 6 moves remaining sensitive profile, case workflow, student progress,
student case request, planner, and faculty/admin case-action mutations behind
DentBridge API/service routes. The forward migration
`20260709030000_phase6_sensitive_mutation_api_rls.sql` revokes or narrows the
replaced browser-role write paths:

- `student_profiles`: RLS enabled, own-row student SELECT retained, direct
  browser INSERT/UPDATE/DELETE revoked.
- `faculty_profiles`: faculty own INSERT/UPDATE policies dropped; profile
  completion uses the API. Existing faculty/admin SELECT policies and the
  existing admin update policy are retained.
- `patient_requests`: direct authenticated UPDATE policies for admin, faculty,
  and student lifecycle updates dropped; case workflow updates use API services.
- `student_case_requests`: direct student INSERT and admin/faculty UPDATE
  policies dropped; student request and faculty decision actions use API
  services.
- `case_progress_entries`: direct student INSERT policy dropped; progress
  creation uses API services.
- `case_routing_stages`: direct admin/faculty INSERT/UPDATE policies dropped;
  routing changes use API services.
- `student_planner_events`: RLS enabled, own-row student SELECT retained, direct
  browser INSERT/UPDATE/DELETE revoked.
- `storage.objects`: legacy direct browser SELECT policies for `patient-uploads`
  are dropped because signed URL minting now goes through the files service.

Service-role code bypasses RLS by design, so every Phase 6 service must enforce
session identity, role, row ownership, and workflow eligibility explicitly before
writing.

## Audit Logging Guidelines

Audit logs are an internal accountability record, not an analytics stream and
not a clinical detail store. Events should be append-only and suitable for
future export to a SIEM, queue, or compliance archive without changing the
application-facing event contract.

Each audited event should include:

- a stable `action` from the application audit constants;
- `category`, `severity`, `actor_type`, and `success`;
- `entity_type` and, when safe, `entity_id`;
- `request_id` and `correlation_id` for tracing multi-step workflows;
- `source_service`, `api_version`, `event_version`, and `metadata_schema`;
- only safe, flat metadata that has been curated by the caller.

Events that must always be audited once their server-side workflows exist:

- patient request creation;
- required consent capture;
- OTP challenge request for patient status lookup;
- OTP-protected patient status lookup success or failure;
- file upload prepare, confirmation/rejection, and signed URL creation;
- future admin, student, faculty, routing, upload-review, and permission
  decisions that affect patient data access or lifecycle state.

Audit metadata must never contain:

- OTP codes or OTP hashes;
- raw full phone numbers, passwords, secrets, authorization headers, tokens, or
  service-role keys;
- full complaint text, medical condition details, clinical notes, uploaded file
  contents, or attachment paths/names unless a future reviewed policy explicitly
  permits a safe reference;
- raw Supabase or provider errors intended only for server logs.

Operational recommendations:

- Keep audit inserts centralized in `src/lib/audit/audit.service.ts`.
- Prefer wrapper helpers over direct `createAuditLog` calls in route handlers.
- Treat audit insert failure as non-blocking unless a workflow explicitly
  requires it; consent record failure is different and should fail closed for
  patient intake.
- Use retention policies appropriate to jurisdiction and institutional
  requirements before production scale. Retention cleanup, SIEM export,
  monitoring alerts, queues, and dashboards are intentionally deferred and
  should integrate at the audit service boundary rather than changing callers.

## Consent Record Guidelines

Consent records are legal/accountability records tied to a patient request.
They should remain immutable-friendly: create new rows for new decisions or
future withdrawal/revocation events rather than overwriting the original
acceptance history.

For every consent row, capture:

- `consent_type`, `consent_version`, and when applicable `policy_version`;
- `consent_status`;
- language, source, jurisdiction, country code, and university key;
- document title and document fingerprint when a stable published document
  fingerprint is available;
- IP address and user agent from the server-side request context.

Future consent expansion should add new consent types, document fingerprints,
and withdrawal/revocation workflows with forward migrations. It must not expose
`consent_records` directly to browser roles.

## Fresh Replay Verification

To verify a fresh local database when Docker/Supabase local services are
available:

```bash
supabase db reset
npm run build
npx tsc --noEmit
npm run lint
```

Supabase local may print a notice that `seed.sql` does not exist. That is
expected for Phase 2: no seed file is required to validate the production
schema, migrations, constraints, indexes, or RLS policy definitions.

Future demo or sample seed data belongs in a later testing/developer-experience
task. It must not be folded into production migrations or used to make fresh
replay depend on non-production data.

If local Supabase cannot run, verify the chain statically by checking that:

- the baseline migration sorts before all alter-table migrations for its
  tables;
- every `ALTER TABLE` target exists in an earlier migration;
- no baseline constraint duplicates a later lifecycle constraint;
- forward migrations use guarded `IF NOT EXISTS` patterns where appropriate.
