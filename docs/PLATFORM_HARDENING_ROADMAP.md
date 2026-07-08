# DentBridge Web Platform Hardening Roadmap

This roadmap is documentation only. Creating or updating this file does not
execute any phase and must not change production behavior.

## Core Direction

DentBridge is not being rebuilt as a mobile app right now.

The goal is to harden the existing web platform and turn it into a
professional, platform-grade system.

Core principles:

- No mobile app now.
- No full rebuild.
- Keep Next.js + Supabase.
- Improve DentBridge as a professional web platform.
- Prepare a clean API layer for a future mobile app.

## Database Portability And Data Residency Principle

DentBridge currently uses Supabase as the Data/Auth/Storage layer, but the
architecture must avoid unnecessary vendor lock-in. Sensitive workflows must go
through DentBridge API/service layers so that, if required in the future, the
database/storage/auth layer can be migrated to another PostgreSQL database,
Turkish hosting provider, Turkish data center, or institution-controlled
infrastructure without rebuilding the whole product.

This principle does not remove Supabase from the current roadmap. It means the
platform should clearly document what is Supabase-specific and keep business
workflow boundaries behind DentBridge-owned API and service layers wherever
practical.

Estimated realistic timeline:

- One strong developer: 8-12 weeks
- Two good developers: 5-8 weeks
- Small professional team: 4-6 weeks

## Initiative And Branch Strategy

`platform-hardening` is the overall roadmap/initiative name. It is not a
single giant implementation branch for all phases.

Actual implementation work should be done in small, separate branches with
clear scope and verification. Start with:

- `env-and-production-safety`

Do not create one giant `platform-hardening` implementation branch for all
phases.

## Iron Rules For The Whole Project

1. Do not add new features.
2. Do not start a mobile app.
3. Do not do a major redesign.
4. Do not do a full rebuild.
5. Do not remove Supabase.
6. Do not change production without staging or backup.
7. Every change must be done in a separate branch.
8. Every phase must end with verification that the site still works.
9. Security + API + audit come before large refactoring.
10. The goal is platform-grade quality, not more features.

## Module Path Convention

The implemented codebase organizes shared server/service code under `src/lib/**`
(for example `src/lib/audit/audit.service.ts`, `src/lib/cases/*.service.ts`,
`src/lib/files/files.service.ts`, `src/lib/planner/student-planner.service.ts`),
not `src/modules/**`.

Some phase sections below (notably Phase 4, 7, 8, 9, and 15) were written
referencing `src/modules/**` paths. Those paths are illustrative only. Follow the
existing `src/lib/**` convention when implementing later phases — for example, the
Phase 7 case lifecycle belongs at `src/lib/cases/case-lifecycle.ts`, not
`src/modules/cases/case-lifecycle.ts`. Do not create a parallel `src/modules`
tree.

## Correct Phase Order

Phase 0 - Preparation & Safety

Phase 1 - Environment, Secrets, Staging

Phase 2 - Database Foundation

Phase 3 - Patient Privacy, Secure OTP Status Verification & Intake API

Phase 4 - Audit Logs + Consent Records

Phase 5 - File Upload Security

Phase 6 - Move Sensitive Mutations to API

Phase 7 - Case Lifecycle State Machine

Phase 8 - Refactor Monster UI Files

Phase 9 - Type Safety

Phase 10 - Tests + CI

Phase 11 - Monitoring + Logging

Phase 12 - Performance + Scalability

Phase 13 - Documentation

Phase 14 - Future Mobile/API Readiness

Phase 15 - Push Notifications Foundation

## Items Previously Listed Under Phase 16 / New Tasks

These are not independent phases right now. They must be placed into the
correct phases above and must not be executed as a separate current phase.

### OTP Verification Layer

Place under Phase 3 and continue hardening under Phase 6 / Phase 12.

Includes:

- `otp_codes` table
- generate OTP
- hash OTP before storing
- expiry 5-10 minutes
- max attempts
- rate limiting
- SMS provider
- audit log
- generic errors

### New Tasks Placement

1. Split i18n translations by domain.
   Place under Phase 8 or Phase 12.
2. Create proper component folders.
   Place under Phase 8.
   Required folders:
   - `src/components/ui`
   - `src/components/admin`
   - `src/components/student`
   - `src/components/patient`
   - `src/components/forms`
3. Review `public/student-pilot/dentbridge-form.html`.
   Place under Phase 1.
   Decision required:
   - keep
   - migrate
   - archive
4. Add basic tests before large UI refactor.
   Place under Phase 10, but minimum test coverage must exist before Phase 8
   large refactoring.
5. Audit over-fetching of patient/student/admin data.
   Place under Phase 12.
6. Create reusable UI design system components.
   Place under Phase 8.
   Components:
   - Button
   - Input
   - Card
   - Modal
   - Badge
   - StatusBadge
   - Table
   - EmptyState
   - LoadingState
   - ErrorState
7. Add bundle/performance review for large translation files and client
   components.
   Place under Phase 12.

Do not do everything together. The order matters.

## Phase 0 - Preparation & Safety

### Goal

Before touching the code, make sure the live site cannot be broken
accidentally.

### Estimated Time

1-2 days

### Tasks

1. Treat `platform-hardening` as the overall initiative name, not one giant
   implementation branch.
2. Open small separate implementation branches for future work, starting with
   `env-and-production-safety`.
3. Create a database backup.
4. Create a Supabase Storage backup.
5. Confirm there is a rollback path if a deployment breaks.
6. Document all critical flows that must continue working:
   - Homepage
   - Patient request
   - Patient status
   - Student login
   - Student dashboard
   - Student case request
   - Admin login
   - Admin request detail
   - Faculty approval
   - Planner

### Do Not Do In This Phase

- Do not change schema.
- Do not change auth.
- Do not change patient flow.
- Do not start refactoring.

### Done

- Backup exists.
- Branch exists.
- Flow checklist exists.
- It is safe to start working.

## Phase 1 - Environment, Secrets, Staging

### Goal

Make the system safer regarding environments, keys, URLs, and production.

### Estimated Time

3-5 days

### Tasks

1. Create a clean `.env.example`.
2. Move hardcoded URLs to env:
   - `NEXT_PUBLIC_SITE_URL`
   - `APP_URL`
   - `INVITE_REDIRECT_URL`
   - `PASSWORD_RESET_REDIRECT_URL`
3. Check:
   - `next.config.ts`
   - `layout.tsx`
   - `sitemap.ts`
   - `robots.ts`
   - invitation routes
   - forgot-password page
   - student-pilot static HTML
4. Confirm:
   - `SUPABASE_SERVICE_ROLE_KEY` is server-side only.
   - `OPENAI_API_KEY` is server-side only.
   - No keys in client.
   - No keys in docs.
   - No keys in README.
5. Create `docs/ENVIRONMENT.md`.
6. Create staging deployment if it does not exist.
7. Review `public/student-pilot/dentbridge-form.html` and decide whether to
   keep, migrate, or archive it.

### Can Be Done Together

- `.env.example`
- hardcoded URLs
- `docs/ENVIRONMENT.md`
- secrets review
- student-pilot static HTML review

### Do Not Do Together

- Do not change patient request flow at the same time.
- Do not change migrations on the same day as a large env refactor.

### Done

- local/staging/production are clear.
- No hardcoded production URL exists in critical places.
- `.env.example` exists.
- `ENVIRONMENT.md` exists.
- staging does not accidentally redirect users to production.

## Phase 2 - Database Foundation

### Goal

Make the database professional, reproducible, typed, and ready for the next
phases.

### Estimated Time

5-10 days

### Tasks

1. Complete missing baseline migrations:
   - `patient_requests`
   - `student_profiles`
   - `student_planner_events`
2. Confirm that all important tables exist in migrations:
   - `patient_requests`
   - `student_profiles`
   - `faculty_profiles`
   - `student_case_requests`
   - `student_planner_events`
   - `case_progress_entries`
   - `case_routing_stages`
3. Add status constraints:
   - `patient_requests.status`
   - `student_case_requests.status`
   - `case_routing_stages.status`
   - `student_planner_events.lifecycle_state`
4. Check indexes:
   - status
   - student_id
   - patient_request_id
   - created_at
   - reviewed_by
   - assigned_department
5. Create `docs/DATABASE.md`.
6. Confirm that a new DB can be recreated from migrations.

### Can Be Done Together

- baseline migrations
- constraints
- indexes
- `DATABASE.md`

### Do Not Do Together

- Do not change patient API at the same time.
- Do not do a large UI change.
- Do not refactor dashboard during large schema changes.

### Done

- DB schema is reproducible.
- Full migrations exist.
- Constraints exist.
- Basic indexes exist.
- `DATABASE.md` exists.

## Phase 3 - Patient Privacy, Secure OTP Status Verification & Intake API

### Goal

Fix the two most important patient privacy risks:

1. Patient status currently relies on phone-only lookup.
2. Patient request is submitted directly from the browser to Supabase.

The new patient status verification model must use secure OTP verification
through phone/SMS.

Any older `request_code` wording is superseded by the secure phone/SMS OTP
model for patient status.

### Estimated Time

5-8 days

### Part A - Secure OTP Verification For Patient Status

Tasks:

1. Create an OTP verification layer for patient status lookup.
2. Add an `otp_codes` table.
3. Generate OTP server-side.
4. Hash OTP before storing it.
5. Set OTP expiry to 5-10 minutes.
6. Add maximum attempt limits.
7. Add rate limiting.
8. Connect an SMS provider.
9. Update the patient status page to use:
   - phone number
   - secure OTP verification
10. Replace phone-only status lookup with `POST /api/v1/patient/status`.
11. Return only minimum necessary information:
    - status
    - created_at
    - general message
    - assigned_department only if truly needed
12. Use generic public errors.
13. Add audit logging for `patient_status_lookup`.

### Part B - Patient Request Through API

Tasks:

1. Create `POST /api/v1/patient/requests`.
2. Move to the server:
   - validation
   - phone normalization
   - consent check
   - insert to `patient_requests`
3. In the patient/request page, replace direct Supabase insert with fetch to
   the API.
4. Return generic error messages to the patient.
5. After request submission, show the patient the correct next step for secure
   OTP-based status tracking.

### Can Be Done Together

- OTP layer
- patient status API
- patient request API
- server-side validation
- generic patient errors

### Do Not Do Together

- Do not do a full file upload refactor in the same phase.
- Do not do malware scanning in this phase.
- Do not break apart the entire `patient/request/page.tsx` before the API
  works.

### Done

- Patient cannot check status by phone only.
- Patient status requires secure OTP verification.
- Patient request goes through API.
- Server-side validation exists.
- Patient form still works.
- Public errors are generic.
- OTP lookup attempts are audited.

## Phase 4 - Audit Logs + Consent Records

### Goal

Make DentBridge auditable.

This is a critical phase.

### Estimated Time

5-10 days

### Tasks

1. Create `audit_logs`.

`audit_logs`:

- id
- actor_user_id
- actor_email
- actor_role
- action
- entity_type
- entity_id
- metadata_json
- ip_address
- user_agent
- created_at

2. Create audit service: `src/modules/audit/audit.service.ts`

or:

`src/lib/audit/audit.service.ts`

3. Start documenting central actions:

- `patient_request_created`
- `patient_status_lookup`
- `patient_request_viewed`
- `admin_case_status_changed`
- `student_case_requested`
- `student_case_approved`
- `student_case_rejected`
- `student_progress_added`
- `file_signed_url_created`
- `file_viewed`
- `invitation_sent`
- `role_changed`

4. Create `consent_records`.

`consent_records`:

- id
- patient_request_id
- consent_type
- consent_version
- policy_version
- language
- accepted_at
- ip_address
- user_agent
- source
- created_at

5. Connect `consent_records` to patient request API.

For every new patient request:

- create patient_request
- create consent_record
- create audit_log

### Can Be Done Together

- `audit_logs`
- audit service
- `consent_records`
- `patient_request_created` audit
- `patient_status_lookup` audit

### Do Not Do Together

- Do not connect audit to the entire site in one day.
- Do not change the whole admin dashboard in this phase.
- Do not try to make perfect audit coverage from day one.

### Done

- Real `audit_logs` exist.
- `consent_records` exist.
- patient request is recorded in audit.
- status lookup is recorded in audit.
- admin/student actions start being recorded.

## Phase 5 - File Upload Security

### Goal

Make file uploads more professional and secure.

### Estimated Time

7-14 days

### Correct Order

Do not start directly with malware scanning.

First, build a correct upload layer.

### Phase 5A - Private Bucket Policy Review

Tasks:

1. Check `patient-uploads` bucket:
   - public = false
   - who can upload
   - who can read
   - who can create signed URL
2. Check student access:
   Can a student view a file before approval?
   If yes, decide whether this is intended.

### Phase 5B - Server-side Upload Validation

Tasks:

1. Create API: `POST /api/v1/files/prepare-upload`.
2. The API checks:
   - file name
   - file size
   - declared MIME type
   - allowed extensions
   - user/session if relevant
   - context: patient_request / admin / student
3. The API returns signed upload path or upload permission.
4. Create file metadata record if needed.

### Phase 5C - MIME Validation

Tasks:

1. Do not rely only on extension.
2. Check:
   - image/jpeg
   - image/png
   - application/pdf
3. If possible, check file signature/magic bytes server-side or in a worker.

### Phase 5D - Signed URL Audit

Tasks:

1. Every `createSignedUrl` must go through a service.
2. Every time a signed URL is created, create audit log:
   `file_signed_url_created`.
3. Shorten expiry as needed:
   - preview: 60-300 seconds
   - admin download: as needed, not one hour unless necessary

### Phase 5E - File Access Audit

Tasks:

1. Document:
   - file uploaded
   - signed URL created
   - file viewed/downloaded if possible
   - actor
   - entity
   - IP/user agent

### Phase 5F - Malware Scanning

Tasks:

1. Create quarantine flow:
   - uploaded
   - pending_scan
   - clean
   - rejected
2. Do not display a file until it is clean.
3. Options:
   - ClamAV worker
   - scanning API
   - background job
   - storage trigger if available
4. If too complex, leave it as a later production-hardening step, but plan the
   statuses and structure now.

### Can Be Done Together

- bucket policy review
- student access review
- signed URL audit
- file access audit

### Do Not Do Together

- Do not do malware scanning before upload API exists.
- Do not do scanning on the same day as a large RLS change.
- Do not move uploads to a new flow without testing patient request
  end-to-end.

### Done

- private bucket checked.
- student file access is clear.
- server-side upload validation exists.
- MIME validation exists.
- signed URL creation is audited.
- file access is audited.
- malware scanning is planned or implemented.

## Phase 6 - Move Sensitive Mutations To API

### Goal

Turn Next.js API into DentBridge's central gateway.

### Estimated Time

10-20 days

### New Rule

Sensitive workflow mutation never happens directly from UI to Supabase.

### Move To API By Priority

Priority 1:

- patient request submission
- patient status lookup
- file upload/signing
- admin case status changes
- student case request
- student progress note

Priority 2:

- planner create/update/delete
- admin invitations
- student request approval/rejection
- case routing stages
- role/profile changes

Priority 3:

- exports
- bulk invites
- notifications
- clinical form submissions

### Recommended API Structure

- `/api/v1/patient/requests`
- `/api/v1/patient/status`
- `/api/v1/files/prepare-upload`
- `/api/v1/student/cases`
- `/api/v1/student/cases/:id/request`
- `/api/v1/student/cases/:id/progress`
- `/api/v1/student/planner`
- `/api/v1/admin/requests`
- `/api/v1/admin/requests/:id/decision`
- `/api/v1/admin/invitations`

### Every API Route Must Include

- auth/session check
- role check
- server-side validation
- rate limiting where needed
- audit log where needed
- generic public errors
- typed response

### Can Be Done Together

API route + validation + audit for the same workflow.

Example:

- student case request API
- validation
- audit
- generic errors

### Do Not Do Together

- Do not move the whole system to API in one day.
- Do not do large UI refactor before the API of that flow is stable.
- Do not change Admin dashboard and Student dashboard in one huge branch.

### Done

- All sensitive actions go through API.
- UI no longer holds business mutation logic.
- API is the central gateway.
- The system is future-mobile-ready.

## Phase 7 - Case Lifecycle State Machine

### Implementation Status

DONE. Implemented at `src/lib/cases/case-lifecycle.ts` (pure state machine) plus
the shared `src/lib/cases/case-stage-context.ts` helper. The admin/student case
services consult the module instead of local status/action maps and duplicated
stage-authorization logic. No new statuses, schema, RLS, API shapes, UI,
generated types, or test framework were introduced. See
[CASE_LIFECYCLE.md](./CASE_LIFECYCLE.md). Formal transition tests are deferred to
Phase 10.

### Goal

Centralize all case statuses in one place.

### Estimated Time

5-10 days

### Tasks

1. Create `src/lib/cases/case-lifecycle.ts`.
2. Define statuses:

- submitted
- under_review
- matched
- student_approved
- contacted
- appointment_scheduled
- in_treatment
- faculty_review
- completed
- rejected
- cancelled

3. Define transitions:

- submitted -> under_review
- under_review -> matched
- under_review -> rejected
- matched -> student_approved
- student_approved -> contacted
- contacted -> appointment_scheduled
- appointment_scheduled -> in_treatment
- in_treatment -> faculty_review
- faculty_review -> completed

4. Define permissions.

student can:

- request case
- add progress note
- update allowed student lifecycle steps

faculty/admin can:

- review
- match
- approve/reject
- move to faculty_review/completed

patient cannot:

- change clinical workflow status

5. Connect to API routes:

- `/api/admin/cases/[id]`
- `/api/student/cases/[id]/status`
- `/api/student/cases/[id]/progress`

### Can Be Done Together

- state machine
- tests for transitions
- API guard updates

### Do Not Do Together

- Do not change DB statuses, UI statuses, and API logic in three places without
  tests.
- Do not add a new status without migration + tests + docs.

### Done

- There is a source of truth for statuses.
- Illegal transitions are blocked.
- API uses the state machine.
- Tests exist.
- `docs/CASE_LIFECYCLE.md` exists.

## Phase 8 - Refactor Monster UI Files

### Goal

Move business logic out of huge UI files.

### Estimated Time

15-30 days

### Important Rule

Do not split everything at once.

Work flow by flow.

### Recommended Order

1. Patient Request Page

File:

`src/app/patient/request/page.tsx`

Extract:

- `src/modules/patient/patient-request.validation.ts`
- `src/modules/patient/patient-request.types.ts`
- `src/modules/patient/patient-request.client.ts`
- `src/modules/patient/patient-request.service.ts`

2. Patient Status Page

Extract:

- `patient-status.validation.ts`
- `patient-status.client.ts`
- `patient-status.types.ts`

3. Student Dashboard

File:

`student/dashboard-client.tsx`

Extract:

- `useStudentDashboard.ts`
- `StudentStatsCards.tsx`
- `ActiveCasesList.tsx`
- `StudentCaseActions.tsx`
- `student-dashboard.client.ts`
- `student-case.service.ts`

4. Student Planner

File:

`planner-client.tsx`

Extract:

- `planner.types.ts`
- `planner.validation.ts`
- `planner.client.ts`
- `planner-date.utils.ts`
- `PlannerCalendar.tsx`
- `PlannerEventForm.tsx`

5. Admin Request Detail

File:

`admin/requests/[id]/detail-client.tsx`

Extract:

- `AdminRequestHeader.tsx`
- `PatientSummaryCard.tsx`
- `RequestStatusPanel.tsx`
- `StudentRequestsPanel.tsx`
- `RoutingStagesPanel.tsx`
- `FilePreviewPanel.tsx`
- `CaseTimelinePanel.tsx`
- `admin-request.client.ts`
- `admin-case-actions.service.ts`

6. Admin Dashboard

Extract:

- `InviteStudentForm.tsx`
- `InviteFacultyForm.tsx`
- `BulkInvitePanel.tsx`
- `AdminStatsCards.tsx`
- `admin-invitations.client.ts`
- `bulk-invite.utils.ts`

### Additional Phase 8 Tasks

1. Split i18n translations by domain if appropriate here.
2. Create proper component folders:

- `src/components/ui`
- `src/components/admin`
- `src/components/student`
- `src/components/patient`
- `src/components/forms`

3. Create reusable UI design system components:

- Button
- Input
- Card
- Modal
- Badge
- StatusBadge
- Table
- EmptyState
- LoadingState
- ErrorState

### Can Be Done Together

- split UI components
- extract client API helpers
- extract validation

### Do Not Do Together

- Do not refactor UI before the API of that flow is stable.
- Do not split two monster files in the same branch.
- Do not change design during extraction.
- Do not change business behavior during refactor.

### Done

- No 2000+ line files.
- Business logic is out of UI.
- UI components are small and clear.
- Services/hooks are organized.
- Future mobile reuse is easier.

## Phase 9 - Type Safety

### Goal

Make the code typed and serious with Supabase.

### Estimated Time

3-7 days

### Tasks

1. Create `src/lib/database.types.ts`.
2. Update:
   - `src/lib/supabase.ts`
   - `src/lib/supabase-server.ts`
   - `src/lib/supabase-admin.ts`
3. Gradually replace `any`/ad-hoc types.
4. Create shared types:
   - `src/modules/cases/case.types.ts`
   - `src/modules/patient/patient.types.ts`
   - `src/modules/student/student.types.ts`
5. Confirm `npm run typecheck` passes.

### Can Be Done Together

- generated types
- typecheck script
- small type cleanup

### Do Not Do Together

- Do not type-migrate the whole project in one day.
- Do not change schema while replacing types.

### Done

- Supabase clients are typed.
- typecheck exists.
- Fewer `any` types.
- Less schema drift.

## Phase 10 - Tests + CI

### Goal

Prevent the system from breaking after every change.

### Estimated Time

7-14 days for a good start. One month or more for serious coverage.

### Tasks

1. Add test framework: Vitest.
2. Add scripts:
   - `npm run test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
3. First tests:
   - case lifecycle transitions
   - patient request validation
   - patient status requires secure OTP verification
   - student cannot perform invalid transition
   - faculty approval flow
   - generic error mapper
4. API tests:
   - `POST /api/v1/patient/requests`
   - `POST /api/v1/patient/status`
   - `POST /api/v1/student/cases/:id/request`
   - `POST /api/v1/student/cases/:id/progress`
   - `PATCH /api/v1/admin/requests/:id/decision`
5. RLS/security tests:
   - student cannot see patient identity before approval
   - student cannot access another student's case
   - anon cannot read `patient_requests`
   - faculty/admin access is role-gated
6. CI:

GitHub Actions:

- install
- typecheck
- lint
- test
- build

Minimum test coverage must exist before Phase 8 large refactoring.

### Can Be Done Together

- state machine + tests
- validation + tests
- CI + scripts

### Do Not Do Together

- Do not add CI before build passes reliably.
- Do not try 80% coverage on day one.
- Do not do a large refactor without basic tests.

### Done

- Test framework exists.
- Important tests exist.
- CI exists.
- PR does not pass if build/typecheck/tests fail.

## Phase 11 - Monitoring + Logging

### Goal

Know when the site breaks, where, and why.

### Estimated Time

3-7 days

### Tasks

1. Add Sentry or equivalent.
2. Define redaction.

Do not send:

- patient name
- phone
- clinical text
- uploaded file data
- sensitive request details

3. Add structured logging to API routes.
4. Add correlation/request ID.
5. Create `docs/MONITORING.md`.
6. Add uptime monitoring:
   - homepage
   - patient request
   - admin login
   - student login
   - API health endpoint

### Can Be Done Together

- Sentry
- `MONITORING.md`
- generic error handling
- structured logs

### Do Not Do Together

- Do not enable broad logging before confirming there is no PHI in logs.
- Do not send full payloads to Sentry.

### Done

- Error monitoring exists.
- Uptime checks exist.
- Logging policy exists.
- No medical information is sent to external logs.

## Phase 12 - Performance + Scalability

### Goal

Make the system faster and ready for more users.

### Estimated Time

7-14 days for a start. Ongoing after that.

### Tasks

1. Fix k6 load tests.

Codex found incorrect endpoints.

Update:

- student dashboard
- student cases
- patient request
- patient status
- admin requests
- planner

2. Run load tests on staging.

Do not run them on production.

Scenarios:

- 100 users
- 500 users
- 1000 users
- login spike
- patient request burst
- student dashboard repeated load
- admin queue load
- file upload simulation

3. DB indexes.

Confirm indexes based on real queries.

4. Pagination.

Especially:

- admin requests
- student case pool
- case history
- planner events

5. Caching.

Use carefully.

- cache public/non-sensitive data
- do not cache sensitive patient data without a reason

6. Rate limiting.

Add Redis/Upstash/Vercel KV or similar.

Endpoints:

- patient request
- patient status
- chat
- check-email
- admin invitations
- student case request
- file upload
- progress note
- planner writes

7. Audit over-fetching of patient/student/admin data.
8. Add bundle/performance review for large translation files and client
   components.
9. Split i18n translations by domain if more appropriate here than Phase 8.
10. Continue OTP hardening from Phase 3 where scalability/rate-limiting work
    belongs.

### Can Be Done Together

- k6 fixes
- indexes
- pagination
- rate limiting

### Do Not Do Together

- Do not cache before understanding permission model.
- Do not run load tests on production with mutations.
- Do not claim 6000 users before testing.

### Done

- load tests work.
- rate limiting exists.
- queries are faster.
- pagination exists.
- real metrics exist.

## Phase 13 - Documentation

### Goal

A senior developer should open the repo and see a professional system.

### Estimated Time

3-7 days

### Create Docs

- `docs/ARCHITECTURE.md`
- `docs/ENVIRONMENT.md`
- `docs/DATABASE.md`
- `docs/SECURITY.md`
- `docs/RBAC.md`
- `docs/CASE_LIFECYCLE.md`
- `docs/API.md`
- `docs/MONITORING.md`
- `docs/DEPLOYMENT.md`
- `docs/TESTING.md`
- `docs/FILE_UPLOADS.md`
- `docs/AUDIT_LOGGING.md`
- `docs/MOBILE_READINESS.md`
- `docs/INTEGRATIONS_READINESS.md`

### `ARCHITECTURE.md` Should Include

- Next.js web
- Next.js API gateway
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- RLS
- Service layer
- Audit logs
- Monitoring
- Future mobile app connects to API only
- Database portability assumptions
- Which parts are Supabase-specific
- Which parts are abstracted behind DentBridge API/service layers
- Data residency considerations for future Turkish hosting, Turkish data
  centers, or institution-controlled infrastructure

### Additional Documentation Requirements

- Document database portability assumptions.
- Document which parts are Supabase-specific.
- Document which parts are abstracted behind DentBridge API/service layers.
- Document that future mobile and integrations must use DentBridge API only,
  not direct Supabase access.

### Done

- Serious docs exist.
- A new developer can understand the system.
- There is an explanation of why the system is built this way.

## Phase 14 - Future Mobile/API Readiness

### Goal

Do not build a mobile app, but prepare the website for it.

### Estimated Time

5-10 days

### Tasks

1. Create API contract: `docs/API.md` or OpenAPI spec.
2. Confirm that every mobile-needed flow has an endpoint:
   - login/session
   - student dashboard
   - case pool
   - student requests
   - planner
   - patient request
   - patient status
   - file upload
   - notifications
3. Confirm that future mobile does not need direct Supabase client access.
4. Create `docs/MOBILE_READINESS.md`.
5. Define: Mobile app will use DentBridge API only.
6. Document database portability assumptions.
7. Document which parts are Supabase-specific.
8. Document which parts are abstracted behind DentBridge API/service layers.
9. Document that future mobile and integrations must use DentBridge API only,
   not direct Supabase access.

### Do Not Do

- Do not build a mobile app.
- Do not choose App Store flow now.
- Do not work on mobile design now.

### Done

- System is conceptually and technically ready for a future app.
- API is clear.
- Business logic is not trapped in UI.
- Future mobile and integrations use DentBridge API only, not direct Supabase
  access.
- Database portability and data residency assumptions are documented.

## Phase 15 - Push Notifications Foundation

### Goal

Prepare a notification system without building a mobile app now.

### Estimated Time

5-10 days

### Tasks

1. Create notifications table:

- id
- user_id
- channel
- type
- title
- body_safe
- status
- created_at
- sent_at
- metadata_json

2. Create notification service:
   `src/modules/notifications/notification.service.ts`
3. Start with in-app notifications/web notifications.
4. Do not send medical information in notifications.
5. Prepare future structure:
   - push_token table
   - user_devices table
   - notification preferences
6. Future:
   - FCM/APNs/mobile push

### Can Be Done Together

- notifications table
- notification service
- audit logs for notification events

### Do Not Do Together

- Do not add FCM before there is a mobile app.
- Do not send clinical details in notifications.
- Do not build a complex notification queue before there is a need.

### Done

- Notification foundation exists.
- Future push notifications can be connected.
- No dependency on a mobile app now.

## Final Dependency Order

1. Backup + branch + staging safety
2. Env/secrets/hardcoded URLs
3. Baseline migrations + DB constraints
4. Secure OTP verification for patient status
5. Patient request API
6. Audit logs
7. Consent records
8. File upload validation + signed URL audit
9. Move sensitive mutations to API
10. Case lifecycle state machine
11. Generated Supabase types
12. Split monster UI files
13. Tests
14. CI
15. Monitoring/logging
16. Rate limiting
17. Performance/load tests
18. Documentation
19. Mobile readiness docs/API contract
20. Notification foundation

## What Must Not Be Done Together In The Same Branch

1. Do not change DB schema + split a huge UI file in the same branch.
2. Do not move patient request to API + change upload flow + change status
   lookup in one large branch.
   Better:
   - one branch for status OTP
   - one branch for patient request API
   - one branch for upload
3. Do not create state machine + change all statuses across the site without
   tests.
4. Do not add Sentry/logging before defining redaction.
5. Do not do malware scanning before upload validation and file metadata exist.
6. Do not do performance caching before permission/RLS review.
7. Do not refactor admin detail and student dashboard together.
8. Do not add push notifications before notification table/service.
9. Do not start mobile before all sensitive API endpoints are ready.
10. Do not change production env during a large schema change.

## What Can Be Done Together

1. Env cleanup + `.env.example` + `ENVIRONMENT.md`
2. Baseline migrations + `DATABASE.md`
3. Secure OTP patient status API + audit for status lookup
4. Patient request API + consent record + audit `patient_request_created`
5. File policy review + signed URL audit
6. State machine + lifecycle tests
7. Generated types + typecheck script
8. Tests + CI
9. Sentry + generic error handling + `MONITORING.md`
10. API docs + `MOBILE_READINESS.md`

## Milestones

### Milestone 1 - Safe Foundation

- env clean
- staging safe
- secrets safe
- DB reproducible

### Milestone 2 - Patient Privacy Fixed

- status requires secure OTP verification
- patient request goes through API
- generic errors
- consent record
- audit log

### Milestone 3 - Clinical Accountability

- audit logs
- file access audit
- admin/student actions audited
- case lifecycle controlled

### Milestone 4 - Platform Architecture

- API-based
- service layer
- monster files reduced
- business logic outside UI

### Milestone 5 - Engineering Quality

- generated types
- tests
- CI
- monitoring
- documentation

### Milestone 6 - Scale & Future Ready

- rate limiting
- load tests
- performance improvements
- notification foundation
- mobile API readiness
- integration readiness

## Definition Of Done - DentBridge Is High-Level Ready When

1. There are no sensitive browser-to-database mutations.
2. Patient status does not work by phone only.
3. Patient status requires secure phone/SMS OTP verification.
4. Patient request goes through API.
5. Real `audit_logs` exist.
6. `consent_records` exist.
7. File uploads go through server-side validation.
8. Signed URLs are recorded in audit.
9. Student file access is checked and defined.
10. Private bucket policies are documented.
11. Generated Supabase types exist.
12. Full baseline migrations exist.
13. Case lifecycle state machine exists.
14. Admin/student mutations go through API.
15. Huge UI files are gradually split.
16. Important tests exist.
17. CI exists.
18. Sentry/monitoring exists.
19. Rate limiting exists.
20. Updated load tests exist.
21. Professional docs exist.
22. API contract exists.
23. The site works clearly in staging and production.
24. Admin/Faculty remain web-based.
25. The system is ready for a future mobile app through a clean API.

## First Three Branches

These are small implementation branches under the overall `platform-hardening`
initiative. Do not put all phases into one giant implementation branch.

### Branch 1 - `env-and-production-safety`

Tasks:

- `.env.example`
- hardcoded URLs to env
- `ENVIRONMENT.md`
- secrets review

### Branch 2 - `patient-status-secure-otp`

Tasks:

- `otp_codes` table
- server-side OTP generation
- hash OTP before storing
- OTP expiry 5-10 minutes
- max attempts
- rate limiting
- SMS provider integration
- `POST /api/v1/patient/status`
- generic errors
- audit `patient_status_lookup`

### Branch 3 - `patient-request-api`

Tasks:

- `POST /api/v1/patient/requests`
- server-side validation
- phone normalization
- insert via server
- generic errors
- consent record preparation
- audit preparation

After these three branches, DentBridge becomes much stronger against real
privacy and platform risks.

## Summary Statement

Do not build a mobile app now.

Build DentBridge as a platform.

The website remains the main product.

Next.js becomes the API Gateway.

Supabase remains the Data/Auth/Storage layer.

Every sensitive workflow goes through API.

Every sensitive action is audited.

Every critical part of the code becomes typed, tested, and documented.

Only after that should a mobile app be considered.
