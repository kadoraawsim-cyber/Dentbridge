# 05 — Custom Skill Contracts

Minimum required contracts for the custom skills that are **genuinely justified**. Per the mandate, ten candidate areas were analyzed; **five are justified as custom skills**, and **five are explicitly not** (dispositions at the end). Nothing here is implemented — these are build specifications awaiting approval.

Common to all five contracts:
- **Owner:** repository maintainer (single-contributor pattern VERIFIED across baselines; reassign per subsystem if the team grows — PerioFlow `13_RISK_REGISTER.md` preamble).
- **Format:** Agent Skills spec (`SKILL.md` + optional scripts), authored with `skill-creator`, kept Codex-portable (`.codex/skills/`) where feasible.
- **Location:** each skill lives in the repository it serves (`.claude/skills/<name>/`); none is global.
- **Permissions baseline:** read-only against the repo unless a row below says otherwise; **no skill may write to application source, migrations, or `.env*`**; evidence output goes only to a dedicated `docs/**/evidence/` or scratch path.
- **Failure behavior baseline:** fail closed — on missing inputs, ambiguous state, or unverifiable claims, stop and report; never emit a passing verdict on partial execution.

---

## 1. `perioflow-mutation-safety-review` (Tier 1)

| Field | Contract |
|---|---|
| **Trigger** | Any diff (PR or working tree) touching `src/features/perioflow/realtime/tool-dispatcher.ts`, `intent-router.ts`, `capture-config.ts`, `chart/model.ts`, `chart/command-parser.ts`, `intelligence/*`, `assistant/*`, or any state/ref pair in `components/perioflow-workspace.tsx`; invoked manually (`/perioflow-mutation-safety-review`) or by team convention before merge |
| **Inputs** | The diff; `docs/perioflow-stage-3/01-interaction-contract.md` (invariant source); the relevant test suites' current pass state |
| **Checks (the invariant register)** | (1) No path other than `dispatchRealtimeToolCall` mutates chart state; (2) model/planner output remains untrusted — proposals re-validated against fresh state before commit; (3) atomic simulate-then-commit preserved, no partial "Applied" claims; (4) every final transcript still reaches exactly one outcome (totality); (5) new/changed state+ref pairs update synchronously (the 3×-recurred bug class — `11_TECHNICAL_DEBT.md` #4); (6) duplicate-suppression stays target-aware; (7) flag gates (`isStage3InteractionEnabled` etc.) not bypassed; (8) no diagnostic/telemetry addition leaks transcripts or keys |
| **Outputs** | Markdown review: verdict (PASS / FINDINGS / BLOCK) + per-finding invariant citation and location |
| **Permissions** | Read-only; may run `npm run test:parser/realtime/ui` (read-only side effects: compiled test dirs) |
| **Stop conditions** | Diff touches none of the trigger paths (report "not applicable", do not review filler); interaction contract missing/moved; test suites already red before the diff |
| **Evidence produced** | Review file per invocation (`docs/perioflow-stage-3/evidence/reviews/<date>-<branch>.md`) |
| **Failure behavior** | Any invariant ambiguity ⇒ BLOCK with a question, never PASS-with-caveats |
| **Test fixtures** | (a) Reintroduced Wave-3-class stale-ref defect ⇒ must BLOCK citing invariant 5; (b) a diff adding a direct `setChart` call from an assistant path ⇒ must BLOCK citing invariant 1; (c) a benign i18n string change in trigger files ⇒ must PASS |
| **Maintenance burden** | Low — changes only when the interaction contract changes; review the register at each stage milestone |

## 2. `perioflow-live-voice-qa` (Tier 1)

| Field | Contract |
|---|---|
| **Trigger** | Manual (`/perioflow-live-voice-qa [row-range \| all \| changed-paths]`); expected cadence: full run before any pilot/release, targeted rows after any voice-path change |
| **Inputs** | Running localhost dev server; live `OPENAI_API_KEY` (+ `DEEPGRAM_API_KEY` when testing that provider); `docs/perioflow-stage-3/06-day-3-manual-qa.md` (the 60-row matrix — canonical, the skill must not fork it); prepared audio fixtures (recorded WAV per scripted utterance) for automatable rows |
| **Scripts/checks** | Playwright-driven browser session (via `webapp-testing` patterns) with Chrome fake-audio-capture flags feeding fixture audio; per row: capture raw/assembled/normalized transcript, route decision, plan, policy outcome, chart delta, cursor, UI state from the app's diagnostics; compare against the matrix's expected columns; on failure assign a failure-layer code (1–9) per the matrix's own taxonomy; separately: one live Deepgram `/v1/auth/grant` + WebSocket handshake probe (risk register #13) |
| **Outputs** | (a) Filled matrix section per run (dated); (b) failure-layer histogram; (c) human checklist for rows requiring a real microphone/device (Safari/iPad AudioWorklet, long-session row 48) with exact steps and recording columns |
| **Permissions** | Read repo; **network to OpenAI/Deepgram with live keys** (cost-bearing — a run must print its estimated/actual session-minutes); write only under `docs/perioflow-stage-3/evidence/live-qa/` |
| **Stop conditions** | Keys absent; dev server not up; matrix file changed shape (stop, don't guess); provider handshake fails (record as the finding, halt dependent rows) |
| **Evidence produced** | Dated evidence bundle per run: matrix results + traces + console/screenshot captures + cost note |
| **Failure behavior** | A row without a captured trace is recorded NOT RUN — never PASS; partial runs are labeled partial in the bundle header |
| **Test fixtures** | (a) A known-good utterance fixture ("probing depth three two three") must yield PASS with full trace; (b) a deliberately ambiguous fixture must route to clarification and be recorded as such; (c) simulated provider-auth failure must produce failure-layer attribution, not a crash |
| **Maintenance burden** | Medium — audio fixtures and matrix stay in sync with the routing corpus; owner updates fixtures when `interaction-corpus.ts` changes |

## 3. `dentbridge-rls-review` (Tier 2)

| Field | Contract |
|---|---|
| **Trigger** | Any diff containing `supabase/migrations/*`, `src/lib/supabase-admin.ts` usage changes, new/modified `src/app/api/**` route auth logic, or `database.types.ts` regeneration; manual invocation before schema-bearing releases |
| **Inputs** | The diff; the invariant register (mined at build time from the migration history — anon lockdown, role re-checks, function permission reconciliation, VERIFIED patterns in `09_SECURITY_PRIVACY_AND_DATA_FLOW.md`); optionally, live `get_advisors` output from the **read-only** Supabase MCP connection for cross-check |
| **Checks** | (1) Every new table ships RLS-enabled with explicit policies before first use; (2) every new/changed `SECURITY DEFINER` RPC re-checks `auth.jwt() app_metadata role` and locks rows where it mutates; (3) no anon grant widens (compare against the lockdown migrations); (4) service-role client never enters a request path reachable by users; (5) storage access stays signed-URL, fail-closed; (6) new tables carrying patient data appear in audit/consent coverage; (7) migration has a rollback note; (8) types regenerated when schema changed |
| **Outputs** | Review verdict + per-finding citation of invariant and migration/file location |
| **Permissions** | Read-only repo; MCP access **only** via the read-only Supabase connection; never executes SQL writes |
| **Stop conditions** | Diff has no schema/auth surface (report not-applicable); invariant register missing; MCP unavailable (proceed, mark advisor cross-check SKIPPED) |
| **Evidence produced** | Review file per invocation under `docs/engineering-baseline-v2/evidence/rls-reviews/` (or successor evidence dir) |
| **Failure behavior** | Unresolvable authorization intent ⇒ BLOCK with the exact question for the human |
| **Test fixtures** | (a) Fixture migration dropping a policy ⇒ BLOCK; (b) fixture RPC without role re-check ⇒ BLOCK; (c) fixture adding a properly-locked table ⇒ PASS |
| **Maintenance burden** | Low-Medium — append new invariants as the schema grows; revisit at each release |

## 4. `release-candidate-verification` (Tier 2)

| Field | Contract |
|---|---|
| **Trigger** | Manual, at RC time for either product (`/release-candidate-verification <repo> <ref>`); also dry-runnable anytime |
| **Inputs** | The RC ref; the product's gate register (DentBridge: `docs/PRODUCTION_RELEASE_GATES_2026-07-11.md` 25 items; PerioFlow: to be authored during Tier 2 by copying the pattern); CI artifacts |
| **Checks** | (1) CI green **on this ref** (not "recently"); (2) `npm audit` executed **now**, output dated and embedded — never quoted from a prior report (the stale-claim failure mode is VERIFIED history: release report said 0 while 5 highs exist — DentBridge `09`); (3) coverage report present with named safety modules (`patient-intent-router.ts`, `student-planner.service.ts`) meeting floor; (4) browser e2e result attached (once C5 lands); (5) migration state matches `database.types.ts`; (6) RLS review (skill 3) evidence present for schema-bearing RCs; (7) rollback steps stated; (8) open Critical/High baseline-backlog items either closed or explicitly waived by the human with a name and date |
| **Outputs** | RC evidence bundle (one Markdown file + attachments) ending in SIGNED / NOT SIGNED |
| **Permissions** | Read-only repo; runs read-only commands (`npm audit`, coverage, test invocations); writes only the bundle |
| **Stop conditions** | Any check unexecutable ⇒ NOT SIGNED with the missing item named (no partial signatures) |
| **Evidence produced** | Dated bundle per RC under `docs/release-evidence/` |
| **Failure behavior** | Contradiction between a committed claim and live output ⇒ NOT SIGNED + the contradiction quoted verbatim |
| **Test fixtures** | Run against today's `main`: must return NOT SIGNED citing the 5 high advisories and the 0%-coverage safety classifier — the baseline supplies this negative test for free |
| **Maintenance burden** | Low — follows the gate register; one register per product |

## 5. `compass-content-review` (Tier 3)

| Field | Contract |
|---|---|
| **Trigger** | Manual per authored topic/batch (`/compass-content-review <topic-id \| category>`); convention: required before `reviewStatus` advances past draft |
| **Inputs** | The topic's full TopicCard content (base + overlay merge); `src/types/compass.ts` (the frozen contract per relationship doc §7); the source registry |
| **Checks** | (1) Structural completeness — every pedagogical field non-empty and on-model; (2) EN/TR parity — both locales present, semantically equivalent, no untranslated leakage; (3) citation discipline — claims map to registered sources; `evidenceLevel` honest (no "high evidence" without a source); (4) clinical-safety tone — supervisor-escalation guidance present where the model requires it; no diagnostic/treatment overreach beyond educational scope (mirroring the non-diagnostic principle PerioFlow holds across 4 prompt surfaces — VERIFIED); (5) pedagogy — mini-scenario and reflection question actually exercise the topic; "what not to say" is concrete; (6) no patient-identifying content in examples |
| **Outputs** | Per-topic verdict (ACCEPT / REVISE with itemized reasons) + batch summary table |
| **Permissions** | Read-only; never writes content or advances `reviewStatus` itself — humans do that |
| **Stop conditions** | Content model changed since the skill's rubric (stop, flag for rubric update); topic missing one locale entirely (auto-REVISE, skip deep review) |
| **Evidence produced** | Review records per batch under `docs/content-review/` |
| **Failure behavior** | Clinical-safety doubt ⇒ REVISE + escalate to human faculty review, never ACCEPT-with-note |
| **Test fixtures** | (a) The 1 currently-authored topic (the only real content — VERIFIED) as the calibration case; (b) a fixture topic with EN/TR divergence ⇒ REVISE; (c) a fixture claiming high evidence with no source ⇒ REVISE |
| **Maintenance burden** | Medium during authoring push (rubric evolves with editorial policy), low after |

---

## Analyzed and NOT justified as custom skills

| Mandated area | Disposition | Why |
|---|---|---|
| DentBridge mobile & clinical workflow audit | **ADAPT** `mobile-app-design` (Tier 3) + built-in review skills | The mobile lens is generic HIG/Material knowledge applied to our screens — public raw material exists; the clinical-workflow half is already covered by DentBridge's well-tested lifecycle backend (VERIFIED `08`) plus `webapp-testing`-driven walkthroughs. A custom skill would restate public guidance. |
| Visual/product polish review | **ADOPT** `frontend-design` + **ADAPT** `ui-ux-suite` | Generative guidance + scored audit fully cover the need; the only DentBridge-specific part (brand tokens, EN/TR, clinical tone) fits in a one-paragraph repo instruction and a rubric edit — far below custom-skill weight. |
| Work-packet verification | **Built-in `/verify`** + reviewer separation (`06`) | Driving the affected flow end-to-end is exactly what the built-in does; the missing ingredient is process (implementer ≠ verifier), not tooling. |
| Documentation synchronization | **CI script + repository rule** (`07`) | The observed failures are deterministic: stale currency markers, contradicted claims, boilerplate READMEs (VERIFIED in all three baselines). A grep-able currency-header convention + CI check beats a judgment skill; judgment-level doc review is a normal prompt. |
| Integration-boundary review (PerioFlow→DentBridge, Compass→DentBridge) | **Process checklist**, human-gated | It is a small number of one-time go/no-go design decisions against the already-written prerequisites (`18_…RELATIONSHIP.md` §8) — not a repeatable workflow. Encoding a one-shot decision as a skill creates dead tooling; the schema-level enforcement it implies is exactly what `dentbridge-rls-review` (recurring) already covers. |
