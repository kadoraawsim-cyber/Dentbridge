'use client'

import Link from 'next/link'
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Phone,
  Stethoscope,
  TrendingUp,
  UserCheck,
} from 'lucide-react'

import { useI18n } from '@/lib/i18n'

import type { DashboardStats, DashboardUiText, LiveActiveCase } from './types'

interface StudentDashboardOverviewProps {
  actionRequiredCount: number
  nextActionCase: LiveActiveCase | null
  nextActionLabel: string
  trulyActiveCaseCount: number
  stats: DashboardStats
  displayName: string
  studentEmail: string
  studentPhone: string
  studentInitials: string
  avatarUrl: string
  ui: DashboardUiText
  onAvatarImageError: () => void
  tTreatment: (value: string) => string
  tDept: (value: string | null) => string
}

export function StudentDashboardOverview({
  actionRequiredCount,
  nextActionCase,
  nextActionLabel,
  trulyActiveCaseCount,
  stats,
  displayName,
  studentEmail,
  studentPhone,
  studentInitials,
  avatarUrl,
  ui,
  onAvatarImageError,
  tTreatment,
  tDept,
}: StudentDashboardOverviewProps) {
  const { t } = useI18n()

  return (
    <>
      <div className="mb-4 sm:mb-8 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <div
              className={`flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl text-sm sm:text-xl font-bold shadow-sm ${
                avatarUrl ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'
              }`}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Avatar URLs can be local object URLs from file previews, which are not safe for next/image.
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={onAvatarImageError}
                />
              ) : (
                studentInitials
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
                {ui.heroHeading}
              </h1>

              {displayName && (
                <p className="mt-0.5 sm:mt-1 truncate text-sm sm:text-lg font-semibold text-slate-800">{displayName}</p>
              )}

              <div className="mt-1 sm:mt-2 flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-400">
                <span className="hidden sm:block max-w-full truncate sm:max-w-[240px]">{studentEmail}</span>
                <span className="hidden h-1 w-1 shrink-0 rounded-full bg-slate-300 sm:block" />
                <span className="flex shrink-0 items-center gap-1 text-teal-600">
                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {t('student.dashboard.enrolledActive')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 sm:gap-3">
            <Link
              href="/student/cases"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-slate-900 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{t('student.dashboard.browseCases')}</span>
              {stats.available > 0 && (
                <span className="ml-0.5 rounded-full bg-white/20 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold">
                  {stats.available}
                </span>
              )}
            </Link>
          </div>
        </div>

        {actionRequiredCount > 0 && (
          <div className="flex items-center gap-2 sm:gap-3 border-t border-amber-100 bg-amber-50 px-4 py-2 sm:px-8 sm:py-3">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-600" />
            <p className="text-xs sm:text-sm text-amber-800 truncate">
              <span className="font-semibold">
                {actionRequiredCount === 1
                  ? t('student.dashboard.caseNeedsAttention')
                  : `${actionRequiredCount} ${t(
                      'student.dashboard.casesNeedAttention'
                    )}`}
              </span>{' '}
              <span className="hidden sm:inline">{t('student.dashboard.actionNeededSuffix')}</span>
            </p>
          </div>
        )}
      </div>

      <div className="mb-4 sm:mb-8 grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="min-w-0 col-span-2 sm:col-span-1 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-600" />
            <p className="truncate text-xs sm:text-sm font-semibold text-slate-900">{ui.nextAction}</p>
          </div>

          {nextActionCase ? (
            <>
              <p className="truncate text-sm sm:text-base font-medium text-slate-700">{nextActionLabel}</p>
              <p className="mt-0.5 sm:mt-1 truncate text-[10px] sm:text-xs text-slate-400">
                {nextActionCase.assigned_department ? tDept(nextActionCase.assigned_department) : tTreatment(nextActionCase.treatment_type)}
              </p>
              <a
                href="#my-active-cases"
                className="mt-2 sm:mt-4 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                {ui.continueWork}
                <ChevronRight className="h-3 sm:h-4 w-3 sm:w-4" />
              </a>
            </>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500">{ui.nothingUrgent}</p>
          )}
        </div>

        <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
            <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-emerald-600" />
            <p className="truncate text-xs sm:text-sm font-semibold text-slate-900">{ui.activePatients}</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">{trulyActiveCaseCount}</p>
          <p className="hidden sm:block mt-1 truncate text-xs sm:text-sm text-slate-500">{ui.activePatientsDesc}</p>
        </div>

        <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-slate-500" />
            <p className="truncate text-xs sm:text-sm font-semibold text-slate-900">{ui.studentProfile}</p>
          </div>
          <p className="truncate text-xs sm:text-sm font-semibold text-slate-800">
            {displayName || studentEmail.split('@')[0]}
          </p>
          <p className="mt-1.5 sm:mt-3 truncate text-[9px] sm:text-xs font-medium uppercase tracking-wider text-slate-400">
            {ui.phoneOnFile}
          </p>
          <p className="mt-0.5 sm:mt-1 truncate text-xs sm:text-sm text-slate-700">
            {studentPhone?.trim() || ui.notAdded}
          </p>
        </div>
      </div>

      <div className="mb-6 sm:mb-8 grid w-full grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="flex min-w-0 flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('student.dashboard.statPendingLabel')}
            </p>
            <p className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {stats.pending}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              {ui.completedCases}
            </p>
            <p className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {stats.completed}
            </p>
            <a
              href="#completed-cases"
              className="mt-1 inline-flex text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 sm:text-xs"
            >
              {ui.viewCompleted}
            </a>
          </div>
        </div>

        <div className="flex min-w-0 flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-700">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('student.dashboard.statInPoolLabel')}
            </p>
            <p className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {stats.available}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-red-50 text-red-600">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('student.dashboard.statUrgentLabel')}
            </p>
            <p className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {stats.urgent}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
