# 03 — Recommended Skill Catalog

The ranked shortlist. Every entry carries: classification (ADOPT / ADAPT / BUILD CUSTOM / DO NOT USE / NOT A SKILL), the baseline problem it addresses, expected impact, why a skill (vs. existing tooling), effort, maintenance, measurable acceptance criteria, sources, and confidence. Research detail and rejected-candidate rationale live in `02_PUBLIC_SKILL_RESEARCH.md`; custom contracts in `05_CUSTOM_SKILL_CONTRACTS.md`; tier sequencing in `04_TIERED_IMPLEMENTATION_PLAN.md`.

**The library: 11 skills** (3 ADOPT · 3 ADAPT · 5 BUILD CUSTOM), ranked by expected return.

---

## Ranked shortlist

### 1. `perioflow-live-voice-qa` — BUILD CUSTOM — Tier 1 — **highest ROI in the library**
- **Baseline problem:** the product's core value (voice → correct chart) has zero real-world validation; the team's own 60-scenario QA matrix has never been executed (VERIFIED — PerioFlow `08_TESTING_STATUS.md`, `13_RISK_REGISTER.md` #1, matrix at `docs/perioflow-stage-3/06-day-3-manual-qa.md`).
- **Expected impact:** converts the single largest blocker to pilot readiness into a repeatable workflow. Measured as: matrix rows executed with evidence (target: all 60, each with transcript→route→plan→chart trace and a failure-layer code on failure) and re-executable after every voice-path change at a fraction of first-run cost.
- **Why a skill:** the workflow is multi-step, judgment-bearing (attributing a failure to 1 of 9 layers requires reading telemetry + chart state), evidence-producing, and must be repeated across regressions and both STT providers. CI can't do it (needs live credentials, real audio, human mic/device rows); a plain prompt loses the procedure between sessions.
- **Why existing tooling is insufficient:** built-in `/verify` drives an app but knows nothing of the matrix, the failure taxonomy, or the transcript-trace method; nothing public is domain-adjacent (searched — `02` §Tally).
- **Effort:** build ~2–4 focused days (it wraps existing assets: the matrix doc, `eval:stage3-intelligence`, diagnostics logging). **Maintenance:** update when the matrix or routing taxonomy changes — same owner and cadence as the Stage 3 docs.
- **Acceptance criteria:** (a) a full run produces a dated evidence file per matrix section; (b) a targeted re-run of any single row is possible; (c) the skill refuses to mark a row PASS without a captured trace; (d) mock-audio rows automated, real-mic rows generate a human checklist.
- **Confidence:** High (need: VERIFIED; design: RECOMMENDATION).

### 2. `perioflow-mutation-safety-review` — BUILD CUSTOM — Tier 1
- **Baseline problem:** all chart writes flow through one dispatcher under contract invariants ("no model mutates directly"; atomic simulate-then-commit; every final transcript gets exactly one outcome), and the stale-ref/state-sync bug class has recurred three times (VERIFIED — PerioFlow `00` §evolution, `11` #4, `13` #7).
- **Expected impact:** every diff touching the mutation path gets a domain-invariant review before merge during Stage 3 closure — the exact period when regression risk is highest. Measured as: zero contract-invariant violations reaching `main`; review findings logged per diff.
- **Why a skill:** the invariants are project-specific and live across code + contract docs; generic `/code-review` cannot know that (e.g.) a new state/ref pair must update synchronously, or that "Applied" claims require full coverage. A skill encodes the checklist once, durably.
- **Effort:** build ~1–2 days (the invariants are already written down in `01-interaction-contract.md` — the skill operationalizes them). **Maintenance:** low; changes only when the contract changes.
- **Acceptance criteria:** review of a seeded known-bad diff (reintroduce a Wave-3-class defect) flags it; review output cites the specific invariant violated.
- **Confidence:** High.

### 3. `webapp-testing` — ADOPT AS-IS — Tier 1
- **Baseline problem:** no browser automation capability exists in PerioFlow at all; DentBridge's Playwright e2e is authored but was never runnable here (VERIFIED — both `08` docs).
- **Expected impact:** the enabling layer for #1, for e2e debugging (D4), and for screenshot evidence in polish audits. Measured as: PerioFlow drivable end-to-end in a scripted browser session within the first week of Tier 1.
- **Why a skill:** browser-driving is a reusable, cross-repo agent capability, not a one-repo script; official and inspectable.
- **Source:** [anthropics/skills — webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) (Anthropic; Apache-2.0 at repo level VERIFIED, per-skill NOT VERIFIED). Executes Playwright scripts (Python) — accepted given provenance.
- **Effort:** install + one afternoon validating against PerioFlow dev server. **Maintenance:** upstream-tracked; pin and update deliberately.
- **Acceptance criteria:** drives PerioFlow's workspace (load, mode switch, manual entry, chart assertion) and captures a screenshot + console log bundle.
- **Confidence:** High.

### 4. `dentbridge-rls-review` — BUILD CUSTOM — Tier 2
- **Baseline problem:** DentBridge's authorization is database-authoritative (17 RLS tables, 36 policies, 25 `SECURITY DEFINER` RPCs — VERIFIED `09`), and both upcoming roadmap steps (PerioFlow integration, Clinical Compass port) add schema. A silent policy weakening is the platform's worst-case failure and is invisible to generic review.
- **Expected impact:** every migration/route diff reviewed against the codified invariants (anon lockdown, role re-checks inside RPCs, no service-role in request paths, tenant scoping). Measured as: seeded policy-weakening diff is flagged; zero RLS regressions in release evidence.
- **Why a skill vs. tooling:** Supabase MCP `get_advisors` gives platform-generic advice (NOT A SKILL, complementary — `07`); CI can lint SQL syntax but not authorization *intent*. The invariant list is DentBridge-specific.
- **Effort:** build ~2–3 days (mining the invariants from the migration history is most of it). **Maintenance:** append-only as new tables/policies land.
- **Acceptance criteria:** documented invariant register + red-team fixture diffs (a policy drop, an RPC missing role re-check) all flagged.
- **Confidence:** High.

### 5. `release-candidate-verification` — BUILD CUSTOM — Tier 2
- **Baseline problem:** DentBridge's release process is strong but manual-evidence-based, and it has already produced one **stale security claim** — release report says 0 vulnerabilities while `npm audit` shows 5 highs today (VERIFIED — `09`, `12`). PerioFlow will need the same discipline with none of the process.
- **Expected impact:** a repeatable RC workflow that gathers **dated** evidence (audit output, coverage incl. the safety-module floor, CI status, e2e result, migration state) and refuses to sign with stale/missing items. Measured as: no release doc ships with an undated or contradicted security claim again.
- **Why a skill:** the *enforcement* pieces are CI (`07`), but assembling a coherent, human-readable RC evidence bundle across CI artifacts, checklists, and repo state — and stopping on contradictions — is judgment + orchestration.
- **Effort:** ~2 days; encodes the existing 25-item gate register (`docs/PRODUCTION_RELEASE_GATES_2026-07-11.md`). **Maintenance:** follows the gate register.
- **Acceptance criteria:** running it against today's `main` correctly **fails** the RC (5 high advisories, 0% safety-classifier coverage) — the baseline gives us a built-in negative test.
- **Confidence:** High.

### 6. `frontend-design` — ADOPT AS-IS (with a repo-instruction leash) — Tier 2
- **Baseline problem:** roadmap steps 3–4 are explicit polish phases; PerioFlow's UI has never had a design pass and DentBridge's polish is iterative-by-commit (VERIFIED — P14/D12 evidence in `01`).
- **Expected impact:** measurably less generic UI output during polish work. Measured via #7's scored audits improving release-over-release, and via human review acceptance rate of polish PRs.
- **Why a skill:** design judgment is exactly the fuzzy, generative guidance LLM instructions are for; no CI equivalent exists.
- **Source:** [anthropics/claude-code frontend-design](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md); [Anthropic blog](https://claude.com/blog/improving-frontend-design-through-skills). Instruction-only (no shell).
- **Caveat (RECOMMENDATION):** pair with a one-paragraph repo instruction subordinating "distinctiveness" to DentBridge's clinical-trust brand (navy `#0d1f54`, bilingual EN/TR, patient-facing conservatism).
- **Effort:** install + instruction paragraph. **Maintenance:** upstream-tracked. **Confidence:** High.

### 7. `ui-ux-suite` — ADAPT (fork + pin) — Tier 2
- **Baseline problem:** polish needs *measurement*, not just guidance — otherwise "improves quality" is exactly the unfalsifiable claim this strategy bans.
- **Expected impact:** scored 12-dimension audits (UX laws, WCAG/APCA contrast, touch targets) per key route, giving polish phases numeric before/after deltas. Measured as: audit score deltas tracked per release for the 5 highest-traffic routes of each product.
- **Source:** [Aboudjem/ui-ux-suite](https://github.com/Aboudjem/ui-ux-suite) — zero required deps; optional Playwright deep mode. License/maintenance **NOT VERIFIED** → pre-install checklist (`08`) mandatory; fork + pin; deep mode off initially.
- **Adaptation:** add DentBridge brand tokens + EN/TR rule to the rubric; align output format with `release-candidate-verification` evidence.
- **Effort:** vet + fork + rubric edit ~1–2 days. **Maintenance:** ours after fork (deliberate — stability over upstream drift). **Confidence:** Medium.

### 8. `a11y-audit` — ADAPT (fork + pin) — Tier 2
- **Baseline problem:** zero accessibility posture in both products; institutional pilots raise the stakes (VERIFIED — PerioFlow `11` #10; DentBridge `10`).
- **Expected impact:** judgment-layer a11y review (semantics, keyboard flows, ARIA correctness) on top of a deterministic axe CI job (`07`). Measured as: axe-critical count → 0 and kept there by CI; skill findings tracked to closure before each pilot.
- **Source:** [snapsynapse/skill-a11y-audit](https://github.com/snapsynapse/skill-a11y-audit) (primary) / [airowe/claude-a11y-skill](https://github.com/airowe/claude-a11y-skill) (reserve). Both single-maintainer, license/maintenance **NOT VERIFIED** → this is the **highest-risk third-party item we actually recommend adopting**; fork + pin + line-review required (`08`).
- **Effort:** vet + fork + restrict ~1–2 days. **Maintenance:** ours after fork. **Confidence:** Medium.

### 9. `compass-content-review` — BUILD CUSTOM — Tier 3
- **Baseline problem:** Clinical Compass has a rich pedagogical model and 1 of ~485 topics authored; nothing enforces content quality, EN/TR parity, evidence-level honesty, or clinical-safety tone at authoring time (VERIFIED — CC `00`, `14` Critical-2).
- **Expected impact:** authoring throughput with a quality floor: every authored topic gets a structured review (completeness per the TopicCard model, citation presence, supervisor-escalation guidance, bilingual parity) before `reviewStatus` advances. Measured as: % of authored topics passing on first review; reviewer-found defects per topic trending down.
- **Why a skill:** this is repeatable editorial judgment against a codified rubric — the canonical skill shape. CI can check field presence; it cannot judge whether a mini-scenario teaches the right escalation behavior.
- **Effort:** ~2 days once the content model is frozen. **Maintenance:** follows `src/types/compass.ts`. **Confidence:** High on need; timing depends on roadmap step 6.

### 10. `mobile-app-design` — ADAPT (fork + rewrite) — Tier 3
- **Baseline problem:** roadmap step 7 (iPhone/Android from one codebase); current evidence favors the PWA/wrapper path (VERIFIED — PWA shell present, native deferred, portable API substrate; DentBridge `10`).
- **Expected impact:** HIG/Material-grounded review lens for the wrapper transformation (touch targets, navigation idioms, safe areas, offline behavior). Measured as: mobile audit checklist pass rate on the 10 core screens before store submission.
- **Source:** [awesome-skills/mobile-app-design](https://github.com/awesome-skills/mobile-app-design) as raw material; **rewrite anchored on Apple HIG and Material 3 primary sources** (per the official-guidance-first rule). Provenance NOT VERIFIED → fork + review.
- **Effort:** deferred to Tier 3; ~2–3 days then. **Confidence:** Medium-Low today, deliberately deferred.

### 11. `skill-creator` — ADOPT AS-IS — Tier 1 (enabler)
- **Baseline problem:** five custom skills must be authored consistently, portably (Claude Code now, Codex `.codex/skills/` compatibility desired — `02` ground rules), and with test fixtures per their contracts.
- **Expected impact:** custom skills conform to the Agent Skills spec on first review. Measured as: each custom skill passes its own contract's test fixtures at delivery.
- **Source:** [anthropics/skills](https://github.com/anthropics/skills) (skill-creator). **Effort:** trivial. **Confidence:** High.

---

## DO NOT USE (summary — full rationale in `02`)

| Candidate | One-line reason |
|---|---|
| `obra/superpowers` | Workflow-takeover scope + hooks/WebSocket server; conflicts with established process; duplicates built-ins. Highest-risk candidate evaluated. |
| `pr-review-toolkit`, `security-guidance`, `commit-commands` (official) | Redundant with built-in `/code-review`, `/security-review`, `/review` present in this environment. |
| Anthropic document skills, `mcp-builder`, `artifacts-builder` | No baseline finding served. |
| `masuP9/a11y-specialist-skills` | Second a11y voice; conflict > marginal value. |
| `airowe/claude-a11y-skill` | Held as reserve only; one a11y skill maximum. |
| `gregorymm/design-review-plugin` | Single-author pedagogy; full overlap with #6/#7; unmeasurable output. |
| `gotalab/uxaudit` | Journey regression belongs to deterministic Playwright CI. |
| `lackeyjb/playwright-skill` | Overlaps official `webapp-testing`; provenance loses. |
| `wshobson/agents` (incl. mobile-ios-design) | Breadth is the risk; SwiftUI-native focus mismatches the wrapper path. |
| Marketplace-listing mobile/design skills (aggregator-hosted) | No inspectable canonical source — categorical fail. |

## NOT A SKILL (summary — mechanics in `07`)

CI for PerioFlow and Clinical Compass; DentBridge CI extensions (dated `npm audit` gate, coverage floor incl. safety modules, Playwright e2e job, axe job, brand-lexicon grep, migration↔types drift check); Supabase official MCP (read-only) and optional Playwright MCP; Sentry rollout to PerioFlow; docs-currency pointers and integration-boundary go/no-go checklist (repository rules/process); auth/rate-limiting/CSP/cost-instrumentation and all test-writing (engineering work); work-packet verification (built-in `/verify` + reviewer separation per `06`).
