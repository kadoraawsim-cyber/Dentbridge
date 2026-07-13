'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useDashboardLabels } from './useDashboardLabels'
import type { DepartmentCaseItem } from './types'

function RelativeBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-teal-500 transition-all duration-500"
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
  )
}

interface DepartmentCasesCardProps {
  departments: DepartmentCaseItem[]
}

/** Sidebar card: active case counts per department with relative bars. */
export function DepartmentCasesCard({ departments }: DepartmentCasesCardProps) {
  const { t } = useI18n()
  const { tDepartment } = useDashboardLabels()

  return (
    <div className="w-full">
      <h2 className="mb-2 sm:mb-4 text-lg sm:text-xl font-bold tracking-tight text-slate-900">
        {t('admin.dashboard.casesByDept')}
      </h2>

      <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        {departments.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-500 text-center">
            {t('admin.dashboard.noDeptCases')}
          </p>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {departments.map((dept) => (
              <div key={dept.name} className="w-full">
                <div className="mb-1.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="truncate pr-2 font-medium text-slate-700">{tDepartment(dept.name)}</span>
                  <span className="font-bold text-slate-700">{dept.count}</span>
                </div>
                <RelativeBar value={dept.barWidth} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface UrgentActionCardProps {
  urgentCasesCount: number
}

/** Sidebar card: urgent-cases call to action / all-clear state. */
export function UrgentActionCard({ urgentCasesCount }: UrgentActionCardProps) {
  const { t } = useI18n()

  return (
    <div
      className={`min-w-0 w-full rounded-xl sm:rounded-2xl border p-4 sm:p-6 shadow-sm ${
        urgentCasesCount > 0
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <AlertCircle
          className={`mt-0.5 h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${
            urgentCasesCount > 0 ? 'text-amber-600' : 'text-slate-400'
          }`}
        />
        <div className="min-w-0">
          <h3
            className={`truncate text-sm sm:text-base font-bold ${
              urgentCasesCount > 0 ? 'text-amber-900' : 'text-slate-700'
            }`}
          >
            {urgentCasesCount > 0
              ? t('admin.dashboard.actionRequired')
              : t('admin.dashboard.queueClear')}
          </h3>

          <p
            className={`mt-1 sm:mt-2 break-words text-xs sm:text-sm leading-relaxed ${
              urgentCasesCount > 0 ? 'text-amber-800' : 'text-slate-500'
            }`}
          >
            {urgentCasesCount > 0
              ? urgentCasesCount === 1
                ? t('admin.dashboard.urgentWaitingSingle')
                : `${urgentCasesCount} ${t('admin.dashboard.urgentWaitingPluralSuffix')}`
              : t('admin.dashboard.noUrgentCases')}
          </p>

          {urgentCasesCount > 0 && (
            <Link
              href="/admin/requests"
              className="mt-3 sm:mt-4 inline-flex w-full justify-center rounded-lg sm:rounded-xl border border-amber-300 bg-white px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-amber-800 transition hover:bg-amber-100 sm:w-auto"
            >
              {t('admin.dashboard.reviewNow')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
