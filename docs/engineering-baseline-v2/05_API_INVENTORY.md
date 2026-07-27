# 05 — API Inventory

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** enumerate every API route, its method(s), purpose, guards, and security notes.
- **Status:** Baseline (v2). **Scope:** all 22 `src/app/api/**/route.ts`. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / NOT VERIFIED / RECOMMENDATION. Methods/guards below were extracted directly from each route file (VERIFIED).

All handlers declare `runtime = 'nodejs'`. Guard legend: **SO** = same-origin, **RL** = durable rate limit, **AUTH** = `auth.getUser()`, **ROLE** = role check, **CRON** = `CRON_SECRET`, **TICKET** = HMAC upload ticket.

## Patient (public / anonymous)

| Route | Method | Purpose | Guards | Notes |
|---|---|---|---|---|
| `v1/patient/requests` | POST | Submit a patient treatment request | RL | → `submit_patient_request_atomic` RPC; anon direct insert revoked; atomic with file linkage |
| `v1/patient/status/request-otp` | POST | Send OTP to phone | RL | Twilio Verify send (`src/lib/otp/twilio-verify.ts`) |
| `v1/patient/status` | POST | Look up request status after OTP | RL | Verify + `get_request_status_by_phone`; direct RPC revoked |
| `chat/patient` | POST | Bridgey public assistant | RL (8/60s) | Emergency intent short-circuits before OpenAI; see `07` |

## Files (patient uploads)

| Route | Method | Purpose | Guards | Notes |
|---|---|---|---|---|
| `v1/files/prepare-upload` | POST | Issue ticketed private-quarantine upload target | RL, TICKET | HMAC `FILE_TICKET_SECRET` |
| `v1/files/[id]/confirm` | POST | Magic-byte + Sharp sanitize + link file | RL | Re-encode pipeline (`image-sanitizer.ts`) |
| `v1/files/[id]/signed-url` | POST | Short-lived signed URL | AUTH | Fail-closed (`tests/file-signed-url-fail-closed.test.ts`) |

## Student portal

| Route | Method | Purpose | Guards |
|---|---|---|---|
| `student/cases/[id]/request` | POST | Request a pool case | AUTH |
| `student/cases/[id]/status` | PATCH | Update student case status | AUTH |
| `student/cases/[id]/progress` | POST | Record progress entry | AUTH |
| `student/planner` | GET, POST | List/create planner events | AUTH |
| `student/planner/[id]` | PATCH, DELETE | Update/remove planner event | AUTH |

Student mutations delegate to case/planner services and are ultimately gated by RLS + case-access rules (`src/lib/cases/student-case-access.ts`, `student_has_current_stage_assignment`).

## Admin / faculty portal

| Route | Method | Purpose | Guards |
|---|---|---|---|
| `admin/cases/[id]` | PATCH | Faculty/admin case decision (triage/route/return/terminal) | AUTH, ROLE (`canAccessFacultyPortal`) → atomic decision RPCs |
| `admin/invitations/faculty` | POST | Invite faculty | AUTH, ROLE (`isAdminRole`) |
| `admin/invitations/students` | POST | Invite students (bulk) | AUTH, ROLE (`isAdminRole`) |
| `admin/invitations` | (shared) | Invitation helper module | INFERENCE — no exported HTTP method detected in this file; appears to be shared invitation logic imported by the faculty/students routes. **Confirm before treating as a live endpoint.** |

## Auth / profile

| Route | Method | Purpose | Guards |
|---|---|---|---|
| `auth/complete-profile/student` | POST | Complete student profile | AUTH, ROLE (`isStudentRole`) |
| `auth/complete-profile/faculty` | POST | Complete faculty profile | AUTH |

## Internal / ops

| Route | Method | Purpose | Guards |
|---|---|---|---|
| `internal/files/cleanup` | GET | Orphan file cleanup worker | CRON | Invoked by Vercel cron hourly; `FOR UPDATE SKIP LOCKED` |
| `internal/monitoring-test` | GET | Sentry/monitoring smoke test | CRON | Gated by `ENABLE_MONITORING_TEST_ROUTE` |
| `health` | GET | Liveness | — | Tested (`tests/health-route.test.ts`) |
| `readiness` | GET | Readiness (dependency checks) | — | Tested (`tests/readiness-route.test.ts`) |

## Cross-route security posture (VERIFIED)

- **Anonymous mutation is always rate-limited** (patient + files + chat all use `checkDurableRateLimit`, DB-backed so limits hold across serverless instances).
- **Authenticated routes call `auth.getUser()`** and, where privileged, a role guard from `src/lib/roles.ts`; the **authoritative** authz is the RPC's own JWT role re-check + RLS.
- **Cron routes require `CRON_SECRET`**; monitoring-test additionally flag-gated.
- **Typed error surface** via `src/lib/api/errors.ts` (`tests/api-errors.test.ts`, `tests/invitation-errors.test.ts`) — consistent, non-leaking responses.
- **RECOMMENDATION:** confirm `admin/invitations/route.ts` is a shared module and not an unintended unguarded endpoint; if it is a live route, verify its guards match the faculty/students variants.
