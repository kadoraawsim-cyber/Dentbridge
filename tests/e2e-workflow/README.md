# DentBridge E2E Workflow Suite

This suite is intentionally opt-in and guarded. It creates synthetic patient workflow data and never deletes it automatically.

## Architecture

- Browser layer: `browser/single-case.spec.mjs` drives one real browser workflow with Playwright, including patient form submission, image upload, faculty login, student login, workflow actions, traces, screenshots, and video on failure.
- API layer: `run-api-workflows.mts` runs 2, 5, or 10 concurrent workflows through DentBridge public/authenticated routes. It uses app routes for all workflow mutations and authenticated Supabase/RPC reads for verification. Service-role access is used only for read-only verification of service-only tables (`patient_files`, `case_decision_history`) and for the separate cleanup tool.
- Cleanup layer: `cleanup.mts` is dry-run by default, requires an exact `RUN_ID`, lists every target record and storage object, and requires `--execute --confirm-run-id=<RUN_ID>` before deleting.

## Endpoints Used

- `POST /api/v1/files/prepare-upload`
- Signed storage upload URL returned by prepare-upload
- `POST /api/v1/files/:id/confirm`
- `POST /api/v1/patient/requests`
- `PATCH /api/admin/cases/:id` with `update_triage`, `approve`, `approve_student_request`, `mark_completed`
- `POST /api/student/cases/:id/request`
- `GET /api/student/planner`
- `PATCH /api/student/cases/:id/status` with `mark_contacted`, `mark_appointment_scheduled`, `mark_in_treatment`, `submit_stage_for_review`
- `POST /api/student/cases/:id/progress`

The suite never calls OTP, SMS, Twilio, or patient-status OTP routes.

## Account Distribution

- Cases 1, 3, 5, 7, 9: Student Account A
- Cases 2, 4, 6, 8, 10: Student Account B
- Triage/release alternates by case: Faculty A for odd cases, Faculty B for even cases
- Student-request approval alternates opposite triage: Faculty B for odd cases, Faculty A for even cases
- Final approval alternates by case: Faculty A for odd cases, Faculty B for even cases

## Local Environment

Create `tests/e2e-workflow/.env.local` from `.env.example` and fill only the four account credentials. Do not put credentials in commands.

The runner also needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` available from the root `.env.local` or process environment. The service-role key is required for full read-only verification and cleanup.

The app must be running locally with patient uploads enabled.

## Safe Local Commands

Static checks only:

```bash
npm run typecheck
npm run lint
npm test -- tests/e2e-workflow/e2e-workflow-helpers.test.ts
```

One browser workflow:

```bash
npx playwright test --config=tests/e2e-workflow/playwright.config.mjs
```

Two API workflows:

```bash
node --experimental-strip-types tests/e2e-workflow/run-api-workflows.mts --workflows=2 --concurrency=2
```

Five API workflows:

```bash
node --experimental-strip-types tests/e2e-workflow/run-api-workflows.mts --workflows=5 --concurrency=3
```

Ten API workflows:

```bash
node --experimental-strip-types tests/e2e-workflow/run-api-workflows.mts --workflows=10 --concurrency=10
```

Cleanup dry-run:

```bash
node --experimental-strip-types tests/e2e-workflow/cleanup.mts --run-id=<RUN_ID>
```

Cleanup destructive:

```bash
node --experimental-strip-types tests/e2e-workflow/cleanup.mts --run-id=<RUN_ID> --execute --confirm-run-id=<RUN_ID>
```

## Guarded Production Commands

Production runs are deliberately noisy and require `ALLOW_PRODUCTION_E2E=true`.

```bash
ALLOW_PRODUCTION_E2E=true E2E_BASE_URL=https://your-production-host.example node --experimental-strip-types tests/e2e-workflow/run-api-workflows.mts --workflows=2 --concurrency=2
```

```bash
ALLOW_PRODUCTION_E2E=true node --experimental-strip-types tests/e2e-workflow/cleanup.mts --run-id=<RUN_ID>
```

```bash
ALLOW_PRODUCTION_E2E=true node --experimental-strip-types tests/e2e-workflow/cleanup.mts --run-id=<RUN_ID> --execute --confirm-run-id=<RUN_ID>
```

## Expected Data Created

Each workflow creates one patient request, one sanitized patient file, consent records, one routing stage, one student case request, planner/progress records, decision history, and a final completed case. Each synthetic request includes the exact marker `RUN_ID=[<RUN_ID>]` in text fields. `RUN_ID` may contain only letters, numbers, and hyphens.

## Current Limitations

- The current patient request API has no email field. The suite does not invent one; it records a unique `@example.test` email marker in synthetic complaint text for traceability.
- `@playwright/test` is not installed in this repository. The browser spec is ready, but running it requires installing Playwright first.
- Full verification requires a service-role key for read-only access to `patient_files` and `case_decision_history`; workflow mutations still run through normal user-authenticated app routes.
