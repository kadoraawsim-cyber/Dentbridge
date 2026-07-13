'use client'

import Link from 'next/link'
import { Activity, Clock, Inbox, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import type { DashboardStats } from './types'

interface AdminStatsCardsProps {
  stats: DashboardStats
  avgTriageTimeLabel: string
}

/** Dashboard stat card grid plus the outcome summary pills. */
export function AdminStatsCards({ stats, avgTriageTimeLabel }: AdminStatsCardsProps) {
  const { t } = useI18n()

  return (
    <>
      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
          <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
            <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-slate-400" />
            <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('admin.dashboard.statNewTodayLabel')}
            </span>
          </div>
          <div className="truncate text-xl sm:text-5xl font-bold tracking-tight text-blue-900">
            {stats.newToday}
          </div>
          <div className="mt-0.5 sm:mt-2 truncate text-[10px] sm:text-sm text-slate-500">{t('admin.dashboard.statNewTodayDesc')}</div>
        </div>

        <div
          className={`min-w-0 rounded-xl sm:rounded-2xl border bg-white p-3 sm:p-6 shadow-sm transition ${
            stats.pendingReview > 0 ? 'border-amber-200' : 'border-slate-200'
          }`}
        >
          <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-500" />
            <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('admin.dashboard.statPendingLabel')}
            </span>
          </div>
          <div
            className={`truncate text-xl sm:text-5xl font-bold tracking-tight ${
              stats.pendingReview > 0 ? 'text-amber-600' : 'text-slate-400'
            }`}
          >
            {stats.pendingReview}
          </div>
          <div className="mt-0.5 sm:mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-1 sm:gap-2">
            <span className="truncate text-[10px] sm:text-sm text-slate-500">{t('admin.dashboard.statPendingDesc')}</span>
            {stats.pendingReview > 0 && (
              <Link
                href="/admin/requests"
                className="shrink-0 text-[10px] sm:text-xs font-semibold text-amber-600 hover:underline"
              >
                {t('admin.dashboard.statPendingReviewLink')}
              </Link>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
          <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-violet-500" />
            <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('admin.dashboard.statMatchedLabel')}
            </span>
          </div>
          <div className="truncate text-xl sm:text-5xl font-bold tracking-tight text-violet-700">
            {stats.activeTreatments}
          </div>
          <div className="mt-0.5 sm:mt-2 truncate text-[10px] sm:text-sm text-slate-500">{t('admin.dashboard.statMatchedDesc')}</div>
        </div>

        <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
          <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-teal-500" />
            <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('admin.dashboard.statTotalLabel')}
            </span>
          </div>
          <div className="truncate text-xl sm:text-5xl font-bold tracking-tight text-teal-600">
            {stats.total}
          </div>
          <div className="mt-0.5 sm:mt-2 truncate text-[10px] sm:text-sm text-slate-500">{t('admin.dashboard.statTotalDesc')}</div>
        </div>

        <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
          <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-cyan-600" />
            <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('admin.dashboard.statAvgTriageTimeLabel')}
            </span>
          </div>
          <div className="truncate text-lg sm:text-4xl font-bold tracking-tight text-cyan-700">
            {avgTriageTimeLabel}
          </div>
          <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-sm text-slate-500">
            {t('admin.dashboard.statAvgTriageTimeDesc')}
          </div>
        </div>
      </div>

      {/* ── Outcome summary pills ──────────────────────────────────────── */}
      <div className="mt-3 sm:mt-4 grid w-full grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 sm:px-4 sm:py-3">
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full bg-emerald-500" />
          <div className="min-w-0">
            <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              {t('admin.dashboard.statCompletedLabel')}
            </p>
            <p className="truncate text-base sm:text-xl font-bold leading-tight text-emerald-800">
              {stats.completed}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 sm:px-4 sm:py-3">
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full bg-rose-400" />
          <div className="min-w-0">
            <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-rose-700">
              {t('admin.dashboard.statCancelledLabel')}
            </p>
            <p className="truncate text-base sm:text-xl font-bold leading-tight text-rose-800">
              {stats.cancelled}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 sm:px-4 sm:py-3">
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full bg-blue-500" />
          <div className="min-w-0">
            <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-blue-700">
              {t('admin.dashboard.statInTreatmentLabel')}
            </p>
            <p className="truncate text-base sm:text-xl font-bold leading-tight text-blue-800">
              {stats.inTreatment}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
