# 15 — Next Phase Recommendation

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** the lowest-risk execution order for remaining work, derived only from repository evidence.
- **Status:** Baseline (v2). **Scope:** synthesizes `08`–`14`. **Last reviewed:** 2026-07-27.
- Labels: RECOMMENDATION (ordering) grounded in VERIFIED findings.

This is a **hardening-and-verification** sequence, not a rebuild. The architecture is sound (`02`, `12`); the gaps are security currency, coverage of two modules, and one unrun test path.

## Phase 1 — Close the security + safety gaps (do first)

1. **Upgrade `sharp` ≥0.35.0 and resolve `postcss`**; regression-test the sanitization pipeline. This is the only *High* with a live-exploit shape (untrusted image decode). *(`09`, `14.1`)*
2. **Test `patient-intent-router.ts`** to lock the emergency/medical-advice safety behavior before further Bridgey changes. *(`08`, `14.2`)*
3. **Make `npm audit` a dated release gate.** *(`09`, `14.3`)*

**Why first:** these are the two findings that combine real-world exploitability (sharp) and safety-control fragility (0%-covered classifier), and both are cheap relative to their risk.

## Phase 2 — Restore end-to-end release confidence

4. **Install + run the Playwright browser e2e** against staging; add to the release checklist. *(`08`, `14.5`)*
5. **Confirm/complete CI gates** (vitest + typecheck + lint + coverage floor). *(`08`, `14.6`)*
6. **Test `student-planner.service.ts`.** *(`08`, `14.4`)*

**Why second:** once the safety/security floor is set, restore confidence that the *whole* workflow works in a browser and that CI will keep it that way.

## Phase 3 — Maintainability + compliance

7. **Decompose the two admin monster clients** using the existing `case-detail/*` pattern. *(`04`, `14.7`)*
8. **Define + implement data-retention/erasure** and document KVKK/GDPR posture. *(`09`, `14.8`)*
9. **Add a11y automation** and a migration↔types drift check. *(`10`, `06`, `14.9/14.11`)*
10. **Normalize public brand/legal copy.** *(`14.10`)*

**Why third:** these reduce long-term risk and legal exposure but don't block a supervised production/pilot the way Phase 1 does.

## Phase 4 — Future-facing (only after 1–3)

11. **API versioning discipline** across all portals (prerequisite for any native client). *(`10`, `14.14`)*
12. **Evaluate the Clinical Compass relationship** per `18` — decide separate vs. shared *before* writing any integration code.

**Explicitly deprioritized (RECOMMENDATION):** native iOS/Android (the roadmap defers it), and any Clinical Compass code integration (not justified by current evidence; see `18`).

## One-paragraph summary

DentBridge is close to a defensible supervised-production posture. The remaining critical work is small and specific: patch the image-path CVEs, cover the two 0% modules (one of them a safety control), and run the browser e2e that already exists. Do those, confirm CI, then address maintainability and compliance — and only then look at native or cross-product integration.
