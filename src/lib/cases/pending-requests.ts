/**
 * Pure aggregation helpers for pending student case requests (Phase 2).
 *
 * The faculty dashboard and work queue both need pending-request visibility
 * with strict count semantics:
 *   - dashboard card    → total pending REQUEST records;
 *   - work-queue tab    → unique CASES with at least one pending request;
 *   - per-case badge    → exact pending-request count for that case.
 *
 * Only rows with status 'pending' may contribute; approved, rejected, and
 * revoked requests are history, not current faculty work. The grouping runs
 * server-side over rows read with the caller's authenticated session (RLS
 * preserved) so browsers only ever receive the aggregate, never row data.
 */

import { STUDENT_REQUEST_STATUS } from './case-lifecycle'

export interface PendingRequestRow {
  case_id: string
  status: string | null
  created_at: string | null
}

export interface CasePendingSummary {
  /** Number of pending requests on this case. */
  count: number
  /** ISO timestamp of the oldest pending request, if any row carries one. */
  oldestCreatedAt: string | null
  /** ISO timestamp of the newest pending request, if any row carries one. */
  newestCreatedAt: string | null
}

export interface PendingRequestAggregate {
  /** Total pending student-request records across all cases. */
  totalPending: number
  /** Unique cases with at least one pending request. */
  caseCount: number
  byCase: Record<string, CasePendingSummary>
}

export function groupPendingRequests(
  rows: readonly PendingRequestRow[] | null | undefined
): PendingRequestAggregate {
  const byCase: Record<string, CasePendingSummary> = {}
  let totalPending = 0

  for (const row of rows ?? []) {
    if (!row?.case_id) continue
    if (row.status !== STUDENT_REQUEST_STATUS.PENDING) continue

    totalPending += 1
    const summary =
      byCase[row.case_id] ?? { count: 0, oldestCreatedAt: null, newestCreatedAt: null }
    summary.count += 1
    if (row.created_at && (!summary.oldestCreatedAt || row.created_at < summary.oldestCreatedAt)) {
      summary.oldestCreatedAt = row.created_at
    }
    if (row.created_at && (!summary.newestCreatedAt || row.created_at > summary.newestCreatedAt)) {
      summary.newestCreatedAt = row.created_at
    }
    byCase[row.case_id] = summary
  }

  return { totalPending, caseCount: Object.keys(byCase).length, byCase }
}

/** Pending-request count derivation shared by the case-detail banner and panel. */
export function countPendingRequests(
  requests: ReadonlyArray<{ status: string }> | null | undefined
): number {
  return (requests ?? []).filter(
    (request) => request.status === STUDENT_REQUEST_STATUS.PENDING
  ).length
}
