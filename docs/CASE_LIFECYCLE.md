# Case Lifecycle

Status: IMPLEMENTED / PHASE 7. This document describes the DentBridge case
lifecycle state machine introduced in Phase 7 of
[PLATFORM_HARDENING_ROADMAP.md](./PLATFORM_HARDENING_ROADMAP.md).

Related docs: [DATABASE.md](./DATABASE.md).

---

## 1. Source of truth

The application-layer source of truth for case lifecycle rules is:

- **`src/lib/cases/case-lifecycle.ts`** — a **pure** module (no database access, no
  Supabase client, no side effects). It defines the valid statuses, the actions
  each actor may take, the allowed transitions and their preconditions, actor
  permission predicates, reusable validation helpers, and the safe, generic
  user-facing messages.
- **`src/lib/cases/case-stage-context.ts`** — a small server-only helper that
  resolves the student's authorized routing-stage context. It was previously
  duplicated verbatim inside two student services and is now shared.

The **database CHECK constraints remain the storage-layer source of truth** for
which status strings are legal. `case-lifecycle.ts` mirrors those constraints and
must stay in sync with them. Do not add a status to the module without a
supporting migration.

Constraint references:

| Domain | Column | Constraint / migration |
| --- | --- | --- |
| Case status | `patient_requests.status` | `patient_requests_status_check` (`20260416`, widened by `20260509000000`) |
| Routing stage status | `case_routing_stages.status` | `case_routing_stages_status_check` (`20260707`) |
| Student request status | `student_case_requests.status` | `student_case_requests_status_check` (`20260415`, widened by `20260421`) |
| Planner lifecycle state | `student_planner_events.lifecycle_state` | `student_planner_events_lifecycle_state_chk` (`20260509010000`) |

---

## 2. Statuses

### Case status (`patient_requests.status`)

`submitted`, `under_review`, `matched`, `student_approved`, `contacted`,
`appointment_scheduled`, `in_treatment`, `faculty_review`, `completed`,
`rejected`, `cancelled`.

### Routing stage status (`case_routing_stages.status`)

`draft`, `released`, `student_assigned`, `contacted`, `appointment_scheduled`,
`in_treatment`, `faculty_review`, `completed`, `cancelled`.

### Student request status (`student_case_requests.status`)

`pending`, `approved`, `rejected`, `revoked`.

### Planner lifecycle state (`student_planner_events.lifecycle_state`)

`active`, `historical`, `stale`, `cancelled` (nullable).

No new statuses were introduced in Phase 7. The module exposes exactly the sets
above.

---

## 3. Transitions

Phase 7 preserves the existing behavior exactly. The tables below document the
transitions as they are currently enforced by the services; the module encodes
these rules without widening or narrowing them.

### Faculty / admin case actions (`admin-case-actions.service.ts`)

| Action | Precondition (case status) | Result |
| --- | --- | --- |
| `save_draft` | none | case → `under_review` |
| `update_triage` | none (reason required if department changes) | triage fields only; status unchanged |
| `approve` | none | ensure a `released` routing stage; case → `matched` |
| `reject` | none | case → `rejected` |
| `return_to_pool` | `student_approved` \| `contacted` \| `appointment_scheduled`; approved request exists; reason required | approved request → `revoked`; case → `matched` |
| `approve_student_request` | request+stage consistent | request → `approved`; stage → `student_assigned`; case → `student_approved`; other pending requests → `rejected` |
| `reject_student_request` | request exists; reason required | request → `rejected` |
| `undo_reject_student_request` | request exists; reason required | request → `pending` |
| `release_next_stage` | case `faculty_review`; department provided | new routing stage (`released`, next sequence); case → `matched` |
| `mark_contacted` | none | case → `contacted` |
| `mark_appointment_scheduled` | none | case → `appointment_scheduled` |
| `mark_in_treatment` | none | case → `in_treatment` |
| `mark_completed` | none | case → `completed` (+ `routing_completed_at`) |
| `mark_cancelled` | none; reason required | case → `cancelled` |

Note: faculty/admin lifecycle actions (`mark_*`) intentionally do **not** enforce
a "from" status precondition. This mirrors current behavior and Phase 7 did not
add such checks.

### Student case actions (`student-case-status.service.ts`, `student-progress.service.ts`)

Every student action requires the student to hold an **approved**
`student_case_requests` row for the case (enforced by `case-stage-context.ts`).

| Action | Required current case status | Result |
| --- | --- | --- |
| `mark_contacted` | `student_approved` | case + stage → `contacted` |
| `mark_appointment_scheduled` | `contacted` | case + stage → `appointment_scheduled`; progress entry + planner event |
| `mark_in_treatment` | `appointment_scheduled` | case + stage → `in_treatment`; progress entry |
| `reschedule_appointment` | `appointment_scheduled` \| `in_treatment` | status unchanged; `rescheduled` progress entry + planner update |
| `submit_stage_for_review` | `in_treatment` (routing stage required) | case + stage → `faculty_review` |
| add progress note | `in_treatment` | append-only progress entry; status unchanged |

### Student case request (`student-case-request.service.ts`)

| Precondition | Result |
| --- | --- |
| case status `matched` and current routing stage `released` | new `student_case_requests` row (`pending`) |

---

## 4. Actor permissions

- **patient / anonymous** — has no authenticated case actions and can never
  change clinical workflow status.
- **student** — may perform only the student case actions above, and only on
  cases they have an approved request for. `isStudentActor(role)` is the role
  gate.
- **faculty / admin** — may perform the faculty/admin case actions above.
  `isFacultyActor(role)` (i.e. `canAccessFacultyPortal`) is the role gate.
- **service role** — bypasses RLS by design. Every service therefore still
  enforces session identity, role, and row ownership/eligibility explicitly.
  The lifecycle module supplies the role gate and the transition rules; it does
  not replace the per-request ownership checks.

---

## 5. What Phase 7 changed

- Added `src/lib/cases/case-lifecycle.ts` as the single source of truth for
  statuses, actions, transitions, permissions, validation helpers, and safe
  messages.
- Extracted the duplicated `getAuthorizedStageContext` (previously copied in
  `student-case-status.service.ts` and `student-progress.service.ts`) into the
  shared `src/lib/cases/case-stage-context.ts`.
- Refactored the four case services to consult the module instead of local
  copies:
  - `admin-case-actions.service.ts` — action validity, the lifecycle
    action→status map, return-to-pool eligibility, release precondition, stage
    `released` writes, and the faculty role gate now come from the module.
  - `student-case-status.service.ts` — action validity, expected-status
    transition resolution, reschedule/submit preconditions, `faculty_review`
    writes, planner `active` state, and the student role gate now come from the
    module; the shared stage-context helper is imported.
  - `student-progress.service.ts` — the in-treatment precondition, role gate,
    and shared stage-context helper now come from the module.
  - `student-case-request.service.ts` — the matched-case and released-stage
    preconditions, duplicate-request message, `pending` request status, and role
    gate now come from the module.

## 6. What Phase 7 intentionally did NOT change

- No new statuses, transitions, or permissions. Behavior is preserved exactly.
- No database schema, migration, or RLS changes.
- No API route signatures or response shapes changed.
- No UI changes (Phase 8) and no generated Supabase types (Phase 9).
- No formal test framework added (Phase 10). See Verification below.
- Faculty/admin `mark_*` actions still have no "from status" precondition; this
  was not tightened.
- Raw write payloads that set a single-use status literal (e.g. the student
  request `approved`/`rejected`/`revoked` transitions inside the admin service)
  were left as-is where they are not shared decision logic; a fuller
  literal→constant sweep is a safe optional follow-up, not required by Phase 7.

---

## 7. Verification (Phase 10 will formalize)

There is no test runner in the repo yet, and Phase 7 must not introduce one.
The transition rules are small and pure, so they can be verified by inspection
and by the existing build/typecheck/lint plus manual QA:

Static verification:

- `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass.
- The module's status sets match the DB CHECK constraints listed in section 1.

Manual behavior verification (mirrors
[MANUAL_DEPLOYMENT_CHECKLIST.md](./MANUAL_DEPLOYMENT_CHECKLIST.md)):

- Student advances an approved case `student_approved → contacted →
  appointment_scheduled → in_treatment`, then `submit_stage_for_review` →
  `faculty_review`; each step out of order returns a generic 409.
- Student progress note allowed only while `in_treatment`.
- Faculty approve/reject a student request; approve moves the case to
  `student_approved` and the stage to `student_assigned`.
- Faculty `return_to_pool` only from `student_approved` / `contacted` /
  `appointment_scheduled`; case returns to `matched`.
- Faculty `release_next_stage` only from `faculty_review`.
- Student case request only succeeds while the case is `matched` and its stage
  is `released`.

Phase 10 should convert the section-3 tables into unit tests of the pure module
(`resolveStudentLifecycleTransition`, `canReturnCaseToPool`, `canReleaseNextStage`,
the action guards) plus API-level transition tests.
