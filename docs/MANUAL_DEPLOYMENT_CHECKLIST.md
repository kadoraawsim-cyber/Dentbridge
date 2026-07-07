# Manual Deployment Checklist

This checklist covers manual work outside the codebase before running the
Phase 2-5 DentBridge changes in Preview or Production.

Do not treat this as a deployment script. It is an operator checklist for
Vercel, Supabase, SMS, QA, and rollback decisions.

## Critical Deployment Gate

Do not deploy Phase 3, Phase 4, or Phase 5 code to Production unless all of the following
are true:

- `SUPABASE_SERVICE_ROLE_KEY` is configured in the target Vercel environment.
- `OTP_HASH_SECRET` is configured in the target Vercel environment.
- `FILE_TICKET_SECRET` is configured in the target Vercel environment.
- Production migrations have been reviewed and are ready to run.
- A real SMS provider is configured, or the patient status page is intentionally
  gated off until real OTP delivery is ready.
- The `patient-uploads` bucket is private, and the legacy anon/authenticated
  Storage INSERT path has been revoked by the Phase 5 migration.

If any item is uncertain, stop the deployment.

## 1. Vercel Manual Setup

Configure variables separately for Preview and Production. Do not copy local
Supabase keys into hosted environments.

Required Production environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OTP_HASH_SECRET`
- `FILE_TICKET_SECRET`
- `OPENAI_API_KEY`
- `APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL`
- `INVITE_REDIRECT_URL`

Required Preview environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OTP_HASH_SECRET`
- `FILE_TICKET_SECRET`
- `OPENAI_API_KEY`
- `APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL`
- `INVITE_REDIRECT_URL`

Variable notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It is required for patient request
  API inserts, OTP operations, consent records, and audit logs.
- `OTP_HASH_SECRET` is server-only. Generate a strong random secret and keep it
  stable for the environment. Rotating it invalidates verification for existing
  unconsumed OTP rows.
- `FILE_TICKET_SECRET` is server-only. Generate a strong random secret that is
  distinct from `OTP_HASH_SECRET`. Rotating it invalidates only in-flight file
  upload tickets.
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

Future SMS variables, not required for the local mock but required before real
OTP use:

- SMS provider account SID or API key.
- SMS provider auth token or API secret.
- Sender phone number or approved sender ID.
- Provider region or messaging service ID if required.
- Optional webhook signing secret if inbound delivery callbacks are later used.

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
- Confirm direct browser upload is still an accepted temporary risk until the
  later upload-security phase.

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

## 3. SMS Provider Setup

Local development can use the mock SMS sender. Real OTP use requires a real SMS
provider before public launch.

Provider options to evaluate:

- Twilio.
- MessageBird.
- Vonage.
- Local Turkish SMS provider with approved sender support.
- Supabase-compatible Edge Function or server-side API integration later, if
  chosen deliberately.

Before enabling real OTP in Production:

- Choose the provider.
- Complete account verification and billing setup.
- Configure sender number or sender ID.
- Confirm whether Turkish telecom rules require approved sender names,
  opt-out text, registration, or message templates.
- Confirm delivery works to expected patient countries.
- Confirm SMS content does not include sensitive medical details.
- Store provider credentials only in Vercel server-side environment variables.
- Confirm logs at the SMS provider do not expose OTPs longer than necessary.

SMS environment variables needed later:

- Provider account ID or API key.
- Provider secret or auth token.
- Sender phone number or sender ID.
- Optional messaging service ID.
- Optional webhook signing secret.
- Optional provider region or country routing setting.

## 4. GitHub/Vercel Preview Workflow

For Preview:

- Open or update a pull request from the feature branch.
- Confirm Vercel creates a Preview deployment for that PR branch.
- Confirm Preview uses Preview environment variables, not Production values.
- Confirm Preview Supabase points to a safe test/staging Supabase project unless
  explicitly reviewed.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` and `OTP_HASH_SECRET` are configured for
  Preview before testing Phase 3/4 flows.
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

Patient status OTP:

- Request an OTP for an existing request.
- Confirm the response does not reveal whether the phone exists.
- Confirm OTP delivery works if a real SMS provider is configured.
- Verify status with a valid OTP.
- Confirm invalid, expired, reused, and over-attempted OTP cases return generic
  errors.
- Confirm returned status payload does not include phone, full name, complaint
  text, medical condition, notes, attachments, clinical data, or internal IDs.

Admin login:

- Confirm admin login still works.
- Confirm admin request list loads.
- Confirm admin request detail loads.

Student login:

- Confirm student login still works.
- Confirm student dashboard loads.
- Confirm student case/request views still work.

Dashboard:

- Confirm main dashboard pages render without auth or data errors.
- Confirm no new public API errors appear in browser console for normal flows.

Planner:

- Confirm student planner loads.
- Confirm planner create/update/delete flows still work if they are in scope
  for the environment being tested.

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

## 7. Explicit Production Warning

Do not deploy Phase 3/4/5 code to Production without:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OTP_HASH_SECRET`
- `FILE_TICKET_SECRET`
- Production migrations applied or ready to apply in the correct order
- SMS provider configured, or the status page intentionally gated off
- Confirmed private `patient-uploads` bucket and revoked anon/authenticated
  Storage INSERT path

These items are hard gates. Skipping any of them can break patient intake,
status lookup, consent logging, audit logging, or privacy expectations.
