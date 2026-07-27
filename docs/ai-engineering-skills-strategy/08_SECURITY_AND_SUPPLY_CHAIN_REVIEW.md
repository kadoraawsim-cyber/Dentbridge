# 08 — Security and Supply-Chain Review

Risks of adopting third-party Agent Skills into the DentBridge workspace, and the approval checklist that must pass **before any installation**. Context that raises the stakes: `dental-match` handles real patient-identifiable data (VERIFIED — `09_SECURITY_PRIVACY_AND_DATA_FLOW.md`), and live provider API keys exist in PerioFlow's `.env.local` (VERIFIED — names only, `09_SECURITY_REVIEW.md`).

## Threat model for skills (what a malicious or sloppy skill can actually do)

A skill is **instructions the agent follows plus optional scripts it may execute**. The realistic risk classes, in descending severity for this workspace:

1. **Instruction-level injection / behavior steering.** A skill's SKILL.md is trusted prompt content. A malicious or compromised skill can instruct the agent to exfiltrate file contents, weaken code it touches, or quietly disable checks. This is the defining risk of the format — it needs no script to be dangerous.
2. **Script execution.** Skills that bundle scripts (`webapp-testing`'s Playwright runners, a11y scanners) execute with the developer's local privileges: read `.env.local` (live OpenAI/Deepgram keys — VERIFIED present), read patient-adjacent code and fixtures, make network calls.
3. **Dependency chains.** Skills that `npm/pip install` at run time import the whole registry-compromise surface (typosquats, hijacked maintainers) — the same class as the `sharp`/`postcss` advisories already live in DentBridge (VERIFIED), but *unpinned and executed on a dev machine*.
4. **Silent upstream drift.** An installed skill tracking a moving branch can change behavior after review. What was audited is not what runs.
5. **License/IP contamination.** Low probability, nonzero: forked skill text with unclear licensing embedded into shipped docs or code.
6. **Cost abuse.** A skill with live keys can burn provider spend (PerioFlow's own baseline flags unbounded-billing exposure as its #2 risk — the same logic applies to agent tooling).

**Deliberate mitigations already in this strategy's shape:** zero hooks (the auto-executing artifact class — `07`); MCP limited to one official read-only connection; only 3 third-party (non-Anthropic) items recommended at all, all as **pinned forks**; skills never granted write access to app source, migrations, or `.env*` (contract baseline in `05`).

## Pre-installation approval checklist (mandatory, per item, human-signed)

| # | Check | Pass bar |
|---|---|---|
| 1 | **Provenance** | Named author/org with verifiable identity; canonical repo (no aggregator-hosted copies — the reason the mcpmarket mobile family was rejected outright in `02`) |
| 2 | **License** | OSI license present and compatible; recorded in our fork's README. Any candidate whose license cannot be confirmed is blocked (several shortlist items are currently **NOT VERIFIED** on this — the checklist is where that resolves) |
| 3 | **Full-text read** | Every line of SKILL.md + every bundled script read by a human (or by an agent with the human reviewing the summary **and** diffs). No skipping "obvious" files — instruction injection hides in prose |
| 4 | **Execution surface inventory** | List every command the skill can run, every path it writes, every network destination. Anything touching `.env*`, credentials, or non-scratch writes → reject or strip in the fork |
| 5 | **Dependency freeze** | No runtime `npm/pip install` of unpinned packages; vendored or lockfile-pinned only |
| 6 | **Fork + pin** | Third-party items install **only from our fork at a reviewed commit SHA**. Upstream pulls are deliberate PRs re-passing checks 3–5. Never track a branch |
| 7 | **Least privilege** | Install into the one repo that needs it, not user-global; declare needed permissions; deny-by-default for the rest |
| 8 | **Conflict review** | Diff the skill's instructions against built-ins and already-installed skills for contradictory guidance (the reason duplicate review/a11y/design voices were rejected in `02`/`03`) |
| 9 | **Test-fixture run** | Run the skill against its acceptance fixture (per `03`/`05`) in a repo checkout containing **no live secrets** before first real use |
| 10 | **Registration** | Entry in a skills register (name, version/SHA, scope, owner, install date, review date) — the currency problem the baselines document for docs applies to tooling too |

**Standing rules after installation:** re-run checks 3–5 on every upstream pull; quarterly register review retires unused skills (aligned with the `04` rule: two missed acceptance criteria ⇒ removal); any skill observed attempting an out-of-inventory action is removed immediately and the incident recorded.

## Per-item risk assessment (the recommended library only)

| Item | Origin | Executes scripts? | Risk | Verdict |
|---|---|---|---|---|
| `skill-creator`, `frontend-design` | Anthropic | No (instruction-only; confirm at install) | Low | Adopt after checklist |
| `webapp-testing` | Anthropic | **Yes** (Python Playwright) | Low-Medium — official provenance, but it drives a browser and runs local servers; keep fixtures/secrets separated per check 9 | Adopt after checklist |
| `ui-ux-suite` fork | Community (Aboudjem) | Optional deep mode (Playwright/axe) | Medium — zero-dep default is the mitigation; **install with deep mode stripped** | Adapt after checklist |
| `a11y-audit` fork | Community (snapsynapse or airowe) | **Yes** (scanning stack) | **Highest-risk item recommended for adoption** — single-maintainer provenance + script execution + likely runtime installs. Checklist items 3–6 are non-negotiable; if it fails, fall back to CI-5 (axe) alone and defer the judgment layer to unassisted review | Adapt only if checklist passes |
| `mobile-app-design` fork | Community (awesome-skills) | No (guidance) | Low-Medium (instruction-injection class only); rewrite-on-fork reduces it further | Adapt at Tier 3 |
| 5 custom skills | In-house | Bounded, self-specified (`05`) | Low — main risk is scope creep; contracts cap permissions | Build |
| Supabase MCP (read-only) | Supabase official | n/a (connection) | Medium if misconfigured — the credential **bypasses RLS**; read-only mode + non-production scoping are mandatory (`07` MCP-1) | Connect per constraints |

**Highest-risk candidate evaluated overall:** `obra/superpowers` — rejected in `02` (hooks + local WebSocket server + lifecycle-takeover instruction scope). Its rejection is itself a supply-chain decision: quality and popularity were not in question; surface area was.

## Incident response (keep it proportionate)

If a skill is suspected compromised or misbehaving: (1) remove it from the repo(s); (2) rotate any credentials its execution surface could have read (PerioFlow provider keys rotate cheaply — VERIFIED both are single-purpose server-side keys); (3) diff recent agent-authored changes on surfaces the skill touched; (4) record the incident in the skills register. No standing monitoring infrastructure is warranted at this team size (RECOMMENDATION) — the register plus rotation discipline is the right weight.
