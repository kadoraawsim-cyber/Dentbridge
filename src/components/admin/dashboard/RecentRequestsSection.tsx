'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { getStatusBadgeClass, getUrgencyBadgeClass } from './badges'
import { useDashboardLabels } from './useDashboardLabels'
import type { PatientRequest } from './types'

interface RecentRequestsSectionProps {
  requests: PatientRequest[]
}

/** Recent requests: mobile card list plus desktop table. */
export function RecentRequestsSection({ requests }: RecentRequestsSectionProps) {
  const { t } = useI18n()
  const { relativeTime, tStatus, tTreatment, tUrgency } = useDashboardLabels()

  return (
    <div className="w-full">
      <div className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Recent Requests
          </h2>
        </div>
        <Link
          href="/admin/requests"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="w-full overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Mobile cards */}
        <div className="divide-y divide-slate-100 md:hidden">
          {requests.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500 text-center">
              {t('admin.dashboard.noRequests')}
            </div>
          ) : (
            requests.map((r) => (
              <Link
                key={r.id}
                href={`/admin/requests/${r.id}`}
                className="block w-full px-4 py-4 transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.full_name}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      {r.id.slice(0, 8)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {relativeTime(r.created_at)}
                  </span>
                </div>

                <p className="mt-2 break-words text-xs text-slate-600">
                  {tTreatment(r.treatment_type)}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold ${getUrgencyBadgeClass(
                      r.urgency
                    )}`}
                  >
                    {tUrgency(r.urgency)}
                  </span>

                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                      r.status
                    )}`}
                  >
                    {tStatus(r.status)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden w-full overflow-x-auto md:block">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tablePatient')}</th>
                <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tableIssue')}</th>
                <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tableUrgency')}</th>
                <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tableStatus')}</th>
                <th className="px-5 py-3 text-right font-semibold">
                  {t('admin.dashboard.tableSubmitted')}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-sm text-slate-500 text-center">
                    {t('admin.dashboard.noRequests')}
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="group transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link href={`/admin/requests/${r.id}`} className="block">
                        <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-900">
                          {r.full_name}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                          {r.id.slice(0, 8)}
                        </div>
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {tTreatment(r.treatment_type)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getUrgencyBadgeClass(
                          r.urgency
                        )}`}
                      >
                        {tUrgency(r.urgency).toUpperCase()}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                          r.status
                        )}`}
                      >
                        {tStatus(r.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="flex items-center justify-end gap-1 whitespace-nowrap text-xs text-slate-400 hover:text-blue-700"
                      >
                        {relativeTime(r.created_at)}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
