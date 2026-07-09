'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, Download } from 'lucide-react'

import { AdminInviteCard } from '@/components/admin/dashboard/AdminInviteCard'
import { AdminStatsCards } from '@/components/admin/dashboard/AdminStatsCards'
import { BulkInvitePanel } from '@/components/admin/dashboard/BulkInvitePanel'
import { DashboardHeader } from '@/components/admin/dashboard/DashboardHeader'
import { DepartmentCasesCard, UrgentActionCard } from '@/components/admin/dashboard/DashboardSidebar'
import { RecentRequestsSection } from '@/components/admin/dashboard/RecentRequestsSection'
import { UrgentQueueSection } from '@/components/admin/dashboard/UrgentQueueSection'
import { escapeCsvValue } from '@/components/admin/dashboard/csv'
import type {
  DashboardStats,
  DepartmentCaseItem,
  PatientRequest,
} from '@/components/admin/dashboard/types'
import { useDashboardLabels } from '@/components/admin/dashboard/useDashboardLabels'
import { useI18n } from '@/lib/i18n'
import { isAdminRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

interface Props {
  initialRequests: PatientRequest[]
  adminEmail: string
  currentRole: string | null
}

export function DashboardClient({ initialRequests, adminEmail, currentRole }: Props) {
  const { t, locale } = useI18n()
  const { formatSubmittedDate, tDepartment, tStatus, tTreatment, tUrgency } =
    useDashboardLabels()

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [locale]
  )

  const avgTriageTimeLabel = useMemo(() => {
    const completedTriageDurations = initialRequests
      .filter((request) =>
        ['matched', 'rejected'].includes((request.status || '').toLowerCase()) &&
        request.created_at &&
        request.reviewed_at
      )
      .map((request) => {
        const createdAt = new Date(request.created_at as string).getTime()
        const reviewedAt = new Date(request.reviewed_at as string).getTime()
        return reviewedAt - createdAt
      })
      .filter((duration) => duration >= 0)

    if (completedTriageDurations.length === 0) {
      return t('admin.dashboard.statAvgTriageTimeNoData')
    }

    const avgMs =
      completedTriageDurations.reduce((sum, duration) => sum + duration, 0) /
      completedTriageDurations.length

    const hours = avgMs / (1000 * 60 * 60)

    if (hours < 24) {
      return `${numberFormatter.format(hours)} ${t('admin.dashboard.avgTriageHours')}`
    }

    const days = hours / 24
    return `${numberFormatter.format(days)} ${t('admin.dashboard.avgTriageDays')}`
  }, [initialRequests, numberFormatter, t])

  const dashboardStats = useMemo<DashboardStats>(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const newToday = initialRequests.filter((request) => {
      if (!request.created_at) return false
      return new Date(request.created_at) >= todayStart
    }).length

    const pendingReview = initialRequests.filter((request) =>
      ['submitted', 'under_review'].includes((request.status || '').toLowerCase())
    ).length

    const activeTreatments = initialRequests.filter(
      (request) => (request.status || '').toLowerCase() === 'matched'
    ).length

    const completed = initialRequests.filter(
      (request) => (request.status || '').toLowerCase() === 'completed'
    ).length

    const cancelled = initialRequests.filter(
      (request) => (request.status || '').toLowerCase() === 'cancelled'
    ).length

    const inTreatment = initialRequests.filter(
      (request) => (request.status || '').toLowerCase() === 'in_treatment'
    ).length

    return {
      newToday,
      pendingReview,
      activeTreatments,
      total: initialRequests.length,
      completed,
      cancelled,
      inTreatment,
    }
  }, [initialRequests])

  const recentRequests = useMemo(() => initialRequests.slice(0, 5), [initialRequests])

  const urgentUnreviewedList = useMemo(
    () =>
      initialRequests
        .filter(
          (request) =>
            (request.urgency || '').toLowerCase() === 'high' &&
            ['submitted', 'under_review'].includes((request.status || '').toLowerCase())
        )
        .slice(0, 3),
    [initialRequests]
  )

  const departmentCases = useMemo<DepartmentCaseItem[]>(() => {
    const departmentNames = [
      'Endodontics',
      'Oral & Maxillofacial Surgery',
      'Orthodontics',
      'Periodontology',
      'Restorative Dentistry',
      'Prosthodontics',
      'Pedodontics',
      'Oral Radiology',
    ]

    const counts = departmentNames.map((name) => ({
      name,
      count: initialRequests.filter(
        (request) =>
          (request.assigned_department || '').toLowerCase() === name.toLowerCase() &&
          !['rejected', 'completed', 'cancelled'].includes(
            (request.status || '').toLowerCase()
          )
      ).length,
    }))

    const withCases = counts.filter((department) => department.count > 0)
    if (withCases.length === 0) return []

    const maxCount = Math.max(...withCases.map((department) => department.count))
    return withCases.map((department) => ({
      ...department,
      barWidth: Math.round((department.count / maxCount) * 100),
    }))
  }, [initialRequests])

  const urgentCasesCount = useMemo(
    () =>
      initialRequests.filter(
        (request) =>
          (request.urgency || '').toLowerCase() === 'high' &&
          ['submitted', 'under_review'].includes((request.status || '').toLowerCase())
      ).length,
    [initialRequests]
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  function handleExportCsv() {
    const headers = [
      t('admin.dashboard.csvHeaderPatientId'),
      t('admin.dashboard.csvHeaderPatientName'),
      t('admin.dashboard.csvHeaderIssue'),
      t('admin.dashboard.csvHeaderUrgency'),
      t('admin.dashboard.csvHeaderStatus'),
      t('admin.dashboard.csvHeaderAssignedDepartment'),
      t('admin.dashboard.csvHeaderSubmittedDate'),
    ]

    const rows = initialRequests.map((request) => [
      request.id,
      request.full_name,
      tTreatment(request.treatment_type),
      tUrgency(request.urgency),
      tStatus(request.status),
      request.assigned_department ? tDepartment(request.assigned_department) : '',
      formatSubmittedDate(request.created_at),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(String(value ?? ''))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateSuffix = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `${t('admin.dashboard.exportCsvFilename')}-${dateSuffix}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900">
      <DashboardHeader adminEmail={adminEmail} onSignOut={handleSignOut} />

      <section className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t('admin.dashboard.pageTitle')}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500 sm:gap-2 sm:text-sm">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-teal-500 sm:h-4 sm:w-4" />
              <span>{t('admin.dashboard.systemsOnline')}</span>
              {dashboardStats.pendingReview > 0 && (
                <>
                  <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                  <span className="font-semibold text-amber-600">
                    {dashboardStats.pendingReview === 1
                      ? t('admin.dashboard.caseAwaitingReview')
                      : `${dashboardStats.pendingReview} ${t('admin.dashboard.casesAwaitingReview')}`}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 sm:w-auto sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('admin.dashboard.exportCsvButton')}
            </button>

            <Link
              href="/admin/requests"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:w-auto sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm"
            >
              {t('admin.dashboard.openWorkQueue')}
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </div>
        </div>

        <AdminStatsCards stats={dashboardStats} avgTriageTimeLabel={avgTriageTimeLabel} />

        {isAdminRole(currentRole) && (
          <>
            <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
              <AdminInviteCard
                title={t('admin.dashboard.inviteStudentTitle')}
                description={t('admin.dashboard.inviteStudentDesc')}
                emailLabel={t('admin.dashboard.inviteStudentEmailLabel')}
                emailPlaceholder={t('admin.dashboard.inviteStudentEmailPlaceholder')}
                submitLabel={t('admin.dashboard.inviteStudentButton')}
                submittingLabel={t('admin.dashboard.inviteStudentSending')}
                invalidEmailMessage={t('admin.dashboard.inviteStudentInvalidEmail')}
                genericErrorMessage={t('admin.dashboard.inviteStudentErrorGeneric')}
                successMessage={t('admin.dashboard.inviteStudentSuccess')}
                endpoint="/api/admin/invitations"
              />

              <AdminInviteCard
                title={t('admin.dashboard.inviteFacultyTitle')}
                description={t('admin.dashboard.inviteFacultyDesc')}
                emailLabel={t('admin.dashboard.inviteFacultyEmailLabel')}
                emailPlaceholder={t('admin.dashboard.inviteFacultyEmailPlaceholder')}
                submitLabel={t('admin.dashboard.inviteFacultyButton')}
                submittingLabel={t('admin.dashboard.inviteFacultySending')}
                invalidEmailMessage={t('admin.dashboard.inviteFacultyInvalidEmail')}
                genericErrorMessage={t('admin.dashboard.inviteFacultyErrorGeneric')}
                successMessage={t('admin.dashboard.inviteFacultySuccess')}
                endpoint="/api/admin/invitations/faculty"
              />
            </div>

            <BulkInvitePanel />
          </>
        )}

        <div className="mt-6 flex w-full flex-col gap-6 sm:mt-8 sm:gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-6 sm:space-y-8">
            <UrgentQueueSection items={urgentUnreviewedList} />
            <RecentRequestsSection requests={recentRequests} />
          </div>

          <div className="w-full min-w-0 space-y-4 sm:space-y-6 lg:w-80 lg:shrink-0 xl:w-96">
            <DepartmentCasesCard departments={departmentCases} />
            <UrgentActionCard urgentCasesCount={urgentCasesCount} />
          </div>
        </div>
      </section>
    </main>
  )
}
