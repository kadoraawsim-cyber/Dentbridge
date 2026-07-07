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

### `faculty_profiles`

Faculty account profile data linked to invited/authenticated users.

- Created by: `20260420010000_faculty_profiles.sql`
- Primary key: `id`
- Unique key: `email`

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
- Access model: service-role/server only.
- RLS is enabled and no `anon` or `authenticated` direct access is granted.
- Audit metadata must contain only caller-curated safe fields. Do not log OTP
  codes, OTP hashes, raw secrets, full complaint text, medical details,
  attachment contents, or unnecessary patient identifiers.
- Phase 4 audit coverage includes patient request creation. OTP-related audit
  events must not include OTP codes, OTP hashes, or raw phone numbers.

### `consent_records`

Immutable consent acceptance records tied to patient intake submissions.

- Created by: `20260708030000_phase4_audit_logs_consent_records.sql`
- Linked to `patient_requests(id)` with `ON DELETE CASCADE`.
- Current consent types are `kvkk_acknowledgement` and `explicit_consent`.
- Current source is constrained to `patient_request`.
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
