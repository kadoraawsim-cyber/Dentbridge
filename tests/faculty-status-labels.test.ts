import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import { en } from '@/lib/i18n/translations/en'
import { tr } from '@/lib/i18n/translations/tr'
import { buildCaseTimeline } from '@/lib/case-timeline'
import { useDashboardLabels } from '@/components/admin/dashboard/useDashboardLabels'
import { useAdminCaseLabels } from '@/components/admin/case-detail/useAdminCaseLabels'

/**
 * Phase 1 faculty-facing terminology tests.
 *
 * These verify DISPLAY wording only. The canonical internal value 'matched'
 * (released to the student pool) must remain unchanged — every assertion below
 * feeds the internal value in and checks the faculty-facing label that comes
 * out. No lifecycle, RPC, or authorization behavior is exercised here; that
 * coverage lives in case-lifecycle-transitions.test.ts and
 * admin-case-actions.service.test.ts and is intentionally untouched.
 */

const mockState = vi.hoisted(() => ({ locale: 'en' as 'en' | 'tr' }))

vi.mock('@/lib/i18n', async () => {
  const { en: enDict } = await import('@/lib/i18n/translations/en')
  const { tr: trDict } = await import('@/lib/i18n/translations/tr')

  function lookup(source: Record<string, unknown>, key: string): string {
    const value = key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part]
      return undefined
    }, source)
    return typeof value === 'string' ? value : key
  }

  return {
    useI18n: () => ({
      locale: mockState.locale,
      dir: 'ltr' as const,
      setLocale: () => {},
      t: (key: string) =>
        lookup((mockState.locale === 'en' ? enDict : trDict) as unknown as Record<string, unknown>, key),
    }),
  }
})

function withLocale<T>(locale: 'en' | 'tr', run: () => T): T {
  const previous = mockState.locale
  mockState.locale = locale
  try {
    return run()
  } finally {
    mockState.locale = previous
  }
}

describe('faculty translations for internal status matched (released to pool)', () => {
  it('shared faculty status label renders Released to Pool, not Matched', () => {
    expect(en.admin.db.statusMatched).toBe('Released to Pool')
    expect(tr.admin.db.statusMatched).toBe('Öğrenci Havuzuna Yayımlandı')
  })

  it('dashboard pool card uses In Student Pool wording', () => {
    expect(en.admin.dashboard.statMatchedLabel).toBe('In Student Pool')
    expect(en.admin.dashboard.statMatchedDesc).toBe('Available to eligible students')
    expect(tr.admin.dashboard.statMatchedLabel).toBe('Öğrenci Havuzunda')
    expect(tr.admin.dashboard.statMatchedDesc).toBe('Uygun öğrencilerin erişimine açık')
  })

  it('request-list released tab is labelled Student Pool', () => {
    expect(en.admin.requests.queueTabReleased).toBe('Student Pool')
    expect(tr.admin.requests.queueTabReleased).toBe('Öğrenci Havuzu')
  })

  it('request-list row and filter labels for matched stay pool wording in both locales', () => {
    expect(en.admin.requests.statusMatched).toBe('Released to Pool')
    expect(en.admin.requests.statusLabelMatched).toBe('Released to Pool')
    expect(tr.admin.requests.statusMatched).toBe('Öğrenci Havuzuna Yayımlandı')
    expect(tr.admin.requests.statusLabelMatched).toBe('Öğrenci Havuzuna Yayımlandı')
  })

  it('no faculty-facing label for released-to-pool uses Match terminology', () => {
    const releasedToPoolLabels = [
      en.admin.db.statusMatched,
      en.admin.dashboard.statMatchedLabel,
      en.admin.requests.queueTabReleased,
      en.admin.requests.statusLabelMatched,
    ]
    for (const label of releasedToPoolLabels) {
      expect(label.toLowerCase()).not.toContain('match')
    }
    const releasedToPoolLabelsTr = [
      tr.admin.db.statusMatched,
      tr.admin.dashboard.statMatchedLabel,
      tr.admin.requests.queueTabReleased,
      tr.admin.requests.statusLabelMatched,
    ]
    for (const label of releasedToPoolLabelsTr) {
      expect(label).not.toContain('Eşleştir')
    }
  })
})

describe('faculty status formatters (internal value in, display label out)', () => {
  it('dashboard formatter renders matched as Released to Pool in both locales', () => {
    expect(withLocale('en', () => useDashboardLabels().tStatus('matched'))).toBe('Released to Pool')
    expect(withLocale('tr', () => useDashboardLabels().tStatus('matched'))).toBe(
      'Öğrenci Havuzuna Yayımlandı'
    )
  })

  it('dashboard formatter maps faculty_review instead of leaking the raw token', () => {
    expect(withLocale('en', () => useDashboardLabels().tStatus('faculty_review'))).toBe(
      'Faculty Review'
    )
    expect(withLocale('tr', () => useDashboardLabels().tStatus('faculty_review'))).toBe(
      'Fakülte İncelemesi'
    )
  })

  it('case-detail formatter renders matched as Released to Pool in both locales', () => {
    expect(withLocale('en', () => useAdminCaseLabels().tStatus('matched'))).toBe('Released to Pool')
    expect(withLocale('tr', () => useAdminCaseLabels().tStatus('matched'))).toBe(
      'Öğrenci Havuzuna Yayımlandı'
    )
  })

  it('post-approval label is untouched in this phase (student_approved stays Student Assigned)', () => {
    expect(withLocale('en', () => useDashboardLabels().tStatus('student_approved'))).toBe(
      'Student Assigned'
    )
    expect(withLocale('en', () => useAdminCaseLabels().tStatus('student_approved'))).toBe(
      'Student Assigned'
    )
  })
})

describe('treatment journey display reconstruction', () => {
  // reviewed_at on patient_requests always holds the LATEST faculty action, so
  // the faculty-review journey item must use neutral wording for pooled cases:
  // the data cannot distinguish initial release, return to pool, later-stage
  // release, or a triage edit. Event-specific entries (stage rows, request
  // rows) carry the precise transitions from their own timestamps.

  const NEUTRAL_REVIEW_KEY = 'admin.detail.journeyFacultyReviewCompleted'
  const GENERIC_REVIEW_KEY = 'admin.detail.journeyFacultyReviewed'

  function makeStage(overrides: Record<string, unknown>) {
    return {
      id: 'stage-1',
      sequence: 1,
      department: 'Endodontics',
      target_student_level: 'Year 4 Clinical Student',
      status: 'released',
      student_email: null,
      released_by: 'faculty@example.edu',
      released_at: '2026-07-02T10:00:00.000Z',
      assigned_by: null,
      assigned_at: null,
      stage_submitted_at: null,
      stage_reviewed_by: null,
      stage_reviewed_at: null,
      completed_at: null,
      cancelled_at: null,
      created_at: '2026-07-02T10:00:00.000Z',
      ...overrides,
    }
  }

  function buildJourney({
    status,
    reviewedAt = '2026-07-02T10:00:00.000Z',
    studentRequests = [] as Array<Record<string, unknown>>,
    routingStages = [] as Array<Record<string, unknown>>,
  }: {
    status: string
    reviewedAt?: string
    studentRequests?: Array<Record<string, unknown>>
    routingStages?: Array<Record<string, unknown>>
  }) {
    return buildCaseTimeline({
      request: {
        id: 'case-1',
        status,
        created_at: '2026-07-01T10:00:00.000Z',
        reviewed_at: reviewedAt,
        reviewed_by: 'faculty@example.edu',
      },
      // Fixtures intentionally stay minimal; cast keeps them aligned with the
      // exported timeline input types without repeating every nullable field.
      studentRequests: studentRequests as Parameters<
        typeof buildCaseTimeline
      >[0]['studentRequests'],
      progressEntries: [],
      routingStages: routingStages as Parameters<typeof buildCaseTimeline>[0]['routingStages'],
    })
  }

  function titleOf(items: ReturnType<typeof buildCaseTimeline>, idPrefix: string) {
    return items.find((item) => item.id.startsWith(idPrefix))?.titleKey
  }

  it('initial release to pool: neutral review title plus the stage-release entry', () => {
    const items = buildJourney({
      status: 'matched',
      routingStages: [makeStage({})],
    })
    expect(titleOf(items, 'faculty-reviewed-')).toBe(NEUTRAL_REVIEW_KEY)
    expect(titleOf(items, 'stage-released-stage-1')).toBe('admin.detail.journeyStageReleased')
  })

  it('returned-to-pool case: review title stays neutral and never claims triage completion', () => {
    const items = buildJourney({
      status: 'matched',
      reviewedAt: '2026-07-05T09:00:00.000Z',
      routingStages: [makeStage({})],
      studentRequests: [
        {
          id: 'req-1',
          student_email: 'student@example.edu',
          status: 'revoked',
          reviewed_at: '2026-07-05T09:00:00.000Z',
          created_at: '2026-07-03T08:00:00.000Z',
        },
      ],
    })
    expect(titleOf(items, 'faculty-reviewed-')).toBe(NEUTRAL_REVIEW_KEY)
    // The revocation itself is reported by its own event-specific entry.
    expect(titleOf(items, 'student-reviewed-req-1')).toBe('admin.detail.journeyStudentRevoked')
  })

  it('later department-stage release: neutral review title plus the next-stage entry', () => {
    const items = buildJourney({
      status: 'matched',
      reviewedAt: '2026-07-08T11:00:00.000Z',
      routingStages: [
        makeStage({ status: 'completed', completed_at: '2026-07-08T11:00:00.000Z' }),
        makeStage({
          id: 'stage-2',
          sequence: 2,
          department: 'Periodontology',
          released_at: '2026-07-08T11:00:00.000Z',
          created_at: '2026-07-08T11:00:00.000Z',
        }),
      ],
    })
    expect(titleOf(items, 'faculty-reviewed-')).toBe(NEUTRAL_REVIEW_KEY)
    expect(titleOf(items, 'stage-released-stage-2')).toBe(
      'admin.detail.journeyNextStageReleased'
    )
  })

  it('student-approved case keeps the generic review title (real Match wording is later phase)', () => {
    const items = buildJourney({
      status: 'student_approved',
      studentRequests: [
        {
          id: 'req-1',
          student_email: 'student@example.edu',
          status: 'approved',
          reviewed_at: '2026-07-05T09:00:00.000Z',
          created_at: '2026-07-03T08:00:00.000Z',
        },
      ],
    })
    expect(titleOf(items, 'faculty-reviewed-')).toBe(GENERIC_REVIEW_KEY)
    expect(titleOf(items, 'student-reviewed-req-1')).toBe('admin.detail.journeyStudentApproved')
  })

  it('pre-release statuses keep the generic review title', () => {
    expect(titleOf(buildJourney({ status: 'under_review' }), 'faculty-reviewed-')).toBe(
      GENERIC_REVIEW_KEY
    )
  })

  it('journey wording keys exist with the approved values in both locales', () => {
    expect(en.admin.detail.journeyFacultyReviewCompleted).toBe('Faculty review completed')
    expect(en.admin.detail.journeyReleasedToStudentPool).toBe('Released to Student Pool')
    expect(en.admin.detail.journeyStageReleased).toBe('Case released to department pool')
    expect(en.admin.detail.journeyStagePrefix).toBe('Stage')
    expect(tr.admin.detail.journeyFacultyReviewCompleted).toBe('Fakülte incelemesi tamamlandı')
    expect(tr.admin.detail.journeyReleasedToStudentPool).toBe('Öğrenci havuzuna yayımlandı')
    expect(tr.admin.detail.journeyStageReleased).toBe('Vaka bölüm havuzuna yayımlandı')
    expect(tr.admin.detail.journeyStagePrefix).toBe('Aşama')
  })
})
