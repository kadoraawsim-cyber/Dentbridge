# 08 — Testing Status

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** what is tested, how, coverage, and the gap between automated and real/manual validation.
- **Status:** Baseline (v2). **Scope:** `tests/**`, `vitest.config.ts`, `coverage/`, `load-tests/`. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / NOT VERIFIED / RECOMMENDATION. Test/coverage numbers below were produced **first-hand in this audit** (see method).

## Method (this audit ran these)

- `npx vitest run` → **44 test files, 292 tests, all passing, 12.17s** (VERIFIED, run 2026-07-27).
- `npx vitest run --coverage` → **50.32% statements, 43.11% branches, 60.81% functions, 50.85% lines (1305/2566)** (VERIFIED).
- The Playwright browser spec was **not** run (dependency not installed — see below).

## Automated test suite (VERIFIED)

44 vitest files under `tests/`, node environment, `server-only` shimmed (`tests/noop-server-only.ts`). Coverage scope is deliberately backend-focused: `include: ['src/app/api/**/*.ts', 'src/lib/**/*.ts']`, excluding `*.tsx`, i18n, and generated `database.types.ts` (`vitest.config.ts`).

**Strongly covered areas** (representative files):
- Case lifecycle & transitions (`case-lifecycle*.test.ts`, `case-stage-context.test.ts`) — `case-lifecycle.ts` ≈ 96% lines (55/57).
- Concurrency (`student-lifecycle-concurrency.test.ts`, `atomic-intake-migration.test.ts`).
- File security (`file-upload-security.test.ts`, `file-quarantine.test.ts`, `file-signed-url-fail-closed.test.ts`, `image-sanitizer.test.ts`, `files-current-stage-access.test.ts`, `orphan-cleanup.test.ts`).
- Audit/consent (`audit-accountability.test.ts`), privacy (`patient-storage-privacy.test.ts`, `sentry-privacy.test.ts`).
- Auth/session (`session-continuity.test.ts`, `session-expiry-ux.test.ts`, `proxy-auth.test.ts`), OTP (`twilio-verify.test.ts`, `patient-status-routes.test.ts`).
- Rate limiting (`durable-rate-limit.test.ts`), env validation (`environment-validation.test.ts`), observability (`observability-*.test.ts`, `error-monitor.test.ts`), health/readiness routes.
- Patient intake/i18n (`patient-intake-service.test.ts`, `patient-request-*.test.ts`, `patient-submission-flow.test.ts`).

## Critical coverage gaps (VERIFIED — first-hand lcov)

| Module | Lines | Hit | Coverage | Why it matters |
|---|---|---|---|---|
| `src/lib/chat/patient-intent-router.ts` | 60 | **0** | **0%** | The **AI safety classifier** (emergency/medical-advice routing) has no automated tests |
| `src/lib/planner/student-planner.service.ts` | 162 | **0** | **0%** | The **largest untested service**; planner correctness unverified |

No direct test file references either module (VERIFIED — `grep -rl` in `tests/`). These two files alone are a large share of the uncovered surface and are disproportionately risky (safety + a substantial feature).

## Real-browser / manual validation (VERIFIED)

- **Playwright e2e exists but has never run here.** `tests/e2e-workflow/browser/single-case.spec.mjs` drives a full real-browser workflow (patient submit → image upload → faculty login → student login → actions, with traces/screenshots/video). But `tests/e2e-workflow/README.md` states plainly: *"`@playwright/test` is not installed in this repository. The browser spec is ready, but running it requires installing Playwright first."* So the browser path is **authored but unexecuted in this environment**.
- **API-workflow harness** (`tests/e2e-workflow/run-api-workflows.mts` + `lib/*.mts`) drives guarded full-workflow API sequences with safety rails (`lib/safety.mts`) — separate from vitest, requires real env; not run in this audit.
- **Load tests** (`load-tests/public-site.js`, `student-portal.js`) — k6-style; git history references a "public site 100 VU load test evidence" commit (`fb28646`). Not re-run here.

## Regression protection assessment (RECOMMENDATION)

- **Strong** for the case lifecycle, file security, concurrency, and privacy — the highest-risk backend logic is genuinely well covered and passes.
- **Weak/absent** for: the AI safety classifier (0%), the planner service (0%), all `*.tsx` UI (excluded by design), and real-browser end-to-end (Playwright uninstalled).
- **CI:** a `.github/` directory exists and commit history shows CI-related fixes (`6efbec8 fix Twilio Verify test isolation in CI`), indicating CI runs the vitest suite. Whether CI enforces coverage thresholds or type/lint gates was **NOT VERIFIED** (workflow file not inspected in this pass).

## Recommendations

1. Add tests for `patient-intent-router.ts` (emergency/medical-advice/negation cases) — highest priority; it is a safety control at 0%.
2. Add tests for `student-planner.service.ts`.
3. Install and run the existing Playwright spec at least once against a staging environment; it is written, only unexecuted.
4. Confirm CI gates (coverage threshold, typecheck, lint) in `.github/workflows`.
