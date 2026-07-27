# 09 — Security, Privacy, and Data Flow

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** secrets, authn/authz, RLS, storage, privacy, data flow, and vulnerabilities.
- **Status:** Baseline (v2). **Scope:** whole repo + first-hand `npm audit`. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / NOT VERIFIED / RECOMMENDATION. **No secret values are reproduced — key names only.**

## Secrets & environment (VERIFIED — names only)

23 keys documented in `.env.example`. Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_VERIFY_SERVICE_SID`, `SENTRY_AUTH_TOKEN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `FILE_TICKET_SECRET`, `RATE_LIMIT_HMAC_SECRET`, `CRON_SECRET`, `APP_URL`, `INVITE_REDIRECT_URL`, `PATIENT_UPLOAD_POLICY`, `ENABLE_MONITORING_TEST_ROUTE`. Client-visible (`NEXT_PUBLIC_*`): Supabase URL/anon key, Sentry DSN, site URL, uploads-enabled flag, password-reset redirect URL. Env access is centralized/validated (`src/lib/env/server.ts`, `src/lib/env/public.ts`; `tests/environment-validation.test.ts`). `.gitignore` excludes `.env*` (VERIFIED). `.env.local` contains only 3 dev keys (no committed secrets found).

## Authentication (VERIFIED)

Supabase Auth via `@supabase/ssr`. Browser client (`src/lib/supabase.ts`), SSR client (`src/lib/supabase-server.ts` → `createServerClient` with cookie store), service-role client (`src/lib/supabase-admin.ts`, server-only). Password flows (`auth/set-password`, `reset`, `recover`, `update`, `forgot`) and invitation-driven onboarding (`src/lib/auth-invitations.ts`). Cross-portal role-mismatch and expired-session handling are explicitly hardened and tested (`git log` d7daf4e, bd23a2b; `tests/proxy-auth.test.ts`, `session-*`).

## Authorization (VERIFIED — defense in depth)

1. **Route layer:** `auth.getUser()` + role guard (`src/lib/roles.ts`: `isAdminRole`, `isStudentRole`, `canAccessFacultyPortal`).
2. **Database layer (authoritative):** 17 RLS-enabled tables, 36 policies, 25 `SECURITY DEFINER` RPCs that re-check `auth.jwt() -> 'app_metadata' ->> 'role'` and lock rows. Progressive lockdown migrations revoked anon/broad access (`20260417000000_patient_access_lockdown`, `20260708020000_revoke_anon_patient_request_insert`, `20260418010000_remove_broad_patient_upload_reads`, `20260709030000_phase6_sensitive_mutation_api_rls`).
3. **Function permissions** were explicitly reconciled (`20260711035000_release_function_permissions`, `…035100_release_authenticated_function_permissions`).

## Web application security (VERIFIED — strong)

`next.config.ts` sets a full header suite on every path: `Content-Security-Policy` (scoped `connect-src` allowlist for Supabase, Sentry, Vercel; `frame-ancestors 'none'`; `object-src 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera/mic/geo/etc. disabled), and HSTS in production HTTPS. Same-origin enforcement (`src/lib/api/same-origin.ts`) and durable rate limiting protect mutation endpoints. This is a materially stronger baseline than a default Next app.

## File-upload security (VERIFIED — a highlight)

Private-quarantine → magic-byte validation (`magic-bytes.ts`) → Sharp/libvips **re-encode** sanitization (`image-sanitizer.ts`, `20260712010000_scannerless_image_sanitization.sql`) → link → short-lived signed URLs (fail-closed) → hourly cron cleanup with atomic claims. Upload is policy-gated (`PATIENT_UPLOAD_POLICY`). Tests: `file-upload-security`, `file-quarantine`, `file-signed-url-fail-closed`, `image-sanitizer`, `patient-storage-privacy`.

## Privacy / PHI handling (VERIFIED)

This platform **does** handle patient-identifiable data (name, phone, complaint, images) — unlike PerioFlow. Mitigations found: OTP-gated status access; Sentry PII scrubbing (`src/lib/observability/sentry-privacy.ts`, tested); consent records + audit logs as hardened tables; KVKK/GDPR-oriented legal pages (`personal-data-protection-law`, `privacy`, `terms`) and consent constants (`src/lib/consent/consent.constants.ts`). Bridgey is explicitly forbidden from accessing patient records. **NOT VERIFIED:** formal data-retention/erasure automation beyond file cleanup.

## Vulnerabilities (VERIFIED — first-hand `npm audit`, 2026-07-27)

**5 high-severity advisories** against the currently pinned dependency tree:

| Advisory | Package | Relevance |
|---|---|---|
| GHSA-r28c-9q8g-f849 | `postcss` (path traversal, source-map disclosure) | Build/tooling; `overrides` pins `postcss ^8.5.16` but audit still flags the tree |
| CVE-2026-33327 / 33328 / 35590 / 35591 (GHSA-f88m-g3jw-g9cj) | `sharp` <0.35.0 (libvips) | **Highest concern — `sharp` decodes untrusted patient-uploaded images** |

**Contradiction with committed docs (VERIFIED):** `docs/PRODUCTION_RELEASE_REPORT_2026-07-12.md` records `npm audit` = **0 vulnerabilities** (down from 11). That was true at release time but is **now stale**; these 5 highs are newer advisories. `sharp` upgrade to ≥0.35.0 is a breaking change (`npm audit fix --force`), so it needs deliberate handling. This is the top security action item (`13`, `14`).

## Findings summary

| # | Finding | Severity | Label |
|---|---|---|---|
| 1 | 5 high `npm audit` advisories (sharp/libvips on the image path; postcss) | High | VERIFIED |
| 2 | AI safety classifier `patient-intent-router.ts` at 0% test coverage | Medium-High | VERIFIED |
| 3 | Strong RLS + atomic RPC authz boundary | Positive | VERIFIED |
| 4 | Full CSP/security-header suite + PII scrubbing | Positive | VERIFIED |
| 5 | Robust file-sanitization pipeline | Positive | VERIFIED |
| 6 | Name inconsistency ("DentiBridge") + stale founder wording in public copy | Low | VERIFIED |
| 7 | Data-retention/erasure automation | — | NOT VERIFIED |
