import { describe, expect, it } from 'vitest'

import { en } from '@/lib/i18n/translations/en'
import { tr } from '@/lib/i18n/translations/tr'
import { buildCaseTimeline } from '@/lib/case-timeline'
import {
  countPendingRequests,
  groupPendingRequests,
} from '@/lib/cases/pending-requests'
import {
  WORKFLOW_TABS,
  compareByNewestPendingRequest,
  compareByOldestPendingRequest,
  initialSortByForTab,
  isValidWorkflowTab,
  matchesWorkflowTab,
  resolveSortByForTabChange,
  resolveWorkflowTab,
} from '@/app/admin/requests/workflow-tabs'

/**
 * Phase 2 faculty pending-request visibility tests.
 *
 * Everything here is display/aggregation logic over unchanged canonical
 * values: patient_requests statuses ('submitted', 'under_review', 'matched',
 * 'student_approved', …) and student_case_requests statuses ('pending',
 * 'approved', 'rejected', 'revoked') are asserted as inputs, never renamed.
 */

describe('pending-request aggregation semantics', () => {
  const rows = [
    { case_id: 'case-a', status: 'pending', created_at: '2026-07-10T09:00:00.000Z' },
    { case_id: 'case-a', status: 'pending', created_at: '2026-07-09T08:00:00.000Z' },
    { case_id: 'case-a', status: 'pending', created_at: '2026-07-11T10:00:00.000Z' },
  ]

  it('three pending requests on one case: dashboard=3 requests, tab=1 case, badge=3', () => {
    const aggregate = groupPendingRequests(rows)
    expect(aggregate.totalPending).toBe(3)
    expect(aggregate.caseCount).toBe(1)
    expect(aggregate.byCase['case-a'].count).toBe(3)
  })

  it('tracks the oldest pending request per case', () => {
    const aggregate = groupPendingRequests(rows)
    expect(aggregate.byCase['case-a'].oldestCreatedAt).toBe('2026-07-09T08:00:00.000Z')
  })

  it('approved, rejected, and revoked requests never count', () => {
    const aggregate = groupPendingRequests([
      { case_id: 'case-a', status: 'approved', created_at: '2026-07-01T00:00:00.000Z' },
      { case_id: 'case-a', status: 'rejected', created_at: '2026-07-01T00:00:00.000Z' },
      { case_id: 'case-b', status: 'revoked', created_at: '2026-07-01T00:00:00.000Z' },
      { case_id: 'case-b', status: 'pending', created_at: '2026-07-02T00:00:00.000Z' },
    ])
    expect(aggregate.totalPending).toBe(1)
    expect(aggregate.caseCount).toBe(1)
    expect(aggregate.byCase['case-a']).toBeUndefined()
    expect(aggregate.byCase['case-b'].count).toBe(1)
  })

  it('handles empty and null input safely', () => {
    expect(groupPendingRequests([]).totalPending).toBe(0)
    expect(groupPendingRequests(null).caseCount).toBe(0)
  })

  it('countPendingRequests counts only pending rows (banner disappears at zero)', () => {
    expect(
      countPendingRequests([
        { status: 'pending' },
        { status: 'pending' },
        { status: 'rejected' },
      ])
    ).toBe(2)
    // After the final pending request is approved/rejected, the derived count
    // is 0, which hides the banner and the panel badge.
    expect(
      countPendingRequests([{ status: 'approved' }, { status: 'rejected' }, { status: 'revoked' }])
    ).toBe(0)
  })
})

describe('work-queue tabs after Pending Assignment removal', () => {
  it('needs_routing no longer exists; unknown tab values fall back to all', () => {
    expect(WORKFLOW_TABS).not.toContain('needs_routing')
    expect(isValidWorkflowTab('needs_routing')).toBe(false)
    expect(resolveWorkflowTab('needs_routing')).toBe('all')
    expect(resolveWorkflowTab('nonsense')).toBe('all')
    expect(resolveWorkflowTab(undefined)).toBe('all')
    expect(resolveWorkflowTab('student_requests')).toBe('student_requests')
    expect(resolveWorkflowTab('released')).toBe('released')
  })

  it('cases formerly in Pending Assignment stay visible in Triage and All Cases', () => {
    // A fresh submitted request with no assigned department — exactly the
    // population the removed tab showed.
    const fresh = { status: 'submitted' }
    expect(matchesWorkflowTab(fresh, 'needs_review', 0)).toBe(true)
    expect(matchesWorkflowTab(fresh, 'all', 0)).toBe(true)
  })

  it('Triage still includes both submitted and under_review', () => {
    expect(matchesWorkflowTab({ status: 'submitted' }, 'needs_review', 0)).toBe(true)
    expect(matchesWorkflowTab({ status: 'under_review' }, 'needs_review', 0)).toBe(true)
    expect(matchesWorkflowTab({ status: 'matched' }, 'needs_review', 0)).toBe(false)
  })

  it('the status filter still distinguishes New Request from Under Review', () => {
    expect(en.admin.requests.statusSubmitted).toBe('New Request')
    expect(en.admin.requests.statusUnderReview).toBe('Under Review')
    expect(tr.admin.requests.statusSubmitted).toBe('Yeni Talep')
    expect(tr.admin.requests.statusUnderReview).toBe('İncelemede')
  })

  it('student_requests membership comes only from pending-request counts', () => {
    expect(matchesWorkflowTab({ status: 'matched' }, 'student_requests', 2)).toBe(true)
    expect(matchesWorkflowTab({ status: 'matched' }, 'student_requests', 0)).toBe(false)
    // A pooled case with only resolved requests is not current faculty work.
    expect(matchesWorkflowTab({ status: 'matched' }, 'released', 0)).toBe(true)
  })

  it('unrelated tab membership is unchanged', () => {
    expect(matchesWorkflowTab({ status: 'matched' }, 'released', 3)).toBe(true)
    expect(matchesWorkflowTab({ status: 'student_approved' }, 'active', 0)).toBe(true)
    expect(matchesWorkflowTab({ status: 'in_treatment' }, 'active', 0)).toBe(true)
    expect(matchesWorkflowTab({ status: 'completed' }, 'closed', 0)).toBe(true)
    expect(matchesWorkflowTab({ status: 'rejected' }, 'closed', 0)).toBe(true)
  })

  it('sorts by oldest pending request first with a stable id tiebreak', () => {
    const rows = [
      { id: 'case-c', oldestPendingAt: '2026-07-11T00:00:00.000Z' },
      { id: 'case-b', oldestPendingAt: '2026-07-09T00:00:00.000Z' },
      { id: 'case-d', oldestPendingAt: null },
      { id: 'case-a', oldestPendingAt: '2026-07-09T00:00:00.000Z' },
    ]
    const sorted = [...rows].sort(compareByOldestPendingRequest)
    expect(sorted.map((row) => row.id)).toEqual(['case-a', 'case-b', 'case-c', 'case-d'])
  })
})

describe('Student Requests sort mode (fixes the mislabeled default)', () => {
  it('defaults to pending_oldest on first render of the tab, and to newest elsewhere', () => {
    expect(initialSortByForTab('student_requests')).toBe('pending_oldest')
    expect(initialSortByForTab('all')).toBe('newest')
    expect(initialSortByForTab('needs_review')).toBe('newest')
    expect(initialSortByForTab('released')).toBe('newest')
    expect(initialSortByForTab('active')).toBe('newest')
    expect(initialSortByForTab('closed')).toBe('newest')
  })

  it('deep link and refresh both resolve to the same initial mode (no hydration mismatch)', () => {
    // A refresh and a deep link both start from a server-resolved tab with no
    // prior client sort state — initialSortByForTab is the only input either
    // path uses, so they are identical by construction.
    const deepLinkTab = resolveWorkflowTab('student_requests')
    expect(initialSortByForTab(deepLinkTab)).toBe('pending_oldest')
  })

  it('the visible selected label matches the actual applied order: pending_oldest', () => {
    const rows = [
      { id: 'case-late', oldestPendingAt: '2026-07-12T00:00:00.000Z' },
      { id: 'case-early', oldestPendingAt: '2026-07-01T00:00:00.000Z' },
    ]
    const sorted = [...rows].sort(compareByOldestPendingRequest)
    // "Oldest Request First" selected → the longest-waiting case leads.
    expect(sorted[0].id).toBe('case-early')
  })

  it('Newest First inside Student Requests sorts by newest pending-request timestamp, not case creation', () => {
    const rows = [
      { id: 'case-a', newestPendingAt: '2026-07-01T00:00:00.000Z' },
      { id: 'case-b', newestPendingAt: '2026-07-12T00:00:00.000Z' },
      { id: 'case-c', newestPendingAt: null },
    ]
    const sorted = [...rows].sort(compareByNewestPendingRequest)
    expect(sorted.map((row) => row.id)).toEqual(['case-b', 'case-a', 'case-c'])
  })

  it('newest-first has a stable case-id tiebreak, matching the oldest-first comparator', () => {
    const rows = [
      { id: 'case-c', newestPendingAt: '2026-07-09T00:00:00.000Z' },
      { id: 'case-a', newestPendingAt: '2026-07-09T00:00:00.000Z' },
      { id: 'case-b', newestPendingAt: '2026-07-11T00:00:00.000Z' },
    ]
    const sorted = [...rows].sort(compareByNewestPendingRequest)
    expect(sorted.map((row) => row.id)).toEqual(['case-b', 'case-a', 'case-c'])
  })

  it('one case with multiple pending requests: oldest mode uses its oldest, newest mode uses its newest', () => {
    const aggregate = groupPendingRequests([
      { case_id: 'case-multi', status: 'pending', created_at: '2026-07-05T00:00:00.000Z' },
      { case_id: 'case-multi', status: 'pending', created_at: '2026-07-01T00:00:00.000Z' },
      { case_id: 'case-multi', status: 'pending', created_at: '2026-07-09T00:00:00.000Z' },
    ])
    expect(aggregate.byCase['case-multi'].oldestCreatedAt).toBe('2026-07-01T00:00:00.000Z')
    expect(aggregate.byCase['case-multi'].newestCreatedAt).toBe('2026-07-09T00:00:00.000Z')
  })

  it('resolved requests never influence oldest/newest sorting timestamps', () => {
    const aggregate = groupPendingRequests([
      { case_id: 'case-x', status: 'pending', created_at: '2026-07-05T00:00:00.000Z' },
      // Earlier and later timestamps, but not pending — must not shift the range.
      { case_id: 'case-x', status: 'approved', created_at: '2026-07-01T00:00:00.000Z' },
      { case_id: 'case-x', status: 'rejected', created_at: '2026-07-09T00:00:00.000Z' },
    ])
    expect(aggregate.byCase['case-x'].oldestCreatedAt).toBe('2026-07-05T00:00:00.000Z')
    expect(aggregate.byCase['case-x'].newestCreatedAt).toBe('2026-07-05T00:00:00.000Z')
  })

  it('entering Student Requests from the general default auto-selects pending_oldest', () => {
    expect(resolveSortByForTabChange('newest', 'all', 'student_requests')).toBe('pending_oldest')
    expect(resolveSortByForTabChange('newest', 'needs_review', 'student_requests')).toBe(
      'pending_oldest'
    )
  })

  it('entering Student Requests never overrides an explicit prior selection', () => {
    expect(resolveSortByForTabChange('oldest', 'all', 'student_requests')).toBe('oldest')
    expect(resolveSortByForTabChange('urgency', 'released', 'student_requests')).toBe('urgency')
  })

  it('leaving Student Requests clears pending_oldest back to the general default', () => {
    expect(resolveSortByForTabChange('pending_oldest', 'student_requests', 'all')).toBe('newest')
    expect(resolveSortByForTabChange('pending_oldest', 'student_requests', 'closed')).toBe(
      'newest'
    )
  })

  it('leaving Student Requests preserves an explicit selection made inside it', () => {
    expect(resolveSortByForTabChange('urgency', 'student_requests', 'all')).toBe('urgency')
    expect(resolveSortByForTabChange('oldest', 'student_requests', 'active')).toBe('oldest')
  })

  it('staying within the same tab never changes the sort mode', () => {
    expect(
      resolveSortByForTabChange('pending_oldest', 'student_requests', 'student_requests')
    ).toBe('pending_oldest')
    expect(resolveSortByForTabChange('urgency', 'all', 'all')).toBe('urgency')
  })

  it('High Urgency First is unaffected by tab-change resolution (unrelated tabs untouched)', () => {
    for (const [from, to] of [
      ['all', 'needs_review'],
      ['needs_review', 'released'],
      ['released', 'active'],
      ['active', 'closed'],
    ] as const) {
      expect(resolveSortByForTabChange('urgency', from, to)).toBe('urgency')
    }
  })

  it('the pending_oldest option value only appears in the Student Requests tab context', () => {
    // Membership guard: pending_oldest is meaningless in tab predicates that
    // don't gate on it — this documents that the sort mode is exclusively an
    // ordering concern and never affects which rows a tab shows.
    expect(matchesWorkflowTab({ status: 'matched' }, 'released', 0)).toBe(true)
    expect(WORKFLOW_TABS).not.toContain('pending_oldest')
  })
})

describe('faculty-facing wording (EN/TR parity)', () => {
  it('dashboard pending-requests card', () => {
    expect(en.admin.dashboard.statPendingRequestsLabel).toBe('Pending Student Requests')
    expect(en.admin.dashboard.statPendingRequestsDesc).toBe('Awaiting faculty approval')
    expect(tr.admin.dashboard.statPendingRequestsLabel).toBe('Bekleyen Öğrenci Talepleri')
    expect(tr.admin.dashboard.statPendingRequestsDesc).toBe('Fakülte onayı bekleniyor')
  })

  it('dashboard summary segments (singular and plural)', () => {
    expect(en.admin.dashboard.requestAwaitingApproval).toBe('1 student request awaiting approval')
    expect(en.admin.dashboard.requestsAwaitingApprovalSuffix).toBe(
      'student requests awaiting approval'
    )
    expect(tr.admin.dashboard.requestAwaitingApproval).toBe('1 öğrenci talebi onay bekliyor')
    expect(tr.admin.dashboard.requestsAwaitingApprovalSuffix).toBe('öğrenci talebi onay bekliyor')
  })

  it('Recent Requests action badge coexists with the lifecycle label', () => {
    expect(en.admin.dashboard.recentPendingApprovalOne).toBe('1 Student Awaiting Approval')
    expect(en.admin.dashboard.recentPendingApprovalSuffix).toBe('Students Awaiting Approval')
    expect(tr.admin.dashboard.recentPendingApprovalOne).toBe('1 Öğrenci Onay Bekliyor')
    expect(tr.admin.dashboard.recentPendingApprovalSuffix).toBe('Öğrenci Onay Bekliyor')
    // Lifecycle label is untouched: a pooled case still reads Released to Pool.
    expect(en.admin.db.statusMatched).toBe('Released to Pool')
    expect(tr.admin.db.statusMatched).toBe('Öğrenci Havuzuna Yayımlandı')
  })

  it('work-queue tab, row badge, and CTA', () => {
    expect(en.admin.requests.queueTabStudentRequests).toBe('Student Requests')
    expect(tr.admin.requests.queueTabStudentRequests).toBe('Öğrenci Talepleri')
    expect(en.admin.requests.pendingRequestBadgeOne).toBe('1 Pending Student Request')
    expect(en.admin.requests.pendingRequestBadgeSuffix).toBe('Pending Student Requests')
    expect(tr.admin.requests.pendingRequestBadgeOne).toBe('1 Bekleyen Öğrenci Talebi')
    expect(tr.admin.requests.pendingRequestBadgeSuffix).toBe('Bekleyen Öğrenci Talebi')
    expect(en.admin.requests.reviewRequestCta).toBe('Review Request')
    expect(en.admin.requests.reviewRequestsCta).toBe('Review Requests')
    expect(tr.admin.requests.reviewRequestCta).toBe('Talebi İncele')
    expect(tr.admin.requests.reviewRequestsCta).toBe('Talepleri İncele')
  })

  it('the dedicated Oldest Request First sort option exists in both locales', () => {
    expect(en.admin.requests.sortPendingOldest).toBe('Oldest Request First')
    expect(tr.admin.requests.sortPendingOldest).toBe('En Eski Talep Önce')
    // The pre-existing options keep their original, honest, tab-agnostic
    // meaning — only the new key is Student-Requests-specific.
    expect(en.admin.requests.sortNewest).toBe('Newest First')
    expect(en.admin.requests.sortOldest).toBe('Oldest First')
    expect(tr.admin.requests.sortNewest).toBe('En Yeni')
    expect(tr.admin.requests.sortOldest).toBe('En Eski')
  })

  it('obsolete Pending Assignment tab label is gone from both locales', () => {
    expect(
      (en.admin.requests as Record<string, unknown>).queueTabNeedsRouting
    ).toBeUndefined()
    expect(
      (tr.admin.requests as Record<string, unknown>).queueTabNeedsRouting
    ).toBeUndefined()
  })

  it('case-detail action banner (singular and plural)', () => {
    expect(en.admin.detail.actionBannerTitle).toBe('Faculty Action Required')
    expect(en.admin.detail.actionBannerBodyOne).toBe(
      'A student has requested this case and is waiting for your approval.'
    )
    expect(en.admin.detail.actionBannerBodySuffix).toBe(
      'students have requested this case and are waiting for review.'
    )
    expect(en.admin.detail.actionBannerCtaOne).toBe('Review Student Request')
    expect(en.admin.detail.actionBannerCtaMany).toBe('Review Student Requests')
    expect(tr.admin.detail.actionBannerTitle).toBe('Fakülte İşlemi Gerekli')
    expect(tr.admin.detail.actionBannerBodyOne).toBe(
      'Bir öğrenci bu vakayı talep etti ve onayınızı bekliyor.'
    )
    expect(tr.admin.detail.actionBannerBodySuffix).toBe(
      'öğrenci bu vakayı talep etti ve incelemenizi bekliyor.'
    )
    expect(tr.admin.detail.actionBannerCtaOne).toBe('Öğrenci Talebini İncele')
    expect(tr.admin.detail.actionBannerCtaMany).toBe('Öğrenci Taleplerini İncele')
  })

  it('real Match mapping: student_approved is Matched on product-status surfaces', () => {
    expect(en.admin.db.statusStudentApproved).toBe('Matched')
    expect(tr.admin.db.statusStudentApproved).toBe('Eşleştirildi')
    expect(en.admin.requests.statusStudentApproved).toBe('Matched')
    expect(en.admin.requests.statusLabelStudentApproved).toBe('Matched')
    expect(tr.admin.requests.statusStudentApproved).toBe('Eşleştirildi')
    expect(tr.admin.requests.statusLabelStudentApproved).toBe('Eşleştirildi')
  })

  it('matched assignment summary labels', () => {
    expect(en.admin.detail.matchedSummaryTitle).toBe('Matched')
    expect(en.admin.detail.matchedStudentLabel).toBe('Assigned student')
    expect(en.admin.detail.matchedApprovedAtLabel).toBe('Match approved')
    expect(en.admin.detail.matchedApprovedByLabel).toBe('Approved by')
    expect(tr.admin.detail.matchedSummaryTitle).toBe('Eşleştirildi')
    expect(tr.admin.detail.matchedStudentLabel).toBe('Atanan öğrenci')
    expect(tr.admin.detail.matchedApprovedAtLabel).toBe('Eşleşme onayı')
    expect(tr.admin.detail.matchedApprovedByLabel).toBe('Onaylayan')
  })

  it('journey and activity wording for requests and real Matches', () => {
    expect(en.admin.detail.journeyStudentRequested).toBe('Student submitted a case request')
    expect(en.admin.detail.journeyPendingFacultyApproval).toBe('Pending faculty approval')
    expect(en.admin.detail.journeyStudentApproved).toBe('Patient–student Match approved')
    expect(en.admin.detail.journeyStageStudentAssigned).toBe('Student assigned to case')
    expect(en.admin.detail.historyStudentSubmitted).toBe('Student submitted a case request')
    expect(en.admin.detail.historyStudentApproved).toBe('Patient–student Match approved')
    expect(tr.admin.detail.journeyStudentRequested).toBe('Öğrenci vaka talebi gönderdi')
    expect(tr.admin.detail.journeyPendingFacultyApproval).toBe('Fakülte onayı bekleniyor')
    expect(tr.admin.detail.journeyStudentApproved).toBe('Hasta–öğrenci eşleşmesi onaylandı')
    expect(tr.admin.detail.journeyStageStudentAssigned).toBe('Öğrenci vakaya atandı')
    expect(tr.admin.detail.historyStudentSubmitted).toBe('Öğrenci vaka talebi gönderdi')
    expect(tr.admin.detail.historyStudentApproved).toBe('Hasta–öğrenci eşleşmesi onaylandı')
    // Release-to-pool history wording never reads as a Match.
    expect(en.admin.detail.historyCaseReleased).toBe('Case released to pool')
  })

  it('student-requests panel counts pending work only', () => {
    expect(en.admin.detail.studentRequestPendingCountSuffix).toBe('pending request')
    expect(en.admin.detail.studentRequestsPendingCountSuffix).toBe('pending requests')
    expect(tr.admin.detail.studentRequestPendingCountSuffix).toBe('bekleyen talep')
    expect(tr.admin.detail.studentRequestsPendingCountSuffix).toBe('bekleyen talep')
  })

  it('new-request statuses never use Match or pool terminology', () => {
    for (const label of [
      en.admin.db.statusSubmitted,
      en.admin.db.statusUnderReview,
      en.admin.requests.statusLabelSubmitted,
      en.admin.requests.statusLabelUnderReview,
    ]) {
      expect(label.toLowerCase()).not.toContain('match')
      expect(label.toLowerCase()).not.toContain('pool')
      expect(label.toLowerCase()).not.toContain('assigned')
    }
    for (const label of [
      tr.admin.db.statusSubmitted,
      tr.admin.db.statusUnderReview,
      tr.admin.requests.statusLabelSubmitted,
      tr.admin.requests.statusLabelUnderReview,
    ]) {
      expect(label).not.toContain('Eşleştir')
      expect(label).not.toContain('Havuz')
      expect(label).not.toContain('Atandı')
    }
  })
})

describe('treatment journey pending-approval note', () => {
  function journeyFor(requestStatus: string) {
    return buildCaseTimeline({
      request: {
        id: 'case-1',
        status: 'matched',
        created_at: '2026-07-01T10:00:00.000Z',
        reviewed_at: '2026-07-02T10:00:00.000Z',
        reviewed_by: 'faculty@example.edu',
      },
      studentRequests: [
        {
          id: 'req-1',
          student_email: 'student@example.edu',
          status: requestStatus,
          reviewed_at: requestStatus === 'pending' ? null : '2026-07-04T10:00:00.000Z',
          created_at: '2026-07-03T10:00:00.000Z',
        },
      ],
      progressEntries: [],
    })
  }

  it('a pending request shows the awaiting-approval note', () => {
    const submission = journeyFor('pending').find((item) =>
      item.id.startsWith('student-requested-')
    )
    expect(submission?.titleKey).toBe('admin.detail.journeyStudentRequested')
    expect(submission?.noteKey).toBe('admin.detail.journeyPendingFacultyApproval')
  })

  it('resolved requests carry no pending note', () => {
    for (const status of ['approved', 'rejected', 'revoked']) {
      const submission = journeyFor(status).find((item) =>
        item.id.startsWith('student-requested-')
      )
      expect(submission?.noteKey).toBeUndefined()
    }
  })

  it('the approval event uses the real-Match title key', () => {
    const approval = journeyFor('approved').find((item) =>
      item.id.startsWith('student-reviewed-')
    )
    expect(approval?.titleKey).toBe('admin.detail.journeyStudentApproved')
  })
})
