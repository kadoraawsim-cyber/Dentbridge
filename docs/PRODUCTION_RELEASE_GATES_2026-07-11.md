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

## Patient image uploads — scannerless temporary policy

DentBridge now uses a temporary scannerless image policy for patient uploads. This is not malware
scanning and must never be described as malware-clean. The accepted production state is
`sanitized_unscanned`.

The active architecture is: private quarantined original upload -> strict server-side Sharp/libvips
decode and JPEG re-encode -> sanitized derivative -> delete the original after durable derivative
metadata -> serve only the derivative through short-lived signed URLs.

Authoritative server policy is `PATIENT_UPLOAD_POLICY`:

- `disabled`: all upload prepare/confirm requests fail closed.
- `sanitized_images`: JPEG/PNG are accepted for sanitizer processing; derivatives are viewable as
  `sanitized_unscanned`.
- `malware_scanned`: reserved for a future real scanner integration.

The public `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED` flag only hides or shows the upload UI. Patient
request submission is not affected when no image is selected. Do not send patient files to a third
party before privacy/data-processing approval.

## Required server-only configuration

- `APP_URL`
- `CRON_SECRET`
- `FILE_TICKET_SECRET`
- `INVITE_REDIRECT_URL`
- `OPENAI_API_KEY`
- `PATIENT_UPLOAD_POLICY` (`disabled`, `sanitized_images`, or `malware_scanned`)
- `RATE_LIMIT_HMAC_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_VERIFY_SERVICE_SID`

Public configuration:

- `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL`
- `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED` (UI mirror; `true` only when the server policy is enabled)
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
