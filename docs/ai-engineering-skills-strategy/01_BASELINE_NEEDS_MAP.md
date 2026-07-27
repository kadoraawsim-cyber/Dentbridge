# 01 — Baseline Needs Map

Maps every meaningful finding from the three approved engineering baselines to the capability required to address it, and to the **mechanism** that capability should take (Skill / CI / script / MCP / repository rule / engineering work). The mechanism decision logic is documented in `07_MCP_HOOK_CI_BOUNDARIES.md`; skill specifics are in `03_RECOMMENDED_SKILL_CATALOG.md` and `05_CUSTOM_SKILL_CONTRACTS.md`.

Evidence labels: **VERIFIED** = stated in the cited baseline document and/or independently re-confirmed in the repository during this strategy pass; **INFERENCE**; **RECOMMENDATION**.

First-hand re-verification performed for this map (2026-07-28):
- `dentbridge-perioflow`: no `.github/`, no `.claude/`, runtime deps exactly `@openai/agents, next, react, react-dom, zod`; test scripts `test:parser`/`test:realtime`/`test:ui` are `tsc && node` pipelines (VERIFIED — `package.json` read directly).
- `dental-match`: `.github/workflows/ci.yml` exists and runs **typecheck + lint + `npm test` + build** on PRs and pushes to `main` (VERIFIED — file read directly; this resolves the baseline's open "CI gates NOT VERIFIED" item in `08_TESTING_STATUS.md` §Regression). CI has **no coverage floor, no `npm audit` gate, no Playwright job, no a11y job** (VERIFIED — absent from the workflow).
- `clinical-compass`: no `.github/`, no test script, deps exactly `next, react, react-dom` (VERIFIED — `package.json` read directly). `AGENTS.md`/`CLAUDE.md` exist but contain only the generic Next.js instruction stub (VERIFIED).
- No Agent Skills are installed in any of the three repositories today (VERIFIED — no `.claude/skills/`, no plugin config beyond permissions in `dental-match/.claude/settings*.json`).

---

## A. PerioFlow (`dentbridge-perioflow/docs/engineering-baseline/`)

| # | Baseline finding (evidence) | Capability required | Mechanism | Tier |
|---|---|---|---|---|
| P1 | **Live voice pipeline never validated** — 60-row manual QA matrix authored, never executed; real mic/WebRTC/Deepgram/planner all "NOT RUN" (VERIFIED — `08_TESTING_STATUS.md`, `13_RISK_REGISTER.md` #1, `14_BACKLOG.md` Critical-1) | A repeatable, evidence-producing live QA workflow: drive the app in a real browser, inject known audio, trace transcript→route→plan→chart mutation, fill the matrix's failure-layer taxonomy | **SKILL (custom): `perioflow-live-voice-qa`** + human execution for real-microphone/device rows | 1 |
| P2 | Chart-mutation safety rests on a single-dispatcher invariant that every closure change must preserve — the stale-ref/state-sync bug class has recurred 3× across correction passes (VERIFIED — `11_TECHNICAL_DEBT.md` #4, `13_RISK_REGISTER.md` #7) | A structured review gate for any diff touching `tool-dispatcher.ts`, `intent-router.ts`, `chart/model.ts`, execution policy, or state/ref pairs, checking the interaction contract's invariants | **SKILL (custom): `perioflow-mutation-safety-review`**, layered on built-in `/code-review` | 1 |
| P3 | No CI — quality gates run manually (VERIFIED — no `.github/`, re-confirmed first-hand) | Enforce `lint + test:parser + test:realtime + test:ui + build` on every push/PR | **CI (NOT A SKILL)** | 1 (engineering) |
| P4 | No auth / rate limiting on `realtime-token`, `plan-utterance` etc. — unbounded billing exposure (VERIFIED — `09_SECURITY_REVIEW.md` findings 1–2) | Product code change (rate limit / access gate, mirroring the hardened `deepgram-token` pattern) | **Engineering (NOT A SKILL)**; built-in `/security-review` verifies the diff | 1 (engineering) |
| P5 | No production observability, no structured logging (VERIFIED — `12_PRODUCTION_READINESS.md`) | Error tracking + non-PHI counters (Sentry pattern already proven in `dental-match`) | **Engineering + monitoring automation (NOT A SKILL)** | 2 (engineering) |
| P6 | No AI cost measurement — cost-per-exam unknown across entire project history (VERIFIED — `13_RISK_REGISTER.md` #3) | Session-minutes / call-count instrumentation | **Engineering (NOT A SKILL)** | 2 (engineering) |
| P7 | Deepgram API shape authored without live verification (VERIFIED — team's own docstring, `13_RISK_REGISTER.md` #13) | First live handshake validation with current official docs | Covered as a step inside **`perioflow-live-voice-qa`** | 1 |
| P8 | Safari/iPad `AudioWorklet` path unverified; chairside/tablet is the stated usage pattern (VERIFIED — `13_RISK_REGISTER.md` #9) | Device-matrix validation | **`perioflow-live-voice-qa`** device rows + human with real hardware | 1 |
| P9 | No accessibility posture at all (VERIFIED — `11_TECHNICAL_DEBT.md` #10) | Automated axe scanning + judgment-based ARIA/keyboard/contrast review | **CI (axe run)** + **SKILL (adapt): `a11y-audit`** for the judgment layer | 2 |
| P10 | No visual regression tooling (VERIFIED — `08_TESTING_STATUS.md`) | Screenshot-diff protection for the chart UI | **CI (Playwright snapshots, NOT A SKILL)**; `webapp-testing` skill assists authoring | 2 (engineering) |
| P11 | Single 3,825-line workspace component; decomposition deferred deliberately (VERIFIED — `11_TECHNICAL_DEBT.md` #3, `15_NEXT_PHASE` deprioritization) | Careful behavior-preserving refactor when scheduled | **Engineering** with built-in `/code-review` + `/simplify`; no new skill | 3 (engineering) |
| P12 | Dead `charting-agent` route; stale README; three generations of audit material (VERIFIED — `11_TECHNICAL_DEBT.md` #5/#6/#9) | Cleanup + a docs-currency convention | **Repository rule + one-time engineering (NOT A SKILL)** | 2 (engineering) |
| P13 | No CSP/security headers (VERIFIED — `09_SECURITY_REVIEW.md` #5) | Headers config (DentBridge's `next.config.ts` is the in-house template — VERIFIED) | **Engineering (NOT A SKILL)** | 1–2 (engineering) |
| P14 | Production-polish PerioFlow is roadmap step 3 (roadmap, fixed) | Distinctive, non-generic UI polish guidance + scored audit | **SKILL (adopt): `frontend-design`** + **SKILL (adapt): `ui-ux-suite`** | 2 |

## B. DentBridge (`dental-match/docs/engineering-baseline-v2/`)

| # | Baseline finding (evidence) | Capability required | Mechanism | Tier |
|---|---|---|---|---|
| D1 | 5 high `npm audit` advisories (`sharp` on the untrusted-image path; `postcss`) while the committed release report says "0 vulnerabilities" (VERIFIED — `09` §Vulnerabilities) | (a) Patch + regression-test sanitization; (b) make security claims **dated and re-verified** at release time | (a) **Engineering**; (b) **CI dated-audit gate (NOT A SKILL)** + **SKILL (custom): `release-candidate-verification`** which refuses to sign an RC with stale evidence | 2 |
| D2 | AI safety classifier `patient-intent-router.ts` at **0% coverage** (VERIFIED — `08`, first-hand lcov in baseline) | Tests for emergency/negation/medical-advice/locale routing; then keep it covered | **Engineering (tests)**; `release-candidate-verification` treats safety-module coverage as a blocking check | 2 |
| D3 | `student-planner.service.ts` at 0% coverage (VERIFIED — `08`) | Tests | **Engineering (NOT A SKILL)** | 2 (engineering) |
| D4 | Playwright browser e2e authored but never executed; `@playwright/test` not installed (VERIFIED — `08`, `tests/e2e-workflow/README.md`) | Install, run once against staging, then keep in CI | **Engineering + CI (NOT A SKILL)**; `webapp-testing` skill assists debugging failures | 2 |
| D5 | CI gates confirmed as typecheck+lint+test+build, **no coverage floor / audit / e2e / a11y jobs** (VERIFIED first-hand — `.github/workflows/ci.yml`) | Extend CI | **CI (NOT A SKILL)** | 2 (engineering) |
| D6 | RLS/tenant isolation is the platform's authorization backbone — 17 RLS tables, 36 policies, 25 `SECURITY DEFINER` RPCs (VERIFIED — `09`); every schema/API change risks silently weakening it | A structured, repo-specific review of any migration/route diff against the RLS invariants; plus platform-side advisor checks | **SKILL (custom): `dentbridge-rls-review`** + **MCP (NOT A SKILL): official Supabase MCP in read-only mode** (`get_advisors`) | 2 |
| D7 | No a11y automation (VERIFIED — `10`) | axe in CI + judgment-layer review | **CI** + **SKILL (adapt): `a11y-audit`** (shared with PerioFlow) | 2 |
| D8 | Brand/copy inconsistencies on patient-facing pages ("DentiBridge", malformed founder wording) (VERIFIED — `11.6`) | Deterministic lexicon check | **CI grep script (NOT A SKILL)** | 2 (engineering) |
| D9 | Student/admin APIs unversioned — blocks future native/3rd-party clients (VERIFIED — `10`, `11.8`) | API versioning discipline before mobile | **Engineering + repository rule (NOT A SKILL)** | 3 (engineering) |
| D10 | Migration↔`database.types.ts` drift risk (VERIFIED — `14.11`) | Regenerate-and-diff check | **CI (NOT A SKILL)** | 2 (engineering) |
| D11 | Data-retention/erasure automation NOT VERIFIED to exist (VERIFIED as an open item — `09` finding 7) | Design + implement retention; document KVKK/GDPR posture | **Engineering (NOT A SKILL)** | 2–3 (engineering) |
| D12 | Product-polish the full platform is roadmap step 4; monster admin clients raise change cost (VERIFIED — `11.4`) | Polish guidance + scored audits + safe decomposition reviews | **SKILLS: `frontend-design`, `ui-ux-suite`** + built-ins | 2 |
| D13 | Mobile transformation is roadmap step 7; PWA shell already present; a11y and API contracts are the named blockers (VERIFIED — `10`) | Mobile-first/HIG/Material review lens for the web-to-app path | **SKILL (adapt): `mobile-app-design`** | 3 |
| D14 | Release discipline is strong but *manual-evidence-based* (25-item gate register, manual checklist) (VERIFIED — `12`) | A repeatable RC verification workflow producing a signed, dated evidence bundle | **SKILL (custom): `release-candidate-verification`** | 2 |

## C. Clinical Compass (`clinical-compass/docs/engineering-baseline-v2/`)

| # | Baseline finding (evidence) | Capability required | Mechanism | Tier |
|---|---|---|---|---|
| C1 | **1 of ~485 topics authored** — the product gap is content (VERIFIED — `00`, `14` Critical-2) | Content authorship at scale with consistent pedagogy, EN/TR parity, evidence citations, and clinical-safety tone | **Human authorship**, accelerated + quality-gated by **SKILL (custom): `compass-content-review`** | 3 |
| C2 | Content governance: review status, evidence levels, source citation discipline exist in the model but nothing enforces them (VERIFIED — `00` content model; `06`) | Per-topic structured review producing accept/revise verdicts with reasons | **`compass-content-review`** | 3 |
| C3 | Zero automated tests; merge logic (`repository.ts`, 358 lines) and content route (524 lines) unprotected (VERIFIED — `08`) | Vitest coverage of the integrity-critical code | **Engineering (NOT A SKILL)** | 3 (engineering) |
| C4 | Unauthenticated fs-writing content path; must never reach a shared host as-is (VERIFIED — `11.1`, `11.2`) | Integration-time replacement with Supabase + DentBridge auth per the port-not-merge plan | **Engineering governed by the `18_…RELATIONSHIP.md` checklist (NOT A SKILL)**; `dentbridge-rls-review` gates the new schema when built | 3 (engineering) |
| C5 | No CI, no typecheck script (VERIFIED — `08`, re-confirmed first-hand) | lint + `tsc --noEmit` (+ tests when they exist) | **CI (NOT A SKILL)** | 3 (engineering) |
| C6 | 1,815-line `WorkbenchStudio.tsx` (VERIFIED — `11.4`) | Decomposition during integration | **Engineering** with built-in review skills | 3 (engineering) |
| C7 | Integration-boundary risks: importing an unauthenticated fs-write CMS into a PHI platform; two i18n systems; empty-feature shipping (VERIFIED — `18` §9) | A gated go/no-go review against the §8 prerequisites before any code moves | **Repository rule + checklist review (NOT A SKILL)** — one-time design gate, not a repeatable workflow; ChatGPT-level acceptance review per `06_AGENT_RESPONSIBILITY_MATRIX.md` | 3 (process) |

## D. Cross-cutting

| # | Need | Mechanism | Tier |
|---|---|---|---|
| X1 | Custom skills must be authored consistently, portably (Claude Code now; Codex `.codex/skills/` compatibility desired), and testably | **SKILL (adopt): `skill-creator`** (Anthropic-official authoring aid) | 1 |
| X2 | Browser-driving capability underlies live QA, e2e debugging, screenshot evidence, and polish audits in all repos | **SKILL (adopt): `webapp-testing`**; optional **Playwright MCP (NOT A SKILL)** if tool-call-style browsing is later preferred | 1 |
| X3 | Independent review separation (implementer ≠ reviewer for safety-critical diffs) | **Process rule** in `06_AGENT_RESPONSIBILITY_MATRIX.md` (NOT A SKILL) | 1 (process) |
| X4 | Skill supply-chain safety (fork, pin, review before install) | **Checklist** in `08_SECURITY_AND_SUPPLY_CHAIN_REVIEW.md` (NOT A SKILL) | 1 (process) |

## Findings that map to NO new capability (deliberately)

- PerioFlow's **rollback/feature-flag posture** is already Ready (VERIFIED — `12_PRODUCTION_READINESS.md`); nothing to add.
- DentBridge's **observability/logging/deployment** are already Ready (VERIFIED — `12`); PerioFlow should copy them (engineering), not acquire new tooling.
- PerioFlow's assert-based test suites are **explicitly not debt** per its own baseline (VERIFIED — `11` "Explicitly not treated as debt"); no test-framework-migration skill is warranted.
- The fixed roadmap itself needs no tooling: no baseline evidence surfaced a critical blocker requiring reordering (VERIFIED — consistent with every `15_NEXT_PHASE_RECOMMENDATION.md`).
