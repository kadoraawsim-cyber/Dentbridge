# 18 — DentBridge ↔ Clinical Compass Relationship

- **Repositories compared:** `dental-match` (DentBridge) and `clinical-compass` (Clinical Compass) — two **separate, independent** Git repositories.
- **Purpose:** describe the *actual current* relationship between the two codebases without pretending they are integrated, and lay out prerequisites/sequence for a possible future integration.
- **Status:** Cross-repository analysis. **Scope:** both repos at their audited HEADs — DentBridge `ab36262`, Clinical Compass `db87df5`. **Last reviewed:** 2026-07-27.
- **Every statement is labeled VERIFIED / INFERENCE / RECOMMENDATION.** This document does **not** create or assume a combined architecture.

> Placement note: per the user's chosen layout, this cross-repo report lives in `dental-match/docs/engineering-baseline-v2/18_...` (the requested `docs/engineering-baseline/18_...` was redirected to the v2 subfolder to keep the new baseline set coherent and leave the earlier first-pass baseline untouched).

## 1. Current relationship (VERIFIED)

**There is no integration between the two repositories today. None.**

- **VERIFIED:** DentBridge contains **no code** that imports, calls, links to, or depends on Clinical Compass. The only references are UI/marketing strings: `src/app/students/students-client.tsx` lists `clinicalCompass` in a `developmentFeatureKeys` set (rendered as "in development"), and i18n copy (`src/lib/i18n/translations/en.ts:3086`, `tr.ts:743`) plus Bridgey grounding context (`src/lib/chat/patient-site-context.ts:157-158`) describe Clinical Compass as a planned student feature *"marked as in development on the public student page."*
- **VERIFIED:** Clinical Compass contains **no code** that imports, calls, or depends on DentBridge. It has no Supabase/OpenAI/HTTP client at all. Its only references to DentBridge are **documented intent**: `src/docs/clinical-compass-architecture.md` ("Later DentBridge Integration…") and future-only types in `src/types/compass.ts` (`StudentTopicProgress` commented "Future DentBridge integration contract only"; `FutureClinicalCompassRole = student | admin | super_admin`).
- **VERIFIED:** They are separate repos with different git remotes (DentBridge → `github.com/kadoraawsim-cyber/Dentbridge.git`; Clinical Compass → **no remote**). No shared package, no shared module, no shared types file, no monorepo.

**INFERENCE:** Both sides independently describe the *same future intent* — a Clinical Compass learning module living inside DentBridge — but each only anticipates it; neither has begun it in code.

## 2. Verified shared concepts and duplicated functionality

| Concept | DentBridge | Clinical Compass | Label |
|---|---|---|---|
| Audience & domain | Academic dentistry, students/faculty | Dental students, clinical education | VERIFIED (shared intent) |
| Bilingual EN/TR | `src/lib/i18n` React context + `translations/{en,tr}.ts` | `src/i18n` `[locale]` routing + `dictionaries/{en,tr}.ts` | VERIFIED — **two independent i18n implementations** (duplicated capability, different design) |
| Framework stack | Next 16.2.10, React 19.2.6, Tailwind v4, TS | Next 16.2.9, React 19.2.4, Tailwind v4, TS | VERIFIED — compatible, minor version drift |
| "Clinical Compass" concept | Advertised placeholder | The actual product | VERIFIED |
| Content/learning model | None (DentBridge has no learning-content system) | `TopicCard` pedagogical model + base/overlay store | VERIFIED — **no overlap**; Clinical Compass owns this exclusively |

**INFERENCE:** The duplication that matters for a future merge is the **two separate EN/TR i18n systems** and **two Tailwind setups** — these would need reconciliation, not two of everything.

## 3. Verified / likely integration boundaries

Clinical Compass's own architecture doc (VERIFIED) already decomposes itself along the exact seams DentBridge would need:

- **Public content reads** (categories/topics/sources) — role-agnostic, cacheable.
- **Per-student progress writes** (`StudentTopicProgress`) — owned by a user id.
- **Editorial operations** (create/edit/publish content) — role-protected (`admin`/`super_admin`).

**INFERENCE:** These three boundaries map cleanly onto DentBridge's existing model: public reads ≈ DentBridge public pages; per-student progress ≈ a new RLS-owned table keyed by the Supabase user id (DentBridge already does per-user RLS); editorial ops ≈ DentBridge's `admin`/`faculty` role guards + `SECURITY DEFINER` RPC pattern. DentBridge already has the substrate (Supabase Auth, RLS, roles, atomic RPCs) that Clinical Compass says it will need.

## 4. Conflicting architectural / UI assumptions (VERIFIED)

| Dimension | DentBridge | Clinical Compass | Conflict |
|---|---|---|---|
| Persistence | Supabase Postgres + RLS | Local `node:fs` JSON overlays | **Hard conflict** — CC's store must be replaced, not imported |
| AuthZ | Supabase Auth + roles + RLS + RPC re-checks | **None** — two env flags | **Hard conflict** — CC has no auth model to carry over |
| i18n | React context provider + big translation objects | `[locale]` path segments + dictionary files | Design conflict — pick one |
| Routing | Portal-based (`/student`, `/admin`, `/patient`) | `[locale]`-prefixed content routes | Structural difference to reconcile |
| Content editing | N/A | 1,815-line dev Workbench, fs writes | Would be replaced by an authenticated admin surface |

**RECOMMENDATION:** Integration is a **port of the content *model* and reading UI**, plus a **rebuild of the persistence + auth layers** on DentBridge's substrate — not a code-level merge of Clinical Compass as-is.

## 5. Content, identity, data, API, navigation, deployment considerations

- **Content (VERIFIED):** Clinical Compass has the model but ~1 of ~485 topics authored. Integrating an empty module ships an empty feature. Content authorship is a prerequisite independent of engineering.
- **Identity (VERIFIED):** Clinical Compass has no user concept; DentBridge has students/faculty/admins. Progress + editorial features require DentBridge identities.
- **Data (INFERENCE):** The overlay concepts (`overrides`/`custom`/`archivedIds`) translate naturally to rows + soft-delete flags in Supabase; `src/types/compass.ts` is a ready-made contract.
- **API (VERIFIED/RECOMMENDATION):** Clinical Compass's single fs-writing route must be replaced by authenticated DentBridge API routes + RPCs; DentBridge's unversioned student/admin API (see `10`) should gain versioning discipline before absorbing a new surface.
- **Navigation (INFERENCE):** DentBridge would expose Clinical Compass under the student portal (where it is already advertised); the `[locale]` routing must fold into DentBridge's i18n/routing.
- **Deployment (VERIFIED):** DentBridge deploys on Vercel with a real pipeline; Clinical Compass has none and cannot deploy its write path to serverless. Integration inherits DentBridge's deployment — another reason to port, not host separately.

## 6. What should remain separate (RECOMMENDATION)

- **Content authoring workflow and the base catalog** can continue to evolve in `clinical-compass` as a standalone authoring environment until content is substantial and the model stabilizes.
- **The dev Workbench** should **not** move into DentBridge; it should be replaced by an authenticated admin surface.
- Keep the two repos independent until the prerequisites in §8 are met — premature coupling imports risk (see §9).

## 7. What could eventually become shared (RECOMMENDATION)

- **The domain model** (`src/types/compass.ts`) — the natural shared contract.
- **The reading UI components** (`src/components/compass/*`) — reusable inside DentBridge's student portal.
- **DentBridge's substrate** (Supabase Auth, RLS, roles, atomic RPCs, i18n, deployment, observability) — Clinical Compass should consume these rather than reinvent them.

## 8. Prerequisites for a future Clinical Compass integration (RECOMMENDATION)

1. **Substantial authored content** in Clinical Compass (the model proven with real topics).
2. **A Supabase schema + RLS design** replacing the fs JSON overlays (content rows, archival, per-student progress).
3. **An auth/role model** (`student`/`admin`/`super_admin`) mapped onto DentBridge's existing roles, replacing env-flag gating.
4. **i18n + design-system reconciliation** (one EN/TR system, one Tailwind config, one component style).
5. **API versioning discipline** in DentBridge (per `10`).
6. **DentBridge's own Phase-1 hardening done** (patch `sharp`/`postcss`, cover the 0% safety modules — see DentBridge `14`), so a new module doesn't land on an unpatched base.

## 9. Risks of premature merging (VERIFIED basis)

- **Importing an unauthenticated, fs-writing CMS into a patient-data platform** (VERIFIED: Clinical Compass has no auth and writes to disk; DentBridge handles PHI). This is the single biggest risk — it could weaken DentBridge's hard-won security posture.
- **Shipping an empty feature** (VERIFIED: ~1/485 authored).
- **Doubling i18n/design systems** inside one app (VERIFIED: two independent implementations), increasing maintenance surface.
- **Coupling two codebases before the model stabilizes**, making both harder to change (INFERENCE).

## 10. Recommended integration sequence (RECOMMENDATION)

1. **Keep separate now.** Continue Clinical Compass as a standalone authoring prototype; continue DentBridge Phase-1 hardening.
2. **Author content + stabilize the model** in Clinical Compass; freeze `src/types/compass.ts` as the contract.
3. **Design (not build) the Supabase schema + RLS + role model** for content, progress, and editorial ops.
4. **Port the reading UI + model into DentBridge** behind the existing student portal, backed by the new tables (read-only student view first).
5. **Add per-student progress writes** (RLS-owned) once reads are proven.
6. **Add an authenticated editorial admin surface** (replacing the Workbench) last.
7. **Retire the standalone Clinical Compass repo** only after content and editorial workflows live in DentBridge.

**Do not** begin step 4+ as code until steps 1–3 and the §8 prerequisites are satisfied. This document describes a *possible* future; it does not authorize or assume it.
