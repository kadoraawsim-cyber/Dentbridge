# DentBridge — Project Context

Version: 2.1
Last Updated: 2026-07-14 (verified against the repository at commit `6efbec8`
on `main`; reconciled with the operator's account of the July 13 release
workflow — facts confirmed operationally but not provable from the repository
are labeled as such)

This document has two parts:

- **Part I — Product Vision & Principles**: the standing product, security, and
  engineering philosophy of DentBridge. These are intent, not code claims.
- **Part II — Verified Codebase Reference**: concrete facts verified directly
  from the repository. Anything that could not be verified from the repository
  is explicitly marked **Unknown / Needs confirmation**.

For the live snapshot of branch, CI, test, migration, and deployment state, see
[CURRENT_PROJECT_STATUS.md](./CURRENT_PROJECT_STATUS.md).

---

# Part I — Product Vision & Principles

## Executive Summary

DentBridge is a production-grade software platform for dental schools,
university dental hospitals, and supervised clinical education. It connects
patients, students, faculty members, and administrators through one secure
digital workflow.

It is not an EHR, not a private-practice management system, and not an LMS. It
sits between education and clinical operations: it supports supervised dental
education while improving patient experience and institutional efficiency.

Every architectural decision prioritizes: patient safety, data integrity,
security, reliability, maintainability, scalability, and long-term
sustainability.

## Mission

Replace the fragmented workflows of traditional dental schools (paper forms,
WhatsApp groups, Excel files, manual patient assignment, unstructured
follow-up) with one secure integrated platform that improves patient
experience, student education, faculty efficiency, administrative workflow,
institutional visibility, and treatment documentation.

DentBridge is an educational platform first. Every feature must support
supervised clinical education.

## Vision

Become the operating platform for academic dentistry: patient intake,
screening, clinical assignment, treatment planning, supervision,
documentation, follow-up, quality assurance, and institutional analytics —
eventually across multiple universities and countries. (The current
implementation is single-institution; see Part II, "Known Architectural
Constraints".)

## Product Philosophy (permanent principles)

1. **Patient safety first.** Educational convenience never overrides clinical
   safety.
2. **Faculty supervision.** Students never work independently. The platform
   assists clinical education; it never replaces faculty judgment.
3. **Simplicity.** Users should never need technical knowledge; every
   unnecessary click is friction.
4. **Security by default.** Assume sensitive patient data, legal
   responsibility, institutional compliance, and future regulation. Fail
   closed.
5. **Maintainability.** Small improvements over large rewrites. Readable code
   over clever code.
6. **Scalability.** New features must not require architectural redesign to
   support future multi-institution expansion.
7. **Long-term thinking.** Avoid quick fixes that create technical debt;
   document intentional debt.

## Golden Rule

Whenever uncertainty exists: protect the patient, protect the data, protect
the institution, protect long-term maintainability. Never sacrifice these for
speed or convenience.

## Core Security Principles

- **Least privilege** — every role gets only the minimum permissions required.
- **Zero trust** — never trust browser input, hidden fields, client-side
  validation, URLs, or uploaded files. Every request is verified on the
  server.
- **Defense in depth** — authentication, authorization, RLS, server-side
  validation, database constraints, secure storage, audit logging, rate
  limiting, and input validation are independent layers; no single layer is
  sufficient.
- **Secure defaults** — when uncertain, choose the safest behavior; the
  platform fails securely (this is implemented: rate limiter, uploads, OTP,
  and readiness all fail closed — see Part II).
- **Server-side trust only** — frontend authorization alone is never
  acceptable.
- Errors must never expose secrets, stack traces, database structure, or
  internal configuration. Users receive safe generic messages; diagnostics go
  to monitoring.
- Secrets belong only in environment variables, never in Git, docs, logs,
  screenshots, or client bundles.

## Engineering Discipline

- Small, isolated, well-described commits; the Git history is documentation.
- Understand existing code before modifying it; search for existing
  components, hooks, utilities, and database functions before building new
  ones.
- Database migrations are permanent history: never modify applied migrations;
  create new forward migrations.
- Every significant deployment needs a rollback strategy.
- Testing verifies functionality, security, permissions, workflows, and
  regressions. Passing tests increase confidence; they do not guarantee
  correctness.
- Every dependency increases maintenance cost; prefer existing platform
  capabilities.
- Preferred workflow: understand → inspect existing implementation → design →
  review security implications → implement → test → review → deploy → monitor.

## Rules for AI Assistants

AI assistants are collaborators, not owners of the architecture. Final
decisions belong to the project owner.

Always:

- understand existing code before modifying it
- preserve architecture, security, and production stability
- prefer existing project patterns; avoid unnecessary dependencies
- explain important decisions, tradeoffs, and risks
- identify affected modules, users, permissions, and database tables before
  changing code

Never:

- invent architecture, database tables, API endpoints, workflows, completed
  features, production behavior, testing results, deployment status, or
  security guarantees — if information is unavailable, say so explicitly
- bypass authentication, weaken authorization, or disable RLS
- expose secrets
- rewrite working code without justification
- claim tests passed unless they were actually executed

If uncertainty exists: stop, state the uncertainty, and request information
rather than guessing.

Project-specific rules (derived from this codebase — see Part II for details):

- The database CHECK constraints are the storage-layer source of truth for
  statuses; `src/lib/cases/case-lifecycle.ts` is the application-layer source
  of truth. Never add a status in code without a supporting migration, and
  vice versa.
- The service role bypasses RLS by design, so every service-role code path
  must enforce session identity, role, row ownership, and workflow
  eligibility explicitly before writing.
- Regenerate `src/lib/database.types.ts` (`supabase gen types typescript
  --local`) with every schema migration and commit them together.
- Never log or put in audit metadata: OTP codes, tokens, secrets, full phone
  numbers, patient names, complaint text, medical details, clinical notes, or
  attachment paths/filenames.
- Public-facing responses must stay generic; existence non-disclosure is a
  release gate (no enumeration oracles).
- Patient upload derivatives are `sanitized_unscanned` — never describe or
  code them as malware-clean.

## AI Product Principle

AI inside DentBridge assists — it never independently diagnoses patients,
never replaces licensed clinicians, and never removes faculty supervision.
Clinical responsibility always belongs to licensed professionals.

---

# Part II — Verified Codebase Reference

Everything below was verified directly from the repository on 2026-07-14.
Statements about external systems (production Vercel/Supabase/Twilio state)
are marked **Needs confirmation** because they cannot be verified from the
repository alone; a small number of release facts confirmed by the release
operator are labeled **operationally verified during the July 13 release**
(see §23).

## 1. Repository Overview

- Package name: `dental-match` (product name: **DentBridge**), version `0.1.0`,
  private.
- Git remote: `https://github.com/kadoraawsim-cyber/Dentbridge.git`.
- Default branch: `main`.
- Linked Vercel project: `dentbridge` (per `docs/ENVIRONMENT.md`); production
  deploys from `main`, previews from non-main branches.
- Production domain: `README.md` references `https://dentbridgetr.com`;
  `next.config.ts` permanently redirects the host `dentbridge.com` to
  `APP_URL`. The actual live domain configuration is **Needs confirmation**
  (Vercel dashboard).
- Single app — no monorepo, no workspaces. Path alias `@/*` → `src/*`.
- Node.js **22.x** pinned in `package.json` `engines`, `.nvmrc` (`22`), and CI.

## 2. Technology Stack (exact versions from package.json / lockfile)

Dependencies:

| Package | Version |
| --- | --- |
| `next` | 16.2.10 (App Router) |
| `react` / `react-dom` | 19.2.6 |
| `typescript` | ^5 |
| `tailwindcss` / `@tailwindcss/postcss` | ^4 |
| `@supabase/supabase-js` | ^2.103.0 |
| `@supabase/ssr` | ^0.10.2 |
| `@sentry/nextjs` | ^10.42.0 (lockfile: 10.65.0) |
| `openai` | ^6.34.0 |
| `twilio` | ^6.0.2 |
| `sharp` | 0.34.5 (pinned — image sanitizer) |
| `lucide-react` | ^1.8.0 |
| `@vercel/analytics` | ^2.0.1 |
| `@vercel/speed-insights` | ^2.0.0 |
| `server-only` | ^0.0.1 |

Dev dependencies: `vitest` ^4.1.10 + `@vitest/coverage-v8`, `eslint` ^9 +
`eslint-config-next` 16.2.10.

`overrides` in package.json: `postcss: ^8.5.16` (security fix — deviates from
Next's own pin; revisit on the next Next upgrade) and `ws: 8.21.0`.

Notable absences: no ORM (Supabase client only), no server actions (`"use
server"` appears nowhere in `src/`; all mutations are route handlers), no
component library beyond Tailwind + lucide icons, no dedicated email service
(Supabase Auth sends invitation/reset emails).

## 3. Directory Structure

```
src/
  app/                    App Router pages + route handlers (see routes below)
  components/             UI components (admin/, patient/, shared/, student/, public widgets)
  lib/
    api/                  errors, same-origin CSRF check, in-memory + durable rate limits, service types
    audit/                audit.service.ts — audit log constants and wrappers
    cases/                case-lifecycle.ts (state machine), stage context, 4 case services
    chat/                 patient chat intent router + site context
    consent/              consent constants (KVKK/explicit consent evidence)
    data/                 data-load helpers
    env/                  public.ts / server.ts — validated environment access
    files/                files.service, image-sanitizer, magic-bytes, malware-scanner seam,
                          orphan-cleanup.service, HMAC upload tickets, constants
    i18n/                 in-repo EN/TR translation layer
    legal/                legal document registry (versions + sha256 fingerprints)
    observability/        logger, request-context, error-monitor seam, sentry-privacy/provider
    otp/                  twilio-verify.ts (send/check verification)
    patient-request/      intake.service, submission-flow
    patient-status/       phone normalization
    planner/              student-planner.service
    profiles/             profile-completion.service
    auth-invitations.ts, case-timeline.ts, roles.ts,
    supabase.ts (browser), supabase-server.ts (cookie session), supabase-admin.ts (service role),
    database.types.ts (generated)
  proxy.ts                Route protection (Next 16 proxy — the middleware layer)
  instrumentation.ts      Env validation + Sentry provider registration at startup
supabase/migrations/      45 forward-only SQL migrations (20260413000000 → 20260712010000)
tests/                    40 Vitest files + tests/e2e-workflow/ (opt-in guarded E2E suite)
load-tests/               k6 scripts (public-site.js, student-portal.js, mutation safety guard)
release-evidence/         load-tests/public-site-100vu-2026-07-13.json
docs/                     DATABASE, ENVIRONMENT, FILE_UPLOADS, CASE_LIFECYCLE, TESTING, TYPES,
                          OBSERVABILITY, MANUAL_DEPLOYMENT_CHECKLIST, PLATFORM_HARDENING_ROADMAP,
                          PHASE_0_SAFETY, PRODUCTION_RELEASE_GATES_2026-07-11,
                          PRODUCTION_RELEASE_REPORT_2026-07-12,
                          PATIENT_IMAGE_SANITIZATION_PREVIEW_CHECKLIST
archive/student-pilot/    Archived legacy static pilot form (not served)
.github/workflows/ci.yml  Single CI workflow
vercel.json               Cron definition only
```

## 4. Application Architecture

- **Layers:** Next.js App Router UI → route handlers (`src/app/api`) → server-only
  services (`src/lib/**/*.service.ts`) → Supabase (Postgres + Auth + Storage).
- **Three Supabase client tiers**, all typed against `Database` from
  `src/lib/database.types.ts`:
  - `src/lib/supabase.ts` — browser client (anon key): auth session flows,
    browser-role reads permitted by RLS, and the signed-upload transport.
  - `src/lib/supabase-server.ts` — server client with cookie session: server
    component reads and route authentication.
  - `src/lib/supabase-admin.ts` — service-role client (`server-only`): all
    sensitive mutations, inside services that enforce authorization
    explicitly because the service role bypasses RLS.
- **Route protection** is in `src/proxy.ts` (Next.js proxy/middleware). It
  calls `supabase.auth.getUser()` (live JWT validation, not `getSession()`)
  and enforces:
  - `/admin/*` → role `admin` or `faculty`
  - `/student/*` → role `student`
  - pass-throughs: `/admin/login`, `/student/login`, `/auth/*`
  - wrong-role access redirects to the user's own portal.
- **No server actions.** Every mutation is an explicit route handler with:
  same-origin check (`src/lib/api/same-origin.ts`), content-type enforcement,
  rate limiting (in-memory pre-filter + durable Postgres
  `consume_rate_limit`), session/role/ownership checks, and generic error
  mapping (`src/lib/api/errors.ts`).
- **Security headers** (CSP, `X-Frame-Options: DENY`, nosniff,
  Referrer-Policy, Permissions-Policy, HSTS in production HTTPS) are set
  globally in `next.config.ts`. Sentry is wrapped via `withSentryConfig`.
- **i18n:** in-repo EN/TR layer (`src/lib/i18n`), language switcher, TR error
  bodies honored via `accept-language`.

## 5. Route Map

### Public routes (no account required)

`/` (landing), `/about`, `/faq`, `/privacy`, `/terms`,
`/personal-data-protection-law` (KVKK clarification text), `/patients`,
`/students` (public info pages), `/patient/request` (intake form),
`/patient/status` (OTP-protected status lookup), `/forgot-password`,
`/login` (redirects to `/`), `/robots.txt`, `/sitemap.xml`.
`/student-pilot` returns **410 Gone** (legacy pilot form archived under
`archive/student-pilot/`).

### Patient "portal"

Patients have **no accounts**. The patient experience is:

1. `/patient/request` — anonymous intake form (client validation, session-
   storage draft, optional single image via the signed-upload flow when
   enabled) submitting to `POST /api/v1/patient/requests`.
2. `/patient/status` — request an SMS code, then view the latest request
   status (treatment/status/date/days/department only) via the OTP-protected
   status API.
3. The public patient chat widget (OpenAI-backed) is mounted globally.

### Auth routes

`/auth/callback` (Supabase invite/confirmation landing), `/auth/confirm`,
`/auth/forgot-password`, `/auth/recover`, `/auth/reset-password`,
`/auth/set-password` (+ `/student`, `/faculty` variants),
`/auth/update-password`, `/change-password`.

### Faculty/Admin portal — `/admin/*` (roles `faculty` and `admin`)

There is **no separate faculty URL space**; faculty and admin share the same
portal, gated by `canAccessFacultyPortal()` in `src/lib/roles.ts`.

- `/admin/login` — sign-in.
- `/admin` — dashboard: stats, urgent queue, recent requests, invitation
  actions (single + bulk invite panels; invitation APIs are **admin-only**).
- `/admin/requests` — triage queue and active cases.
- `/admin/requests/[id]` — case file: patient summary, triage panel,
  lifecycle panel, treatment journey, student requests panel, activity log,
  review record.

### Student portal — `/student/*` (role `student`)

- `/student/login`, `/student/dashboard` (pool stats, active/completed cases,
  workspace), `/student/cases` (matched pool cases open for requests),
  `/student/requests` (own requests + outcomes), `/student/planner` (private
  planner with case/appointment links), `/student/exchange` (**coming-soon
  placeholder**), `/student/clinical-tools/bmi-calculator`,
  `/student/clinical-tools/local-anesthesia-calculator`.

## 6. API Routes (all route handlers; no server actions)

### Public v1 API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/v1/patient/requests` | POST | Atomic patient intake via `submit_patient_request_atomic` RPC (request + 2 consent records + audit + optional file link in one transaction; idempotent per `submissionId`) |
| `/api/v1/patient/status/request-otp` | POST | Send Twilio Verify SMS code (generic response regardless of phone existence) |
| `/api/v1/patient/status` | POST | Verify code with Twilio, return non-sensitive status card |
| `/api/v1/files/prepare-upload` | POST | Create `patient_files` row + signed upload token + HMAC ticket (policy-gated) |
| `/api/v1/files/[id]/confirm` | POST | Structural validation (size, extension/MIME allowlist, magic bytes, checksum) + sanitization pipeline |
| `/api/v1/files/[id]/signed-url` | GET/POST | Short-lived signed URL minting, role- and current-stage-authorized, audited, fail-closed on quarantine |

### Faculty/Admin API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/admin/cases/[id]` | PATCH | All faculty/admin case actions (see state machine §9): `save_draft`, `update_triage`, `approve`, `reject`, `return_to_pool`, `approve_student_request`, `reject_student_request`, `undo_reject_student_request`, `release_next_stage`, `mark_contacted`, `mark_appointment_scheduled`, `mark_in_treatment`, `mark_completed`, `mark_cancelled` |
| `/api/admin/invitations` | POST | Alias re-exporting the students invitation handler |
| `/api/admin/invitations/students` | POST | Invite student(s) via Supabase Auth admin API — **`admin` role only** (403 for faculty) |
| `/api/admin/invitations/faculty` | POST | Invite faculty — **`admin` role only** |

### Student API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/student/cases/[id]/request` | POST | Request a pool case (case `matched` + stage `released` required) |
| `/api/student/cases/[id]/status` | PATCH | Lifecycle transitions (`mark_contacted`, `mark_appointment_scheduled`, `mark_in_treatment`, `reschedule_appointment`, `submit_stage_for_review`) |
| `/api/student/cases/[id]/progress` | POST | Append-only progress note (only while `in_treatment`) |
| `/api/student/planner` + `/api/student/planner/[id]` | GET/POST/PATCH/DELETE | Planner CRUD through the service boundary |

### Auth / profile API

`/api/auth/complete-profile/student` and `/api/auth/complete-profile/faculty`
(POST) — invitation profile completion; browser table upserts are revoked.

### Other

| Route | Purpose |
| --- | --- |
| `/api/chat/patient` (POST) | Public patient chat — OpenAI |
| `/api/health` (GET) | Shallow health: status, timestamp, environment, commit — no secrets |
| `/api/readiness` (GET) | Readiness incl. DB check; 503 `not_ready` fail-closed |
| `/api/internal/files/cleanup` (POST) | Hourly Vercel cron; constant-time `Bearer CRON_SECRET` auth; atomic orphan cleanup |
| `/api/internal/monitoring-test` | Sentry pipeline test; disabled unless `ENABLE_MONITORING_TEST_ROUTE=true` (Preview only) |

## 7. Authentication Flow

- Supabase Auth with cookie sessions (`@supabase/ssr`).
- Roles are stored in `app_metadata.role` on the Supabase user and read via
  `getAppRole()`; roles are `student | faculty | admin`
  (`src/lib/roles.ts`).
- **Patients never authenticate** — identity for status lookup is proven by
  Twilio Verify SMS OTP per lookup.
- **Students and faculty are invitation-only**: an admin invites them
  (Supabase Auth admin invite API, `INVITE_REDIRECT_URL` → `/auth/callback`),
  they set a password in the role-specific set-password flow, and profile
  completion writes go through `/api/auth/complete-profile/*`.
- Password reset uses `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL` →
  `/auth/update-password`.
- The proxy validates the JWT with a live `getUser()` call on every portal
  navigation, so a revoked/expired session cannot reach a portal page.
- Admin account provisioning (the first/only `admin` user) is done outside the
  app (Supabase dashboard) — **Needs confirmation** for the exact production
  procedure.

## 8. Authorization Model / Roles & Permissions

| Capability | patient (anon) | student | faculty | admin |
| --- | --- | --- | --- | --- |
| Submit intake, OTP status lookup, public chat | ✅ | – | – | – |
| `/student/*` portal, pool browsing, case requests, own-case lifecycle, planner | – | ✅ | – | – |
| `/admin/*` portal, triage, case decisions, lifecycle, student-request decisions | – | – | ✅ | ✅ |
| Send student/faculty invitations | – | – | ❌ (403) | ✅ |

Enforcement layers, in order:

1. `src/proxy.ts` — portal-level role routing.
2. Route handlers — same-origin, content-type, rate limits, session + role.
3. Services — explicit role gate (`isStudentActor` / `isFacultyActor` from
   `case-lifecycle.ts`), row ownership, and workflow eligibility before any
   service-role write.
4. Database — RLS on browser roles, revoked direct writes, CHECK
   constraints, and atomic SECURITY DEFINER RPCs that re-check state under
   row locks.

Students only ever see pool cases through allowlisted SECURITY DEFINER RPCs
(`student_pool_cases`, `student_active_cases`,
`student_requested_case_overview`) that project non-PII fields until a case is
approved for them; access is **current-stage-only** — a previous-stage student
loses case and file access after handoff.

## 9. Database Schema

Managed by 45 forward-only migrations in `supabase/migrations/`
(`20260413000000_baseline_existing_core_tables.sql` →
`20260712010000_scannerless_image_sanitization.sql`). Types generated to
`src/lib/database.types.ts`.

### Tables

| Table | Purpose | Browser access |
| --- | --- | --- |
| `patient_requests` | Patient intake + case lifecycle source of truth (name, phone, complaint, urgency, triage fields, `status`) | Reads via RPCs/policies; all writes via API (direct INSERT/UPDATE revoked) |
| `student_profiles` | Student profile (PK = `auth.users.id`, unique email) | Own-row SELECT; writes via API only |
| `faculty_profiles` | Faculty profile | Faculty/admin SELECT policies; writes via API only |
| `student_case_requests` | Student claims on cases; unique `(case_id, student_id)` | Reads; writes via API only |
| `case_routing_stages` | Sequential department routing stages; unique `(case_id, sequence)` | Reads per policy; writes via API only |
| `case_progress_entries` | Append-only progress notes (non-empty content CHECK) | Reads per policy; writes via API only |
| `case_decision_history` | Mandatory-reason decision records for destructive/routing actions | Service-role only |
| `student_planner_events` | Planner entries + system appointment links (`patient_id` legacy, `source_case_id`, `stage_id`) | Own-row SELECT; writes via API only |
| `audit_logs` | Append-only security/workflow audit events | Service-role only |
| `consent_records` | Immutable consent acceptances linked to `patient_requests` (CASCADE) | Service-role only |
| `patient_files` | Upload metadata; opaque UUID object keys; original/derivative sanitization fields | Service-role only |
| `otp_codes` | **Legacy** — Phase 3 local OTP storage; the app no longer reads/writes it (Twilio Verify replaced it) | Service-role only |
| `rate_limit_buckets` | Durable rate-limit state (HMAC-hashed keys, 64-hex CHECK) | Service-role only via `consume_rate_limit` RPC |

Note: `rate_limit_buckets` exists in the migration
(`20260711010000_release_durable_rate_limits.sql`) but is **absent from the
generated `database.types.ts`** (the app only touches it through the
`consume_rate_limit` RPC, which is typed). Regenerating types should restore
it — minor discrepancy, see Technical Debt.

### Key RPCs (SECURITY DEFINER, pinned `search_path`, fail-closed grants)

- Intake/files: `submit_patient_request_atomic`,
  `claim_orphan_patient_files`, `complete_patient_file_cleanup`
- Rate limiting: `consume_rate_limit` (service-role only)
- Student reads: `student_pool_cases`, `student_active_cases`,
  `student_requested_case_overview`, `student_has_current_stage_assignment`
- Atomic decisions (authenticated, internally re-checked):
  `admin_approve_student_request`, `admin_return_case_to_pool(_with_decision)`,
  `admin_release_next_stage(_with_decision)`,
  `admin_set_case_terminal_state(_with_decision)`,
  `admin_set_student_request_decision`,
  `admin_update_case_triage_with_decision`
- Legacy, EXECUTE revoked: `get_request_status_by_phone`

### Enums / status values (CHECK constraints on text — no Postgres enums)

- `patient_requests.status`: `submitted`, `under_review`, `matched`,
  `student_approved`, `contacted`, `appointment_scheduled`, `in_treatment`,
  `faculty_review`, `completed`, `rejected`, `cancelled`
- `case_routing_stages.status`: `draft`, `released`, `student_assigned`,
  `contacted`, `appointment_scheduled`, `in_treatment`, `faculty_review`,
  `completed`, `cancelled`
- `student_case_requests.status`: `pending`, `approved`, `rejected`, `revoked`
- `student_planner_events.lifecycle_state`: `active`, `historical`, `stale`,
  `cancelled` (nullable)
- `patient_files.status`: `pending`, `original_received`,
  `structurally_valid`, `sanitizing`, `sanitized_unscanned`, `uploaded`,
  `scanning`, `clean`, `quarantined`, `rejected`, `sanitize_failed`,
  `cleanup_eligible`, `cleanup_claimed`, `orphaned`, `deleted`

### Case lifecycle state machine

Application source of truth: `src/lib/cases/case-lifecycle.ts` (pure module —
statuses, transitions, actor gates, safe messages), consumed by the four case
services; shared stage authorization in
`src/lib/cases/case-stage-context.ts`. Full transition tables:
`docs/CASE_LIFECYCLE.md`. Highlights:

- Student transitions are strictly ordered: `student_approved → contacted →
  appointment_scheduled → in_treatment → (submit_stage_for_review) →
  faculty_review`; out-of-order returns a generic 409.
- Faculty `release_next_stage` only from `faculty_review`; `return_to_pool`
  only from `student_approved | contacted | appointment_scheduled` (revokes
  the approved request, case back to `matched`).
- Faculty/admin `mark_*` actions intentionally have **no from-status
  precondition** (preserved historical behavior).
- Terminal states (`completed`, `cancelled`, `rejected`) are absorbing.
- Concurrency: admin decisions are atomic row-locked RPCs (one approval
  wins); student writes are concurrency-guarded with compensation.

## 10. Supabase RLS Model

The governing principle after the Phase 6 hardening: **browser roles read
narrowly, never write sensitive rows.**

- RLS is enabled on all sensitive tables. `audit_logs`, `consent_records`,
  `patient_files`, `otp_codes`, `case_decision_history`, and
  `rate_limit_buckets` have **no** anon/authenticated policies at all —
  service-role only.
- Direct browser writes to `patient_requests`, `student_case_requests`,
  `case_progress_entries`, `case_routing_stages`, `student_planner_events`,
  `student_profiles`, and `faculty_profiles` were revoked by
  `20260709030000_phase6_sensitive_mutation_api_rls.sql`; retained browser
  access is own-row/role-scoped SELECT.
- `anon` lost `INSERT` on `patient_requests`
  (`20260708020000_revoke_anon_patient_request_insert.sql`) — intake is
  API-only.
- Legacy broad storage policies on `patient-uploads` (INSERT and SELECT) are
  dropped; storage access is exclusively server-mediated.
- Because the service role bypasses RLS, **every service must enforce
  authorization explicitly** — this is a standing invariant, not an option.

## 11. Storage & Upload Security

- Single **private** bucket: `patient-uploads`
  (`PATIENT_UPLOADS_BUCKET`, `src/lib/files/file.constants.ts`). Bucket
  creation/privacy is configured in Supabase, **Needs confirmation** in
  production.
- Authoritative server policy `PATIENT_UPLOAD_POLICY`: `disabled` (default —
  prepare/confirm fail closed) | `sanitized_images` | `malware_scanned`
  (reserved for a future scanner). `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED` only
  hides/shows the form.
- Flow: `prepare-upload` creates a `patient_files` row with an opaque UUID
  `object_path` (never patient data in keys) + Supabase signed upload token +
  an HMAC-SHA256 ticket (`FILE_TICKET_SECRET`) binding the fileId
  (constant-time verified, short-lived, prevents confirm/attach of a
  non-prepared file) → browser uploads directly to storage → `confirm`
  validates size caps, extension/MIME allowlist, magic bytes, checksum.
- **Scannerless sanitization** (current accepted policy): strict server-side
  Sharp/libvips decode → JPEG re-encode → store derivative → delete original
  after durable metadata → serve **derivative only** via short-lived signed
  URLs. The resulting state is `sanitized_unscanned` — it is *not*
  malware-clean and must never be presented as such. JPEG/PNG only; HEIC/
  WebP/AVIF are not advertised until the Preview fixture proof passes
  (`docs/PATIENT_IMAGE_SANITIZATION_PREVIEW_CHECKLIST.md`).
- Signed URLs: minted only by the server files service, role- and
  current-stage-authorized, audited per mint, fail-closed for quarantined
  files.
- Orphan cleanup: hourly Vercel cron → `/api/internal/files/cleanup`;
  pending uploads expire after 30 min, unlinked quarantined after 24 h;
  atomic claim via `FOR UPDATE SKIP LOCKED`; storage failure returns rows to
  `orphaned` for retry; linked clinical files are never eligible.
- Full architecture and QA plan: `docs/FILE_UPLOADS.md`.

## 12. OTP / Patient Status Verification

- Codes are issued and verified **exclusively by Twilio Verify SMS**
  (`src/lib/otp/twilio-verify.ts`: `sendPatientStatusVerification`,
  `checkPatientStatusVerification`). DentBridge does not generate, hash,
  store, compare, consume, or log verification codes.
- Auth uses a Twilio API key (SID/secret), not the account auth token. No
  purchased phone number required; WhatsApp not enabled. EN/TR locales.
- The `otp_codes` table and the phone-only `get_request_status_by_phone` RPC
  are **legacy** — retained in schema history, unused by the app, EXECUTE
  revoked.
- Existence non-disclosure: `request-otp` returns an identical generic
  success for unknown phones; status verification failures are generic.
- Rate limits: durable per-phone/per-IP caps (e.g., OTP requests limited per
  15-minute window → 429 with Retry-After), failing **closed** (503) if the
  database is unavailable.

## 13. Audit Logging

- Central service: `src/lib/audit/audit.service.ts` — typed
  `AUDIT_ACTIONS/CATEGORIES/SEVERITIES/ACTOR_TYPES` plus wrapper helpers
  (route handlers use wrappers, not raw `createAuditLog`).
- Events carry `action`, `category`, `severity`, `actor_type`, `success`,
  `entity_type/id`, `request_id`, `correlation_id`, `source_service`,
  `api_version`, `event_version`, `metadata_schema`, and curated flat
  metadata. Phone numbers only ever as last-4 (`getPhoneLast4`).
- Covered events include: patient request creation, consent capture, OTP
  challenge/lookup, file prepare/confirm/reject/signed-URL, invitations,
  profile completion, student case request/progress/status changes, admin
  case decisions, return-to-pool.
- Audit insert failure is non-blocking, **except consent recording during
  intake, which fails closed**.
- Audit logs (accountability, full IP allowed) are deliberately separate from
  operational logs (debugging, bucketed IPs, PHI-free) — see
  `docs/OBSERVABILITY.md`.
- SIEM export, retention cleanup, alerting, dashboards: **deferred by
  design**; integrate at the audit-service boundary.

## 14. Consent & Legal Workflows

- Every intake records **two** consent rows (`kvkk_acknowledgement`,
  `explicit_consent`), status `accepted`, inside the atomic intake RPC.
- Evidence per row: consent/policy version, language, source
  (`patient_request`), jurisdiction `TR`, country `TR`, university key
  `istinye-dental-hospital`, document title + sha256 fingerprint, IP, user
  agent (`src/lib/consent/consent.constants.ts`, current intake consent
  version `2026-07-11-intake-v1`).
- Versioned legal document registry with per-locale sha256 fingerprints:
  `src/lib/legal/legal-documents.ts` — Privacy Policy (`2026-06-26-v1`,
  `/privacy`) and KVKK Clarification (`2026-06-27-v1`,
  `/personal-data-protection-law`), EN + TR.
- Consent rows are immutable-friendly: future withdrawal/revocation gets new
  rows, never overwrites. Withdrawal workflow: **planned, not implemented**.

## 15. AI Integrations

- Exactly one AI feature: the **public patient chat**
  (`/api/chat/patient` + `PublicPatientChatWidget`), server-side OpenAI
  client, model **`gpt-4.1-mini`** (constant in the route), with an intent
  router and curated site context (`src/lib/chat/`). It gives guidance about
  the public site/process; it has no access to patient records and performs
  no diagnosis.
- No other AI integrations exist in the codebase.

## 16. Email / Messaging Integrations

- **Email:** Supabase Auth transactional emails only (invitations via the
  admin invite API, password reset). SMTP configuration lives in Supabase —
  **Needs confirmation**. No in-repo email service/templates.
- **SMS:** Twilio Verify for patient status OTP only.
- No other messaging (no WhatsApp, no push notifications — push is Phase 15
  of the roadmap, **planned, not implemented**).

## 17. Environment Variables

Placeholders inventory: `.env.example`. Validated, typed access:
`src/lib/env/public.ts` + `src/lib/env/server.ts` — production startup
fail-fast validation runs in `src/instrumentation.ts`. HTTPS-only URLs
enforced (localhost exempt); secrets minimum 32 chars where noted.

| Category | Variables |
| --- | --- |
| Supabase (public) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase (secret) | `SUPABASE_SERVICE_ROLE_KEY` |
| URLs | `NEXT_PUBLIC_SITE_URL`, `APP_URL`, `INVITE_REDIRECT_URL`, `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL` |
| Twilio (secret) | `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_VERIFY_SERVICE_SID` |
| Uploads | `PATIENT_UPLOAD_POLICY` (server-authoritative; ≠ valid value fails startup), `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED` (UI mirror), `FILE_TICKET_SECRET` (≥32 chars, independent of all other secrets) |
| Ops secrets | `CRON_SECRET` (≥32), `RATE_LIMIT_HMAC_SECRET` (≥32) |
| AI | `OPENAI_API_KEY` |
| Sentry (optional) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` |
| Debug/test | `ENABLE_MONITORING_TEST_ROUTE` (Preview only), `LOG_LEVEL` |

Never print real values; never give a secret a `NEXT_PUBLIC_` prefix. Full
rules: `docs/ENVIRONMENT.md` and
`docs/PRODUCTION_RELEASE_GATES_2026-07-11.md`.

## 18. Testing Strategy & Existing Tests

- **Unit/route tests:** Vitest (`vitest.config.ts`: node environment,
  `tests/**/*.test.ts`, setup injects placeholder env, `server-only` aliased
  to a no-op). No Supabase connection — the service-role boundary is mocked.
- **Current suite: 40 test files, 214 tests** (all passing when run on
  2026-07-14 — see CURRENT_PROJECT_STATUS.md). Coverage focus areas: case
  lifecycle + concurrency, upload security (allowlists, magic bytes, tickets,
  quarantine fail-closed, signed-URL gates), Twilio Verify, patient intake +
  atomic migration behavior, patient status routes, durable rate limits,
  audit accountability, Sentry privacy scrubbing, observability
  logger/request context, proxy auth, session continuity/expiry, environment
  validation, invitation errors, legal document registry, orphan cleanup,
  health/readiness routes, profile completion.
- Coverage at the 2026-07-12 release report: ~47% statements — **critical-path
  coverage was the release criterion, not the global number**; UI pages, chat
  intent router, and planner service are the accepted gaps.
- **E2E workflow suite** (`tests/e2e-workflow/`): opt-in, guarded, *not run in
  CI*. Playwright browser single-case spec + API-layer runner for 2/5/10
  concurrent workflows across two student and two faculty accounts; dry-run
  cleanup tool requiring `--execute --confirm-run-id=<RUN_ID>`. It never
  touches OTP/Twilio routes. Requires a locally running app + real
  Preview/local credentials in `tests/e2e-workflow/.env.local`.
- **Load tests** (`load-tests/`): k6 scripts for the public site (GET-only,
  production-safe) and student portal (session-cookie auth); mutations
  double-gated (`TEST_MUTATIONS` + `ALLOW_PRODUCTION_MUTATIONS`); thresholds
  p95 < 2000 ms, failures < 1%.

## 19. CI Workflow

Single workflow: `.github/workflows/ci.yml` — on PRs and pushes to `main` and
`patient-request-api`: checkout → Node 22 (npm cache) → `npm ci` →
`npm run typecheck` → `npm run lint` → `npm test` → `npm run build`, with
placeholder env vars (no production secrets, no live database). There is no
deploy step in CI — deployment is Vercel's Git integration
(**Needs confirmation** of the exact Vercel Git wiring).

## 20. Vercel Deployment Model

- Project `dentbridge`; production branch `main`; previews for non-main
  branches. Production domain intended: `dentbridgetr.com` (README);
  `dentbridge.com` host-redirects to `APP_URL` via `next.config.ts`.
- `vercel.json` defines exactly one cron: `17 * * * *` →
  `/api/internal/files/cleanup` (Vercel sends `Authorization: Bearer
  $CRON_SECRET`).
- Node 22.x must be set for both Production and Preview.
- Env vars are managed in the Vercel dashboard per environment; `.vercel/` is
  local metadata and not a source of truth.
- Rollback: promote the previous deployment (schema is additive, old app
  doesn't call new RPCs); disable the cron first if cleanup misbehaves; kill
  uploads via `PATIENT_UPLOAD_POLICY=disabled` without affecting intake.

## 21. Supabase Migration Workflow

1. Add a new timestamped SQL file under `supabase/migrations/` — **never edit
   an applied migration**; history was normalized once
   (`35b5a3a chore(db): normalize all migration versions`) before production
   application.
2. Forward-only, additive; use `IF NOT EXISTS` guards; baseline
   (`20260413000000`) must keep sorting first.
3. Regenerate types: `supabase gen types typescript --local >
   src/lib/database.types.ts` and commit with the migration.
4. Fresh replay verification: `supabase db reset` + build/typecheck/lint (no
   seed file exists; the "seed.sql not found" notice is expected).
5. Apply to Preview Supabase first, run the Preview QA script
   (release report §9), then apply to production during the deployment
   window (`supabase db push` or SQL editor, filename order), then run
   post-migration grant/RLS checks (release report §10).
6. Function security invariants: SECURITY DEFINER with pinned
   `search_path = public, pg_temp`; identity from `auth.uid()`/`auth.jwt()`
   only; default EXECUTE revoked; service-role-only for intake/cleanup/rate-
   limit RPCs; `authenticated` only for internally re-checked decision RPCs.

## 22. Performance & Load-Testing Evidence

- Committed evidence:
  `release-evidence/load-tests/public-site-100vu-2026-07-13.json` (k6
  summary export, added in commit `fb28646`): 100 VUs, 48,961 requests,
  `http_req_duration` p95 = 233.5 ms / p99 = 410.6 ms (threshold p95 < 2000
  ms not breached), 0 failed requests, 0 check failures (0% errors). The
  pass is verifiable from the thresholds recorded in the JSON; the run was
  part of the July 13 release workflow.
- Target environment of that run is not recorded inside the JSON (only group
  and check names, no URL) — **Needs confirmation** (production vs preview
  vs local).
- No committed student-portal load-test evidence yet.

## 23. Release Workflow (as practiced for the 2026-07 release)

1. Hardening/release work on a branch (`release/final-production-2026-07-11`),
   baseline preserved as a tag (`codex-handoff-2026-07-11`,
   `release-final-backup-2026-07-13`).
2. Local validation gates: `npm ci`, lint, typecheck, test, coverage,
   `npm audit` (0 vulnerabilities required), build, clean tree.
3. Release report with explicit verdict + conditions:
   `docs/PRODUCTION_RELEASE_REPORT_2026-07-12.md` (verdict: **CONDITIONAL
   GO**, conditions C1–C4 all operational, plus the F-01…F-25 release-gate
   matrix).
4. Manual external verification (Supabase, Vercel, Twilio, Sentry, backups,
   cron) per report §8 and `docs/MANUAL_DEPLOYMENT_CHECKLIST.md`.
5. Preview QA script (report §9) with real Preview credentials.
6. Production deployment sequence (report §10): freeze → verify env → backup
   snapshot → apply migrations → post-migration checks → promote → 10-min
   smoke → watch first cron + Sentry → 24 h staffed rollback window.
7. Merge to `main` and push.

### July 13 release outcome

Repository-verified (Git):

- `release/final-production-2026-07-11` was merged into `main` as merge
  commit `0c26485` (second parent `fb28646`, the release-branch tip) and
  pushed to GitHub (`origin/main` matches local `main`).
- Backup tag `release-final-backup-2026-07-13` (→ `fb28646`) was created and
  pushed to the remote.
- CI fix `6efbec8` ("fix Twilio Verify test isolation in CI", current HEAD)
  changes **tests only**: `tests/twilio-verify.test.ts` gets deterministic
  fake env values in `beforeEach`, `vi.resetModules()`, a dynamic import of
  the module under test, and env restoration in `afterEach` — no
  production-code changes.

Operationally verified during the July 13 release (operator-confirmed; not
provable from the repository):

- The application was successfully deployed to Vercel Production.
- GitHub Actions initially failed after the merge because
  `tests/twilio-verify.test.ts` allowed the CI Twilio environment secret to
  affect the test; `6efbec8` was the fix.

Still needing confirmation: exact deployed SHA/domain mapping, the latest
GitHub Actions result after `6efbec8`, and production Supabase migration
state — see `CURRENT_PROJECT_STATUS.md`.

## 24. Known Architectural Constraints

- **Single institution:** university key `istinye-dental-hospital` and
  jurisdiction/country `TR` are constants in
  `src/lib/consent/consent.constants.ts`. Multi-tenancy is future work.
- **No malware scanning:** the scanner is a seam
  (`src/lib/files/malware-scanner.ts`); production policy is scannerless
  sanitization with the honest `sanitized_unscanned` state. `malware_scanned`
  policy value is reserved.
- **Supabase single-region dependency:** readiness and public endpoints fail
  closed (503) during outage — intended posture. Storage objects are not
  covered by Postgres PITR; DR story for the bucket needs an explicit answer.
- **In-memory rate limiter is per-instance** (best-effort pre-filter); the
  durable Postgres limiter is authoritative.
- **Faculty/admin `mark_*` lifecycle actions have no from-status
  precondition** (deliberate preservation of historical behavior).
- Patients are anonymous by design; there is no patient account system.
- One optional attachment per patient request (JPEG/PNG only, when enabled).

## 25. Existing Technical Debt (verified)

- `README.md` says route protection is in `src/middleware.ts`; the actual
  file is `src/proxy.ts`.
- `docs/TESTING.md` still describes "OTP generation, hashing, verification"
  tests — superseded by Twilio Verify (`twilio-verify.test.ts`); the doc
  predates the swap.
- `docs/OBSERVABILITY.md` says the error-monitor provider is no-op/future —
  the Sentry provider is actually registered at startup in
  `src/instrumentation.ts`.
- `docs/DATABASE.md` cites pre-normalization migration filenames (e.g.
  `20260416_lifecycle_statuses.sql`); actual normalized files differ (e.g.
  `20260415000000_lifecycle_statuses.sql`).
- `rate_limit_buckets` is missing from generated `database.types.ts`
  (harmless today — access is RPC-only — but regenerate on next migration).
- `postcss ^8.5.16` override deviates from Next's pin; drop it once Next
  ships postcss ≥ 8.5.10.
- `PROJECT_STATUS.md` (root) is an older status snapshot with an incomplete
  route map; superseded by `CURRENT_PROJECT_STATUS.md`.
- `otp_codes` table is dead schema kept for rollout compatibility.
- Global test coverage ~47%; UI pages, chat intent router, and planner
  service are untested (accepted at release).
- Legacy compatibility columns `patient_requests.attachment_path/-_name` are
  kept synchronized with `patient_files` for compatibility.

## 26. Deferred Features (planned, not implemented)

- Real malware scanner integration (vendor selection + DPA required before
  any patient file leaves Supabase).
- HEIC/WebP/AVIF upload support (blocked on Preview codec proof).
- `/student/exchange` — placeholder page only.
- Consent withdrawal/revocation workflow.
- Audit retention/SIEM export, alert routing, dashboards, log shipping.
- Safe shallow DB degraded-health contract for `/api/health`.
- Multi-university/multi-tenant support; additional languages beyond EN/TR.
- Phases 12–15 of `docs/PLATFORM_HARDENING_ROADMAP.md` beyond what is listed
  as implemented (performance program, mobile/API readiness, push
  notifications foundation).
- Demo/sample seed data for local development.

## 27. Operational Runbooks (pointers)

- **Deployment & external setup:** `docs/MANUAL_DEPLOYMENT_CHECKLIST.md`
  (Vercel/Supabase/Twilio/QA/rollback operator checklist);
  `docs/PRODUCTION_RELEASE_REPORT_2026-07-12.md` §8–§11 (verification, QA
  script, deployment sequence, rollback plan).
- **Release gates:** `docs/PRODUCTION_RELEASE_GATES_2026-07-11.md` (upload
  policy, retention timings, required env, Sentry privacy defaults, Node 22).
- **Upload enablement:** `docs/PATIENT_IMAGE_SANITIZATION_PREVIEW_CHECKLIST.md`
  — must pass in Preview before setting `PATIENT_UPLOAD_POLICY=sanitized_images`
  in production.
- **Production debugging:** `docs/OBSERVABILITY.md` — correlate by
  `request_id`/`correlation_id`; never paste sensitive log content; treat
  leaked PII in logs as a privacy incident.
- **Incident rollback:** app = promote previous Vercel deployment; cron =
  disable in Vercel first; uploads = set policy `disabled`; database = never
  ad-hoc rollback — restore snapshot/PITR or fix forward.

## 28. Glossary

| Term | Meaning |
| --- | --- |
| **Case** | A `patient_requests` row moving through the clinical lifecycle |
| **Pool** | Cases with status `matched` and a `released` routing stage, visible to students via RPC |
| **Triage** | Faculty/admin assignment of department, urgency, student level, clinical notes |
| **Routing stage** | One sequential department step of a case (`case_routing_stages`) |
| **Current-stage authorization** | Students only access cases/files for the stage currently assigned to them |
| **Return to pool** | Faculty revokes an approved student request; case returns to `matched` |
| **Release next stage** | From `faculty_review`, faculty opens the next department stage |
| **Terminal state** | `completed` / `cancelled` / `rejected` — absorbing, never reopens |
| **Intake** | Anonymous patient request submission (atomic RPC) |
| **OTP status lookup** | Twilio-Verify-SMS-protected patient status check |
| **Upload ticket** | Short-lived HMAC-SHA256 token binding a prepared fileId |
| **Sanitized derivative** | Server-re-encoded JPEG served instead of original bytes; state `sanitized_unscanned` (not malware-clean) |
| **Quarantined** | Upload held with no viewable URL (fail-closed) |
| **Orphan cleanup** | Hourly cron deleting expired unlinked upload rows/objects |
| **Decision history** | Mandatory-reason records (`case_decision_history`) for destructive/routing actions |
| **KVKK** | Turkish personal data protection law; clarification text at `/personal-data-protection-law` |
| **Service-role boundary** | Server-only services using the Supabase service key with explicit authorization (RLS bypassed by design) |
| **Existence non-disclosure** | Identical generic responses whether or not a record exists |
| **Phase N** | Numbered stages of `docs/PLATFORM_HARDENING_ROADMAP.md` (0–15) |
