# Environment Configuration

This document defines the DentBridge environment strategy for local,
preview, and production deployments.

It is documentation only. Updating this file must not change code,
environment values, authentication, API routes, patient flow, UI behavior, or
production behavior.

## Environment Strategy

DentBridge uses three environment classes:

- Local: developer machines running the app locally.
- Preview: Vercel deployments for non-main branches.
- Production: the live Vercel deployment from the `main` branch.

Local development should use `.env.local` with local or safe test values.
Preview deployments should use Vercel Preview environment variables. Production
must use Vercel Production environment variables and must not rely on values
from local files.

Production and Preview must be configured independently so staging or preview
work does not accidentally redirect users to production.

## Required Variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public/client-safe | Supabase project URL used by browser and server Supabase clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/client-safe | Supabase anonymous key used by browser and server Supabase clients. This is public by design and depends on correct RLS and server-side protections. |
| `OPENAI_API_KEY` | Server-only secret | OpenAI API key used by server-side API routes. Must never be exposed to browser code. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret | Supabase service role key for privileged server-side operations. Must never be exposed to browser code. |
| `NEXT_PUBLIC_SITE_URL` | Public/client-safe | Canonical public site URL for metadata, sitemap, robots, and browser-safe URL construction. |
| `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL` | Public/client-safe redirect configuration | Supabase password reset redirect URL used by the browser password reset request flow. |
| `APP_URL` | Server-side configuration | Canonical app URL for server/runtime redirects and URL construction. |
| `INVITE_REDIRECT_URL` | Server-side configuration | Supabase invitation redirect URL. |

`NEXT_PUBLIC_*` variables may be exposed to the browser. Do not put secrets in
any variable whose name starts with `NEXT_PUBLIC_`.

Client components should use `NEXT_PUBLIC_SITE_URL` for browser-safe URL
construction and `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL` for the browser
password reset redirect. Do not rely on server-side redirect variables in
browser code.

## Local Setup

Local development should use `.env.local`. Real `.env` files must never be
committed.

Use `.env.example` as the placeholder inventory for expected variable names.
The example file may be committed because it must contain placeholder values
only.

Local URL values should point to the local app or a safe test deployment. Do
not use production secrets for routine local development.

Supabase local may generate or display default local API keys and database
credentials. Treat those values as development-only:

- Do not expose local Supabase Studio, API, or database ports publicly.
- Do not use local default keys or local credentials in Production or Preview.
- Do not copy local service-role credentials into Vercel or any hosted
  environment.
- Rotate any hosted credential that is accidentally copied into local notes,
  logs, screenshots, or shared channels.

## Vercel Configuration

The linked Vercel project is `dentbridge`.

- Production branch: `main`.
- Preview deployments: non-main branches.
- Production environment variables must be configured in Vercel Production.
- Preview environment variables must be configured in Vercel Preview.
- The URL variables `NEXT_PUBLIC_SITE_URL`, `APP_URL`,
  `INVITE_REDIRECT_URL`, and `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL` must be
  configured for both Production and Preview.
- `VERCEL_URL` is an optional Vercel-provided runtime fallback. Do not set it
  manually in `.env.local` or in the Vercel dashboard.

Production URL values should point to the production DentBridge domain. Preview
URL values should point to the corresponding Preview deployment or approved
staging URL, not production, unless intentionally reviewed and approved.

Do not commit `.vercel` project metadata or use it as a source for secrets.
Vercel environment values must be reviewed in the Vercel dashboard without
copying secret values into the repository.

## Runtime URL Policy

Runtime site URLs and redirect URLs must come from environment variables.

Do not add hardcoded production URLs to runtime code for:

- metadata base URLs
- sitemap URLs
- robots sitemap URLs
- invitation redirects
- password reset redirects
- app-level canonical redirects

If a fallback is necessary, it should be safe for local or preview behavior and
must not silently send preview or staging users to production.

## Secrets Rules

- Real `.env` files must never be committed.
- `.env.example` may be committed with placeholder values only.
- `OPENAI_API_KEY` must be used server-side only.
- `SUPABASE_SERVICE_ROLE_KEY` must be used server-side only.
- Patient request API inserts, consent records, and audit logging depend on
  `SUPABASE_SERVICE_ROLE_KEY`; missing or incorrect values cause those
  server-side workflows to fail closed with generic public errors.
- Phase 6 profile completion, case workflow, student progress, student case
  request, planner, and admin/faculty mutation services also depend on
  `SUPABASE_SERVICE_ROLE_KEY` because direct browser write policies are revoked
  after the API replacements are deployed.
- Audit logging uses server-side request context such as IP, user agent,
  `x-request-id`, and `x-correlation-id` when present. These headers are not
  secrets, but they should be treated as operational trace data and should not
  contain patient details, tokens, or credentials.
- Server-only secrets must never be imported into client components.
- Server-only secrets must never appear in README files, docs, public assets,
  screenshots, logs, or client bundles.
- Do not expose service-role access through browser code or public static
  files.

## Patient Status Verification

Patient status codes are issued and verified exclusively by Twilio Verify. The
legacy `otp_codes` table may remain in the database during rollout, but the
application routes do not read from or write to it. DentBridge does not
generate, hash, store, compare, consume, or log verification codes.

Required server-only configuration:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_VERIFY_SERVICE_SID`

These variables must never be prefixed with `NEXT_PUBLIC_` or exposed to client
components, browser bundles, logs, screenshots, or public documentation. The
current release uses Twilio Verify SMS only; it does not require a purchased
Twilio phone number. WhatsApp is not enabled.

## File Upload Secrets (Phase 5)

Phase 5 introduces a server-mediated patient file upload flow. The flow signs a
short-lived HMAC ticket that binds a prepared file id so a caller cannot confirm
or attach a file id they did not prepare.

- `FILE_TICKET_SECRET` — server-only secret used to sign (HMAC-SHA256) patient
  file upload tickets. It must never be prefixed with `NEXT_PUBLIC_` and must
  never be exposed to browser code, docs, logs, or client bundles. A placeholder
  is present in `.env.example`.

Rules:

- It must be independent from all other server-side credentials and must not be
  shared or derived from one of them.
- It must be configured in both Preview and Production before the Phase 5
  server-mediated upload flow is enabled. Until then the prepare/confirm
  endpoints fail closed with generic errors.
- Rotating it invalidates any in-flight upload tickets, which is acceptable
  because tickets are short-lived. Rotate it independently of other secrets.

## Phase 6 API Mutation Boundary

Phase 6 does not introduce new environment variables.

It does require the existing `SUPABASE_SERVICE_ROLE_KEY` to be present in
Preview and Production before the Phase 6 RLS cleanup migration is applied.
After that migration, browser roles can no longer write directly to several
workflow tables, and the application depends on DentBridge API routes for those
mutations.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser code. The service role is
used only inside server-only services and route handlers after explicit
session, role, ownership, and workflow checks.

## Student Pilot Archive

The old `/student-pilot` form is inactive.

- `/student-pilot` now returns `410 Gone`.
- Archived files are kept in `archive/student-pilot/`.
- The historical Google Apps Script endpoint remains only inside the archived
  HTML file outside `public`.
- The old Google Apps Script endpoint is no longer publicly served by
  DentBridge.
- Future reactivation must be handled only through a safe, controlled task.
  Do not restore the archived static form to `public` or reconnect the Apps
  Script endpoint without an explicit review and implementation plan.

## Deployment Safety

Do not deploy to production without passing:

- `npm run build`
- `npx tsc --noEmit`
- `npm run lint`

Do not change production environment variables without review. Any production
environment change should record:

- variable names changed, without secret values
- environment affected: Production or Preview
- reason for change
- reviewer/approver
- rollback expectation

Do not combine risky environment changes with unrelated schema, auth, patient
flow, API, or UI changes.
