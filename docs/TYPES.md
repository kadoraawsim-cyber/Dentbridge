# TypeScript & Type Safety

Status: IMPLEMENTED / PHASE 9. This document records the DentBridge type
architecture and the conventions introduced by Phase 9 (Type Safety) of
[PLATFORM_HARDENING_ROADMAP.md](./PLATFORM_HARDENING_ROADMAP.md).

Phase 9 changed compile-time contracts only. Runtime behavior, API responses,
database schema, RLS, and UI are identical before and after.

---

## 1. Generated Supabase types

- **`src/lib/database.types.ts`** is generated from the local schema with:

  ```bash
  supabase gen types typescript --local > src/lib/database.types.ts
  ```

- Regenerate it after **every** schema migration and commit the result with the
  migration. The file must never be hand-edited.
- All three Supabase clients are typed with `Database`:
  - `src/lib/supabase.ts` (browser, anon key)
  - `src/lib/supabase-server.ts` (server, cookie session)
  - `src/lib/supabase-admin.ts` (service role)
- Because the clients are typed, `select/insert/update/delete` payloads and row
  results are checked against the real schema. Handwritten row interfaces on
  query results are only needed when narrowing (e.g. status literal unions) —
  and must stay consistent with the generated `Tables<'…'>` shapes.

### Nullability rule

The generated types exposed real nullability the handwritten types had hidden
(e.g. `patient_requests.status`, `consent`, `created_at` are nullable;
`student_planner_events.id` is a **bigint → `number`**). View-model types now
mirror that nullability, and UI code keeps its existing defensive `(x || '')`
style. Do not "fix" nullable columns by asserting non-null in code; either
handle the null or change the schema in a reviewed migration.

## 2. Where shared types live

| Kind | Location |
| --- | --- |
| Generated database schema | `src/lib/database.types.ts` |
| Service-role client type (`SupabaseAdminClient`) | `src/lib/supabase-admin.ts` |
| Service HTTP result (`ServiceResponse`) + actor identities (`StudentActor`, `FacultyActor`) | `src/lib/api/service-types.ts` |
| Public API error codes | `src/lib/api/errors.ts` |
| Case lifecycle statuses, actions, transitions | `src/lib/cases/case-lifecycle.ts` (Phase 7 source of truth) |
| Case timeline view types | `src/lib/case-timeline.ts` |
| Audit actions/categories | `src/lib/audit/audit.service.ts` |
| File statuses/constants | `src/lib/files/file.constants.ts` |
| Locale | `src/lib/i18n` (`Locale`) — import with `import type` from server code |
| Per-screen view models | colocated `types.ts` under `src/components/<area>/…` |

Per-screen view models (e.g. the several `PatientRequest` shapes) are
**intentionally different projections** of the same table — they document which
columns each screen actually selects. Do not merge them into one wide type.

## 3. Conventions

- **No `any`.** The codebase has zero `any` and zero `@ts-ignore` /
  `@ts-expect-error`. Keep it that way; model narrow structural types instead
  (see the cookie shim in `supabase-server.ts`).
- **Explicit route contracts.** Every API route handler is annotated
  `: Promise<NextResponse>` and parses its body into a typed shape.
- **Explicit service results.** Services return `ServiceResponse`,
  `ServiceResult<T>`, or a named result union — never implicit `any`.
- **Type predicates at boundaries.** Lifecycle precondition guards
  (`canAddProgressFromStatus`, `canSubmitStageForReview`, …) accept
  `string | null` and narrow to `CaseStatus` on success, so nullable DB
  statuses are checked once and trusted after.
- **Literal unions over strings** where the DB enforces a CHECK constraint
  (e.g. `MyRequest['status']`). When a generated `string` needs narrowing to
  such a union, do it at the fetch boundary with a comment naming the
  constraint that makes the assertion sound.
- **Documented type bridges only.** The single sanctioned cast pattern is a
  named helper with a comment explaining why it is sound (e.g.
  `toPlannerEventIdFilter` — bigint column, string route param, PostgREST
  coerces). Never inline `as unknown as` without a named, documented reason.
- **`import type`** for type-only imports, especially when importing from
  client modules (`@/lib/i18n`) into server code — type imports are erased at
  build time.

## 4. Known accepted variance (not debt to "fix" blindly)

- `ServiceResult` (files service, generic) vs `ProfileCompletionResult`
  (profile service) use per-service error-reason unions; unifying them would
  force routes to handle reasons they can never receive.
- The admin dashboard's status badge palette and label fallbacks intentionally
  differ from the case-detail/shared variants (see comments in
  `src/components/admin/dashboard/badges.ts` / `useDashboardLabels.ts`);
  unifying them is a design decision, not a type cleanup.
