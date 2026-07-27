# 00 — Executive Decision: DentBridge V1 AI Engineering Skills Strategy

- **Scope:** the reusable AI engineering toolchain (Agent Skills + their boundaries with CI/MCP/hooks/scripts) for the remainder of DentBridge V1 Production, across three separate repositories: `dentbridge-perioflow`, `dental-match` (DentBridge), `clinical-compass`.
- **Authoritative inputs:** the approved engineering baselines (`dentbridge-perioflow/docs/engineering-baseline/`, `dental-match/docs/engineering-baseline-v2/`, `clinical-compass/docs/engineering-baseline-v2/`, incl. `18_DENTBRIDGE_CLINICAL_COMPASS_RELATIONSHIP.md`) plus first-hand repository verification performed for this strategy (see labels below).
- **Date:** 2026-07-28. **Status:** Proposed — nothing in this folder has been installed or implemented. Human approval is required before any Tier 1 action.
- **Labels used throughout this document set:** **VERIFIED** (read directly in a repository or observed first-hand in the working environment), **INFERENCE** (reasoned from verified evidence), **RECOMMENDATION** (judgment call), **NOT VERIFIED** (claim from an external source not independently confirmed).

---

## The decision in one paragraph

Install a deliberately small library of **11 skills** across three tiers — **3 adopted as-is** (all Anthropic-official), **3 adapted forks** (accessibility audit, design audit, mobile design guidance), and **5 built custom** (PerioFlow mutation-safety review, PerioFlow live voice QA, DentBridge RLS/tenant-isolation review, release-candidate verification, Clinical Compass content review) — and deliberately route **twelve other identified needs away from skills entirely** into CI, scripts, MCP connections, and repository rules, because they are deterministic checks that an LLM workflow would only make slower and less reliable. The single highest-return item is the **PerioFlow live voice QA skill**, because it operationalizes the one thing every baseline document independently identifies as the project's largest gap: the 60-scenario manual QA matrix that exists in full detail and has never been executed (VERIFIED — `dentbridge-perioflow/docs/perioflow-stage-3/06-day-3-manual-qa.md`, status "NOT YET EXECUTED").

## Why this shape

1. **The baselines show three repos at three maturities with three different dominant gaps.** PerioFlow's gap is *real-world validation* (zero live browser/microphone/model coverage against ~269 passing deterministic tests — VERIFIED). DentBridge's gap is *verification currency* (5 high `npm audit` advisories contradicting a committed "0 vulnerabilities" release report; a safety classifier at 0% coverage; an authored-but-never-run Playwright e2e — VERIFIED). Clinical Compass's gap is *content, then integrity* (1 of ~485 topics authored; zero tests on the merge/write path — VERIFIED). No generic public skill addresses any of these three directly; each justifies exactly one or two narrow custom skills.
2. **A large fraction of "skill-shaped" needs are already covered by tooling that is present today.** Claude Code ships built-in `/code-review`, `/security-review`, `/verify`, and `/simplify` workflows, and this workspace already has the Vercel plugin's Next.js/React/shadcn/verification skills loaded (VERIFIED first-hand in the working environment, 2026-07-28). Installing public look-alikes of these would add prompt-conflict risk for zero capability gain — the largest single category in the catalog is therefore **DO NOT USE (redundant)**.
3. **Deterministic gates must not become skills.** CI for PerioFlow, a dated `npm audit` release gate, coverage floors, axe-core scans, brand-lexicon checks, and migration↔types drift checks are all cheap, deterministic, and already half-built in DentBridge's real CI (VERIFIED — `.github/workflows/ci.yml` runs typecheck/lint/test/build). Skills complement these by doing what CI cannot: judgment-based review, evidence synthesis, and multi-step orchestration.

## Tier summary (full detail in `04_TIERED_IMPLEMENTATION_PLAN.md`)

| Tier | When | Skills (count) |
|---|---|---|
| **1** | Before continuing significant product work (PerioFlow closure) | `skill-creator` (adopt), `webapp-testing` (adopt), `perioflow-mutation-safety-review` (custom), `perioflow-live-voice-qa` (custom) — **4** |
| **2** | During product polish + integration (roadmap steps 3–5) | `frontend-design` (adopt), `a11y-audit` (adapt), `ui-ux-suite` (adapt), `dentbridge-rls-review` (custom), `release-candidate-verification` (custom) — **5** |
| **3** | Before Clinical Compass build-out / Mobile Transformation / Freeze (steps 6–8) | `compass-content-review` (custom), `mobile-app-design` (adapt) — **2** |

Total: **11** — inside the 10–15 budget, with Tier 3 deliberately under its maximum (RECOMMENDATION: fewer is sufficient there until the mobile decision is concrete).

## Headline classifications (full detail in `03_RECOMMENDED_SKILL_CATALOG.md`)

- **ADOPT AS-IS (3):** `webapp-testing`, `frontend-design`, `skill-creator` — all Anthropic-official, inspectable, permissively licensed.
- **ADAPT (3):** a community accessibility-audit skill (fork + pin + restrict), `ui-ux-suite` design audit (fork + pin), a mobile-design guidance skill (fork + rewrite for the PWA/wrapper path).
- **BUILD CUSTOM (5):** the four DentBridge-specific review/QA workflows plus Clinical Compass content review — each with a minimum contract in `05_CUSTOM_SKILL_CONTRACTS.md`.
- **DO NOT USE (12):** including `obra/superpowers` (highest-risk candidate evaluated — lifecycle-takeover scope, hooks + local WebSocket server, high prompt-conflict risk), redundant official plugins (`pr-review-toolkit`, `security-guidance`, `commit-commands`), overlap-heavy community design/QA skills, and all low-provenance marketplace mobile skills.
- **NOT A SKILL (12 requirements):** routed to CI, scripts, MCP (Supabase official server in read-only mode; optionally Playwright MCP), repository rules, or plain engineering work — see `07_MCP_HOOK_CI_BOUNDARIES.md`.

## What skills cannot fix (be explicit about this)

Skills do not author ~484 missing Clinical Compass topics, do not hold a real microphone in front of a real tablet, do not patch `sharp`/`postcss`, do not add authentication or rate limiting to PerioFlow's token routes, and do not decide pilot scale. Those remain human and engineering work; the skills below only make that work faster, more repeatable, and better evidenced. Full list in `09_FINAL_RECOMMENDATION.md` §5.

## Go / no-go

**GO (RECOMMENDATION)** — on the Tier 1 set only, after human approval, with the supply-chain checklist in `08_SECURITY_AND_SUPPLY_CHAIN_REVIEW.md` applied to every third-party item before installation. Tier 2 and Tier 3 installations are separately gated on reaching their roadmap phases. Nothing installs automatically as a result of this document set.
