# 06 — State and Data Management

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** where data lives, who owns it, how it is synchronized, and how client state is managed.
- **Status:** Baseline (v2). **Scope:** Supabase schema/migrations + `src/lib/**` + client `*-client.tsx`. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / NOT VERIFIED / RECOMMENDATION.

## System of record (VERIFIED)

**Supabase Postgres is the single source of truth.** There is no other datastore. Data ownership is enforced by **17 RLS-enabled tables, 36 policies, and 25 `SECURITY DEFINER` functions** (counted across `supabase/migrations/*`). Client and Node state are always projections of the database.

## Core data domains (VERIFIED from migration filenames + `src/lib/database.types.ts`)

| Domain | Representative tables/artifacts | Migration evidence |
|---|---|---|
| Patient requests / cases | `patient_requests`, case routing stages | `20260413…baseline`, `20260509010000_case_routing_stages_foundation` |
| Student case requests | `student_case_requests` (+ revoked state) | `20260414010000`, `20260421000000_student_case_requests_revoked` |
| Case progress | case progress entries | `20260424000000_case_progress_entries` |
| Case decisions history | append-only decision log | `20260711020000_release_case_decision_history` |
| Faculty access | faculty profiles + case access | `20260420000000`, `20260420010000_faculty_profiles` |
| Files | `patient_files` (quarantine/link/orphan) | `20260709000000_patient_files`, `20260709020000_backfill` |
| Audit & consent | audit_logs, consent_records | `20260708030000`, `20260708040000_phase4_enterprise_audit_consent_hardening` |
| OTP | otp_codes | `20260708000000_otp_codes` |
| Rate limits | durable rate-limit table | `20260711010000_release_durable_rate_limits` |
| Planner | student planner + case links | `20260424010000_student_planner_case_links` |

## Mutation ownership boundary (VERIFIED — the key invariant)

Sensitive mutations do **not** happen via ad-hoc table writes from the Node layer. They happen through **atomic `SECURITY DEFINER` RPCs** that re-check the caller's JWT role, lock rows `FOR UPDATE`, validate the state transition, and write history in one transaction. Examples: `submit_patient_request_atomic`, `admin_*_with_decision`, `admin_set_student_request_decision`, `claim_orphan_patient_files`/`complete_patient_file_cleanup`, `consume_rate_limit`. Broad/anon write paths were progressively revoked (`20260708020000_revoke_anon_patient_request_insert`, `20260709010000_revoke_patient_upload_insert`, `20260418010000_remove_broad_patient_upload_reads`). This is the platform's strongest data-integrity property.

## Read ownership (VERIFIED)

Student reads go through dedicated RPCs/views (`student_pool_cases`, `student_active_cases`, `student_requested_case_overview`) plus RLS, so a student can only see pool cases and cases they are assigned to. Patient reads are gated behind OTP (`get_request_status_by_phone`). Faculty/admin reads are role-gated.

## Client state (VERIFIED)

- **No global client store** (no Redux/Zustand/Jotai in `package.json`) (VERIFIED). Client state is **local component state** in per-portal `*-client.tsx` pages, hydrated from server-rendered props and refreshed via `src/lib/api/portal-fetch.ts` calls to `/api/*`.
- **i18n state** is provided by `src/lib/i18n/index.tsx` (React context/provider) with EN/TR dictionaries; `LanguageSwitcher` toggles locale.
- **Data-load error handling** is standardized via `src/lib/data/data-load.ts` + `DataLoadErrorState` (`tests/data-load-errors.test.ts`).

## Synchronization & concurrency (VERIFIED)

- **Concurrency safety is in the database, not the client.** Row locks (`FOR UPDATE`, `FOR UPDATE SKIP LOCKED` for cleanup) and single-statement transitions prevent double-assignment / double-decision. Dedicated tests exercise this: `tests/student-lifecycle-concurrency.test.ts`, `tests/case-lifecycle-transitions.test.ts`, `tests/orphan-cleanup.test.ts`, `tests/atomic-intake-migration.test.ts`.
- **Rate limiting is durable** (DB-backed via `consume_rate_limit`), so limits are consistent across Vercel's stateless function instances (`src/lib/api/durable-rate-limit.ts`, `tests/durable-rate-limit.test.ts`).
- **Sessions:** Supabase Auth cookies via `@supabase/ssr`; cross-portal role mismatch and expired-session handling are explicitly tested (`tests/session-continuity.test.ts`, `tests/session-expiry-ux.test.ts`, `tests/proxy-auth.test.ts`).

## Data-management gaps (RECOMMENDATION)

- The **generated `src/lib/database.types.ts` (1,162 lines)** is the type contract; keep it regenerated in lockstep with migrations (no automated check for drift was found — NOT VERIFIED that CI enforces it).
- No evidence of a formal data-retention job beyond file cleanup; audit/consent retention policy is **NOT VERIFIED** in code.
