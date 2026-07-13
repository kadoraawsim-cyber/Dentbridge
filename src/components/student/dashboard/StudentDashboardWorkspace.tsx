'use client'

import Link from 'next/link'
import {
  Activity,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  RefreshCw,
  Scale,
  Stethoscope,
  Syringe,
  UserCheck,
} from 'lucide-react'

import { useI18n } from '@/lib/i18n'

import type { DashboardUiText, PoolCase } from './types'

function getUrgencyBadgeClass(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':
      return 'bg-red-50 text-red-700 border border-red-200'
    case 'medium':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'low':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

interface StudentDashboardWorkspaceProps {
  recentCases: PoolCase[]
  hasActiveCases: boolean
  ui: DashboardUiText
  tTreatment: (value: string) => string
  tUrgency: (value: string) => string
}

export function StudentDashboardWorkspace({
  recentCases,
  hasActiveCases,
  ui,
  tTreatment,
  tUrgency,
}: StudentDashboardWorkspaceProps) {
  const { t } = useI18n()

  return (
    <div className="flex w-full flex-col gap-6 sm:gap-8 xl:flex-row xl:items-start">
      <div className="w-full min-w-0 order-2 xl:order-1 flex-1">
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="truncate text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            {t('student.dashboard.recentlyInPool')}
          </h2>
        </div>

        <div className="w-full overflow-x-auto rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm">
          {recentCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14 text-center">
              <p className="text-xs sm:text-sm text-slate-400">
                {t('student.dashboard.noCasesInPoolDesc')}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[400px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[9px] sm:text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 sm:px-5 sm:py-3.5 font-semibold">
                    {t('student.dashboard.tableCase')}
                  </th>
                  <th className="px-3 py-2 sm:px-5 sm:py-3.5 font-semibold">
                    {t('student.dashboard.tableTreatment')}
                  </th>
                  <th className="px-3 py-2 sm:px-5 sm:py-3.5 font-semibold">
                    {t('student.dashboard.tableUrgency')}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentCases.map((c) => (
                  <tr key={c.id} className="group transition hover:bg-slate-50">
                    <td className="px-3 py-2.5 sm:px-5 sm:py-4">
                      <span className="font-mono text-[10px] sm:text-xs font-bold text-slate-500">
                        #{c.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 sm:px-5 sm:py-4 text-xs sm:text-sm font-medium text-slate-800">
                      {tTreatment(c.treatment_type)}
                    </td>
                    <td className="px-3 py-2.5 sm:px-5 sm:py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold ${getUrgencyBadgeClass(
                          c.urgency
                        )}`}
                      >
                        {tUrgency(c.urgency)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="w-full min-w-0 order-1 xl:order-2 space-y-3 sm:space-y-5 xl:w-[320px] xl:shrink-0">
        <div className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="mb-3 flex min-w-0 items-center gap-2.5 sm:gap-3.5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-cyan-50 text-cyan-700">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="min-w-0 truncate text-xs sm:text-sm font-semibold text-slate-900">
              {t('student.dashboard.clinicalTools')}
            </p>
          </div>

          <div className="space-y-2">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {t('student.dashboard.periodontalChartOnline')}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {t('student.dashboard.periodontalChartDescription')}
                  </p>
                </div>
              </div>
              <a
                href="https://www.periodontalchart-online.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                {t('student.dashboard.openTool')}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <Scale className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {t('student.dashboard.bmiCalculator')}
                  </p>
                </div>
              </div>
              <Link
                href="/student/clinical-tools/bmi-calculator"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                {t('student.dashboard.openTool')}
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Syringe className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {t('student.dashboard.localAnesthesiaCalculator')}
                  </p>
                </div>
              </div>
              <Link
                href="/student/clinical-tools/local-anesthesia-calculator"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                {t('student.dashboard.openTool')}
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>

            {[
              {
                label: t('student.dashboard.medicalHistoryForm'),
                Icon: ClipboardList,
                rowClass: 'border-emerald-100 bg-emerald-50/35',
                iconClass: 'bg-emerald-50 text-emerald-700',
              },
              {
                label: t('student.dashboard.clinicalGuidelines'),
                Icon: BookOpen,
                rowClass: 'border-blue-100 bg-blue-50/35',
                iconClass: 'bg-blue-50 text-blue-700',
              },
            ].map(({ label, Icon, rowClass, iconClass }) => (
              <div
                key={label}
                className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 ${rowClass}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="min-w-0 truncate text-xs font-semibold text-slate-600">
                    {label}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {t('student.dashboard.comingSoon')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <h2 className="truncate text-lg sm:text-xl font-bold tracking-tight text-slate-900">
          {t('student.dashboard.quickActions')}
        </h2>

        <div className="flex overflow-x-auto pb-4 -mx-3 px-3 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0 sm:flex-col gap-3">
          <Link
            href="/student/cases"
            className="flex shrink-0 w-64 sm:w-auto items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-700">
                <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs sm:text-sm font-semibold text-slate-900">
                  {t('student.dashboard.browseCasePool')}
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/student/requests"
            className="flex shrink-0 w-64 sm:w-auto items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-700">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs sm:text-sm font-semibold text-slate-900">
                  {t('student.nav.myRequests')}
                </p>
              </div>
            </div>
          </Link>

          {hasActiveCases && (
            <a
              href="#my-active-cases"
              className="flex shrink-0 w-64 sm:w-auto items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs sm:text-sm font-semibold text-slate-900">
                    {ui.activePatients}
                  </p>
                </div>
              </div>
            </a>
          )}
          
           <div className="flex shrink-0 w-64 sm:w-auto cursor-not-allowed items-center justify-between gap-2 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm opacity-60">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-violet-50 text-violet-700">
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs sm:text-sm font-semibold text-slate-900">
                  {t('student.dashboard.caseExchange')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 w-64 sm:w-auto items-center justify-between gap-2 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm opacity-60">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs sm:text-sm font-semibold text-slate-900">
                  {t('student.dashboard.clinicalRequirements')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
