'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  CheckCircle2,
  Stethoscope,
  ArrowRight,
  BookOpen,
  ChevronRight,
  RefreshCw,
  LogOut,
  Clock,
  Phone,
  Bell,
  TrendingUp,
  UserCheck,
  CalendarCheck,
  AlertCircle,
  Activity,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type PoolCase = {
  id: string
  treatment_type: string
  urgency: string
  assigned_department: string | null
  target_student_level: string | null
  created_at: string | null
}

type MyRequest = {
  id: string
  case_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

type ActiveCase = {
  caseId: string
  treatment_type: string
  assigned_department: string | null
  status: string
  full_name: string
  phone: string
}

interface Props {
  poolCases: PoolCase[]
  myRequests: MyRequest[]
  activeCases: ActiveCase[]
  studentEmail: string
  studentFullName: string
  studentPhone: string
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

function getActiveCaseStatusBadge(status: string): string {
  switch (status) {
    case 'student_approved':        return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'contacted':               return 'bg-cyan-50 text-cyan-700 border border-cyan-200'
    case 'appointment_scheduled':   return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    case 'in_treatment':            return 'bg-purple-50 text-purple-700 border border-purple-200'
    case 'completed':               return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'cancelled':               return 'bg-slate-100 text-slate-500 border border-slate-200'
    default:                        return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

// Maps a lifecycle status to a 0-based step index for the progress rail
function getStepIndex(status: string): number {
  const order = ['student_approved', 'contacted', 'appointment_scheduled', 'in_treatment', 'completed']
  return order.indexOf(status)
}

export function DashboardClient({
  poolCases,
  myRequests,
  activeCases,
  studentEmail,
  studentFullName,
  studentPhone,
}: Props) {
  const router = useRouter()
  const { t } = useI18n()

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>(
    () => Object.fromEntries(activeCases.map((c) => [c.caseId, c.status]))
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
  }

  async function handleLifecycleAction(
    caseId: string,
    action: 'mark_contacted' | 'mark_appointment_scheduled' | 'mark_in_treatment'
  ) {
    if (actionLoading) return
    setActionLoading(caseId)
    setActionErrors((prev) => { const next = { ...prev }; delete next[caseId]; return next })

    const res = await fetch(`/api/student/cases/${caseId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    setActionLoading(null)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }))
      setActionErrors((prev) => ({
        ...prev,
        [caseId]: (body as { error?: string }).error ?? 'Failed to update status',
      }))
      return
    }

    const { data } = (await res.json()) as { data: { status: string } }
    setLocalStatuses((prev) => ({ ...prev, [caseId]: data.status }))
  }

  function getActiveCaseStatusLabel(status: string): string {
    switch (status) {
      case 'student_approved':        return t('student.dashboard.statusReadyToContact')
      case 'contacted':               return t('student.dashboard.statusPatientContacted')
      case 'appointment_scheduled':   return t('student.dashboard.statusApptConfirmed')
      case 'in_treatment':            return t('student.dashboard.statusInTreatmentDesc')
      case 'completed':               return t('student.dashboard.statusCompleted')
      case 'cancelled':               return t('student.dashboard.statusCancelled')
      default:                        return status.replace(/_/g, ' ')
    }
  }

  function getActiveCaseStatusLabel_short(status: string): string {
    switch (status) {
      case 'student_approved':        return t('student.dashboard.assigned')
      case 'contacted':               return t('student.dashboard.stepContacted')
      case 'appointment_scheduled':   return t('student.dashboard.stepApptSet')
      case 'in_treatment':            return t('student.dashboard.stepInTreatment')
      case 'completed':               return t('student.dashboard.statusCompleted')
      case 'cancelled':               return t('student.dashboard.caseCancelledText')
      default:                        return status.replace(/_/g, ' ')
    }
  }

  const recentCases = useMemo(() => poolCases.slice(0, 5), [poolCases])

  const stats = useMemo(
    () => ({
      available: poolCases.length,
      urgent: poolCases.filter((c) => (c.urgency || '').toLowerCase() === 'high').length,
      pending: myRequests.filter((r) => r.status === 'pending').length,
      approved: activeCases.length,
    }),
    [poolCases, myRequests, activeCases]
  )

  // Cases that need an immediate action from the student
  const actionRequiredCases = activeCases.filter((c) => {
    const live = localStatuses[c.caseId] ?? c.status
    return live === 'student_approved' || live === 'contacted' || live === 'appointment_scheduled'
  })

const displayName = studentFullName?.trim() || ''
const studentInitials = displayName
  ? displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  : (studentEmail[0] ?? 'S').toUpperCase()
  const steps = [
    { label: t('student.dashboard.stepContacted'),   step: 0 },
    { label: t('student.dashboard.stepApptSet'),     step: 1 },
    { label: t('student.dashboard.stepInTreatment'), step: 2 },
  ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/dentbridge-icon.png" alt="DentBridge" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                {t('student.nav.clinicalPlatform')}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: '/student/dashboard', labelKey: 'student.nav.dashboard', active: true },
              { href: '/student/cases',     labelKey: 'student.nav.casePool',   active: false },
              { href: '/student/exchange',  labelKey: 'student.nav.exchange',   active: false },
            ].map(({ href, labelKey, active }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {t(labelKey)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {actionRequiredCases.length > 0 && (
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  {actionRequiredCases.length}
                </span>
              </div>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
             {studentInitials}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('student.nav.signOut')}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Welcome + CTA ─────────────────────────────────────────────────── */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white shadow-sm">
{studentInitials}
              </div>
              <div>
<h1 className="text-2xl font-bold tracking-tight text-slate-900">
  {t('student.dashboard.welcomeBack')}
</h1>

{displayName && (
  <p className="mt-1 text-base font-semibold text-slate-700">
    {displayName}
  </p>
)}

<div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
  <span className="max-w-[220px] truncate text-slate-400">{studentEmail}</span>
  <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
  <span className="flex items-center gap-1 text-teal-600">
    <CheckCircle2 className="h-3.5 w-3.5" />
    {t('student.dashboard.enrolledActive')}
  </span>
</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/student/cases"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Stethoscope className="h-4 w-4" />
                {t('student.dashboard.browseCases')}
                {stats.available > 0 && (
                  <span className="ml-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                    {stats.available}
                  </span>
                )}
              </Link>
              <Link
                href="/student/exchange"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                {t('student.nav.exchange')}
              </Link>
            </div>
          </div>

          {/* Action-required banner */}
          {actionRequiredCases.length > 0 && (
            <div className="flex items-center gap-3 border-t border-amber-100 bg-amber-50 px-6 py-3 sm:px-8">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">
                  {actionRequiredCases.length === 1
                    ? t('student.dashboard.caseNeedsAttention')
                    : `${actionRequiredCases.length} ${t('student.dashboard.casesNeedAttention')}`}
                </span>
                {t('student.dashboard.actionNeededSuffix')}
              </p>
            </div>
          )}
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Pending */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('student.dashboard.statPendingLabel')}
              </p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">{stats.pending}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t('student.dashboard.statPendingDesc')}</p>
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('student.dashboard.statActiveLabel')}
              </p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">{stats.approved}</p>
              <p className="mt-0.5 text-xs text-emerald-600">
                {stats.approved > 0
                  ? t('student.dashboard.statActiveCases')
                  : t('student.dashboard.statNoActiveCases')}
              </p>
            </div>
          </div>

          {/* Pool available */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('student.dashboard.statInPoolLabel')}
              </p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">{stats.available}</p>
              <p className="mt-0.5 text-xs text-blue-600">{t('student.dashboard.statInPoolDesc')}</p>
            </div>
          </div>

          {/* Urgent */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('student.dashboard.statUrgentLabel')}
              </p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">{stats.urgent}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t('student.dashboard.statUrgentDesc')}</p>
            </div>
          </div>
        </div>

        {/* ── Active Cases ──────────────────────────────────────────────────── */}
        {activeCases.length > 0 && (
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {t('student.dashboard.myActiveCases')}
              </h2>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {activeCases.length} {t('student.dashboard.assigned')}
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {activeCases.map((c) => {
                const liveStatus = localStatuses[c.caseId] ?? c.status
                const isLoading = actionLoading === c.caseId
                const error = actionErrors[c.caseId]
                const isClosed = liveStatus === 'completed' || liveStatus === 'cancelled'
                const stepIdx = getStepIndex(liveStatus)

                return (
                  <div
                    key={c.caseId}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-600">
                          #{c.caseId.slice(0, 8).toUpperCase()}
                        </span>
                        {!isClosed && actionRequiredCases.some(x => x.caseId === c.caseId) && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            <Bell className="h-2.5 w-2.5" />
                            {t('student.dashboard.actionNeededBadge')}
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${getActiveCaseStatusBadge(liveStatus)}`}>
                        {getActiveCaseStatusLabel_short(liveStatus)}
                      </span>
                    </div>

                    <div className="p-5">
                      {/* Treatment + dept */}
                      <p className="text-base font-bold text-slate-900">{c.treatment_type}</p>
                      {c.assigned_department && (
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                          <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                          {c.assigned_department}
                        </div>
                      )}

                      {/* Step progress rail (only for non-closed cases) */}
                      {!isClosed && (
                        <div className="mt-4">
                          <div className="flex items-center gap-1">
                            {steps.map((s) => {
                              const done = stepIdx > s.step
                              const active = stepIdx === s.step
                              return (
                                <div key={s.label} className="flex flex-1 flex-col items-center gap-1">
                                  <div
                                    className={`h-1.5 w-full rounded-full transition-all ${
                                      done
                                        ? 'bg-emerald-500'
                                        : active
                                        ? 'bg-blue-500'
                                        : 'bg-slate-200'
                                    }`}
                                  />
                                  <span className={`text-[10px] font-medium ${
                                    done ? 'text-emerald-600' : active ? 'text-blue-700' : 'text-slate-400'
                                  }`}>
                                    {s.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Status description */}
                      <p className="mt-3 text-sm text-slate-500">{getActiveCaseStatusLabel(liveStatus)}</p>

                      {/* Patient contact panel */}
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                          {t('student.dashboard.patientContact')}
                        </p>
                        <p className="text-sm font-bold text-slate-900">{c.full_name}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {c.phone}
                        </div>
                      </div>

                      {/* Action area */}
                      {!isClosed && (
                        <div className="mt-4">
                          {error && (
                            <p className="mb-2 flex items-center gap-1.5 text-xs text-red-600">
                              <AlertCircle className="h-3.5 w-3.5" />
                              {error}
                            </p>
                          )}

                          {liveStatus === 'student_approved' && (
                            <button
                              type="button"
                              onClick={() => handleLifecycleAction(c.caseId, 'mark_contacted')}
                              disabled={isLoading}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                              {isLoading ? (
                                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {t('student.dashboard.updating')}</>
                              ) : (
                                <><Phone className="h-4 w-4" /> {t('student.dashboard.btnMarkContacted')}</>
                              )}
                            </button>
                          )}

                          {liveStatus === 'contacted' && (
                            <button
                              type="button"
                              onClick={() => handleLifecycleAction(c.caseId, 'mark_appointment_scheduled')}
                              disabled={isLoading}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                            >
                              {isLoading ? (
                                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {t('student.dashboard.updating')}</>
                              ) : (
                                <><CalendarCheck className="h-4 w-4" /> {t('student.dashboard.btnMarkApptScheduled')}</>
                              )}
                            </button>
                          )}

                          {liveStatus === 'appointment_scheduled' && (
                            <button
                              type="button"
                              onClick={() => handleLifecycleAction(c.caseId, 'mark_in_treatment')}
                              disabled={isLoading}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                            >
                              {isLoading ? (
                                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {t('student.dashboard.updating')}</>
                              ) : (
                                <><Stethoscope className="h-4 w-4" /> {t('student.dashboard.btnMarkInTreatment')}</>
                              )}
                            </button>
                          )}

                          {liveStatus === 'in_treatment' && (
                            <div className="flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700">
                              <Clock className="h-4 w-4" />
                              {t('student.dashboard.treatmentInProgress')}
                            </div>
                          )}
                        </div>
                      )}

                      {isClosed && (
                        <div className={`mt-4 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                          liveStatus === 'completed'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}>
                          <CheckCircle2 className="h-4 w-4" />
                          {liveStatus === 'completed'
                            ? t('student.dashboard.caseClosed')
                            : t('student.dashboard.caseCancelledText')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Main grid: recent cases + sidebar ───────────────────────────── */}
        <div className="grid gap-8 xl:grid-cols-[1fr_320px]">

          {/* Recent cases table */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {t('student.dashboard.recentlyInPool')}
                </h2>
                {poolCases.length > 0 && (
                  <p className="mt-0.5 text-sm text-slate-400">
                    {poolCases.length}{' '}
                    {poolCases.length === 1
                      ? t('student.dashboard.caseAvailable')
                      : t('student.dashboard.casesAvailable')}
                  </p>
                )}
              </div>
              <Link href="/student/cases" className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">
                {t('student.dashboard.viewAll')} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              {recentCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <p className="font-semibold text-slate-700">{t('student.dashboard.noCasesInPool')}</p>
                  <p className="mt-1 text-sm text-slate-400">{t('student.dashboard.noCasesInPoolDesc')}</p>
                </div>
              ) : (
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3.5 font-semibold">{t('student.dashboard.tableCase')}</th>
                      <th className="px-5 py-3.5 font-semibold">{t('student.dashboard.tableTreatment')}</th>
                      <th className="hidden px-5 py-3.5 font-semibold sm:table-cell">{t('student.dashboard.tableDept')}</th>
                      <th className="px-5 py-3.5 font-semibold">{t('student.dashboard.tableUrgency')}</th>
                      <th className="px-5 py-3.5 font-semibold text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentCases.map((c) => (
                      <tr key={c.id} className="group transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            #{c.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-800">
                          {c.treatment_type}
                        </td>
                        <td className="hidden px-5 py-4 text-sm text-slate-500 sm:table-cell">
                          {c.assigned_department || '\u2014'}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getUrgencyBadgeClass(c.urgency)}`}>
                            {(c.urgency || 'Unknown').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href="/student/cases">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition group-hover:text-blue-800">
                              {t('student.dashboard.view')} <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {t('student.dashboard.quickActions')}
            </h2>

            <div className="space-y-3">
              <Link
                href="/student/cases"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {t('student.dashboard.browseCasePool')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {stats.available > 0
                        ? `${stats.available} ${t('student.dashboard.casesOpen')}`
                        : t('student.dashboard.findAvailableCases')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </Link>

              <Link
                href="/student/exchange"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {t('student.dashboard.caseExchange')}
                    </p>
                    <p className="text-xs text-slate-400">{t('student.dashboard.tradeCases')}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </Link>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm opacity-60">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {t('student.dashboard.clinicalRequirements')}
                    </p>
                    <p className="text-xs text-slate-400">{t('student.dashboard.caseLogComingSoon')}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </div>
            </div>

            {/* Pending requests card */}
            {stats.pending > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Clock className="h-4 w-4 text-amber-600" />
                  {stats.pending === 1
                    ? t('student.dashboard.requestPendingReview')
                    : `${stats.pending} ${t('student.dashboard.requestsPendingReview')}`}
                </div>
                <p className="mt-1.5 text-xs text-amber-700">
                  {t('student.dashboard.pendingRequestsDesc')}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
