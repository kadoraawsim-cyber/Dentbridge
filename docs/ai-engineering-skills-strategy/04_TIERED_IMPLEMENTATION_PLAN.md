# 04 — Tiered Implementation Plan

Sequencing, dependencies, and acceptance criteria for the 11-skill library in `03_RECOMMENDED_SKILL_CATALOG.md`. Nothing here is installed yet; each tier requires explicit human approval at its gate. The fixed product roadmap is the clock: Tier 1 ↔ roadmap steps 1–2 (PerioFlow closure + Deepgram validation), Tier 2 ↔ steps 3–5 (polish + integration), Tier 3 ↔ steps 6–8 (Clinical Compass, mobile, freeze).

Every tier also lists its **non-skill companions** — the CI/engineering items from `07_MCP_HOOK_CI_BOUNDARIES.md` that must land in the same window for the skills to pay off. Skills without their companion gates produce advice nobody enforces.

---

## Tier 1 — Install before continuing significant product work (4 skills; max 5)

**Gate to enter:** human approval of this strategy. **Theme:** make PerioFlow closure *verifiable*.

| Order | Item | Class | Depends on | Acceptance criterion (measurable) |
|---|---|---|---|---|
| 1.1 | `skill-creator` | ADOPT | — | Installed; used to scaffold 1.3/1.4 so both pass spec review first-pass |
| 1.2 | `webapp-testing` | ADOPT | Python + Playwright browsers available locally | Scripted session drives PerioFlow workspace (load → mode switch → manual entry → chart-state assertion) and captures screenshot + console bundle |
| 1.3 | `perioflow-mutation-safety-review` | CUSTOM | 1.1; supply-chain checklist n/a (in-house) | Seeded known-bad diff (reintroduced Wave-3-class stale-ref defect) is flagged with the specific contract invariant cited |
| 1.4 | `perioflow-live-voice-qa` | CUSTOM | 1.1, 1.2; live `OPENAI_API_KEY`/`DEEPGRAM_API_KEY` in `.env.local` (already present — VERIFIED, PerioFlow `09_SECURITY_REVIEW.md`) | (a) automated mock-audio rows of the 60-row matrix executed with per-row trace evidence; (b) human-checklist generated for real-mic/device rows; (c) refuses PASS without captured trace |

**Non-skill companions (same window):**
- **C1. PerioFlow CI** (lint + `test:parser` + `test:realtime` + `test:ui` + build) — the baseline's own High item (`14_BACKLOG.md` #7). Without CI, the mutation-safety skill reviews diffs that nothing forces to stay green.
- **C2. Rate limiting/access gate on `realtime-token` + `plan-utterance`** (engineering; `/security-review` verifies) — Critical-2 in PerioFlow's backlog; must precede any non-localhost deployment.
- **C3. Human execution of real-microphone/device rows** produced by 1.4 (Chrome/Mac + Safari/iPad at minimum — risk register #9).

**Tier 1 exit criteria:** all four skill acceptance criteria met; C1 CI green on `main`-equivalent branch; the QA matrix has a first real execution record (mock rows automated + human rows recorded); Deepgram live handshake verified or the flag kept off with the finding documented (risk register #13 resolved either way).

**Dependency note:** 1.4 is the payoff item; 1.1/1.2 exist to make it cheap and correct. If time-boxing is needed, ship 1.2 → 1.4 first and 1.3 in the same week.

---

## Tier 2 — Install during product polish and integration (5 skills; max 5)

**Gate to enter:** Tier 1 exit criteria met **and** roadmap has advanced to step 3 (production-polish PerioFlow). **Theme:** polish measurably; make releases and schema changes verifiable.

| Order | Item | Class | Depends on | Acceptance criterion |
|---|---|---|---|---|
| 2.1 | `frontend-design` | ADOPT | brand-leash repo instruction written first | Polish PRs reference it; human acceptance rate of polish PRs tracked; no patient-facing page violates the brand instruction |
| 2.2 | `ui-ux-suite` (fork) | ADAPT | `08` checklist complete; fork pinned; rubric branded | Baseline scored audit of top-5 routes per product committed; deltas tracked per release |
| 2.3 | `a11y-audit` (fork) | ADAPT | `08` checklist complete (**highest-risk third-party item — do not skip**); axe CI job (C4) live | First full audit produces a findings register; all critical findings closed before any pilot |
| 2.4 | `dentbridge-rls-review` | CUSTOM | invariant register mined from migrations; Supabase MCP (read-only) connected for `get_advisors` cross-check | Red-team fixtures (policy drop; RPC missing role re-check) flagged; runs on every migration-touching PR |
| 2.5 | `release-candidate-verification` | CUSTOM | CI extensions C5 live (dated audit gate, coverage floor) | Dry-run against current `main` **fails correctly** on the 5 known high advisories + 0% safety-classifier coverage; first passing RC only after those are fixed |

**Non-skill companions (same window):**
- **C4. axe-core CI job** (both web products) — enforcement layer under 2.3.
- **C5. DentBridge CI extensions:** dated `npm audit` gate; coverage floor with named safety modules (`patient-intent-router.ts`, `student-planner.service.ts`) at 100%-of-target; Playwright e2e job (after its first manual staging run); brand-lexicon grep; migration↔types drift check.
- **C6. Engineering:** `sharp`/`postcss` patch + sanitization regression tests; safety-classifier + planner tests; PerioFlow Sentry + CSP (copying DentBridge patterns).
- **C7. PerioFlow→DentBridge integration reviews** (roadmap step 5) run under 2.4 (any new schema) + built-in `/code-review` + reviewer separation (`06`).

**Tier 2 exit criteria:** first `release-candidate-verification`-signed release of DentBridge; scored polish deltas exist for both products; a11y criticals at zero with CI holding the line; RLS invariant register in force for all new schema.

---

## Tier 3 — Install only before Clinical Compass build-out / Mobile Transformation / Production Freeze (2 skills; max 5 — deliberately under budget)

**Gate to enter:** roadmap step 6 begins (Clinical Compass build) for 3.1; a concrete mobile decision exists for 3.2.

| Order | Item | Class | Depends on | Acceptance criterion |
|---|---|---|---|---|
| 3.1 | `compass-content-review` | CUSTOM | content model frozen (`src/types/compass.ts` as contract per relationship doc §7); authoring underway | First authored category (all topics) passes structured review; EN/TR parity + citation checks enforced; `reviewStatus` advances only via review |
| 3.2 | `mobile-app-design` (fork/rewrite) | ADAPT | mobile path chosen (PWA/wrapper vs. native — decision, not assumption); HIG/Material 3 primary sources anchored | 10-core-screen mobile audit checklist exists and passes before store submission |

**Non-skill companions:** Clinical Compass CI + Vitest on `repository.ts`/content route (CC backlog High-4); integration go/no-go checklist review against relationship-doc §8 prerequisites (process, human-approved); API versioning discipline (DentBridge `11.8`) before any native client; freeze-time evidence bundle via `release-candidate-verification` (reused, not new).

**Why Tier 3 holds only 2 skills (RECOMMENDATION):** the mobile decision isn't concrete yet, and reserving slots invites speculative installs — the exact failure mode this strategy exists to prevent. Unused budget is a feature.

---

## Cross-tier rules

1. **One skill, one owner.** Every installed skill names a maintainer (today: the repository maintainer for all — single-contributor pattern is VERIFIED in the baselines; revisit if the team grows).
2. **Forks are pinned; upstream is pulled deliberately**, never automatically (`08`).
3. **A skill that misses its acceptance criterion twice is removed**, not tuned indefinitely — removal is cheap; catalog drift is not.
4. **No tier borrows from a later tier's list without re-approval.**
5. **Portability check at each install:** confirm the SKILL.md also loads under Codex (`.codex/skills/`) per the compatibility note in `02`; where it doesn't, record the divergence in the skill's README rather than forking behavior silently.
