# 11 — Technical Debt

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** enumerate technical debt with severity, priority, impact, and recommended timing.
- **Status:** Baseline (v2). **Scope:** whole repo. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / RECOMMENDATION.

Severity = impact if unaddressed. Priority = when to pick up.

### 1. Stale/unpatched high-severity dependencies (`sharp`, `postcss`)
**Severity:** High · **Priority:** Immediate · **Evidence:** VERIFIED (first-hand `npm audit` = 5 high, 2026-07-27)
`sharp` <0.35.0 (libvips CVEs) sits on the untrusted patient-image path; `postcss` path-traversal advisory. The committed release report claims 0 vulnerabilities — now stale. Fix requires a breaking `sharp` upgrade (`npm audit fix --force`), so plan + regression-test the sanitization pipeline. **Impact:** image-decode CVEs against attacker-supplied files. (See `09`, `13`, `14`.)

### 2. Zero test coverage on the AI safety classifier
**Severity:** High · **Priority:** Immediate · **Evidence:** VERIFIED (`patient-intent-router.ts` LF:60 LH:0, first-hand)
The emergency/medical-advice classifier that gates Bridgey's safety behavior has no automated tests, while the rest of the platform has 292. A regression here silently weakens a safety control. **Impact:** undetected safety-routing regressions.

### 3. Zero test coverage on the planner service
**Severity:** Medium-High · **Priority:** Near-term · **Evidence:** VERIFIED (`student-planner.service.ts` LF:162 LH:0)
Largest untested service module. **Impact:** planner correctness regressions ship unnoticed.

### 4. Two "monster" admin client components
**Severity:** Medium-High (maintainability) · **Priority:** Before next admin feature · **Evidence:** VERIFIED
`admin/requests/requests-client.tsx` (1,188) and `admin/requests/[id]/detail-client.tsx` (1,059). The decomposition pattern already exists (`src/components/admin/case-detail/*`); it just hasn't been applied to the client shells. **Impact:** high review cost, regression risk, hard onboarding. The roadmap's hardening sequence has this as its remaining un-done phase (INFERENCE from `docs/PLATFORM_HARDENING_ROADMAP.md`).

### 5. Real-browser e2e never executed here (Playwright uninstalled)
**Severity:** Medium · **Priority:** Before next release · **Evidence:** VERIFIED (`tests/e2e-workflow/README.md`)
A complete browser workflow spec exists but `@playwright/test` is not installed, so it has never run in this repo state. **Impact:** the full cross-portal happy path is unverified end-to-end in a browser.

### 6. Content-hygiene inconsistencies in public copy
**Severity:** Low-Medium · **Priority:** Low · **Evidence:** VERIFIED
"DentiBridge" vs "DentBridge" spelling split (`patient-intent-router.ts` uses "DentiBridge"); self-noted "older malformed founder wording" on footer/Terms (`patient-site-context.ts:172`); "Clinical Compass"/"AI Assistant" advertised as "in development" without implementation. **Impact:** brand/legal-copy inconsistency on public, patient-facing pages.

### 7. Documentation currency: multiple overlapping status docs
**Severity:** Low · **Priority:** Low · **Evidence:** VERIFIED
`PROJECT_STATUS.md` (self-labeled LEGACY/SUPERSEDED), `CURRENT_PROJECT_STATUS.md`, `PROJECT_CONTEXT.md`, plus two engineering-baseline folders now (the earlier `engineering-baseline/` and this `engineering-baseline-v2/`). **Impact:** ambiguity about which doc is authoritative. RECOMMENDATION: add a currency pointer; do not delete.

### 8. Unversioned student/admin APIs
**Severity:** Low-Medium (future-facing) · **Priority:** Before any native/3rd-party client · **Evidence:** VERIFIED (only `v1/` on patient/file routes)
Student/admin routes are unversioned. **Impact:** breaks a future native or external consumer without a compatibility contract. (See `10`.)

### 9. `admin/invitations/route.ts` with no detected HTTP export
**Severity:** Low · **Priority:** Verify soon · **Evidence:** VERIFIED (no GET/POST export found)
Likely a shared module, but confirm it is not an unintended/unguarded endpoint (`05`).

## Not debt (intentional, documented)

- **Database-authoritative mutation via RPCs** — deliberate, and a strength, not debt.
- **`*.tsx` excluded from coverage** — an intentional vitest scope choice (`vitest.config.ts`), reasonable given a separate browser e2e exists.
- **No global client store** — a deliberate simplicity choice given SSR + server-authoritative data.
