'use client'

import { useI18n } from '@/lib/i18n'
import { useAdminCaseLabels } from './useAdminCaseLabels'
import type { ActivityLogEntry } from './types'

interface ActivityLogPanelProps {
  entries: ActivityLogEntry[]
  formatReviewDate: (iso: string | null) => string
}

/** Sidebar card listing local faculty activity history for this case. */
export function ActivityLogPanel({ entries, formatReviewDate }: ActivityLogPanelProps) {
  const { t } = useI18n()
  const { tDepartment } = useAdminCaseLabels()

  function activityLabel(entry: ActivityLogEntry): string {
    switch (entry.type) {
      case 'case_released':
        return t('admin.detail.historyCaseReleased')
      case 'student_request_submitted':
        return t('admin.detail.historyStudentSubmitted')
      case 'student_request_approved':
        return t('admin.detail.historyStudentApproved')
      case 'student_request_rejected':
        return t('admin.detail.historyStudentRejected')
      case 'student_request_revoked':
        return t('admin.detail.historyStudentRevoked')
      case 'rejection_undone':
        return t('admin.detail.historyRejectionUndone')
      case 'department_changed':
        return t('admin.detail.historyDepartmentChanged')
      case 'clinical_notes_updated':
        return t('admin.detail.historyClinicalNotesUpdated')
      case 'case_returned_to_pool':
        return t('admin.detail.historyReturnedToPool')
      case 'case_cancelled':
        return t('admin.detail.historyCaseCancelled')
      default:
        return entry.type
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">
          {t('admin.detail.historyTitle')}
        </h3>
        {entries.length > 0 && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
            {entries.length}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">{t('admin.detail.historyEmpty')}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const detailText =
              entry.type === 'case_released' || entry.type === 'department_changed'
                ? entry.detail
                  ? tDepartment(entry.detail)
                  : null
                : entry.detail

            return (
              <div key={entry.id} className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="text-xs font-semibold text-slate-700">
                    {activityLabel(entry)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatReviewDate(entry.timestamp)}
                  </p>
                </div>
                {detailText && (
                  <p className="mt-1 break-words text-xs leading-snug text-slate-500">{detailText}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
