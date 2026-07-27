# 13 — Risk Register

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** engineering risks with likelihood, impact, evidence, mitigation, owner.
- **Status:** Baseline (v2). **Scope:** whole repo. **Last reviewed:** 2026-07-27.
- Labels in Evidence column: VERIFIED / INFERENCE. Likelihood/Impact are RECOMMENDATION-level judgment. **Owner** = "Repository maintainer" (INFERENCE — no `CODEOWNERS`).

| # | Risk | Likelihood | Impact | Evidence | Mitigation |
|---|---|---|---|---|---|
| 1 | `sharp`/libvips CVEs exploited via a crafted patient-uploaded image | Medium | High (RCE-class on the image path; PHI exposure) | VERIFIED — `npm audit` 5 high, `sharp`<0.35 on `image-sanitizer.ts` path | Upgrade `sharp` ≥0.35.0 (breaking); regression-test sanitization; keep magic-byte pre-checks |
| 2 | Safety-classifier regression weakens Bridgey emergency/medical-advice handling undetected | Medium | High (patient-safety-adjacent, public surface) | VERIFIED — `patient-intent-router.ts` 0% coverage | Add unit tests (emergency, negation, medical-advice, locale); treat as a safety gate in CI |
| 3 | `postcss` path-traversal advisory | Low-Medium | Medium (build/tooling) | VERIFIED — audit | Update transitive `postcss`; verify `overrides` actually resolves |
| 4 | Full cross-portal workflow breaks in a real browser (never run here) | Medium | Medium-High (release confidence) | VERIFIED — Playwright uninstalled | Install + run `single-case.spec.mjs` against staging each release |
| 5 | Planner service defects (0% coverage) | Medium | Medium | VERIFIED — 0% coverage, 162 LOC | Add tests; consider narrowing scope until covered |
| 6 | Release/security docs drift from reality (report says 0 vulns; today 5 high) | High (already occurred) | Medium (false assurance) | VERIFIED — report vs. fresh audit | Re-run `npm audit` per release; date-stamp security claims |
| 7 | Authz mistake at the Node layer | Low | High if it occurred | INFERENCE — mitigated by RLS + RPC re-checks | Keep DB-authoritative RPCs; test negative-authz paths (some exist) |
| 8 | PHI leakage via logs/Sentry | Low | High | VERIFIED mitigation — `sentry-privacy.ts` tested | Maintain scrubbing tests; audit new log sites |
| 9 | Data-retention/erasure obligations unmet (KVKK/GDPR) | Medium | Medium-High (legal) | NOT VERIFIED — no retention automation found | Define + implement retention/erasure; document |
| 10 | Migration/type drift (`database.types.ts` vs. schema) | Low-Medium | Medium | INFERENCE — no CI drift check verified | Add a generate-and-diff CI check |
| 11 | Large admin components accrete more logic, compounding regression risk | Medium | Medium | VERIFIED — 1,188 / 1,059 LOC | Decompose using the existing `case-detail/*` pattern |
| 12 | Twilio/OpenAI outage degrades patient status/chat | Low-Medium | Medium | VERIFIED — hard dependencies | Graceful 503s exist; consider status-page + retry/backoff |
| 13 | Public copy inconsistencies ("DentiBridge", stale founder wording) reach patients | Medium | Low-Medium (brand/legal) | VERIFIED | Normalize brand name; fix footer/Terms copy |
| 14 | No a11y validation → institutional/accessibility non-conformance | Medium | Medium | VERIFIED absence | Add axe/pa11y automation before broad rollout |

## Risks explicitly NOT elevated

- **Core authz architecture** — defense-in-depth (RLS + RPC role re-checks + route guards) makes a single-layer mistake non-catastrophic; not a top risk.
- **Secret exposure in git** — `.env*` ignored, no committed secrets found; low risk.
