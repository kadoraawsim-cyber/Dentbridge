# DentBridge — Current Project Status

Last verified: **2026-07-14** (all "verified" items below were checked or
executed on this date, on the developer machine, against the repository at
commit `6efbec8`). Reconciled the same day with the owner's account of the
July 13 release workflow.

Legend:
✅ repository-verified (Git history, repo artifacts, or commands executed
this session) ·
📄 recorded in repo evidence/docs (not re-verified) ·
🟠 **operationally verified during the July 13 release** (confirmed by the
release operator; consistent with Git but not provable from the repository
alone) ·
❓ Needs confirmation (not verifiable from the repository).

This file supersedes the older root `PROJECT_STATUS.md` snapshot.

---

## Git State

- Current branch: `main` at `6efbec8` ("fix Twilio Verify test isolation in
  CI"). ✅
- Working tree: clean except two untracked docs — `PROJECT_CONTEXT.md`
  (rewritten) and `CURRENT_PROJECT_STATUS.md` (this file). ✅
- Remote: `origin = https://github.com/kadoraawsim-cyber/Dentbridge.git`. ✅

### July 13 release — Git-verified facts

- `release/final-production-2026-07-11` was merged into `main`: merge commit
  `0c26485` ("merge final production release") has second parent `fb28646`,
  which is the tip of both local and `origin/`
  `release/final-production-2026-07-11`. ✅
- Backup tag `release-final-backup-2026-07-13` exists locally **and on the
  GitHub remote** (checked live via `git ls-remote --tags origin` on
  2026-07-14). Note: the tag points at `fb28646` (the release-branch tip),
  not at the merge commit `0c26485`. ✅
- The merge was pushed: `origin/main` == local `main` == `6efbec8`, whose
  history contains `0c26485`. ✅
- Other tags: `codex-handoff-2026-07-11`,
  `pre-release-validation-2026-07-10`. ✅

### Latest important commits (all 2026-07-11 → 2026-07-13)

| Commit | Description |
| --- | --- |
| `6efbec8` | fix Twilio Verify test isolation in CI (HEAD) |
| `0c26485` | merge final production release |
| `fb28646` | add public site 100 VU load test evidence |
| `3f46c69` | fix faculty portal mobile responsiveness |
| `4ccf80e` / `e29e63e` / `f53ecd4` | E2E workflow suite added + hardened |
| `d7daf4e` / `bd23a2b` | auth: expired-session and cross-portal role-mismatch handling |
| `35b5a3a` / `997079d` | migration history normalized + reconciled |
| `8055616` / `6067283` | scannerless image sanitization pipeline + UX |
| `2862b5e` | production release report (2026-07-12 candidate) |
| `829d8d2` | Codex production-hardening handoff baseline |

## Production Deployment State

- 🟠 The application was **successfully deployed to Vercel Production during
  the July 13 release workflow** (operator-confirmed; consistent with the
  "retrigger preview after Vercel Pro upgrade" commit and the release-merge
  timeline, but no repository artifact records the deployment itself).

Everything below remains ❓ — nothing in the repository proves what is
currently live:

- Which commit/deployment is live on Vercel Production, and on which domain
  (`dentbridgetr.com` per README; `dentbridge.com` redirect configured in
  code).
- Whether the 45-file migration chain has been applied to **production**
  Supabase. The 2026-07-12 release report explicitly states it had *not*
  been applied at report time (condition C2); later commits ("merge final
  production release", tag `release-final-backup-2026-07-13`, "retrigger
  preview after Vercel Pro upgrade") indicate deployment activity, but no
  committed artifact records the production migration application.
- Production env vars, Node 22 setting, cron activation, Twilio Verify
  service state, Sentry DSNs, and Supabase backups/PITR (release report §8
  checklist).
- Current `PATIENT_UPLOAD_POLICY` value in production (`disabled` vs
  `sanitized_images`) and whether the sanitization Preview checklist was
  completed.

The release verdict on record is **CONDITIONAL GO** with four operational
conditions C1–C4 (`docs/PRODUCTION_RELEASE_REPORT_2026-07-12.md`). The
production deployment itself is operationally confirmed (🟠 above), but
whether each of C1–C4 (upload policy gating, production migration
application, external integration verification, Preview QA) was individually
executed and passed is not recorded in the repo. 📄/❓

## CI State

- Workflow: `.github/workflows/ci.yml` — typecheck, lint, test, build on Node
  22 with placeholder env, for PRs and pushes to `main` /
  `patient-request-api`. ✅ (definition verified)
- 🟠 After the release merge, GitHub Actions **initially failed** because
  `tests/twilio-verify.test.ts` allowed the CI Twilio environment secret to
  affect the test (operator-confirmed; the failed run itself is on GitHub,
  not in the repo).
- ✅ The fix, `6efbec8 fix Twilio Verify test isolation in CI` (HEAD), is
  **repository-verified as test-isolation-only**: the commit touches only
  `tests/twilio-verify.test.ts` (35 insertions, 5 deletions, no
  production-code changes) and does exactly what the release notes describe —
  deterministic fake env values in `beforeEach`, `vi.resetModules()`, dynamic
  `import('@/lib/otp/twilio-verify')`, and environment restoration in
  `afterEach`.
- Result of the latest CI run on GitHub (after `6efbec8`): ❓ (no `gh` CLI on
  this machine; the same suite passes locally — see Test State — but the
  GitHub run result was not verified).

## Test State — ✅ executed 2026-07-14 on this machine

| Command | Result |
| --- | --- |
| `npm ci` | PASS — clean install, **0 vulnerabilities** |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | **PASS — 40 files, 214 tests, 0 failures** (Vitest 4.1.10, 14.3 s) |
| `npm run build` | PASS — compiled with CI-style placeholder env; static + dynamic routes and proxy middleware emitted |

Notes:

- Before `npm ci`, typecheck failed locally because `node_modules` was stale
  (missing `@sentry/nextjs`). Environmental only; resolved by the clean
  install.
- `npm run test:coverage` was not run this session. Last recorded coverage
  (2026-07-12 report): ~47% statements, critical-path-focused. 📄
- The opt-in E2E workflow suite (`tests/e2e-workflow/`) was **not** run (it
  requires a running app + real Preview/local credentials).

## Migration State

- 45 migrations in `supabase/migrations/`, `20260413000000` →
  `20260712010000_scannerless_image_sanitization.sql`, forward-only,
  history normalized pre-production. ✅ (files verified)
- Validated against an isolated Postgres 17 chain during the release phase. 📄
- Applied to production Supabase: ❓ (see Production Deployment State).
- Generated types `src/lib/database.types.ts` cover 12 tables + RPCs but are
  missing `rate_limit_buckets` (RPC-only access today; regenerate with the
  next migration). ✅

## Load-Test State

- Committed evidence:
  `release-evidence/load-tests/public-site-100vu-2026-07-13.json` (added in
  `fb28646`) — k6 public-site test, 100 VUs: 48,961 requests, p95 233.5 ms /
  p99 410.6 ms (threshold p95 < 2000 ms met), **0 failed requests, 0 check
  failures (0% errors)**. The pass itself is repository-verified from the
  thresholds in the JSON. ✅
- Target environment: the JSON records only group/check names (`homepage`,
  `patient-info`, `request-treatment-page`, `check-status-page`) and **no
  target URL**, so the environment the test ran against remains ❓ despite
  the run being part of the July 13 release workflow.
- Student-portal load-test evidence: none committed.

## Completed Work (verified in code)

- Hardening Phases 0–11 of `docs/PLATFORM_HARDENING_ROADMAP.md`: env
  validation, database foundation, OTP-protected patient status via Twilio
  Verify, API-only intake, audit logs + consent records, secure upload
  pipeline, Phase 6 service-role mutation boundary with RLS write revocation,
  case lifecycle state machine, UI refactor, generated types, Vitest + CI,
  observability (structured logging, Sentry with privacy scrubbing,
  health/readiness).
- Release hardening (July 2026): atomic intake RPC, durable fail-closed rate
  limiting, atomic row-locked admin decision RPCs with decision history,
  student concurrency guards, orphan-cleanup claim/finalize, scannerless
  image sanitization pipeline (Sharp → JPEG derivative, `sanitized_unscanned`).
- Public site: EN/TR i18n, legal document registry (Privacy + KVKK) with
  sha256 fingerprints, patient chat (OpenAI `gpt-4.1-mini`), security
  headers/CSP.
- E2E workflow suite (guarded, opt-in) and k6 load-test scripts.
- 100 VU public-site load-test evidence committed.

## Known Issues / Doc-Code Contradictions (found 2026-07-14)

Status: **explicitly documented** here and in `PROJECT_CONTEXT.md` §25.
The underlying doc fixes (items 1–4) are deliberately *not* applied yet —
edits in this pass were limited to `PROJECT_CONTEXT.md` and this file, so the
pending diff stays reviewable; apply them as a follow-up once this diff is
approved.

1. `README.md` points to `src/middleware.ts`; the file is `src/proxy.ts`.
2. `docs/TESTING.md` still describes local OTP hashing/verification tests —
   superseded by Twilio Verify.
3. `docs/OBSERVABILITY.md` claims the error-monitor provider is no-op /
   future — the Sentry provider is registered at startup in
   `src/instrumentation.ts`.
4. `docs/DATABASE.md` references pre-normalization migration filenames
   (e.g. `20260416_lifecycle_statuses.sql` vs actual
   `20260415000000_lifecycle_statuses.sql`).
5. `rate_limit_buckets` missing from generated `database.types.ts`.
6. Root `PROJECT_STATUS.md` is stale (route map omits `/about`, `/terms`,
   `/students`, `/patients`, `/personal-data-protection-law`, clinical tools;
   env list is superseded) — treat as historical; do not delete without
   owner approval.
7. `postcss` override (`^8.5.16`) deviates from Next's pin — re-check on next
   Next upgrade.
8. `otp_codes` is dead schema retained for rollout compatibility.

## Remaining Manual Tasks (from release report §8/§9 — completion ❓)

- Verify/complete production external setup: Vercel env vars + Node 22 +
  cron, Supabase bucket privacy + RLS/grant spot-checks, Twilio Verify
  service + geo limits + billing alerts, Sentry DSNs + replay-off +
  monitoring-test event, backup/PITR posture + one restore drill, storage DR
  answer for `patient-uploads`.
- Apply migration chain to production (if not already done) via the §10
  sequence with a fresh backup snapshot first.
- Run the Preview QA script (§9) if the release was promoted without it.
- Patient uploads: run `docs/PATIENT_IMAGE_SANITIZATION_PREVIEW_CHECKLIST.md`
  in Preview before enabling `PATIENT_UPLOAD_POLICY=sanitized_images` in
  production.
- Watch first production cron run and Sentry for the first hour post-deploy.

## Deferred Work (intentional)

Real malware scanner (+ vendor DPA), HEIC/WebP/AVIF support,
`/student/exchange` workflow, consent withdrawal workflow, audit
retention/SIEM/alerting/dashboards, shallow DB health check, multi-tenancy,
push notifications (Phase 15), demo seed data, student-portal load-test
evidence.

## Immediate Next Priorities (recommended)

1. Confirm and record the remaining ❓ production facts (deployed SHA and
   domain mapping, migration application, env, cron, upload policy, latest
   GitHub Actions result) — turn the 🟠/❓ items above into repository-recorded
   facts, ideally as a dated evidence doc like the release report.
2. Fix the small doc-code contradictions (README middleware path, TESTING.md
   OTP wording, OBSERVABILITY.md Sentry status, DATABASE.md filenames) and
   regenerate `database.types.ts` on the next migration.
3. Decide the fate of root `PROJECT_STATUS.md` (archive or delete) now that
   this file exists.
4. If uploads are to be enabled: execute the sanitization Preview checklist
   and record the fixture results.
5. Post-launch test debt: chat intent router, planner service, and UI-level
   coverage.

## Risks Requiring Verification

- **Production/database drift:** if the migration chain was applied manually
  or partially, code and schema could diverge — verify
  `supabase migration list` against the 45 files.
- **Load-test evidence context:** the 100 VU JSON does not state its target
  environment; production capacity claims should not rely on it until the
  target is confirmed.
- **CI green-ness:** HEAD commit is itself a CI fix; confirm the latest run
  actually passed on GitHub Actions.
- **Storage disaster recovery:** `patient-uploads` objects are outside
  Postgres PITR; an explicit replication/export policy (or accepted risk
  record) is still owed.
- **Twilio cost exposure:** app-side durable caps exist; Twilio-side geo
  permissions and billing alerts are unverified.
- **Single-region Supabase:** outage means fail-closed 503s on public
  endpoints — accepted posture, but ensure stakeholders know.
