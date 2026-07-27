# 07 — MCP / Hook / CI / Skill Boundaries

Which needs belong to Skills versus MCP connections, hooks, scripts, CI, tests, repository rules, or plain engineering. The decision rule applied throughout:

> **If a check is deterministic and its failure should block a merge or release, it is CI (or a test).**
> **If a capability is a live external system the agent must query, it is MCP.**
> **If an action must fire automatically on a harness event, it is a hook.**
> **A Skill is only for judgment-bearing, multi-step, repeatable workflows** — where the output is an assessment, an evidence bundle, or generated work, not a boolean.

Skills that merely re-run deterministic checks are waste (slower, non-blocking, token-priced); CI that tries to encode judgment is noise. Several skills in this library deliberately *sit on top of* CI: the skill supplies judgment and synthesis, CI supplies enforcement.

---

## Routed to CI (deterministic, blocking) — NOT SKILLS

| # | Item | Repo | Status / evidence |
|---|---|---|---|
| CI-1 | Lint + `test:parser` + `test:realtime` + `test:ui` + build on push/PR | PerioFlow | **Missing entirely** (VERIFIED first-hand — no `.github/`); baseline High item `14_BACKLOG.md` #7. Tier 1 companion |
| CI-2 | Dated `npm audit` gate (fail on High+, embed dated output as artifact) | DentBridge, then PerioFlow | Missing (VERIFIED — `ci.yml` has no audit step); directly prevents a recurrence of the stale "0 vulnerabilities" claim (VERIFIED contradiction, `09`) |
| CI-3 | Coverage floor with **named safety modules** (`patient-intent-router.ts`, `student-planner.service.ts`) required at target | DentBridge | Missing (VERIFIED — no coverage step in `ci.yml`) |
| CI-4 | Playwright e2e job (after first manual staging run proves it) | DentBridge | Spec authored, never run (VERIFIED — `tests/e2e-workflow/README.md`) |
| CI-5 | axe-core accessibility scan on key routes | Both web products | Missing (VERIFIED — no a11y tooling anywhere); enforcement layer beneath the `a11y-audit` skill |
| CI-6 | Playwright screenshot/visual-regression snapshots for the chart UI | PerioFlow | Missing (VERIFIED — `08_TESTING_STATUS.md`) |
| CI-7 | Brand-lexicon grep ("DentiBridge", malformed founder wording patterns) | DentBridge | Findings VERIFIED (`11.6`); a 10-line script, not a skill |
| CI-8 | Migration ↔ `database.types.ts` drift check (regenerate + diff) | DentBridge | Baseline item `14.11` |
| CI-9 | lint + `tsc --noEmit` (+ Vitest when tests exist) | Clinical Compass | Missing entirely (VERIFIED — no `.github/`, no test/typecheck script); Tier 3 companion |
| CI-10 | Docs-currency check: every doc under `docs/` carries a status/date header; known-superseded paths listed in an allowlist file | All three | Doc-currency confusion VERIFIED in all three baselines (three generations of audit material in PerioFlow; overlapping status docs in DentBridge; two baseline folders each) |

## Routed to MCP (live external systems) — NOT SKILLS

| # | Connection | Mode & constraint | Serves |
|---|---|---|---|
| MCP-1 | **Supabase official MCP server** ([official connector](https://supabase.com/blog/supabase-is-now-an-official-claude-connector)) | **Read-only mode only** (`?read_only=true`); it authenticates with service-role-level credentials that **bypass RLS** — treat as admin access; never connected writable to production; scoped to the DentBridge project | `get_advisors` security/RLS recommendations as the automated cross-check inside `dentbridge-rls-review`; schema inspection |
| MCP-2 | **Playwright MCP** ([microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)) | **Deferred** — `webapp-testing`'s script approach covers current needs with a smaller standing surface; revisit if tool-call browsing proves better for polish audits | (contingent) |
| MCP-3 | Anything else (Figma MCP is already present in the environment) | No new MCP connections proposed | — |

## Routed to hooks — currently: NONE (RECOMMENDATION)

No baseline finding requires event-triggered automation beyond what CI provides. Candidate considered and rejected for now: a pre-commit hook running PerioFlow's test suites (redundant once CI-1 exists; the suites are also slow enough (`tsc` per suite — VERIFIED script structure) to make a blocking local hook hostile). Revisit only if CI turnaround becomes a real bottleneck. Keeping the hook surface at zero also keeps the supply-chain review (`08`) simple — hooks execute automatically and are the highest-trust artifact class.

## Routed to repository rules (`AGENTS.md` / `CLAUDE.md` additions, post-approval) — NOT SKILLS

| # | Rule | Serves |
|---|---|---|
| R-1 | Reviewer-separation rules from `06` (safety-critical surfaces list included) | Process integrity |
| R-2 | Brand/design leash paragraph for `frontend-design` (clinical-trust tone, navy `#0d1f54`, EN/TR parity duty) | Polish phases |
| R-3 | Docs-currency convention (status header; where the authoritative baseline lives) | All repos |
| R-4 | Integration-boundary go/no-go checklist pointer → `18_DENTBRIDGE_CLINICAL_COMPASS_RELATIONSHIP.md` §8; "no integration code before the checklist passes with human sign-off" | Roadmap steps 5–6 |
| R-5 | "UI advertises only shipped features" governance rule (DentBridge `14.16`) | Public-copy honesty |

## Routed to engineering work (product code / tests) — NOT SKILLS, NOT TOOLING

Rate limiting + access gates on PerioFlow token routes; CSP/security headers for PerioFlow (copy DentBridge's `next.config.ts` suite — VERIFIED in-house template exists); Sentry + non-PHI counters for PerioFlow; AI cost instrumentation; `sharp`/`postcss` patch + sanitization regression tests; tests for the two 0%-coverage DentBridge modules; Vitest coverage for Clinical Compass `repository.ts`/content route; data-retention/erasure design; API versioning; component decompositions; dead-code removal; READMEs.

## Routed to monitoring automation — NOT SKILLS

Sentry (already Ready in DentBridge — VERIFIED `12`) extended to PerioFlow; Vercel Speed Insights (already wired in DentBridge — VERIFIED `10`). No skill should ever be the mechanism by which production incidents are noticed.

## The complementarity map (skills ↔ deterministic layer)

| Skill | Deterministic partner | Division of labor |
|---|---|---|
| `a11y-audit` | CI-5 (axe) | CI catches the ~30–50% machine-detectable class and blocks regressions; the skill judges semantics, keyboard flows, ARIA correctness, and writes remediations |
| `release-candidate-verification` | CI-2/3/4 + gate register | CI produces the dated artifacts; the skill assembles, cross-checks for contradictions, and refuses to sign |
| `dentbridge-rls-review` | MCP-1 `get_advisors` + CI-8 | Advisors catch platform-generic issues; the skill reviews DentBridge-specific authorization intent |
| `perioflow-live-voice-qa` | CI-1 + the deterministic suites | Suites pin the pure logic; the skill validates the live seam (browser/audio/network/model) the suites structurally cannot reach (VERIFIED gap — `08_TESTING_STATUS.md`) |
| `perioflow-mutation-safety-review` | CI-1 | CI proves tests pass; the skill judges whether the *change itself* preserves contract invariants tests don't yet encode |
| `ui-ux-suite` | CI-6 (visual snapshots) | Snapshots freeze pixels; the skill scores design quality |
