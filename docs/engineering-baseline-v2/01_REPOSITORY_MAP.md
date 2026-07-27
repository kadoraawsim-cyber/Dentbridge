# 01 — Repository Map

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** authoritative map of the repository structure, entry points, and feature ownership.
- **Status:** Baseline (v2). **Scope:** full tree at `main` / `ab36262`. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / NOT VERIFIED / RECOMMENDATION.

## Top level (VERIFIED)

| Path | Purpose |
|---|---|
| `package.json` | Node 22.x; Next 16.2.10, React 19.2.6, `@supabase/ssr`+`supabase-js`, `openai` 6, `twilio` 6, `@sentry/nextjs` 10, `sharp` 0.34.5, `lucide-react`. Scripts: `dev/build/start/lint/typecheck/test/test:coverage`. `overrides` pin `postcss` and `ws`. |
| `next.config.ts` | Security headers + CSP (per-path), host redirect `dentbridge.com → APP_URL`, wrapped in `withSentryConfig`. |
| `vercel.json` | One cron: `/api/internal/files/cleanup` hourly (`17 * * * *`). |
| `vitest.config.ts` | Node env; coverage include `src/app/api/**`, `src/lib/**`; excludes `*.tsx`, i18n, `database.types.ts`. |
| `.env.example` | 23 documented env keys (see `09`). `.env.local` holds only 3 (Supabase url/anon, OpenAI). |
| `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`, `.nvmrc` (22) | Tooling. |
| `README.md` | Accurate short platform description (VERIFIED current). |
| `CURRENT_PROJECT_STATUS.md`, `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md` | Root status docs; `PROJECT_STATUS.md` self-labels **LEGACY/SUPERSEDED**. |
| `supabase/` | 45 migrations + `.temp/linked-project.json` (linked project). |
| `docs/` | 13 topic docs + release reports + roadmap + the earlier `engineering-baseline/` (untouched). |
| `tests/` | 44 `*.test.ts` (vitest) + `e2e-workflow/` harness. |
| `load-tests/` | k6-style scripts (`public-site.js`, `student-portal.js`) + safety util. |
| `.github/`, `.vercel/`, `.claude/`, `archive/`, `release-evidence/`, `coverage/` | CI dir, Vercel link, agent config, archived material, release evidence, generated coverage. |
| `public/manifest.json` | PWA manifest. |

## `src/app` — App Router surfaces (VERIFIED)

- **Public/marketing:** `page.tsx`, `about`, `faq`, `privacy`, `personal-data-protection-law` (KVKK, 966 lines), `terms`, `patients`, `students`, `student-pilot`.
- **Patient flow:** `patient/request`, `patient/status`.
- **Auth:** `login`, `admin/login`, `student/login`, `forgot-password`, `change-password`, and an `auth/*` cluster (callback, confirm, recover, reset/set/update-password, faculty/student set-password).
- **Student portal:** `student/dashboard`, `student/cases`, `student/requests`, `student/exchange`, `student/planner`, `student/clinical-tools/{bmi-calculator,local-anesthesia-calculator}`.
- **Admin/faculty portal:** `admin` (dashboard), `admin/requests`, `admin/requests/[id]`.
- **API:** see `05_API_INVENTORY.md` (22 route handlers under `src/app/api`).

## `src/lib` — domain and platform services (VERIFIED, the real backend)

| Area | Files | Role |
|---|---|---|
| `cases/` | `case-lifecycle.ts`, `case-stage-context.ts`, `admin-case-actions.service.ts`, `student-case-*.service.ts`, `student-progress.service.ts`, `pending-requests.ts` | Case state machine + student/faculty case operations (thin wrappers over atomic RPCs). |
| `files/` | `files.service.ts` (831), `image-sanitizer.ts`, `magic-bytes.ts`, `malware-scanner.ts`, `orphan-cleanup.service.ts`, `ticket.ts`, `file.constants.ts` | Upload security pipeline. |
| `chat/` | `patient-intent-router.ts`, `patient-site-context.ts` | Bridgey safety + grounding context. |
| `audit/` | `audit.service.ts` (823) | Append audit log. |
| `otp/` | `twilio-verify.ts` | Phone verification. |
| `patient-request/`, `patient-status/` | `intake.service.ts`, `submission-flow.ts`, `phone.ts` | Patient intake + status. |
| `planner/` | `student-planner.service.ts` (162 LOC of coverage surface) | Student planner. |
| `profiles/`, `consent/`, `legal/`, `roles.ts`, `auth-invitations.ts`, `case-timeline.ts` | Profile completion, consent constants, legal registry, role guards, invitations. |
| `api/` | `durable-rate-limit.ts`, `rate-limit.ts`, `errors.ts`, `same-origin.ts`, `portal-fetch.ts`, `service-types.ts` | API cross-cutting concerns. |
| `observability/` | `logger.ts`, `error-monitor.ts`, `request-context.ts`, `sentry-privacy.ts`, `sentry-provider.ts` | Structured logging + Sentry + PII scrubbing. |
| `env/` | `public.ts`, `server.ts` | Validated env access. |
| `supabase*.ts` | `supabase.ts`, `supabase-server.ts`, `supabase-admin.ts` | Browser / SSR / service-role clients. |
| `i18n/` | `index.tsx`, `translations/en.ts` (3,134), `translations/tr.ts` (1,679) | Bilingual copy. |
| `database.types.ts` (1,162) | Generated Supabase types. |

## `src/components` (VERIFIED)

Organized by portal: `admin/dashboard/*`, `admin/case-detail/*`, `student/dashboard/*`, `student/cases/*`, `student/planner/*`, `patient/request/*`, plus shared/public (`PublicPatientChatWidget.tsx` 852, `InstallBanner.tsx`, `LanguageSwitcher.tsx`, `PublicFooter.tsx`). Portal client pages (`*-client.tsx`) hold most interactivity.

## Instrumentation & Sentry (VERIFIED)

`src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/sentry.server.config.ts`, `src/sentry.edge.config.ts` + `src/lib/observability/sentry-*`.

## Entry points — read these first (RECOMMENDATION)

1. `src/app/api/v1/patient/requests/route.ts` + `src/lib/patient-request/intake.service.ts` (intake).
2. `src/lib/cases/case-lifecycle.ts` + `supabase/migrations/*_release_atomic_*.sql` (the state machine).
3. `src/lib/files/files.service.ts` + `src/lib/files/image-sanitizer.ts` (upload security).
4. `src/app/api/chat/patient/route.ts` + `src/lib/chat/patient-intent-router.ts` (Bridgey + safety).
5. `src/lib/roles.ts`, `src/lib/supabase-server.ts`, `src/lib/supabase-admin.ts` (authz boundary).

## Feature ownership (INFERENCE)

No `CODEOWNERS` file exists. Git history shows many short-lived feature/release branches merged into `main` by a single author (`git branch -a`, `git log`), consistent with a solo/small-team project. Directory structure is the de facto ownership boundary.
