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
- Server-only secrets must never be imported into client components.
- Server-only secrets must never appear in README files, docs, public assets,
  screenshots, logs, or client bundles.
- Do not expose service-role access through browser code or public static
  files.

## Future OTP Secrets (Phase 3)

Phase 3 introduces secure OTP verification for patient status lookup. The
`otp_codes` table (`20260708000000_otp_codes.sql`) is the storage layer only and
requires no environment variables on its own.

Later Phase 3 commits will add server-only secrets that are not required yet and
are therefore not present in `.env.example`:

- A server-only secret for hashing OTP codes before they are stored (codes are
  never stored in plaintext).
- Server-only SMS provider credentials for delivering OTP codes.

When introduced, these must follow the same rules as `SUPABASE_SERVICE_ROLE_KEY`
and `OPENAI_API_KEY`: server-side only, never prefixed with `NEXT_PUBLIC_`, and
never exposed to browser code, docs, logs, or client bundles.

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
