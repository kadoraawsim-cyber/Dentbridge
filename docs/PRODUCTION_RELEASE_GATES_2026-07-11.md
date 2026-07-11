# DentBridge production release gates — 11 July 2026

## File retention and cleanup

- Prepared `pending` uploads expire after 30 minutes.
- Structurally validated, unlinked `quarantined` uploads expire after 24 hours.
- Rejected and explicitly orphaned rows are eligible when their `expires_at` is reached.
- Vercel invokes `/api/internal/files/cleanup` hourly with `CRON_SECRET`.
- Cleanup claims rows atomically with `FOR UPDATE SKIP LOCKED`; linked rows are never eligible.
- A storage failure returns the row to `orphaned` for retry after 15 minutes.
- A worker crash leaves `cleanup_claimed`; another worker may reclaim it after 15 minutes.
- Rollback must disable the cron before reverting application code. Deleted orphan bytes are not
  restored; linked clinical files are outside cleanup eligibility.

## Malware scanning — production blocker

DentBridge currently performs size, extension, MIME magic-byte, and SHA-256 structural validation.
That is not malware scanning. New valid JPG/JPEG, PNG, and PDF uploads remain `quarantined` with
`scan_state = pending`. Signed preview/download URLs require both `status = clean` and
`scan_state = clean`, so quarantined files fail closed.

Launch policy: patient uploads ship DISABLED. The server-only `PATIENT_UPLOADS_ENABLED` flag
(default `false`) gates the `prepare-upload` and `confirm` endpoints with a generic 503, and
`NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED` hides the upload form. Patient request submission is not
affected by either flag. See `docs/ENVIRONMENT.md`.

Production file access must remain gated until Waseem selects a scanner, completes privacy and
data-processing review, configures credentials, implements the `MalwareScanner` adapter, and
validates clean/infected/unavailable callbacks in Preview. Only then may both flags be set to
`true`. Do not send patient files to a third party before those approvals. Twilio Verify is
unrelated to file scanning.

## Required server-only configuration

- `APP_URL`
- `CRON_SECRET`
- `FILE_TICKET_SECRET`
- `INVITE_REDIRECT_URL`
- `OPENAI_API_KEY`
- `PATIENT_UPLOADS_ENABLED` (`false` at launch; see malware scanning gate)
- `RATE_LIMIT_HMAC_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_VERIFY_SERVICE_SID`

Public configuration:

- `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL`
- `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED` (`false` at launch; mirrors the server flag)
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SENTRY_DSN` when Sentry client reporting is enabled

Optional Sentry build/runtime configuration:

- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `ENABLE_MONITORING_TEST_ROUTE` (Preview only; disable after verification)

## Sentry privacy defaults

- `sendDefaultPii` is disabled.
- Session Replay is disabled, including error-triggered replay.
- Request data, users, breadcrumbs, extras, and contexts are removed before send.
- Free-text messages and exception values are replaced with generic text at the
  final transport boundary; tags and fingerprints are discarded.
- Patient form bodies must never be added as custom Sentry context.

## Runtime

Node 22 is pinned in `package.json`, `.nvmrc`, and CI. Vercel Preview and Production must both use
Node.js 22.x before deployment.
