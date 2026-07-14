/**
 * Pure workflow-tab predicates for the faculty work queue (Phase 2).
 *
 * Extracted from requests-client.tsx so the tab membership rules, the tab
 * counts, and the URL deep-link validation all share one testable predicate —
 * a tab's badge count and its visible rows must never be computed from
 * different logic.
 *
 * Phase 2 removed the redundant `needs_routing` ("Pending Assignment") tab:
 * it was a strict subset of `needs_review` (Triage) and its cases remain
 * fully visible under Triage and All Cases. Its slot is now the
 * `student_requests` tab, whose membership comes from authoritative pending
 * student_case_requests rows — NOT from any patient_requests status value.
 */

export const WORKFLOW_TABS = [
  'all',
  'needs_review',
  'student_requests',
  'released',
  'active',
  'closed',
] as const

export type WorkflowTab = (typeof WORKFLOW_TABS)[number]

export const TRIAGE_STATUSES = ['submitted', 'under_review'] as const
export const ACTIVE_STATUSES = [
  'student_approved',
  'contacted',
  'appointment_scheduled',
  'in_treatment',
  'faculty_review',
] as const
export const CLOSED_STATUSES = ['completed', 'rejected', 'cancelled'] as const

export function isTriageStatus(status: string | null): boolean {
  return (TRIAGE_STATUSES as readonly string[]).includes((status || '').toLowerCase())
}

/** Validates a raw `?tab=` value; anything unknown falls back to 'all'. */
export function isValidWorkflowTab(value: string | null | undefined): value is WorkflowTab {
  return typeof value === 'string' && (WORKFLOW_TABS as readonly string[]).includes(value)
}

export function resolveWorkflowTab(value: string | null | undefined): WorkflowTab {
  return isValidWorkflowTab(value) ? value : 'all'
}

export function matchesWorkflowTab(
  request: { status: string | null },
  tab: WorkflowTab,
  pendingRequestCount: number
): boolean {
  const status = (request.status || '').toLowerCase()

  switch (tab) {
    case 'needs_review':
      return (TRIAGE_STATUSES as readonly string[]).includes(status)
    case 'student_requests':
      return pendingRequestCount > 0
    case 'released':
      return status === 'matched'
    case 'active':
      return (ACTIVE_STATUSES as readonly string[]).includes(status)
    case 'closed':
      return (CLOSED_STATUSES as readonly string[]).includes(status)
    default:
      return true
  }
}

/**
 * Ordering for the Student Requests tab: the case whose oldest pending
 * request has waited longest comes first; unknown timestamps sort last; ties
 * break on case id so the order is stable and deterministic.
 */
export function compareByOldestPendingRequest(
  a: { id: string; oldestPendingAt: string | null },
  b: { id: string; oldestPendingAt: string | null }
): number {
  if (a.oldestPendingAt && b.oldestPendingAt) {
    const byOldest = a.oldestPendingAt.localeCompare(b.oldestPendingAt)
    if (byOldest !== 0) return byOldest
  } else if (a.oldestPendingAt) {
    return -1
  } else if (b.oldestPendingAt) {
    return 1
  }
  return a.id.localeCompare(b.id)
}

/**
 * Ordering for the Student Requests tab's explicit "Newest First" selection:
 * the case whose newest pending request arrived most recently comes first;
 * cases with no pending timestamp sort last; ties break on case id so the
 * order stays stable and deterministic — mirrors compareByOldestPendingRequest
 * but in the opposite direction and over each case's newest (not oldest)
 * pending request.
 */
export function compareByNewestPendingRequest(
  a: { id: string; newestPendingAt: string | null },
  b: { id: string; newestPendingAt: string | null }
): number {
  if (a.newestPendingAt && b.newestPendingAt) {
    const byNewest = b.newestPendingAt.localeCompare(a.newestPendingAt)
    if (byNewest !== 0) return byNewest
  } else if (a.newestPendingAt) {
    return -1
  } else if (b.newestPendingAt) {
    return 1
  }
  return a.id.localeCompare(b.id)
}

// ─── Sort-mode state (work-queue sort dropdown) ──────────────────────────────
//
// 'pending_oldest' only has meaning inside the Student Requests tab. These
// two pure functions own every decision about when that mode turns on or
// off, so the component only needs to call them — the visible dropdown
// selection and the actual applied comparator can never drift apart.

export type SortBy = 'newest' | 'oldest' | 'urgency' | 'pending_oldest'

/**
 * Sort mode for the very first render of a given tab (initial page load,
 * deep link, or refresh). Computing this from `initialTab` alone — rather
 * than via a post-mount effect — keeps server and client output identical,
 * so there is no hydration mismatch.
 */
export function initialSortByForTab(tab: WorkflowTab): SortBy {
  return tab === 'student_requests' ? 'pending_oldest' : 'newest'
}

/**
 * Resolves the sort mode across a tab change. Entering Student Requests
 * switches the general default ('newest') to 'pending_oldest', but leaves
 * any explicit choice (oldest/urgency) untouched. Leaving Student Requests
 * clears 'pending_oldest' back to the general default, since no other tab
 * gives that value a meaning; every other value already means the same
 * thing in every tab and needs no reset.
 */
export function resolveSortByForTabChange(
  currentSortBy: SortBy,
  previousTab: WorkflowTab,
  nextTab: WorkflowTab
): SortBy {
  if (nextTab === 'student_requests' && previousTab !== 'student_requests') {
    return currentSortBy === 'newest' ? 'pending_oldest' : currentSortBy
  }
  if (nextTab !== 'student_requests' && previousTab === 'student_requests') {
    return currentSortBy === 'pending_oldest' ? 'newest' : currentSortBy
  }
  return currentSortBy
}
