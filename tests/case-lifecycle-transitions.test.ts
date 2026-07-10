import { describe, expect, it } from 'vitest'

import {
  CASE_STATUS,
  LIFECYCLE_MESSAGES,
  TERMINAL_CASE_STATUSES,
  isTerminalCaseStatus,
  resolveAdminCaseTransition,
} from '@/lib/cases/case-lifecycle'

describe('admin case transition state machine', () => {
  it('classifies terminal statuses', () => {
    expect(TERMINAL_CASE_STATUSES).toEqual(
      expect.arrayContaining([CASE_STATUS.COMPLETED, CASE_STATUS.CANCELLED, CASE_STATUS.REJECTED])
    )
    expect(isTerminalCaseStatus('completed')).toBe(true)
    expect(isTerminalCaseStatus('cancelled')).toBe(true)
    expect(isTerminalCaseStatus('rejected')).toBe(true)
    expect(isTerminalCaseStatus('COMPLETED')).toBe(true)
    expect(isTerminalCaseStatus('matched')).toBe(false)
    expect(isTerminalCaseStatus(null)).toBe(false)
  })

  it('allows valid from→to transitions', () => {
    expect(resolveAdminCaseTransition('approve', CASE_STATUS.UNDER_REVIEW)).toEqual({
      ok: true,
      toStatus: CASE_STATUS.MATCHED,
    })
    expect(resolveAdminCaseTransition('approve_student_request', CASE_STATUS.MATCHED)).toEqual({
      ok: true,
      toStatus: CASE_STATUS.STUDENT_APPROVED,
    })
    expect(resolveAdminCaseTransition('mark_in_treatment', CASE_STATUS.APPOINTMENT_SCHEDULED)).toEqual(
      { ok: true, toStatus: CASE_STATUS.IN_TREATMENT }
    )
    expect(resolveAdminCaseTransition('release_next_stage', CASE_STATUS.FACULTY_REVIEW)).toEqual({
      ok: true,
      toStatus: CASE_STATUS.MATCHED,
    })
  })

  it('rejects illegal from→to transitions with a stable conflict message', () => {
    // approve is only valid from submitted/under_review — not from matched.
    expect(resolveAdminCaseTransition('approve', CASE_STATUS.MATCHED)).toEqual({
      ok: false,
      reason: LIFECYCLE_MESSAGES.INVALID_TRANSITION,
    })
    // approving a student request is only valid from matched.
    expect(resolveAdminCaseTransition('approve_student_request', CASE_STATUS.CONTACTED)).toEqual({
      ok: false,
      reason: LIFECYCLE_MESSAGES.INVALID_TRANSITION,
    })
    // skipping straight to in_treatment from submitted is illegal.
    expect(resolveAdminCaseTransition('mark_in_treatment', CASE_STATUS.SUBMITTED)).toEqual({
      ok: false,
      reason: LIFECYCLE_MESSAGES.INVALID_TRANSITION,
    })
  })

  it('never allows any transition out of a terminal state (no reopening)', () => {
    for (const terminal of TERMINAL_CASE_STATUSES) {
      for (const action of [
        'approve',
        'approve_student_request',
        'mark_contacted',
        'mark_in_treatment',
        'mark_completed',
        'mark_cancelled',
        'return_to_pool',
        'release_next_stage',
        'update_triage',
      ]) {
        expect(resolveAdminCaseTransition(action, terminal)).toEqual({
          ok: false,
          reason: LIFECYCLE_MESSAGES.TERMINAL_CASE_LOCKED,
        })
      }
    }
  })

  it('allows non-status actions on a live case but blocks them once terminal', () => {
    expect(resolveAdminCaseTransition('update_triage', CASE_STATUS.MATCHED).ok).toBe(true)
    expect(resolveAdminCaseTransition('reject_student_request', CASE_STATUS.MATCHED).ok).toBe(true)
    expect(resolveAdminCaseTransition('update_triage', CASE_STATUS.COMPLETED)).toEqual({
      ok: false,
      reason: LIFECYCLE_MESSAGES.TERMINAL_CASE_LOCKED,
    })
  })

  it('treats mark_cancelled as valid from every non-terminal status', () => {
    for (const status of [
      CASE_STATUS.SUBMITTED,
      CASE_STATUS.UNDER_REVIEW,
      CASE_STATUS.MATCHED,
      CASE_STATUS.STUDENT_APPROVED,
      CASE_STATUS.CONTACTED,
      CASE_STATUS.APPOINTMENT_SCHEDULED,
      CASE_STATUS.IN_TREATMENT,
      CASE_STATUS.FACULTY_REVIEW,
    ]) {
      expect(resolveAdminCaseTransition('mark_cancelled', status)).toEqual({
        ok: true,
        toStatus: CASE_STATUS.CANCELLED,
      })
    }
  })
})
