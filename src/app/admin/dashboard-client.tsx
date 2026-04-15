'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  LogOut,
  Clock,
  Inbox,
  Activity,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type PatientRequest = {
  id: string
  full_name: string
  treatment_type: string
  urgency: string
  status: string
  assigned_department: string | null
  created_at: string | null
}

type DepartmentCaseItem = {
  name: string
  count: number
  barWidth: number
}

interface Props {
  initialRequests: PatientRequest[]
  adminEmail: string
}

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

function getStatusBadgeClass(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return 'bg-slate-100 text-slate-700 border border-slate-200'
    case 'under_review':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'matched':
      return 'bg-violet-50 text-violet-700 border border-violet-200'
    case 'contacted':
      return 'bg-cyan-50 text-cyan-700 border border-cyan-200'
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}


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

export function DashboardClient({ initialRequests, adminEmail }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB'

  function relativeTime(iso: string | null): string {
    if (!iso) return '\u2014'
    const ms = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 2) return t('admin.db.timeJustNow')
    if (mins < 60) return `${mins}${t('admin.db.timeMinutesSuffix')}`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}${t('admin.db.timeHoursSuffix')}`
    const days = Math.floor(hrs / 24)
    if (days === 1) return t('admin.db.timeYesterday')
    if (days < 7) return `${days}${t('admin.db.timeDaysSuffix')}`
    return new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
  }

  function tStatus(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'submitted':            return t('admin.db.statusSubmitted')
      case 'under_review':         return t('admin.db.statusUnderReview')
      case 'matched':              return t('admin.db.statusMatched')
      case 'student_approved':     return t('admin.db.statusStudentApproved')
      case 'contacted':            return t('admin.db.statusContacted')
      case 'appointment_scheduled':return t('admin.db.statusApptScheduled')
      case 'in_treatment':         return t('admin.db.statusInTreatment')
      case 'completed':            return t('admin.db.statusCompleted')
      case 'rejected':             return t('admin.db.statusRejected')
      case 'cancelled':            return t('admin.db.statusCancelled')
      default:                     return status
    }
  }

  function tTreatment(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'initial examination / consultation': return t('admin.db.treatmentInitialExam')
      case 'dental cleaning':                    return t('admin.db.treatmentCleaning')
      case 'fillings':                           return t('admin.db.treatmentFillings')
      case 'tooth extraction':                   return t('admin.db.treatmentExtraction')
      case 'root canal treatment':               return t('admin.db.treatmentRootCanal')
      case 'gum treatment':                      return t('admin.db.treatmentGum')
      case 'prosthetics / crowns':               return t('admin.db.treatmentProsthetics')
      case 'orthodontics':                       return t('admin.db.treatmentOrthodontics')
      case 'pediatric dentistry':                return t('admin.db.treatmentPediatric')
      case 'esthetic dentistry':                 return t('admin.db.treatmentEsthetic')
      case 'other':                              return t('admin.db.treatmentOther')
      default:                                   return type
    }
  }

  function tDepartment(dept: string): string {
    switch ((dept || '').toLowerCase()) {
      case 'endodontics':                   return t('admin.db.deptEndodontics')
      case 'oral & maxillofacial surgery':  return t('admin.db.deptSurgery')
      case 'orthodontics':                  return t('admin.db.deptOrthodontics')
      case 'periodontology':                return t('admin.db.deptPeriodontology')
      case 'restorative dentistry':         return t('admin.db.deptRestorative')
      case 'prosthodontics':                return t('admin.db.deptProsthodontics')
      case 'pedodontics':                   return t('admin.db.deptPedodontics')
      case 'oral radiology':                return t('admin.db.deptRadiology')
      case 'general review':                return t('admin.db.deptGeneralReview')
      default:                              return dept
    }
  }

  function tUrgency(urgency: string): string {
    switch ((urgency || '').toLowerCase()) {
      case 'high':   return t('request.urgencyHigh')
      case 'medium': return t('request.urgencyMedium')
      case 'low':    return t('request.urgencyLow')
      default:       return urgency || t('admin.requests.urgencyLabelUnspecified')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  const dashboardStats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const newToday = initialRequests.filter((r) => {
      if (!r.created_at) return false
      return new Date(r.created_at) >= todayStart
    }).length

    const pendingReview = initialRequests.filter((r) =>
      ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
    ).length

    const activeTreatments = initialRequests.filter(
      (r) => (r.status || '').toLowerCase() === 'matched'
    ).length

    const total = initialRequests.length

    return { newToday, pendingReview, activeTreatments, total }
  }, [initialRequests])

  const recentRequests = useMemo(() => initialRequests.slice(0, 5), [initialRequests])

  const urgentUnreviewedList = useMemo(
    () =>
      initialRequests
        .filter(
          (r) =>
            (r.urgency || '').toLowerCase() === 'high' &&
            ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
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
        (r) =>
          (r.assigned_department || '').toLowerCase() === name.toLowerCase() &&
          !['rejected', 'completed'].includes((r.status || '').toLowerCase())
      ).length,
    }))

    const withCases = counts.filter((d) => d.count > 0)
    if (withCases.length === 0) return []

    const maxCount = Math.max(...withCases.map((d) => d.count))
    return withCases.map((d) => ({
      ...d,
      barWidth: Math.round((d.count / maxCount) * 100),
    }))
  }, [initialRequests])

  const urgentCasesCount = useMemo(
    () =>
      initialRequests.filter(
        (r) =>
          (r.urgency || '').toLowerCase() === 'high' &&
          ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
      ).length,
    [initialRequests]
  )

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/dentbridge-icon.png"
              alt="DentBridge icon"
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-lg font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {t('admin.shared.clinicalPlatform')}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/admin" className="text-slate-900">
              {t('admin.shared.navDashboard')}
            </Link>
            <Link href="/admin/requests" className="hover:text-slate-900">
              {t('admin.shared.navTriageReview')}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {adminEmail && (
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                <span className="max-w-[200px] truncate">{adminEmail}</span>
              </div>
            )}
            <LanguageSwitcher />
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('admin.shared.signOut')}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Page title + CTA ───────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {t('admin.dashboard.pageTitle')}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-teal-500" />
              {t('admin.dashboard.systemsOnline')}
              {dashboardStats.pendingReview > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="font-semibold text-amber-600">
                    {dashboardStats.pendingReview === 1
                      ? t('admin.dashboard.caseAwaitingReview')
                      : `${dashboardStats.pendingReview} ${t('admin.dashboard.casesAwaitingReview')}`}
                  </span>
                </>
              )}
            </p>
          </div>
          <Link
            href="/admin/requests"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:self-auto"
          >
            {t('admin.dashboard.openWorkQueue')}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Inbox className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.dashboard.statNewTodayLabel')}
              </span>
            </div>
            <div className="text-5xl font-bold tracking-tight text-blue-900">
              {dashboardStats.newToday}
            </div>
            <div className="mt-2 text-sm text-slate-500">{t('admin.dashboard.statNewTodayDesc')}</div>
          </div>

          <div
            className={`rounded-2xl border bg-white p-6 shadow-sm transition ${
              dashboardStats.pendingReview > 0 ? 'border-amber-200' : 'border-slate-200'
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.dashboard.statPendingLabel')}
              </span>
            </div>
            <div
              className={`text-5xl font-bold tracking-tight ${
                dashboardStats.pendingReview > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {dashboardStats.pendingReview}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-slate-500">{t('admin.dashboard.statPendingDesc')}</span>
              {dashboardStats.pendingReview > 0 && (
                <Link
                  href="/admin/requests"
                  className="text-xs font-semibold text-amber-600 hover:underline"
                >
                  {t('admin.dashboard.statPendingReviewLink')}
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.dashboard.statMatchedLabel')}
              </span>
            </div>
            <div className="text-5xl font-bold tracking-tight text-violet-700">
              {dashboardStats.activeTreatments}
            </div>
            <div className="mt-2 text-sm text-slate-500">{t('admin.dashboard.statMatchedDesc')}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.dashboard.statTotalLabel')}
              </span>
            </div>
            <div className="text-5xl font-bold tracking-tight text-teal-600">
              {dashboardStats.total}
            </div>
            <div className="mt-2 text-sm text-slate-500">{t('admin.dashboard.statTotalDesc')}</div>
          </div>
        </div>

        {/* ── Priority queue: urgent unreviewed cases ─────────────────────── */}
        {urgentUnreviewedList.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  {t('admin.dashboard.urgentQueueTitle')}
                </h2>
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                  {urgentUnreviewedList.length}
                </span>
              </div>
              <Link
                href="/admin/requests"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                {t('admin.dashboard.viewAll')}
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
              {urgentUnreviewedList.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-4 px-6 py-4 ${
                    i < urgentUnreviewedList.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{r.full_name}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{tTreatment(r.treatment_type)}</p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs text-slate-400">{relativeTime(r.created_at)}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(r.status)}`}
                    >
                      {tStatus(r.status)}
                    </span>
                  </div>
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                  >
                    {t('admin.dashboard.reviewNow')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.9fr_1fr]">
          {/* ── Recent requests table ────────────────────────────────────── */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {t('admin.dashboard.recentRequests')}
              </h2>
              <Link
                href="/admin/requests"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                {t('admin.dashboard.viewAllLink')}
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tablePatient')}</th>
                    <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tableIssue')}</th>
                    <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tableUrgency')}</th>
                    <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tableStatus')}</th>
                    <th className="px-5 py-3 font-semibold text-right">{t('admin.dashboard.tableSubmitted')}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-sm text-slate-500">
                        {t('admin.dashboard.noRequests')}
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map((r) => (
                      <tr key={r.id} className="group transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <Link href={`/admin/requests/${r.id}`} className="block">
                            <div className="font-semibold text-slate-900 group-hover:text-blue-900">
                              {r.full_name}
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                              {r.id.slice(0, 8)}
                            </div>
                          </Link>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">{tTreatment(r.treatment_type)}</td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getUrgencyBadgeClass(
                              r.urgency
                            )}`}
                          >
                            {tUrgency(r.urgency).toUpperCase()}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                              r.status
                            )}`}
                          >
                            {tStatus(r.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/requests/${r.id}`}
                            className="flex items-center justify-end gap-1 text-xs text-slate-400 hover:text-blue-700"
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

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-xl font-bold tracking-tight text-slate-900">
                {t('admin.dashboard.casesByDept')}
              </h2>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {departmentCases.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {t('admin.dashboard.noDeptCases')}
                  </p>
                ) : (
                  <div className="space-y-5">
                    {departmentCases.map((dept) => (
                      <div key={dept.name}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{tDepartment(dept.name)}</span>
                          <span className="font-bold text-slate-700">{dept.count}</span>
                        </div>
                        <RelativeBar value={dept.barWidth} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`rounded-2xl border p-6 shadow-sm ${
                urgentCasesCount > 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    urgentCasesCount > 0 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <h3
                    className={`text-base font-bold ${
                      urgentCasesCount > 0 ? 'text-amber-900' : 'text-slate-700'
                    }`}
                  >
                    {urgentCasesCount > 0 ? t('admin.dashboard.actionRequired') : t('admin.dashboard.queueClear')}
                  </h3>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
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
                    <Link href="/admin/requests">
                      <button className="mt-4 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100">
                        {t('admin.dashboard.reviewNow')}
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
