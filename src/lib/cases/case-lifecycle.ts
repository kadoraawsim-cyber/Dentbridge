/**
 * Case Lifecycle State Machine — single source of truth (Phase 7).
 *
 * This module centralizes DentBridge's case lifecycle RULES:
 *   - the valid statuses for cases, routing stages, and student requests;
 *   - the actions each actor may perform;
 *   - the allowed transitions and their preconditions;
 *   - reusable validation helpers and safe, generic user-facing messages.
 *
 * It is intentionally PURE: no database access, no Supabase client, no side
 * effects. Server services (admin/student case services) consult this module
 * for decisions and then perform the authorized mutations with the service role.
 *
 * Status sets mirror the database CHECK constraints and MUST stay in sync with
 * them. Do not add a status here without a supporting migration:
 *   - patient_requests.status        -> 20260416 / 20260509000000 (case status)
 *   - case_routing_stages.status     -> 20260707 (stage status)
 *   - student_case_requests.status   -> 20260415 / 20260421 (request status)
 *   - student_planner_events.lifecycle_state -> 20260509010000 (planner state)
 *
 * Phase 7 preserves existing behavior exactly. It does not widen permissions,
 * does not add new statuses, and does not introduce transition checks where the
 * services did not already enforce them.
 */

import { canAccessFacultyPortal, isStudentRole } from '@/lib/roles'

// ─── Case status (patient_requests.status) ──────────────────────────────────

export const CASE_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  MATCHED: 'matched',
  STUDENT_APPROVED: 'student_approved',
  CONTACTED: 'contacted',
  APPOINTMENT_SCHEDULED: 'appointment_scheduled',
  IN_TREATMENT: 'in_treatment',
  FACULTY_REVIEW: 'faculty_review',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const

export type CaseStatus = (typeof CASE_STATUS)[keyof typeof CASE_STATUS]
export const CASE_STATUSES = Object.values(CASE_STATUS) as readonly CaseStatus[]

// ─── Routing stage status (case_routing_stages.status) ──────────────────────

export const STAGE_STATUS = {
  DRAFT: 'draft',
  RELEASED: 'released',
  STUDENT_ASSIGNED: 'student_assigned',
  CONTACTED: 'contacted',
  APPOINTMENT_SCHEDULED: 'appointment_scheduled',
  IN_TREATMENT: 'in_treatment',
  FACULTY_REVIEW: 'faculty_review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export type StageStatus = (typeof STAGE_STATUS)[keyof typeof STAGE_STATUS]
export const STAGE_STATUSES = Object.values(STAGE_STATUS) as readonly StageStatus[]

// ─── Student case request status (student_case_requests.status) ─────────────

export const STUDENT_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVOKED: 'revoked',
} as const

export type StudentRequestStatus =
  (typeof STUDENT_REQUEST_STATUS)[keyof typeof STUDENT_REQUEST_STATUS]
export const STUDENT_REQUEST_STATUSES = Object.values(
  STUDENT_REQUEST_STATUS
) as readonly StudentRequestStatus[]

// ─── Planner lifecycle state (student_planner_events.lifecycle_state) ───────

export const PLANNER_LIFECYCLE_STATE = {
  ACTIVE: 'active',
  HISTORICAL: 'historical',
  STALE: 'stale',
  CANCELLED: 'cancelled',
} as const

// ─── Actions ────────────────────────────────────────────────────────────────

/** Student lifecycle actions that advance the case status directly. */
export const STUDENT_LIFECYCLE_ACTIONS = [
  'mark_contacted',
  'mark_appointment_scheduled',
  'mark_in_treatment',
] as const
export type StudentLifecycleAction = (typeof STUDENT_LIFECYCLE_ACTIONS)[number]

/** All actions a student may take on an approved/assigned case. */
export const STUDENT_CASE_ACTIONS = [
  ...STUDENT_LIFECYCLE_ACTIONS,
  'reschedule_appointment',
  'submit_stage_for_review',
] as const
export type StudentCaseAction = (typeof STUDENT_CASE_ACTIONS)[number]

/** All actions a faculty/admin actor may take on a case. */
export const ADMIN_CASE_ACTIONS = [
  'save_draft',
  'update_triage',
  'approve',
  'reject',
  'return_to_pool',
  'approve_student_request',
  'reject_student_request',
  'undo_reject_student_request',
  'mark_contacted',
  'mark_appointment_scheduled',
  'mark_in_treatment',
  'release_next_stage',
  'mark_completed',
  'mark_cancelled',
] as const
export type AdminCaseAction = (typeof ADMIN_CASE_ACTIONS)[number]

/** Faculty/admin lifecycle actions that set a case status directly. */
export const ADMIN_LIFECYCLE_ACTIONS = [
  'mark_contacted',
  'mark_appointment_scheduled',
  'mark_in_treatment',
  'mark_completed',
  'mark_cancelled',
] as const
export type AdminLifecycleAction = (typeof ADMIN_LIFECYCLE_ACTIONS)[number]

// ─── Transition maps ─────────────────────────────────────────────────────────

/** Case status produced by each student lifecycle action. */
export const STUDENT_LIFECYCLE_ACTION_TO_STATUS: Record<StudentLifecycleAction, CaseStatus> = {
  mark_contacted: CASE_STATUS.CONTACTED,
  mark_appointment_scheduled: CASE_STATUS.APPOINTMENT_SCHEDULED,
  mark_in_treatment: CASE_STATUS.IN_TREATMENT,
}

/** Case status a student action requires the case to already be in. */
export const STUDENT_LIFECYCLE_EXPECTED_STATUS: Record<StudentLifecycleAction, CaseStatus> = {
  mark_contacted: CASE_STATUS.STUDENT_APPROVED,
  mark_appointment_scheduled: CASE_STATUS.CONTACTED,
  mark_in_treatment: CASE_STATUS.APPOINTMENT_SCHEDULED,
}

/** Case status produced by each faculty/admin lifecycle action. */
export const ADMIN_LIFECYCLE_ACTION_TO_STATUS: Record<AdminLifecycleAction, CaseStatus> = {
  mark_contacted: CASE_STATUS.CONTACTED,
  mark_appointment_scheduled: CASE_STATUS.APPOINTMENT_SCHEDULED,
  mark_in_treatment: CASE_STATUS.IN_TREATMENT,
  mark_completed: CASE_STATUS.COMPLETED,
  mark_cancelled: CASE_STATUS.CANCELLED,
}

// ─── Precondition status sets ────────────────────────────────────────────────

/** A student may reschedule only while the case is scheduled or in treatment. */
export const RESCHEDULE_ALLOWED_STATUSES: readonly CaseStatus[] = [
  CASE_STATUS.APPOINTMENT_SCHEDULED,
  CASE_STATUS.IN_TREATMENT,
]

/** A student may submit a stage for faculty review only while in treatment. */
export const SUBMIT_FOR_REVIEW_REQUIRED_STATUS: CaseStatus = CASE_STATUS.IN_TREATMENT

/** A student may add a progress note only while the case is in treatment. */
export const PROGRESS_NOTE_REQUIRED_STATUS: CaseStatus = CASE_STATUS.IN_TREATMENT

/** Faculty/admin may return a case to the pool only from these statuses. */
export const RETURN_TO_POOL_ELIGIBLE_STATUSES: readonly CaseStatus[] = [
  CASE_STATUS.STUDENT_APPROVED,
  CASE_STATUS.CONTACTED,
  CASE_STATUS.APPOINTMENT_SCHEDULED,
]

/** Faculty/admin may release the next stage only while awaiting faculty review. */
export const RELEASE_NEXT_STAGE_REQUIRED_STATUS: CaseStatus = CASE_STATUS.FACULTY_REVIEW

/** A student may request a case only while it is in the matched pool. */
export const CASE_REQUEST_REQUIRED_STATUS: CaseStatus = CASE_STATUS.MATCHED

/** A student may request a case only while its current stage is released. */
export const CASE_REQUEST_REQUIRED_STAGE_STATUS: StageStatus = STAGE_STATUS.RELEASED

// ─── Safe, generic user-facing messages ─────────────────────────────────────

export const LIFECYCLE_MESSAGES = {
  FORBIDDEN: 'Forbidden',
  UNEXPECTED_STAGE_FOR_ACTION: 'This case is no longer in the expected stage for this action.',
  RESCHEDULE_ONLY_SCHEDULED_OR_ACTIVE:
    'Rescheduling is only available for scheduled or active cases.',
  SUBMIT_ONLY_IN_TREATMENT: 'Only cases in treatment can be submitted for faculty review.',
  STAGE_REQUIRED_FOR_REVIEW: 'A routing stage is required before submitting for faculty review.',
  PROGRESS_ONLY_IN_TREATMENT: 'Progress notes can only be added while the case is in treatment.',
  RETURN_TO_POOL_INELIGIBLE:
    'This case can no longer be returned to the pool from its current stage.',
  RELEASE_ONLY_FACULTY_REVIEW:
    'Next stage routing is only available while the case is awaiting faculty review.',
  CASE_NOT_AVAILABLE_FOR_REQUESTS: 'This case is not currently available for requests',
  STAGE_NOT_AVAILABLE_FOR_REQUESTS: 'This case stage is not currently available for requests',
  DUPLICATE_CASE_REQUEST: 'You have already submitted a request for this case',
  INVALID_TRANSITION: 'This action is not allowed from the current case stage.',
  TERMINAL_CASE_LOCKED:
    'This case is already completed, cancelled, or rejected and can no longer be changed.',
  CONFLICT_RETRY:
    'This case was changed by someone else. Refresh the case and try again.',
} as const

// ─── Status validation helpers ───────────────────────────────────────────────

export function isCaseStatus(value: unknown): value is CaseStatus {
  return typeof value === 'string' && (CASE_STATUSES as readonly string[]).includes(value)
}

export function isStageStatus(value: unknown): value is StageStatus {
  return typeof value === 'string' && (STAGE_STATUSES as readonly string[]).includes(value)
}

export function isStudentRequestStatus(value: unknown): value is StudentRequestStatus {
  return (
    typeof value === 'string' && (STUDENT_REQUEST_STATUSES as readonly string[]).includes(value)
  )
}

// ─── Action validation helpers ───────────────────────────────────────────────

export function isStudentCaseAction(value: unknown): value is StudentCaseAction {
  return typeof value === 'string' && (STUDENT_CASE_ACTIONS as readonly string[]).includes(value)
}

export function isAdminCaseAction(value: unknown): value is AdminCaseAction {
  return typeof value === 'string' && (ADMIN_CASE_ACTIONS as readonly string[]).includes(value)
}

export function isAdminLifecycleAction(value: unknown): value is AdminLifecycleAction {
  return typeof value === 'string' && (ADMIN_LIFECYCLE_ACTIONS as readonly string[]).includes(value)
}

// ─── Actor permissions ───────────────────────────────────────────────────────
//
// Only students perform student case actions; only faculty/admin perform admin
// case actions. Patients/anonymous callers have NO authenticated case actions
// and can never change clinical workflow status. Service-role code still MUST
// enforce session identity, role, and row ownership explicitly because the
// service role bypasses RLS — these helpers are the role gate, not the whole
// authorization check.

export function isStudentActor(role: unknown): role is 'student' {
  return isStudentRole(role)
}

export function isFacultyActor(role: unknown): role is 'faculty' | 'admin' {
  return canAccessFacultyPortal(role)
}

export function canRolePerformStudentAction(role: unknown, action: unknown): boolean {
  return isStudentActor(role) && isStudentCaseAction(action)
}

export function canRolePerformAdminAction(role: unknown, action: unknown): boolean {
  return isFacultyActor(role) && isAdminCaseAction(action)
}

// ─── Transition / precondition helpers ───────────────────────────────────────

export type StudentLifecycleTransition =
  | { ok: true; toStatus: CaseStatus }
  | { ok: false; error: string }

/**
 * Resolve a student lifecycle action against the case's current status.
 * Mirrors the existing check: the case must already be in the expected status,
 * otherwise a generic 409-style message is returned.
 *
 * Phase 9 note: the precondition helpers below accept `string | null` because
 * the generated database types expose `patient_requests.status` as nullable.
 * A null status fails every precondition exactly as it always did at runtime;
 * only the compile-time contract changed. Guards that pass narrow the input to
 * `CaseStatus` so callers can use the checked status where non-null is required.
 */
export function resolveStudentLifecycleTransition(
  action: StudentLifecycleAction,
  currentStatus: string | null
): StudentLifecycleTransition {
  if (currentStatus !== STUDENT_LIFECYCLE_EXPECTED_STATUS[action]) {
    return { ok: false, error: LIFECYCLE_MESSAGES.UNEXPECTED_STAGE_FOR_ACTION }
  }
  return { ok: true, toStatus: STUDENT_LIFECYCLE_ACTION_TO_STATUS[action] }
}

export function canRescheduleFromStatus(currentStatus: string | null): currentStatus is CaseStatus {
  return (RESCHEDULE_ALLOWED_STATUSES as readonly string[]).includes(currentStatus ?? '')
}

export function canSubmitStageForReview(currentStatus: string | null): currentStatus is CaseStatus {
  return currentStatus === SUBMIT_FOR_REVIEW_REQUIRED_STATUS
}

export function canAddProgressFromStatus(currentStatus: string | null): currentStatus is CaseStatus {
  return currentStatus === PROGRESS_NOTE_REQUIRED_STATUS
}

export function canReturnCaseToPool(currentStatus: string | null | undefined): boolean {
  return (RETURN_TO_POOL_ELIGIBLE_STATUSES as readonly string[]).includes(
    (currentStatus || '').toLowerCase()
  )
}

export function canReleaseNextStage(currentStatus: string | null | undefined): boolean {
  return (currentStatus || '').toLowerCase() === RELEASE_NEXT_STAGE_REQUIRED_STATUS
}

export function isCaseAvailableForRequests(currentStatus: string | null): currentStatus is CaseStatus {
  return currentStatus === CASE_REQUEST_REQUIRED_STATUS
}

export function isStageAvailableForRequests(stageStatus: string | null | undefined): boolean {
  return (stageStatus || '').toLowerCase() === CASE_REQUEST_REQUIRED_STAGE_STATUS
}

// ─── Admin/faculty case-status transition rules ──────────────────────────────
//
// Terminal states are absorbing: a completed/cancelled/rejected case can never
// transition again through the admin API. Every status-changing admin action
// declares the set of statuses it may run FROM and the single status it moves
// the case TO. This mirrors (and is independently re-enforced by) the
// conditional predicates in the atomic lifecycle RPCs; keeping the rules here
// lets the service fail fast with a stable 409 and gives us a pure, unit-testable
// specification. Actions that do not change the case status are handled by
// `adminActionChangesCaseStatus` instead.

/** Absorbing terminal case statuses. No admin transition may leave these. */
export const TERMINAL_CASE_STATUSES: readonly CaseStatus[] = [
  CASE_STATUS.COMPLETED,
  CASE_STATUS.CANCELLED,
  CASE_STATUS.REJECTED,
]

export function isTerminalCaseStatus(value: string | null | undefined): boolean {
  return (TERMINAL_CASE_STATUSES as readonly string[]).includes((value ?? '').toLowerCase())
}

/** Admin actions that change patient_requests.status, with their legal from→to. */
export const ADMIN_CASE_TRANSITIONS: Record<
  string,
  { from: readonly CaseStatus[]; to: CaseStatus }
> = {
  save_draft: {
    from: [CASE_STATUS.SUBMITTED, CASE_STATUS.UNDER_REVIEW],
    to: CASE_STATUS.UNDER_REVIEW,
  },
  approve: {
    from: [CASE_STATUS.SUBMITTED, CASE_STATUS.UNDER_REVIEW],
    to: CASE_STATUS.MATCHED,
  },
  reject: {
    from: [CASE_STATUS.SUBMITTED, CASE_STATUS.UNDER_REVIEW],
    to: CASE_STATUS.REJECTED,
  },
  approve_student_request: {
    from: [CASE_STATUS.MATCHED],
    to: CASE_STATUS.STUDENT_APPROVED,
  },
  return_to_pool: {
    from: [
      CASE_STATUS.STUDENT_APPROVED,
      CASE_STATUS.CONTACTED,
      CASE_STATUS.APPOINTMENT_SCHEDULED,
    ],
    to: CASE_STATUS.MATCHED,
  },
  release_next_stage: {
    from: [CASE_STATUS.FACULTY_REVIEW],
    to: CASE_STATUS.MATCHED,
  },
  mark_contacted: {
    from: [CASE_STATUS.STUDENT_APPROVED],
    to: CASE_STATUS.CONTACTED,
  },
  mark_appointment_scheduled: {
    from: [CASE_STATUS.CONTACTED],
    to: CASE_STATUS.APPOINTMENT_SCHEDULED,
  },
  mark_in_treatment: {
    from: [CASE_STATUS.APPOINTMENT_SCHEDULED],
    to: CASE_STATUS.IN_TREATMENT,
  },
  mark_completed: {
    from: [CASE_STATUS.IN_TREATMENT, CASE_STATUS.FACULTY_REVIEW],
    to: CASE_STATUS.COMPLETED,
  },
  mark_cancelled: {
    from: [
      CASE_STATUS.SUBMITTED,
      CASE_STATUS.UNDER_REVIEW,
      CASE_STATUS.MATCHED,
      CASE_STATUS.STUDENT_APPROVED,
      CASE_STATUS.CONTACTED,
      CASE_STATUS.APPOINTMENT_SCHEDULED,
      CASE_STATUS.IN_TREATMENT,
      CASE_STATUS.FACULTY_REVIEW,
    ],
    to: CASE_STATUS.CANCELLED,
  },
}

/**
 * Admin actions that operate on a case/request WITHOUT changing the case status
 * (they still must be blocked once the case is terminal).
 */
export const ADMIN_NON_STATUS_ACTIONS: readonly string[] = [
  'update_triage',
  'reject_student_request',
  'undo_reject_student_request',
]

export type AdminCaseTransition =
  | { ok: true; toStatus: CaseStatus }
  | { ok: false; reason: string }

/**
 * Resolve an admin action against the case's current status. Rejects any action
 * from a terminal state and any action whose declared `from` set does not
 * include the current status. Returns a stable, generic message on failure.
 */
export function resolveAdminCaseTransition(
  action: string,
  currentStatus: string | null | undefined
): AdminCaseTransition {
  const status = (currentStatus ?? '').toLowerCase()

  if (isTerminalCaseStatus(status)) {
    return { ok: false, reason: LIFECYCLE_MESSAGES.TERMINAL_CASE_LOCKED }
  }

  const transition = ADMIN_CASE_TRANSITIONS[action]
  if (!transition) {
    // Non-status-changing action: allowed as long as the case is not terminal.
    if (ADMIN_NON_STATUS_ACTIONS.includes(action)) {
      return { ok: true, toStatus: status as CaseStatus }
    }
    return { ok: false, reason: LIFECYCLE_MESSAGES.INVALID_TRANSITION }
  }

  if (!(transition.from as readonly string[]).includes(status)) {
    return { ok: false, reason: LIFECYCLE_MESSAGES.INVALID_TRANSITION }
  }

  return { ok: true, toStatus: transition.to }
}
