# DentBridge production release report — 12 July 2026

Release branch: `release/final-production-2026-07-11`
Release engineer sign-off basis: local validation on Node 22.17.0 (pinned line), macOS x64.
Baseline: Codex handoff checkpoint `829d8d2` (tag `codex-handoff-2026-07-11`), preserved untouched.

---

## 1. Verdict: CONDITIONAL GO

The application code, database migration chain, test suite, dependency tree, and build are
release-ready. The conditions are operational, not code defects:

| # | Condition | Why it blocks an unconditional GO |
|---|-----------|-----------------------------------|
| C1 | Patient uploads must launch DISABLED (`PATIENT_UPLOADS_ENABLED=false`, `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED=false`) | No malware scanner is configured. The pipeline fails closed and the flag gates it, but the feature must not be enabled until the scanner gate in `docs/PRODUCTION_RELEASE_GATES_2026-07-11.md` is satisfied. |
| C2 | The 44-file migration chain has been validated only against an isolated Postgres 17 instance | It has NOT been applied to production. Apply to Preview first, run the QA script there, then apply to production during the deployment window. |
| C3 | External integrations (Supabase, Vercel, Twilio, Sentry, backups, cron) are unverified from this environment | No production service was contacted during this phase, by instruction. Complete §8 manual verification before deploy. |
| C4 | No Preview-environment end-to-end QA has run for this release candidate | Run §9 QA script in Preview with real Supabase + Twilio test credentials before promoting. |

If C1–C4 are executed and pass, this release is a GO.

---

## 2. Commits in this release (on top of `829d8d2`)

| Commit | Phase | Description |
|--------|-------|-------------|
| `2db3883` | 1 | feat(uploads): gate patient uploads behind PATIENT_UPLOADS_ENABLED launch flag |
| `b9a2121` | 1 | fix(rate-limit): add durable limits to patient status verification |
| `dd8622b` | 1 | fix(lifecycle): guard student case transitions against concurrent writes |
| `75e2dd4` | 1 | refactor: remove superseded non-atomic mutation paths |
| `c9d78bd` | 2 | chore(deps): clear all npm audit advisories without breaking changes |
| `47f97b2` | 2 | test: cover critical security paths flagged by coverage review |
| (this)   | 2 | docs: production release report |

---

## 3. Validation evidence (Node v22.17.0)

| Gate | Result |
|------|--------|
| `npm ci` | PASS — clean install from committed lockfile |
| `npm run lint` | PASS — zero warnings/errors |
| `npm run typecheck` | PASS — zero errors |
| `npm test` | PASS — 37 files, 162 tests, 0 failures |
| `npm run test:coverage` | PASS — summary in §4 |
| `npm audit --json` | 0 vulnerabilities (was 11: 1 low / 10 moderate) |
| `npm audit --omit=dev --json` | 0 vulnerabilities (was 9) |
| `npm run build` | PASS — compiled successfully, 52/52 static pages, all API routes and proxy middleware emitted |
| `git diff --check` | PASS before and after every commit |
| Working tree | CLEAN |

Build notes: single benign warning (`@sentry/nextjs` deprecation of `disableLogger`); no errors.

## 4. Coverage

| Metric | Value |
|--------|-------|
| Statements | 47.45% (1149/2421) |
| Branches | 39.81% (923/2318) |
| Functions | 56.68% (195/344) |
| Lines | 47.69% (1136/2382) |

Critical-path coverage was the release criterion, not the global number. Gaps found and
closed this phase (19 new tests): the atomic-intake ticket/fileId pairing boundary
(`intake.service`, was 0%), the signed-URL quarantine gate (`createPatientFileSignedUrl`),
and profile completion (was 0%). Remaining uncovered code is UI-heavy pages, the public
chat intent router, the planner service, and thin route wrappers whose guards are covered
at the service layer — accepted for launch.

## 5. Dependency audit disposition

All advisories reviewed individually; `npm audit fix --force` was never used.

| Advisory | Package | Severity | Exploitability in DentBridge | Disposition |
|----------|---------|----------|------------------------------|-------------|
| GHSA-4x5r-pxfx-6jf8 | @babel/core ≤7.29.0 | low | Build-time only (Sentry bundler plugin); no untrusted source maps | Fixed via semver-compatible `npm audit fix` |
| GHSA-8988-4f7v-96qf | @opentelemetry/core <2.8.0 | moderate | Runtime: attacker-sent `baggage` headers could allocate unbounded memory in the Sentry OTel chain | Fixed via semver-compatible `npm audit fix` |
| GHSA-jxxr-4gwj-5jf2 | brace-expansion | moderate | Glob expansion in build tooling; no untrusted patterns | Fixed via semver-compatible `npm audit fix` |
| GHSA-h67p-54hq-rp68 | js-yaml 4.0.0–4.1.1 | moderate | Dev-only (eslint config loading); no untrusted YAML | Fixed via semver-compatible `npm audit fix` |
| GHSA-qx2v-qp2m-jg93 | postcss <8.5.10 | moderate | Build-time CSS stringification of untrusted input — DentBridge processes only its own CSS | npm's suggested "fix" was a semver-major downgrade to `next@9.3.3` (rejected). Pinned `postcss: ^8.5.16` via the existing `overrides` block instead — tailwind/vite already run 8.5.x in the same pipeline. Validated by full build + test suite. |

Compensating controls that stand regardless: strict CSP, generic public error mapper,
durable fail-closed rate limiting on all public endpoints, and PII-free structured logs.

Watch item: the `postcss` override deviates from Next's exact pin (8.4.31). Re-check on the
next `next` upgrade and drop the override once Next ships postcss ≥8.5.10 itself.

## 6. Migrations

44 SQL files in `supabase/migrations/`, `20260413…` → `20260711035100…`. Phase 1 review
verified: SECURITY DEFINER with pinned `search_path = public, pg_temp` on every function,
identity always from `auth.uid()`/`auth.jwt()` (never client-supplied), explicit fail-closed
grants (default EXECUTE revoked; service_role-only for intake/cleanup/rate-limit RPCs;
`authenticated` only for the internally re-checked decision RPCs), forward-only ordering,
and RLS + revoked direct writes on all sensitive tables.

Status: validated against an isolated Postgres 17 chain (Codex phase) + static re-review.
**Not applied to production.** Apply via §10 sequence only.

## 7. Smoke tests (local production build, `next start`, placeholder secrets, no external services)

| Area | Checks | Result |
|------|--------|--------|
| Public pages | `/`, `/patient/request`, `/patient/status`, `/privacy`, `/terms`, `/faq`, `/personal-data-protection-law`, `/forgot-password`, `/login` redirect, `/admin/login`, `/student/login`, robots, sitemap | 200/expected redirects |
| Health | `/api/health` | 200, no secrets, commit/env metadata only |
| Readiness | `/api/readiness` with DB down | 503 `not_ready` — fails closed, no detail leak |
| Auth redirects | `/admin`, `/admin/requests`, `/student/dashboard`, `/student/planner` unauthenticated | 307 → role login pages |
| Uploads | prepare + confirm with flag off | 503 generic; upload UI absent from rendered form |
| Signed URL | unauthenticated | 401 generic |
| Patient intake | invalid body 400; valid body with DB down 503 (durable limiter fails closed BEFORE processing) | PASS |
| OTP | request-otp and verify with DB down | 503 fail-closed, generic |
| CSRF/origin | cross-origin POST | 400 rejected |
| Content type | non-JSON POST | 415 |
| Language | TR `accept-language` → TR error bodies; TR/EN UI present | PASS |
| Errors | 404 page, 410 on `/student-pilot`, cron 500 with DB down | Generic bodies, zero stack traces |
| Cron auth | no header / wrong bearer → 401; correct bearer accepted (constant-time) | PASS |
| Monitoring test route | disabled by default | 404 |
| Headers | CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy on pages; `no-store` on APIs | PASS |
| Secret leakage | grep of all response bodies + full server log for secret values/names and submitted phone | 0 hits; logs are structured, IP-bucketed, PII-free |
| Crashes | none across the full matrix | PASS |

Logout note: sign-out is a client-side Supabase call; middleware re-validates the JWT
live on every portal navigation, so a cleared session cannot reach `/admin/*` or
`/student/*` (verified via unauthenticated redirects). Full logout click-through is in
the Preview QA script (§9).

## 8. External integration verification (manual — nothing was assumed or contacted)

**Supabase**
1. Dashboard → confirm project region/plan; Auth → email invites enabled, correct SMTP.
2. Confirm `patient-uploads` bucket exists and is PRIVATE; no public bucket policies.
3. Apply migration chain to Preview project; run `select proname, prosecdef from pg_proc join pg_namespace n on n.oid=pronamespace where nspname='public'` and spot-check EXECUTE grants match §6.
4. Verify RLS enabled on every table in §6 (`select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r'`).
5. Confirm the service-role key in Vercel matches the project and is server-only.

**Vercel**
1. Project → Settings → Node.js version = 22.x for Production AND Preview.
2. Environment variables: every name in `docs/PRODUCTION_RELEASE_GATES_2026-07-11.md` §"Required server-only configuration" present in the right scopes; `PATIENT_UPLOADS_ENABLED=false` and `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED=false` in Production.
3. Cron: `vercel.json` schedule (`17 * * * *` → `/api/internal/files/cleanup`) appears under Project → Cron Jobs after deploy; Vercel sends `Authorization: Bearer $CRON_SECRET` — confirm `CRON_SECRET` is set in Production.
4. Domains: production domain attached; `dentbridge.com` redirect host rule resolves.

**Twilio**
1. Verify Service SID exists; SMS channel enabled; TR + EN locales supported.
2. API key SID/secret pair valid (test with a Verify challenge to a test number in Preview).
3. Set rate limits/geo permissions in Twilio console (Turkey + expected countries only).
4. Confirm billing alerts configured (OTP abuse = cost exposure; app-side durable limits cap this).

**Sentry**
1. DSNs (server + `NEXT_PUBLIC_`) point at the correct project; `SENTRY_ORG/PROJECT/AUTH_TOKEN` set for source-map upload at build.
2. In Preview: set `ENABLE_MONITORING_TEST_ROUTE=true`, call `/api/internal/monitoring-test` with the cron bearer, confirm the event arrives WITH scrubbed payload (no request data, no user, generic message), then set the flag back to `false`.
3. Confirm Session Replay is OFF in the Sentry project settings (client config disables it; verify no override).

**Backups**
1. Supabase → Database → Backups: confirm daily backups + PITR retention meets policy.
2. Perform one restore drill to a scratch project BEFORE launch; record duration.
3. Storage: confirm `patient-uploads` objects are included in the disaster-recovery story (Supabase Storage is not covered by Postgres PITR — document an object-storage replication/export policy or accept and record the risk).

**Malware scanner (pre-condition for ever enabling uploads)**
1. Select vendor; complete privacy/data-processing agreement (patient files leave Supabase only after this).
2. Implement the `MalwareScanner` adapter; wire quarantine → scan → clean/infected transitions.
3. In Preview: validate clean, infected (EICAR), and scanner-unavailable paths; confirm unavailable keeps files quarantined.
4. Only then flip both upload flags in Production.

**Cron**
1. After first production deploy, watch one execution of `/api/internal/files/cleanup` in Vercel logs: expect 200 with `{claimed, deleted, retryableFailures}`.
2. Manually call it without auth → 401.

## 9. Preview QA script (run before production promote)

1. Patient intake: submit EN and TR requests (no attachment) → success screen; rows in `patient_requests` + 2 `consent_records` each + `patient_request_created` audit row; resubmit same `submissionId` → no duplicate.
2. OTP: request status code for the submitted phone → SMS arrives; wrong code → generic failure; correct code → status card with only treatment/status/date/days/department; unknown phone → identical generic success on request-otp.
3. Rate limits: 4th OTP request for one phone in 15 min → 429 with Retry-After.
4. Uploads disabled: `/patient/request` shows no upload UI; direct POST to prepare-upload → 503.
5. Admin: login, review queue, save draft, approve (department set), reject with reason, verify audit rows + `case_decision_history` reasons.
6. Student: login, pool shows only non-PII fields, request case, admin approves → student sees contact details; second student's competing request auto-rejected.
7. Lifecycle: student mark contacted → scheduled (planner event created) → in treatment (progress note) → submit for review; faculty release next stage → prior student loses case + file access; return-to-pool and cancel paths write decisions and revoke access.
8. Concurrency spot-check: two tabs — admin returns case to pool while student marks contacted → one succeeds, other gets 409 refresh message; no clobbered state.
9. Auth: student URL-hacks `/admin` → redirected; faculty hits `/student/*` → redirected; logout from each portal → back to login, back-button does not restore a session.
10. Invitations: admin invites student + faculty; invite email lands; set-password flow completes; profile completion writes correct table; audit rows present.
11. Sentry: monitoring-test event arrives scrubbed (then disable flag).
12. Cron: trigger cleanup with bearer in Preview; prepare an upload, let it expire (or shrink TTL in a scratch env), confirm the orphan is claimed and deleted.

## 10. Deployment sequence (production)

1. Freeze: confirm `release/final-production-2026-07-11` at the release SHA; CI green.
2. Verify §8 items (Vercel env, Node 22, cron, Twilio, Sentry, backups) — record evidence.
3. Take a fresh Supabase production backup snapshot (and note PITR point).
4. Apply the migration chain to production (Supabase CLI `supabase db push` or SQL editor, in filename order). Migrations are additive/forward-only; no destructive statements.
5. Immediately run post-migration checks: RPC grants (§8 Supabase #3), RLS flags, one `consume_rate_limit` smoke call as service role.
6. Promote/deploy the release SHA to Vercel Production (`PATIENT_UPLOADS_ENABLED=false`).
7. Production smoke (10 min): `/api/health` 200; `/api/readiness` 200 `ready`; public pages render; unauthenticated portal redirects; one real patient intake with a test phone + OTP lookup; admin login + queue loads.
8. Watch the first cron run (next `HH:17`) and Sentry for 1 hour.
9. Announce launch; keep the rollback window staffed for 24h.

## 11. Rollback plan

- **Application:** Vercel → promote the previous production deployment (instant). No data
  migration is required to roll the app back: the schema is additive and the previous app
  version does not call the new RPCs.
- **Cron:** if cleanup misbehaves, disable the cron job in Vercel first; quarantined rows
  simply persist (fail-safe direction).
- **Uploads:** if anything is wrong with the upload pipeline after a future enablement,
  set `PATIENT_UPLOADS_ENABLED=false` (env change + redeploy) — intake keeps working.
- **Database:** do NOT roll back migrations ad hoc. For catastrophic schema issues,
  restore the pre-deploy snapshot/PITR point taken in step 10.3 and accept the recorded
  data-loss window; otherwise fix forward with a new migration.
- **Rate limiter outage:** public endpoints fail closed (503). If Supabase is degraded,
  this is expected posture, not an app bug.

## 12. F-01 … F-25 release-gate matrix

No pre-existing F-numbered register exists in the repository; this matrix enumerates the
25 release gates synthesized from the Phase 1 hardening scope (A–H) and Phase 2 release
scope, and is now the durable register for future audits.

| ID | Gate | Status | Evidence |
|----|------|--------|----------|
| F-01 | Atomic patient intake (request + consents + audit + file claim commit/rollback together) | PASS | `submit_patient_request_atomic` single-tx RPC; error-mapping + ticket tests |
| F-02 | Consent evidence persisted (2 records, fingerprint, version, canonical route, language) | PASS | RPC validates 2×typed evidence; legal registry tests |
| F-03 | Upload replay/IDOR protection (HMAC ticket bound to fileId + expiry, constant-time verify) | PASS | ticket tests + new intake pairing tests |
| F-04 | Orphan cleanup: atomic claim (`FOR UPDATE SKIP LOCKED`), retry on storage failure, crash reclaim | PASS | claim/finalize RPCs; orphan-cleanup tests |
| F-05 | Quarantine fail-closed: signed URLs require `status=clean` AND `scan_state=clean` AND linked | PASS | new fail-closed signed-URL tests + source-guard test |
| F-06 | Malware scanning operational | **CONDITIONAL** | adapter fails closed (`unavailable`); real scanner deferred behind C1 |
| F-07 | Uploads disableable without disabling intake (`PATIENT_UPLOADS_ENABLED`) | PASS | flag tests incl. intake-independence guard; smoke 503 + hidden UI |
| F-08 | Structural validation (size caps, extension/MIME allowlist, magic bytes, checksum) | PASS | file-upload-security tests; confirm-time inspection |
| F-09 | Signed URL discipline (short TTLs, purpose-bound, audited, role+current-stage authz) | PASS | files-current-stage-access + new tests; audit row per mint |
| F-10 | OTP via Twilio Verify only — no codes generated/stored/logged locally | PASS | twilio-verify tests; legacy phone RPC revoked |
| F-11 | Existence non-disclosure (identical generic responses; no enumeration oracle) | PASS | patient-status route tests; smoke generic bodies |
| F-12 | Durable, shared, fail-closed rate limiting on every public anonymous endpoint | PASS | added to confirm + verify this release; smoke shows 503 fail-closed |
| F-13 | Rate-limit keys HMAC-hashed (no raw phone/IP at rest) | PASS | `RATE_LIMIT_HMAC_SECRET` + 64-hex CHECK; durable-rate-limit tests |
| F-14 | Student reads via allowlisted SECURITY DEFINER RPCs only (no direct PII projection) | PASS | 20260710 migration; student-case-access tests |
| F-15 | Current-stage-only authorization; previous-stage lockout after handoff | PASS | stage-context + files-current-stage tests |
| F-16 | Admin lifecycle decisions atomic + row-locked (one approval wins) | PASS | decision RPCs; admin-case-actions race tests |
| F-17 | Student lifecycle writes concurrency-guarded with compensation | PASS | fixed `dd8622b`; new concurrency tests |
| F-18 | Terminal states absorbing (completed/cancelled/rejected never reopen) | PASS | lifecycle transition tests; RPC re-checks |
| F-19 | Decision history with mandatory reasons for destructive/routing actions | PASS | `case_decision_history` + `_with_decision` RPCs |
| F-20 | Audit trail: actor, role, type, entity, correlation ids, PII-scrubbed bounded metadata | PASS | audit-accountability tests; sensitive-key scrubber |
| F-21 | Sentry privacy: no request/user/breadcrumbs/PII; generic messages at transport | PASS | sentry-privacy tests; replay disabled; monitoring-test flow |
| F-22 | Environment validation: fail-fast startup, strict flags, HTTPS-only URLs, 32-char secrets | PASS | env tests incl. new strict-flag rejection |
| F-23 | Portal authorization: proxy validates JWT live, role-routed redirects | PASS | proxy-auth tests; smoke redirect matrix |
| F-24 | Cron authentication: constant-time bearer; monitoring route default-off | PASS | orphan-cleanup auth tests; smoke 401/404 |
| F-25 | Supply chain + release hygiene: 0 audit vulns (full+prod), green build/lint/type/tests, clean tree, Node 22 | PASS | §3, §5 |

## 13. Remaining risks

1. **Malware scanning absent (accepted, gated).** Files cannot be viewed (quarantine) and
   uploads ship disabled; risk is deferred, not present — but the feature is inert until C1.
2. **Migration chain unapplied to production.** Mitigated by Preview rehearsal + backup +
   additive-only design; still the highest-variance deploy step.
3. **Supabase single-region dependency.** Readiness fails closed on outage (503s). Verify
   backup/PITR posture (§8) before launch; storage objects need an explicit DR answer.
4. **postcss override vs Next's pin.** Low risk (validated build); revisit on next Next upgrade.
5. **In-memory limiter is per-instance.** Durable Postgres limiter is authoritative; the
   in-memory layer is best-effort pre-filtering — acceptable.
6. **Coverage below 50% globally.** Critical security paths are covered; UI and chat paths
   are not. Post-launch backlog, not a launch blocker.
7. **Twilio cost abuse ceiling.** Durable per-phone/IP caps bound spend; set Twilio-side
   geo permissions + billing alerts as defense in depth (§8).
8. **Single-university assumptions** (hardcoded university value, TR jurisdiction) are
   intentional for this launch; multi-tenancy is future work.
