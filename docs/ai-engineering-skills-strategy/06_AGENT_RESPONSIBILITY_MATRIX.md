# 06 — Agent Responsibility Matrix

How ChatGPT, Claude Code, Codex, and the human owner divide work across the skills library — with deliberate **non-overlap** and explicit reviewer separation. The principle: **the agent that implements a change never provides the only verification of that change** on any safety- or security-critical surface.

**Capability ground truth**
- **Claude Code** runs Agent Skills natively (VERIFIED — this environment) and has deep repo access.
- **Codex** reads `AGENTS.md` natively (VERIFIED — present in the repos) and reportedly runs the same `SKILL.md` files via `.codex/skills/` (NOT VERIFIED against official OpenAI docs — confirm at Tier 1; until confirmed, Codex participates via `AGENTS.md` instructions + the skills' *outputs*).
- **ChatGPT** does not execute repo-local skills; it consumes their evidence artifacts and produces plans/acceptance criteria.

---

## Role charter

| Agent | Owns | Explicitly does NOT own |
|---|---|---|
| **ChatGPT** | Product planning; roadmap control; UX/decision synthesis from evidence bundles; risk & acceptance review (defining what "done" means before work starts; judging RC bundles and QA evidence against it); drafting the human-facing waiver decisions | Writing code; running skills; asserting anything about repo state it hasn't been shown evidence for |
| **Claude Code** | Implementation; deep repository inspection; **executing the structured-audit skills** (`perioflow-live-voice-qa`, `dentbridge-rls-review`, `release-candidate-verification`, `compass-content-review`, a11y/design audits); authoring the custom skills (with `skill-creator`); bounded workflow execution | Being the sole reviewer of its own safety-critical implementations; roadmap/priority decisions; installing anything without the `08` checklist + human approval |
| **Codex** | **Independent review** of Claude-implemented safety-critical diffs (and vice versa); test execution and re-execution of evidence ("does the RC bundle's claim reproduce?"); secondary implementation capacity for well-specified, non-safety-critical packets | Primary authorship of the custom skills (one author, one toolchain — avoids drift); release sign-off |
| **Human (owner)** | Final approval: skill installations, tier gates, release signatures, clinical-safety-relevant content (Compass ACCEPTs on clinically sensitive topics), all waiver decisions; execution of real-microphone/real-device QA rows | — |

## Per-skill assignment

| Skill | Primary runner | Independent check | Human role |
|---|---|---|---|
| `perioflow-mutation-safety-review` | **Codex** (or Claude) — whichever did NOT write the diff | The non-implementing agent runs it; on BLOCK, implementer responds, reviewer re-runs | Approves merges that override a FINDINGS verdict (never a BLOCK) |
| `perioflow-live-voice-qa` | Claude Code (automated rows) | Codex re-executes a sample of PASS rows from the evidence bundle before pilot decisions | Executes real-mic/device checklist rows; owns pilot go/no-go |
| `webapp-testing` | Claude Code (diagnostic driving) | n/a (capability, not verdict-producing) | — |
| `frontend-design` | Claude Code during polish implementation | ChatGPT reviews before/after against acceptance criteria; `ui-ux-suite` scores provide the numbers | Accepts the visual direction |
| `ui-ux-suite` audit | Claude Code | Codex spot-reproduces scores on 1–2 routes per audit | Reads score deltas in release review |
| `a11y-audit` | Claude Code | CI axe job is the deterministic cross-check (must agree on criticals) | Approves pilot with open non-critical findings |
| `dentbridge-rls-review` | The **non-implementing** agent, always (schema diffs are security-critical by definition) | Supabase MCP `get_advisors` (read-only) as automated cross-check | Approves any waiver; no RLS BLOCK is human-overridable without a written waiver in the RC bundle |
| `release-candidate-verification` | Claude Code assembles | **Codex independently re-runs the dated commands** (`npm audit`, coverage) and countersigns the bundle | Signs the release — only on a double-signed bundle |
| `compass-content-review` | Claude Code | Faculty/human review for clinically sensitive topics (the skill escalates; it cannot ACCEPT those alone) | Advances `reviewStatus`; the skill never does |
| `mobile-app-design` | Claude Code during mobile work | ChatGPT judges checklist evidence vs. store-readiness criteria | Approves submission |
| `skill-creator` | Claude Code | Custom-skill test fixtures (from `05`) are the check | Approves each custom skill before first use |

## Reviewer-separation rules (binding)

1. **Safety-critical surfaces** — PerioFlow mutation path, DentBridge RLS/auth/migrations, Bridgey's `patient-intent-router.ts`, file-sanitization pipeline — require implementer ≠ reviewer, and the reviewer runs the relevant custom skill. Same-agent self-review does not count, regardless of effort level.
2. **Evidence is re-executed, not trusted.** Codex's role on RC bundles is to reproduce, not to reread. A bundle whose commands don't reproduce is NOT SIGNED (matches skill 4's failure behavior).
3. **ChatGPT's judgments bind only through the human.** Its acceptance reviews shape decisions; the human clicks approve.
4. **Disagreement protocol:** reviewer verdict stands until the implementer produces new evidence; ties escalate to the human with both positions quoted. No agent "wins" by rerunning until green.
5. **These rules live here and in each repo's `AGENTS.md`/`CLAUDE.md` once approved** (a follow-up change requiring its own approval — this document does not modify those files).
