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
  - `20260415_lifecycle_statuses.sql`
  - `20260509_allow_faculty_review_status.sql`

### `student_profiles`

Student account profile data linked to invited/authenticated users.

- Baseline: `20260413_baseline_existing_core_tables.sql`
- Primary key: `id`
- Unique key: `email`

### `faculty_profiles`

Faculty account profile data linked to invited/authenticated users.

- Created by: `20260420_faculty_profiles.sql`
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
  `20260424_student_planner_case_links.sql`.
- `lifecycle_state` constraint is managed by
  `20260509_case_routing_stages_foundation.sql`.

### `case_progress_entries`

Append-only case progress notes for approved student-owned cases.

- Created by: `20260424_case_progress_entries.sql`
- Linked by `case_id`, `student_id`, and later `stage_id`
- Includes a content check constraint so empty progress entries are rejected.

### `case_routing_stages`

Sequential department routing stages for a patient case.

- Created by: `20260509_case_routing_stages_foundation.sql`
- Unique key: `(case_id, sequence)`
- Status constraint is added by
  `20260707_phase2_database_foundation_constraints_indexes.sql`.

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

## RLS And Policies

RLS and policies are intentionally outside this Phase 2 foundation pass unless
an existing migration already manages them. Phase 2 must not change production
access behavior, APIs, auth, patient flow, student flow, admin flow, or UI.

## Fresh Replay Verification

To verify a fresh local database when Docker/Supabase local services are
available:

```bash
supabase db reset
npm run build
npx tsc --noEmit
npm run lint
```

If local Supabase cannot run, verify the chain statically by checking that:

- the baseline migration sorts before all alter-table migrations for its
  tables;
- every `ALTER TABLE` target exists in an earlier migration;
- no baseline constraint duplicates a later lifecycle constraint;
- forward migrations use guarded `IF NOT EXISTS` patterns where appropriate.
