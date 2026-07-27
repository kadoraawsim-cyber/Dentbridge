# 04 — Component Inventory

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** the important UI components, their responsibilities, dependencies, and reuse opportunities.
- **Status:** Baseline (v2). **Scope:** `src/app/**/*-client.tsx`, `src/components/**`. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / NOT VERIFIED / RECOMMENDATION.

> DentBridge uses Tailwind v4 + `lucide-react` icons; there is **no third-party component library** (no Radix/shadcn/MUI in `package.json`) (VERIFIED). Interactivity concentrates in per-portal `*-client.tsx` pages; `src/components/**` holds decomposed presentational pieces.

## Largest / highest-attention components (VERIFIED — `wc -l`)

| Component | Lines | Role | Note |
|---|---|---|---|
| `src/app/admin/requests/requests-client.tsx` | **1,188** | Admin/faculty request queue + triage board | **Monster file** — top refactor target (`11`) |
| `src/app/admin/requests/[id]/detail-client.tsx` | **1,059** | Admin/faculty case-detail workspace | **Monster file** — partially decomposed into `src/components/admin/case-detail/*` but the client shell is still large |
| `src/app/personal-data-protection-law/page.tsx` | 966 | KVKK legal page | Static content-heavy |
| `src/app/student/planner/planner-client.tsx` | 868 | Student planner UI (calendar/events) | Depends on `src/components/student/planner/*` |
| `src/components/PublicPatientChatWidget.tsx` | 852 | Bridgey chat widget (public) | Depends on `PublicPatientChatButton`, `/api/chat/patient` |
| `src/app/student/dashboard/dashboard-client.tsx` | 845 | Student dashboard shell | Depends on `src/components/student/dashboard/*` |
| `src/app/patient/status/page.tsx` | 828 | Patient OTP status lookup | |
| `src/components/patient/request/PatientRequestFormSections.tsx` | 817 | Patient intake form sections | Depends on `PatientRequestLayout` |
| `src/components/student/dashboard/StudentActiveCasesSection.tsx` | 775 | Active-cases section | |

## Decomposed component families (VERIFIED — good structure)

- **Admin case-detail** (`src/components/admin/case-detail/`): `CaseHeroSection`, `PatientSummarySection`, `TriagePanel`, `LifecyclePanel`, `TreatmentJourneyPanel`, `StudentRequestsPanel`, `ReviewRecordCard`, `ActivityLogPanel`, `FacultyActionBanner` + `helpers.ts`, `types.ts`, `useAdminCaseLabels.ts`. This is a well-separated feature module; the debt is that `detail-client.tsx` still orchestrates them in one 1,059-line file.
- **Admin dashboard** (`src/components/admin/dashboard/`): `AdminStatsCards`, `AdminInviteCard`, `BulkInvitePanel`, `RecentRequestsSection`, `UrgentQueueSection`, `DashboardHeader/Sidebar` + `badges.ts`, `csv.ts`, `types.ts`, `useDashboardLabels.ts`.
- **Student** (`src/components/student/{dashboard,cases,planner}/`): dashboard sections, `CasePoolCard`, `CasesControls/Header`, planner `PlannerHeader/Hero/Sidebar/Toolbar/EventModal`.
- **Patient** (`src/components/patient/request/`): `PatientRequestLayout`, `PatientRequestFormSections`.

## Shared / public components (VERIFIED)

| Component | Role |
|---|---|
| `PublicPatientChatWidget` / `PublicPatientChatButton` | Bridgey entry points |
| `PublicFooter`, `PublicDocumentHeader` | Public chrome |
| `LanguageSwitcher` | EN/TR toggle (i18n) |
| `InstallBanner` | PWA install prompt (mobile) |
| `DataLoadErrorState` | Standard load-error UI (paired with `src/lib/data/data-load.ts`) |
| `src/components/shared/status-badge.ts`, `admin/dashboard/badges.ts` | Status/badge styling helpers |

## Patterns and observations

- **Label hooks** (`useAdminCaseLabels`, `useDashboardLabels`) centralize i18n strings per feature — good, reusable (VERIFIED).
- **Types colocated** per feature (`types.ts` in each family) — good boundary hygiene (VERIFIED).
- **Reuse opportunity (RECOMMENDATION):** status/badge logic appears in `shared/status-badge.ts`, `admin/dashboard/badges.ts`, and `faculty-status-labels`-related test coverage; consolidate into one status/labeling module to prevent drift between portals. Not verified whether current duplication is behavioral or cosmetic.
- **Reuse opportunity (RECOMMENDATION):** the two admin monster clients should be decomposed the way `case-detail/` already demonstrates — the module pattern exists, it just hasn't been applied to the top-level client shells. See `11`.
- **Accessibility:** no automated a11y assertions were found in `tests/` (VERIFIED absence); a11y posture is **NOT VERIFIED** here. See `10`.
