'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { getStatusBadgeClass } from './badges'
import { useDashboardLabels } from './useDashboardLabels'
import type { PatientRequest } from './types'

interface UrgentQueueSectionProps {
  items: PatientRequest[]
}

/** Priority queue of urgent, unreviewed cases. Renders nothing when empty. */
export function UrgentQueueSection({ items }: UrgentQueueSectionProps) {
  const { t } = useI18n()
  const { relativeTime, tStatus, tTreatment } = useDashboardLabels()

  if (items.length === 0) return null

  return (
    <div className="w-full">
      <div className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-red-600" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('admin.dashboard.urgentQueueTitle')}
          </h2>
          <span className="rounded-full bg-red-100 px-2 py-0.5 sm:px-2.5 sm:py-0.5 text-[10px] sm:text-xs font-bold text-red-700">
            {items.length}
          </span>
        </div>
        <Link
          href="/admin/requests"
          className="text-xs sm:text-sm font-semibold text-blue-600 hover:underline"
        >
          {t('admin.dashboard.viewAll')}
        </Link>
      </div>

      <div className="w-full overflow-hidden rounded-xl sm:rounded-2xl border border-red-200 bg-white shadow-sm">
        {items.map((r, i) => (
          <div
            key={r.id}
            className={`flex flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 ${
              i < items.length - 1 ? 'border-b border-slate-100' : ''
            }`}
          >
            <div className="flex min-w-0 items-start gap-2.5 sm:gap-3 sm:flex-1 sm:items-center">
              <div className="mt-1 h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full bg-red-500 sm:mt-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm sm:text-base font-semibold text-slate-900">{r.full_name}</p>
                <p className="mt-0.5 break-words text-xs sm:text-sm text-slate-500">
                  {tTreatment(r.treatment_type)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:block sm:text-right">
              <p className="text-[10px] sm:text-xs text-slate-400">{relativeTime(r.created_at)}</p>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 sm:px-2.5 sm:py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                  r.status
                )}`}
              >
                {tStatus(r.status)}
              </span>
            </div>

            <Link
              href={`/admin/requests/${r.id}`}
              className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 sm:w-auto"
            >
              {t('admin.dashboard.reviewNow')}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
