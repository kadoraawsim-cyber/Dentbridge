import { describe, expect, it } from 'vitest'

import {
  ADMIN_LIFECYCLE_ACTION_TO_STATUS,
  CASE_STATUS,
  LIFECYCLE_MESSAGES,
  STAGE_STATUS,
  STUDENT_LIFECYCLE_EXPECTED_STATUS,
  canAddProgressFromStatus,
  canReleaseNextStage,
  canRescheduleFromStatus,
  canReturnCaseToPool,
  canRolePerformAdminAction,
  canRolePerformStudentAction,
  canSubmitStageForReview,
  isAdminCaseAction,
  isCaseAvailableForRequests,
  isCaseStatus,
  isStageAvailableForRequests,
  isStageStatus,
  isStudentCaseAction,
  isStudentRequestStatus,
  resolveStudentLifecycleTransition,
  type CaseStatus,
  type StudentLifecycleAction,
} from '@/lib/cases/case-lifecycle'

describe('case lifecycle state machine', () => {
  it('recognizes only supported lifecycle statuses and actions', () => {
    expect(isCaseStatus(CASE_STATUS.IN_TREATMENT)).toBe(true)
    expect(isCaseStatus('archived')).toBe(false)
    expect(isCaseStatus(null)).toBe(false)

    expect(isStageStatus(STAGE_STATUS.RELEASED)).toBe(true)
    expect(isStageStatus('submitted')).toBe(false)

    expect(isStudentRequestStatus('approved')).toBe(true)
    expect(isStudentRequestStatus('matched')).toBe(false)

    expect(isStudentCaseAction('submit_stage_for_review')).toBe(true)
    expect(isStudentCaseAction('approve')).toBe(false)

    expect(isAdminCaseAction('approve')).toBe(true)
    expect(isAdminCaseAction('submit_stage_for_review')).toBe(false)
  })

  it('keeps student and faculty/admin role gates separate', () => {
    expect(canRolePerformStudentAction('student', 'mark_contacted')).toBe(true)
    expect(canRolePerformStudentAction('faculty', 'mark_contacted')).toBe(false)
    expect(canRolePerformStudentAction('admin', 'approve')).toBe(false)

    expect(canRolePerformAdminAction('faculty', 'approve')).toBe(true)
    expect(canRolePerformAdminAction('admin', 'release_next_stage')).toBe(true)
    expect(canRolePerformAdminAction('student', 'approve')).toBe(false)
  })

  it.each<[StudentLifecycleAction, CaseStatus, CaseStatus]>([
    ['mark_contacted', CASE_STATUS.STUDENT_APPROVED, CASE_STATUS.CONTACTED],
    ['mark_appointment_scheduled', CASE_STATUS.CONTACTED, CASE_STATUS.APPOINTMENT_SCHEDULED],
    ['mark_in_treatment', CASE_STATUS.APPOINTMENT_SCHEDULED, CASE_STATUS.IN_TREATMENT],
  ])('allows student action %s only from its expected status', (action, fromStatus, toStatus) => {
    expect(STUDENT_LIFECYCLE_EXPECTED_STATUS[action]).toBe(fromStatus)
    expect(resolveStudentLifecycleTransition(action, fromStatus)).toEqual({
      ok: true,
      toStatus,
    })

    expect(resolveStudentLifecycleTransition(action, CASE_STATUS.MATCHED)).toEqual({
      ok: false,
      error: LIFECYCLE_MESSAGES.UNEXPECTED_STAGE_FOR_ACTION,
    })
    expect(resolveStudentLifecycleTransition(action, null)).toEqual({
      ok: false,
      error: LIFECYCLE_MESSAGES.UNEXPECTED_STAGE_FOR_ACTION,
    })
  })

  it('enforces student progress and review preconditions', () => {
    expect(canRescheduleFromStatus(CASE_STATUS.APPOINTMENT_SCHEDULED)).toBe(true)
    expect(canRescheduleFromStatus(CASE_STATUS.IN_TREATMENT)).toBe(true)
    expect(canRescheduleFromStatus(CASE_STATUS.CONTACTED)).toBe(false)
    expect(canRescheduleFromStatus(null)).toBe(false)

    expect(canSubmitStageForReview(CASE_STATUS.IN_TREATMENT)).toBe(true)
    expect(canSubmitStageForReview(CASE_STATUS.APPOINTMENT_SCHEDULED)).toBe(false)

    expect(canAddProgressFromStatus(CASE_STATUS.IN_TREATMENT)).toBe(true)
    expect(canAddProgressFromStatus(CASE_STATUS.FACULTY_REVIEW)).toBe(false)
  })

  it('enforces pool return, next-stage release, and request availability gates', () => {
    expect(canReturnCaseToPool(CASE_STATUS.STUDENT_APPROVED)).toBe(true)
    expect(canReturnCaseToPool('CONTACTED')).toBe(true)
    expect(canReturnCaseToPool(CASE_STATUS.IN_TREATMENT)).toBe(false)

    expect(canReleaseNextStage(CASE_STATUS.FACULTY_REVIEW)).toBe(true)
    expect(canReleaseNextStage(CASE_STATUS.IN_TREATMENT)).toBe(false)

    expect(isCaseAvailableForRequests(CASE_STATUS.MATCHED)).toBe(true)
    expect(isCaseAvailableForRequests(CASE_STATUS.SUBMITTED)).toBe(false)
    expect(isStageAvailableForRequests(STAGE_STATUS.RELEASED)).toBe(true)
    expect(isStageAvailableForRequests(STAGE_STATUS.DRAFT)).toBe(false)
  })

  it('keeps faculty/admin lifecycle actions mapped to existing statuses', () => {
    expect(ADMIN_LIFECYCLE_ACTION_TO_STATUS).toEqual({
      mark_contacted: CASE_STATUS.CONTACTED,
      mark_appointment_scheduled: CASE_STATUS.APPOINTMENT_SCHEDULED,
      mark_in_treatment: CASE_STATUS.IN_TREATMENT,
      mark_completed: CASE_STATUS.COMPLETED,
      mark_cancelled: CASE_STATUS.CANCELLED,
    })
  })
})
