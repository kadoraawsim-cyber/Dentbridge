# 09 — Final Recommendation

## 1. The smallest recommended production stack

**11 skills** — deliberately inside the 10–15 budget, with Tier 3 left under-filled:

| Tier | Skills | Class |
|---|---|---|
| 1 (now, before significant product work) | `skill-creator` · `webapp-testing` · `perioflow-mutation-safety-review` · `perioflow-live-voice-qa` | ADOPT ×2 · CUSTOM ×2 |
| 2 (polish + integration) | `frontend-design` · `ui-ux-suite` (fork) · `a11y-audit` (fork) · `dentbridge-rls-review` · `release-candidate-verification` | ADOPT ×1 · ADAPT ×2 · CUSTOM ×2 |
| 3 (Compass build / mobile / freeze) | `compass-content-review` · `mobile-app-design` (fork) | CUSTOM ×1 · ADAPT ×1 |

Plus, **not** as skills: 10 CI items, 1 read-only MCP connection (Supabase official), 5 repository rules, zero hooks, and a defined block of plain engineering work (`07_MCP_HOOK_CI_BOUNDARIES.md`). The already-present built-ins (`/code-review`, `/security-review`, `/verify`, `/simplify`) and Vercel plugin skills are load-bearing parts of the stack that cost nothing (VERIFIED first-hand).

## 2. Total expected benefit (stated measurably, per the quality contract)

- **PerioFlow closure becomes evidenced instead of asserted:** the 60-row QA matrix — the single gap every baseline document converges on (VERIFIED) — gets executed and stays re-executable; regressions on the mutation path get invariant-cited review before merge. Success measure: matrix fully executed with failure-layer attribution before any pilot; zero contract-invariant violations reaching `main`.
- **DentBridge releases can no longer contradict reality:** the stale "0 vulnerabilities vs. 5 highs" failure mode (VERIFIED) becomes structurally impossible — the RC skill fails on undated/contradicted evidence, and its first dry-run **must fail on today's `main`**, which is the built-in proof it works.
- **Polish phases get numbers:** scored design audits + a11y findings registers + CI-held floors replace "looks better." Success measure: score deltas per release on the top-5 routes of each product; axe-criticals pinned at zero.
- **Schema safety scales into integration:** every migration in roadmap steps 5–6 passes a DentBridge-specific RLS review with red-team fixtures proving the reviewer catches policy weakening.
- **Clinical Compass authoring gets a quality floor** before the ~484-topic push, at editorial-review cost instead of rework cost.

## 3. Total implementation effort (estimate; RECOMMENDATION)

| Block | Effort |
|---|---|
| Tier 1: 2 installs + 2 custom builds + fixtures | ~4–7 focused days |
| Tier 1 companions (PerioFlow CI, token-route gating) | ~1–2 days engineering |
| Tier 2: 1 install + 2 vetted forks + 2 custom builds | ~6–9 days |
| Tier 2 companions (CI extensions; the `sharp`/coverage/e2e engineering is roadmap work, not tooling cost) | ~2–3 days |
| Tier 3: 1 custom + 1 fork rewrite | ~4–5 days (deferred) |
| **Total tooling investment across V1** | **≈ 3–4 working weeks, spread across the roadmap** — roughly half of it in Tier 1+2 where the payoff gates the pilot and releases |

## 4. Risks

1. **Skill sprawl / prompt conflict** — capped by the 11-skill budget, the DO-NOT-USE list (12 rejections, mostly for redundancy), the two-strikes removal rule, and zero hooks.
2. **Third-party supply chain** — three community forks only, all pinned + line-reviewed per `08`; the a11y fork is the highest-risk adoption and has a named fallback (CI axe alone).
3. **Custom-skill staleness** — each contract names its sync source (interaction contract, gate register, content model); acceptance fixtures make drift visible.
4. **Codex portability is assumed, not proven** (NOT VERIFIED) — mitigation: confirm at Tier 1 install; until then Codex works via `AGENTS.md` + evidence re-execution, which the responsibility matrix already supports.
5. **Cost-bearing QA runs** — `perioflow-live-voice-qa` spends real provider minutes; its contract requires printing cost per run, which doubles as the first-ever cost-per-session datapoint (baseline risk #3).

## 5. What skills cannot solve (explicit non-goals)

Content authorship (~484 Compass topics — human work); real-microphone/real-device execution (human hands); PerioFlow auth/rate-limiting/CSP/observability/cost instrumentation (product engineering); the `sharp`/`postcss` patch and the two 0%-coverage test suites (engineering); data-retention/erasure design (engineering + policy); pilot-scale and integration go/no-go decisions (human judgment on evidence); and CI/test enforcement itself (deterministic tooling). The library makes all of these better-evidenced and faster — it replaces none of them.

## 6. Go / no-go

**GO — RECOMMENDATION**, scoped as follows:
- Approve **Tier 1 only** now (4 skills + companions). It directly serves the active priority (PerioFlow closure), contains no third-party non-Anthropic code, and its flagship item (`perioflow-live-voice-qa`) attacks the workspace's single most-cited gap.
- Tier 2 approval is gated on Tier 1 exit criteria (`04`); Tier 3 on roadmap steps 6–7 becoming concrete.
- Every third-party item passes the `08` checklist with a human signature before install; the license/maintenance fields currently marked NOT VERIFIED must resolve there.
- Nothing in this document set has been installed, and no code, configuration, existing documentation, or Git metadata was modified in producing it.

## 7. Summary numbers

- Public candidates evaluated: **26** (`02`) · Adopt as-is: **3** · Adapt: **3** · Build custom: **5** · Do not use: **12** · Routed to NOT-A-SKILL mechanisms: **10 CI items, 1 MCP connection, 5 repo rules, 0 hooks**, plus engineering work.
- Highest-ROI item: **`perioflow-live-voice-qa`**. Highest-risk third-party adoption: **the a11y-audit fork**; highest-risk candidate evaluated (rejected): **`obra/superpowers`**.
