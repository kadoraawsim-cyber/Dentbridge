# 14 — Evidence-Based Backlog

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** prioritized backlog, each item traceable to a verified finding.
- **Status:** Baseline (v2). **Scope:** whole repo. **Last reviewed:** 2026-07-27.
- Every item cites the document/evidence that justifies it. No speculative work.

## Critical

1. **Patch the 5 high-severity advisories.** Upgrade `sharp` ≥0.35.0 (breaking) and resolve the `postcss` advisory; regression-test the sanitization pipeline (`image-sanitizer.ts`, `tests/image-sanitizer.test.ts`). *(Ref: `09`, `11.1`, `13.1`)*
2. **Add automated tests for `patient-intent-router.ts`.** Cover emergency detection, emergency negation, medical-advice routing, locale detection. It is a safety control at 0% coverage. *(Ref: `07`, `08`, `11.2`, `13.2`)*
3. **Re-run `npm audit` as a release gate and date-stamp security claims** so a release report can never again assert "0 vulnerabilities" while the tree has highs. *(Ref: `09`, `13.6`)*

## High

4. **Add tests for `student-planner.service.ts`** (0% coverage, 162 LOC). *(Ref: `08`, `11.3`, `13.5`)*
5. **Install and run the existing Playwright e2e** (`tests/e2e-workflow/browser/single-case.spec.mjs`) against staging; wire into the release checklist. *(Ref: `08`, `11.5`, `13.4`)*
6. **Confirm CI gates** (`.github/workflows`): does CI run vitest, typecheck, lint, and enforce a coverage floor? Add what's missing. *(Ref: `08`)*
7. **Decompose the two admin monster clients** using the existing `src/components/admin/case-detail/*` module pattern. *(Ref: `04`, `11.4`, `13.11`)*

## Medium

8. **Define and implement data-retention/erasure** for patient data + audit/consent, and document it against KVKK/GDPR obligations. *(Ref: `09`, `13.9`)*
9. **Add automated accessibility scanning** (axe/pa11y) to CI. *(Ref: `10`, `13.14`)*
10. **Normalize public brand copy:** fix "DentiBridge"→"DentBridge" in `patient-intent-router.ts`, and the self-noted malformed founder wording in footer/Terms. *(Ref: `07`, `09`, `11.6`, `13.13`)*
11. **Add a migration↔types drift check** to CI (regenerate `database.types.ts` and diff). *(Ref: `06`, `13.10`)*
12. **Verify `admin/invitations/route.ts`** is a shared module, not an unguarded endpoint. *(Ref: `05`, `11.9`)*

## Low

13. **Add a currency pointer** across the overlapping status docs and the two engineering-baseline folders (do not delete). *(Ref: `11.7`)*
14. **Introduce API versioning discipline** for student/admin routes before any native/3rd-party consumer. *(Ref: `10`, `11.8`)*
15. **Commit a measured Web-Vitals/Lighthouse baseline** to complement live Speed Insights. *(Ref: `10`)*
16. **Establish a "development" feature governance rule** so UI advertises only shipped features (relevant to "Clinical Compass"/"AI Assistant" placeholders). *(Ref: `07`, `18`)*

## Out of scope for this backlog

- Integrating the sibling `clinical-compass` repo — analyzed separately in `18`; not committed work in `dental-match` today.
- Native iOS/Android — explicitly deferred by `docs/PLATFORM_HARDENING_ROADMAP.md`.
