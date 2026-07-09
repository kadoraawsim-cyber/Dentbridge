'use client'

import { Calendar, CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import type { CaseTimelineItem } from '@/lib/case-timeline'
import { useAdminCaseLabels } from './useAdminCaseLabels'

interface TreatmentJourneyPanelProps {
  items: CaseTimelineItem[]
  formatReviewDate: (iso: string | null) => string
  formatDateOnly: (value: string | null) => string
  formatTimeOnly: (value: string | null) => string
}

function getJourneyTone(kind: 'system' | 'appointment' | 'progress' | 'closure') {
  switch (kind) {
    case 'appointment':
      return {
        rail: 'bg-indigo-100',
        icon: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      }
    case 'progress':
      return {
        rail: 'bg-purple-100',
        icon: 'border-purple-200 bg-purple-50 text-purple-700',
        badge: 'bg-purple-50 text-purple-700 border-purple-100',
      }
    case 'closure':
      return {
        rail: 'bg-emerald-100',
        icon: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      }
    default:
      return {
        rail: 'bg-slate-100',
        icon: 'border-slate-200 bg-slate-50 text-slate-600',
        badge: 'bg-slate-50 text-slate-600 border-slate-100',
      }
  }
}

/** Sidebar timeline of the case's treatment journey (system + clinical events). */
export function TreatmentJourneyPanel({
  items,
  formatReviewDate,
  formatDateOnly,
  formatTimeOnly,
}: TreatmentJourneyPanelProps) {
  const { t } = useI18n()
  const { tStatus } = useAdminCaseLabels()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">
          {t('admin.detail.treatmentJourneyTitle')}
        </h3>
        {items.length > 0 && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{t('admin.detail.treatmentJourneyEmpty')}</p>
      ) : (
        <div className="max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
          {items.map((item, index) => {
            const tone = getJourneyTone(item.kind)
            const detailText =
              (item.titleKey === 'admin.detail.journeyFacultyReviewed' ||
                item.kind === 'closure') &&
              item.detail
                ? tStatus(item.detail)
                : item.detail
            const kindLabel =
              item.kind === 'appointment'
                ? t('admin.detail.journeyKindAppointment')
                : item.kind === 'progress'
                ? t('admin.detail.journeyKindProgress')
                : item.kind === 'closure'
                ? t('admin.detail.journeyKindClosure')
                : t('admin.detail.journeyKindSystem')

            return (
              <div key={item.id} className="relative flex gap-2.5">
                {index < items.length - 1 && (
                  <div
                    className={`absolute left-[13px] top-7 h-[calc(100%+0.35rem)] w-px ${tone.rail}`}
                    aria-hidden="true"
                  />
                )}
                <div
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${tone.icon}`}
                >
                  {item.kind === 'appointment' ? (
                    <Calendar className="h-3.5 w-3.5" />
                  ) : item.kind === 'progress' ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : item.kind === 'closure' &&
                    ['rejected', 'cancelled'].includes((item.detail || '').toLowerCase()) ? (
                    <XCircle className="h-3.5 w-3.5" />
                  ) : item.kind === 'closure' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
                      {t(item.titleKey)}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}
                    >
                      {kindLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {item.appointmentDate
                      ? `${formatDateOnly(item.appointmentDate)}${
                          item.appointmentTime ? ` · ${formatTimeOnly(item.appointmentTime)}` : ''
                        }`
                      : formatReviewDate(item.occurredAt)}
                  </p>

                  {detailText && (
                    <p className="mt-1 break-words text-xs leading-snug text-slate-600">{detailText}</p>
                  )}
                  {item.actor && (
                    <p className="mt-1 text-xs text-slate-400">
                      {t('admin.detail.journeyActorLabel')} {item.actor}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
