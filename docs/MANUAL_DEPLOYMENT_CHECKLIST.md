# Manual Deployment Checklist

This checklist covers manual work outside the codebase before running the
Phase 2-6 DentBridge changes in Preview or Production.

Do not treat this as a deployment script. It is an operator checklist for
Vercel, Supabase, SMS, QA, and rollback decisions.

## Critical Deployment Gate

Do not deploy Phase 3, Phase 4, Phase 5, or Phase 6 code to Production unless all of the following
are true:

- `SUPABASE_SERVICE_ROLE_KEY` is configured in the target Vercel environment.
- All four server-only `TWILIO_*` variables are configured in the target Vercel environment.
- `FILE_TICKET_SECRET` is configured in the target Vercel environment.
- Production migrations have been reviewed and are ready to run.
- The Twilio Verify service is enabled for SMS and has passed Preview delivery checks.
- The `patient-uploads` bucket is private, and the legacy anon/authenticated
  Storage INSERT path has been revoked by the Phase 5 migration.
- Phase 6 service-role API routes have been verified in Preview before the
  Phase 6 direct-write RLS cleanup migration is applied to Production.

If any item is uncertain, stop the deployment.

## 1. Vercel Manual Setup

Configure variables separately for Preview and Production. Do not copy local
Supabase keys into hosted environments.

Required Production environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FILE_TICKET_SECRET`
- `OPENAI_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_VERIFY_SERVICE_SID`
- `APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL`
- `INVITE_REDIRECT_URL`

Required Preview environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FILE_TICKET_SECRET`
- `OPENAI_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_VERIFY_SERVICE_SID`
- `APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL`
- `INVITE_REDIRECT_URL`

Variable notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It is required for patient request
  API inserts, OTP operations, consent records, audit logs, Phase 5 file
  services, and Phase 6 sensitive mutation services.
- All `TWILIO_*` variables are server-only. DentBridge authenticates with the
  API key SID and secret under the configured account and uses the configured
  Verify service for SMS challenges.
- `FILE_TICKET_SECRET` is server-only. Generate a strong random secret that is
  independent from all other server-side credentials. Rotating it invalidates
  only in-flight file upload tickets.
- `APP_URL` should match the canonical app origin for the environment.
- `NEXT_PUBLIC_SITE_URL` should match the public browser URL for the
  environment.
- Supabase public variables are public by design, but they must point to the
  correct Supabase project for the environment.
- `OPENAI_API_KEY` is server-only and must never be prefixed with
  `NEXT_PUBLIC_`.
- Invite and password reset URLs must point to the same environment being
  deployed. Preview should not silently redirect users to Production.
- `VERCEL_URL` is supplied by Vercel when available. Do not manually set it in
  the dashboard unless there is a reviewed reason.

Twilio Verify is the sole OTP provider for the current release. It uses SMS
only, does not require DentBridge to purchase a Twilio phone number, and does
not enable WhatsApp.

## 2. Supabase Manual Setup

Before migrations:

- Identify the exact Supabase project for the target environment.
- Confirm the target is Preview or Production. Do not run Production migrations
  against the wrong project.
- Take a database backup or confirm a recent restorable backup exists.
- Record the backup timestamp and restoration path.
- Verify storage backup expectations for `patient-uploads`.
- Confirm no manual dashboard policy changes are pending or undocumented.

Storage verification:

- Confirm the `patient-uploads` bucket exists.
- Confirm the bucket is private.
- Confirm existing objects remain readable only through intended server/admin
  paths or reviewed storage policies.
- Confirm browser uploads use only the Phase 5 signed-upload-token flow; open
  anon/authenticated Storage INSERT must remain revoked.

Running migrations:

- Review the migration list in chronological order.
- Run migrations using the approved Supabase workflow for the environment.
- Watch for errors, skipped objects, policy notices, and failed grants.
- Do not hand-edit old migrations.
- Do not fix Production by making untracked dashboard-only schema changes.

Post-migration verification:

- Confirm `otp_codes`, `audit_logs`, and `consent_records` exist.
- Confirm RLS is enabled on `otp_codes`, `audit_logs`, and `consent_records`.
- Confirm `anon` and `authenticated` do not have direct access to
  `audit_logs` or `consent_records`.
- Confirm `anon` and `authenticated` cannot directly insert into
  `patient_requests`.
- Confirm the legacy `get_request_status_by_phone(text)` RPC is not executable
  by `anon`, `authenticated`, or `public`.
- Confirm the `patient-uploads` bucket remains private.
- Confirm the Phase 6 migration has removed direct browser write policies that
  were replaced by APIs:
  - `student_can_insert_own_request`
  - `student_can_update_own_active_case_status`
  - `student_can_insert_own_case_progress_entries`
  - admin/faculty direct workflow update policies on `patient_requests`,
    `student_case_requests`, and `case_routing_stages`
  - faculty own direct profile insert/update policies
- Confirm RLS is enabled on `student_profiles` and `student_planner_events`.
- Confirm students can still SELECT only their own `student_profiles` and
  `student_planner_events` rows.
- Confirm browser roles cannot directly INSERT/UPDATE/DELETE:
  `student_profiles`, `student_case_requests`, `patient_requests`,
  `case_progress_entries`, `case_routing_stages`, or
  `student_planner_events`.
- Confirm direct browser Storage SELECT policies for `patient-uploads` are
  removed and signed URLs are still minted only through
  `/api/v1/files/[id]/signed-url`.

## 3. Twilio Verify Setup

Before enabling patient-status verification in Production:

- Complete Twilio account verification and billing setup.
- Create and configure the Verify service used by `TWILIO_VERIFY_SERVICE_SID`.
- Create a scoped API key and configure all four `TWILIO_*` variables in Vercel.
- Confirm whether Turkish telecom rules require approved sender names,
  opt-out text, registration, or message templates.
- Confirm delivery works to expected patient countries.
- Confirm SMS content does not include sensitive medical details.
- Confirm credentials exist only in Vercel server-side environment variables.
- Confirm application and provider logs do not expose verification codes.
- Do not purchase a Twilio phone number for this flow; Verify does not require one.
- Keep WhatsApp disabled until its sender and Meta business verification are complete.

## 4. GitHub/Vercel Preview Workflow

For Preview:

- Open or update a pull request from the feature branch.
- Confirm Vercel creates a Preview deployment for that PR branch.
- Confirm Preview uses Preview environment variables, not Production values.
- Confirm Preview Supabase points to a safe test/staging Supabase project unless
  explicitly reviewed.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` and all four `TWILIO_*` variables are
  configured for Preview before testing patient-status flows.
- Run manual QA on the Preview URL.
- Record QA results in the PR before approving Production deployment.

Before Production:

- Confirm the PR branch is reviewed.
- Confirm CI/build checks pass.
- Confirm manual QA passed in Preview.
- Confirm the migration and rollback plan are written down.
- Confirm no secret values are pasted into the PR, logs, screenshots, or docs.

## 5. Manual QA Checklist

Run this in Preview first. Repeat a smaller smoke test in Production after
deployment.

Patient request:

- Submit a valid patient request.
- Confirm the UI shows the normal success state.
- Confirm no raw Supabase or server error is shown to the patient.
- Confirm the row exists in `patient_requests`.
- Confirm direct browser insert into `patient_requests` is blocked.

File upload:

- Submit a request with an allowed file type.
- Confirm upload succeeds.
- Confirm the object is stored in `patient-uploads`.
- Confirm the bucket remains private.
- Confirm disallowed file types and oversized files are rejected by the UI.

Consent records:

- Confirm two `consent_records` rows are created for the submitted request.
- Confirm consent type, version, policy version, language, source, country, and
  university fields are populated as expected.
- Confirm browser roles cannot select or insert consent records directly.

Audit logs:

- Confirm `patient_request_created` is logged.
- Confirm `patient_status_otp_requested` is logged during OTP request.
- Confirm `patient_status_lookup` is logged during status lookup.
- Confirm audit metadata does not include complaint text, medical condition,
  file contents, OTP, OTP hash, secrets, tokens, or full phone numbers.
- Confirm browser roles cannot select or insert audit logs directly.
- Confirm Phase 6 workflow actions write audit rows where applicable:
  `profile_completed`, `invitation_sent`, `student_case_requested`,
  `student_progress_added`, `student_case_status_changed`,
  `admin_case_status_changed`, `student_case_approved`,
  `student_case_rejected`, and `case_returned_to_pool`.
- Confirm Phase 6 audit metadata does not include full names, phone numbers,
  complaint text, medical condition details, clinical notes, file paths,
  filenames, OTPs, secrets, tokens, or passwords.

Patient status OTP:

- Request an OTP for an existing request.
- Confirm the response does not reveal whether the phone exists.
- Confirm Twilio Verify SMS delivery works.
- Verify status with a valid OTP.
- Confirm invalid, expired, reused, and over-attempted OTP cases return generic
  errors.
- Confirm returned status payload does not include phone, full name, complaint
  text, medical condition, notes, attachments, clinical data, or internal IDs.

Admin login:

- Confirm admin login still works.
- Confirm admin request list loads.
- Confirm admin request detail loads.
- Confirm an admin/faculty test user can save draft triage, approve/reject a
  case, approve/reject a student request, return a case to the pool, and advance
  or close a case through the existing UI.
- Confirm those admin/faculty actions continue to work after direct browser
  write policies are removed.

Student login:

- Confirm student login still works.
- Confirm student dashboard loads.
- Confirm student case/request views still work.
- Confirm a newly invited test student completes profile setup through
  `/auth/set-password/student`.
- Confirm a newly invited test faculty user completes profile setup through
  `/auth/set-password/faculty`.
- Confirm direct browser upserts to `student_profiles` and `faculty_profiles`
  are blocked after the Phase 6 migration.
- Confirm a student can request a matched case through the UI and cannot insert
  directly into `student_case_requests` using the browser role.
- Confirm an approved student can mark contacted, schedule appointment, mark in
  treatment, add progress, reschedule, and submit for faculty review through the
  UI.
- Confirm direct browser writes to `patient_requests` and
  `case_progress_entries` are blocked for the student browser role.

Dashboard:

- Confirm main dashboard pages render without auth or data errors.
- Confirm no new public API errors appear in browser console for normal flows.

Observability:

- Confirm `GET /api/health` returns `status: ok`, an ISO timestamp,
  environment, version commit if available, and shallow app readiness only.
- Confirm API logs include stable `api.request.start` / `api.request.end`
  events with request/correlation IDs, route, status, and duration.
- Confirm operational logs do not include patient names, full phone numbers,
  OTPs, OTP hashes, passwords, tokens, signed URLs, upload tickets, complaint
  text, medical condition details, clinical notes, attachment paths, object
  paths, filenames, or raw request bodies.
- Confirm audit logging remains separate from operational logging; use audit
  rows for accountability and structured logs for debugging.

Planner:

- Confirm student planner loads.
- Confirm planner create/update/delete flows still work if they are in scope
  for the environment being tested.
- Confirm direct browser INSERT/UPDATE/DELETE to `student_planner_events` is
  blocked while own-row SELECT still works.

## 6. Production Deployment Sequence

1. Freeze risky changes.

   Avoid combining deployment with unrelated UI, auth, storage, or schema work.

2. Backup.

   Take or verify a restorable Production database backup. Verify storage backup
   expectations for `patient-uploads`.

3. Environment verification.

   Confirm every required Production variable exists in Vercel. Confirm no
   secret is accidentally configured as `NEXT_PUBLIC_*`.

4. Migration review.

   Review all pending migrations. Confirm the target Supabase project is
   Production. Confirm rollback expectations before running migrations.

5. Migrate database.

   Run Production migrations using the approved Supabase workflow. Stop if any
   migration fails.

6. Post-migration checks.

   Verify tables, RLS, revokes, policies, and storage privacy before deploying
   code that depends on them.

7. Deploy code.

   Deploy the reviewed commit through Vercel Production.

8. Smoke test.

   Run the Production smoke test:

   - patient request without file;
   - patient request with allowed file;
   - consent record creation;
   - audit log creation;
   - patient status OTP request and verify;
   - admin login;
   - student login;
   - dashboard;
   - planner.

9. Monitor manually.

   Review Vercel logs, Supabase logs, auth errors, API errors, and SMS delivery
   errors during the initial rollout window.

10. Rollback plan.

   If code fails but migrations are healthy, roll back the Vercel deployment.
   If migrations caused data or access issues, follow the documented database
   restore/forward-fix plan. Do not improvise destructive SQL in Production.
   For Phase 6, if the RLS cleanup migration blocks a verified workflow, prefer
   a reviewed forward migration that restores the minimum required policy while
   the API issue is fixed; do not disable RLS globally.

## 7. Explicit Production Warning

Do not deploy Phase 3/4/5/6 code to Production without:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_VERIFY_SERVICE_SID`
- `FILE_TICKET_SECRET`
- Production migrations applied or ready to apply in the correct order
- Twilio Verify service configured and SMS delivery verified
- Confirmed private `patient-uploads` bucket and revoked anon/authenticated
  Storage INSERT path
- Verified Phase 6 Preview QA for profile completion, admin/faculty case
  actions, student case requests, student progress/status, planner CRUD, direct
  mutation denial, and audit rows

These items are hard gates. Skipping any of them can break patient intake,
status lookup, consent logging, audit logging, clinical workflow mutations, or
privacy expectations.
