# 02 — Public Skill Research

All serious candidates reviewed for the DentBridge V1 Skills Library, **including rejected candidates**. Research was performed 2026-07-28 via web search, targeted repository fetches, and — where the capability already exists in the current working environment — first-hand observation.

**Honest scope statement:** for third-party community repositories, license text, last-commit dates, and full source were **not independently line-audited** in this pass unless stated; such fields are labeled **NOT VERIFIED** and the supply-chain checklist in `08_SECURITY_AND_SUPPLY_CHAIN_REVIEW.md` requires completing them **before installation**. No candidate was scored on GitHub stars.

**Compatibility ground rules used below**
- **Claude Code:** native `SKILL.md` support (VERIFIED — this environment).
- **Codex:** multiple 2026 third-party guides report native `SKILL.md` support via `~/.codex/skills/` / `.codex/skills/` and automatic activation ([agensi.io guide](https://www.agensi.io/learn/codex-cli-skills-install-skill-md), [ITECS guide](https://itecsonline.com/post/codex-cli-agent-skills-guide-install-usage-cross-platform-resources-2026)). **NOT VERIFIED against official OpenAI documentation in this pass** — treat as probable but confirm during Tier 1 installation. `AGENTS.md` remains Codex's native instruction file (VERIFIED — present in these repos).
- **ChatGPT (web/app):** does not execute repo-local Agent Skills; it participates by consuming skill *outputs* (reports, evidence bundles) and authoring acceptance criteria. All "ChatGPT compatibility" rows below mean *output-consumer*, not runner.

---

## Group 1 — Already present in the working environment (no installation decision needed)

These were directly observed available in Claude Code in this workspace on 2026-07-28 (VERIFIED first-hand). They form the floor that every candidate below was measured against for overlap.

| # | Capability | What it does | Consequence for this strategy |
|---|---|---|---|
| 1 | Built-in `/code-review` | Effort-leveled correctness/simplification review of the current diff or a PR | Baseline for all review needs; custom review skills must *narrow* it (domain invariants), not duplicate it |
| 2 | Built-in `/security-review` | Security review of pending branch changes | Covers generic injection/XSS/secrets review; makes the official `security-guidance` plugin redundant here |
| 3 | Built-in `/verify` | Exercises a change end-to-end in the real app before commit | Covers generic work-packet verification; a custom "work-packet verification" skill is therefore **not justified** |
| 4 | Built-in `/simplify`, `/review`, `/run` | Cleanup pass; GitHub PR review; app launching | Further reduces the space generic public skills could add value in |
| 5 | Vercel plugin skills (`vercel:nextjs`, `vercel:react-best-practices`, `vercel:shadcn`, `vercel:verification`, deploy/env skills) | Official Next.js/React/shadcn/deployment expertise, already loaded | Next.js 16 / React 19 / Tailwind guidance is **already solved**; no public "Next.js skill" candidates were shortlisted |

## Group 2 — Anthropic-official installable candidates

### 2.1 `webapp-testing` — **shortlisted (ADOPT)**
- **Purpose:** drive local web apps with Python Playwright scripts — server lifecycle, DOM inspection, screenshots, browser logs.
- **Source:** [anthropics/skills — webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing). **Author:** Anthropic. **License:** repo states many skills Apache-2.0 (VERIFIED at repo level via fetch; per-skill file NOT VERIFIED).
- **Maintenance/documentation:** official repo, actively maintained (VERIFIED repo activity; per-skill last-commit NOT VERIFIED). Implementation is transparent scripts + SKILL.md.
- **Executes shell/scripts:** **yes** (Playwright via Python) — acceptable: official provenance, inspectable, and browser automation is inherently execution.
- **Stack fit:** framework-agnostic against a running localhost app → fits Next.js dev servers in all three repos. Requires Python + Playwright browsers on the dev machine (onboarding cost, small).
- **Overlap:** none installed today; PerioFlow has zero browser automation (VERIFIED). Distinct from CI-owned Playwright e2e (deterministic) — this is exploratory/diagnostic driving.
- **Baseline findings served:** P1, P7, P8, P10, D4 (`01_BASELINE_NEEDS_MAP.md`).
- **Confidence:** High for fit; Medium for effort until the Python dependency is confirmed acceptable.

### 2.2 `frontend-design` — **shortlisted (ADOPT)**
- **Purpose:** prescriptive guidance for distinctive, production-grade UI — typography, motion, spatial composition; explicitly anti-"AI slop".
- **Source:** [anthropics/claude-code — frontend-design plugin](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md); background: [Anthropic blog — Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills). **Author:** Anthropic. **License:** claude-code repo licensing (NOT VERIFIED per-file).
- **Executes shell:** no (instruction-only) → low risk.
- **Stack fit:** direct — it targets exactly the React/Tailwind surface both products use.
- **Overlap:** complements (does not duplicate) `vercel:shadcn` (component mechanics) — this governs *design judgment*. Complements `ui-ux-suite` (audit/scoring) — this is generative.
- **Baseline findings served:** P14, D12 (roadmap steps 3–4 polish).
- **Risk:** its "avoid system fonts / be distinctive" stance must be **subordinated to DentBridge's existing brand and clinical-trust tone** via a repository instruction; without that, it could push patient-facing pages toward flashiness (RECOMMENDATION — noted as an adaptation-by-instruction, not a fork).
- **Confidence:** High.

### 2.3 `skill-creator` — **shortlisted (ADOPT)**
- **Purpose:** authoring aid for writing well-structured skills (the 5 custom skills in `05_CUSTOM_SKILL_CONTRACTS.md` are its immediate workload).
- **Source:** [anthropics/skills](https://github.com/anthropics/skills) (skill-creator folder; VERIFIED repo, folder listing NOT VERIFIED in this fetch). **Author:** Anthropic.
- **Executes shell:** minimal/none (NOT VERIFIED; confirm at install).
- **Overlap:** none. **Baseline findings served:** X1. **Confidence:** High (low stakes either way).

### 2.4 Anthropic document skills (docx/pdf/pptx/xlsx) — **rejected (DO NOT USE)**
Office-document production is not a DentBridge V1 need; PerioFlow's print/PDF path is product code. Zero baseline findings served. Source: [anthropics/skills](https://github.com/anthropics/skills).

### 2.5 `mcp-builder`, `artifacts-builder` (anthropics/skills) — **rejected (DO NOT USE)**
No MCP server is being built (we only *consume* official MCP servers, see `07`); artifacts are not a product surface. Zero baseline findings served.

### 2.6 Official marketplace plugins: `pr-review-toolkit`, `security-guidance`, `commit-commands` — **rejected (DO NOT USE — redundant)**
- **Source:** [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) (Apache-2.0 at marketplace level, VERIFIED via fetch).
- All three duplicate capability already present first-hand (Group 1: `/code-review`, `/security-review`, `/review`; git/commit discipline is already clean across repos — VERIFIED from git status/history in baselines). Installing parallel review stacks is the textbook prompt-conflict risk this strategy is required to avoid. Re-evaluate only if the built-ins are ever removed from the environment.

## Group 3 — Community candidates

### 3.1 `obra/superpowers` — **rejected (DO NOT USE) — highest-risk candidate evaluated**
- **Purpose:** a full agentic development lifecycle framework (~12+ chained skills: brainstorming → worktrees → planning → subagent execution → TDD → review), MIT-licensed, accepted into the official marketplace Jan 2026, actively maintained (releases 5.0.1–5.0.7 in 2026). Sources: [GitHub via research roundups](https://awesomeclaudeskills.com/skill/obra/superpowers), [guide](https://pasqualepillitteri.it/en/news/215/superpowers-claude-code-complete-guide). (Claims NOT VERIFIED against the repo directly.)
- **Why rejected despite quality:** (a) it **takes over the whole development workflow**, directly conflicting with the fixed DentBridge roadmap, the agent-responsibility split in `06`, and PerioFlow's established stage-gated process; (b) it ships **hooks and a local WebSocket brainstorm server** — the largest execution surface of any candidate; (c) it duplicates built-in review/verify flows; (d) its value is highest for teams *without* an established process — all three baselines show the opposite (documented stage reports, release gates, correction passes). Popularity (40.9k stars) was explicitly not treated as a quality signal.

### 3.2 `snapsynapse/skill-a11y-audit` — **shortlisted (ADAPT)**
- **Purpose:** WCAG 2.1 AA scanning with template-aware sampling, remediation hints, progress tracking. **Source:** [github.com/snapsynapse/skill-a11y-audit](https://github.com/snapsynapse/skill-a11y-audit). **License/maintenance/author org:** NOT VERIFIED — must be completed pre-install per `08`.
- **Executes shell:** yes (scanning) → **fork + pin + review required** (ADAPT, not ADOPT).
- **Baseline findings served:** P9, D7 (both products have zero a11y posture — VERIFIED).
- **Adaptation:** restrict to our routes/stack; wire outputs to the axe-core CI job (`07`) so the skill supplies *judgment and remediation*, CI supplies *enforcement*.
- **Confidence:** Medium — capability match is clear; provenance homework outstanding.

### 3.3 `airowe/claude-a11y-skill` — **runner-up (DO NOT USE unless 3.2 fails vetting)**
- axe-core + jsx-a11y audits ([github.com/airowe/claude-a11y-skill](https://github.com/airowe/claude-a11y-skill)). Single-author; overlaps 3.2 entirely. Keep exactly one a11y skill. License/maintenance NOT VERIFIED.

### 3.4 `masuP9/a11y-specialist-skills` — **rejected (DO NOT USE)**
Knowledge-based WCAG 2.2/APG review without a scanning harness ([repo](https://github.com/masuP9/a11y-specialist-skills/)); overlaps the judgment layer of 3.2 while adding a second a11y voice — conflict risk exceeds marginal value.

### 3.5 `Aboudjem/ui-ux-suite` — **shortlisted (ADAPT)**
- **Purpose:** scored design audit across 12 dimensions grounded in 24 named UX laws with primary-source citations; WCAG + APCA + OKLCH; **zero required dependencies**, optional `playwright-core`/`@axe-core/playwright` deep mode (measured contrast, <44px touch-target flags, route screenshots). **Source:** [github.com/Aboudjem/ui-ux-suite](https://github.com/Aboudjem/ui-ux-suite). **License:** NOT VERIFIED (repo description reviewed only).
- **Why shortlisted:** it is the only audit-style candidate that produces **scored, repeatable, citation-grounded output** — exactly the "measurable acceptance criteria" the polish phases need; zero-dep default keeps the execution surface small.
- **Adaptation:** fork + pin; disable deep mode initially; add DentBridge brand tokens (navy `#0d1f54`, EN/TR review rule) to the rubric.
- **Baseline findings served:** P14, D12. **Confidence:** Medium (pre-install vetting outstanding).

### 3.6 `gregorymm/design-review-plugin` — **rejected (DO NOT USE)**
Design review derived from one design school's video lectures ([repo](https://github.com/gregorymm/design-review-plugin)); single-author pedagogy, full overlap with `frontend-design` + `ui-ux-suite`, no measurable output format.

### 3.7 `gotalab/uxaudit` — **rejected (DO NOT USE)**
UX regression across user journeys ([repo](https://github.com/gotalab/uxaudit)); the journey-regression need is better served deterministically by DentBridge's existing (unrun) Playwright spec in CI + `webapp-testing` for diagnosis. Overlap without a distinct niche.

### 3.8 `lackeyjb/playwright-skill` — **rejected (DO NOT USE)**
Model-invoked Playwright automation ([repo](https://github.com/lackeyjb/playwright-skill)); direct overlap with the official `webapp-testing` (2.1), which wins on provenance.

### 3.9 `awesome-skills/mobile-app-design` — **shortlisted (ADAPT, Tier 3)**
- **Purpose:** mobile UI/UX guidance — iOS HIG, Material Design, touch targets/thumb-zone ergonomics, accessibility, React Native patterns. **Source:** [github.com/awesome-skills/mobile-app-design](https://github.com/awesome-skills/mobile-app-design). **License/author org/maintenance:** NOT VERIFIED.
- **Why ADAPT not ADOPT:** roadmap step 7 is "iPhone and Android **from the same codebase where practical**" — i.e., most plausibly PWA/wrapper (Capacitor-style) over the existing Next.js app (INFERENCE from `10_PERFORMANCE_AND_MOBILE_REVIEW.md`: PWA shell exists, native explicitly deferred, favorable API substrate). The fork strips React-Native-native content and re-anchors on HIG/Material *as applied to a wrapped web app*. Primary sources (Apple HIG, Material 3) become the cited authority, satisfying the "official vendor guidance first" rule.
- **Baseline findings served:** D13, P8 (tablet framing). **Confidence:** Medium-Low today (Tier 3 decision can be revisited when mobile is concrete).

### 3.10 `wshobson/agents` (incl. `mobile-ios-design`) — **rejected (DO NOT USE)**
Large general-purpose subagent/skill collection; the mobile skill targets SwiftUI-native development, which is not the chosen path. Breadth of the collection is itself the conflict risk.

### 3.11 Marketplace-listing mobile/design skills (mcpmarket.com "mobile-design-*" family, claudedirectory listings, etc.) — **rejected (DO NOT USE)**
Provenance unclear (no inspectable canonical repo identified per listing), authorship anonymous or aggregator-hosted, maintenance unknowable — fails the documented-and-inspectable bar categorically, regardless of description quality.

## Group 4 — Candidates that are infrastructure, not skills (classified NOT A SKILL; detail in `07`)

| # | Candidate | Source | Disposition |
|---|---|---|---|
| 4.1 | **Supabase official MCP server** (`mcp.supabase.com`, 32 tools incl. `get_advisors` security/RLS recommendations) | [Supabase blog — official Claude connector](https://supabase.com/blog/supabase-is-now-an-official-claude-connector) | **Recommended, read-only mode only** (`?read_only=true`); it authenticates with service-role credentials that bypass RLS — never writable against production. Complements (does not replace) `dentbridge-rls-review`. |
| 4.2 | **microsoft/playwright-mcp** (official Playwright MCP server) | [github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | **Optional, deferred.** `webapp-testing`'s script approach covers current needs with a smaller connected surface; revisit if tool-call-style browsing proves better for polish audits. |
| 4.3 | Sentry (error monitoring) | already wired in `dental-match` (VERIFIED) | Monitoring automation; PerioFlow should copy the pattern (engineering). |
| 4.4 | axe-core / Playwright snapshot testing / k6 load tests | standard OSS | CI jobs, not skills. |

---

## Tally

- **Serious public candidates evaluated: 26** (Groups 2–4: 6 official installables/families, 11 community, 4 infrastructure, plus 5 already-present capabilities in Group 1 assessed for overlap).
- **Shortlisted:** 3 ADOPT (2.1, 2.2, 2.3) · 3 ADAPT (3.2, 3.5, 3.9) · 1 runner-up held in reserve (3.3).
- **Rejected (DO NOT USE): 12** — 2.4, 2.5 (two skills counted separately: mcp-builder, artifacts-builder), 2.6 (three plugins), 3.1, 3.3 (reserve), 3.4, 3.6, 3.7, 3.8, 3.10, 3.11 (family).
- **Routed to NOT A SKILL:** Group 4 plus the deterministic needs in `01` — enumerated fully in `07_MCP_HOOK_CI_BOUNDARIES.md`.
- No public candidate exists for: PerioFlow chart-mutation safety review, transcript-to-chart trace QA, DentBridge RLS invariant review, DentBridge release-candidate evidence verification, or Clinical Compass pedagogical content review (searched; nothing domain-adjacent found) → **BUILD CUSTOM ×5**, contracts in `05`.
