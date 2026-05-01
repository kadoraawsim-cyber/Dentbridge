'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import InstallBanner from '@/components/InstallBanner'
import { supabase } from '@/lib/supabase'
import {
  CheckCircle2,
  Stethoscope,
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
  ChevronDown,
  CalendarDays,
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
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  created_at: string
}

type ActiveCase = {
  caseId: string
  treatment_type: string
  assigned_department: string | null
  status: string
  full_name: string
  phone: string
  progressEntries: ProgressEntry[]
}

type ProgressEntry = {
  id: string
  case_id: string
  student_id: string
  student_name: string | null
  status_at_time: string
  appointment_date: string | null
  appointment_time: string | null
  note: string | null
  what_was_done: string | null
  next_step: string | null
  next_appointment_date: string | null
  next_appointment_time: string | null
  needs_faculty_attention: boolean
  created_at: string
}

interface Props {
  poolCases: PoolCase[]
  poolCaseCount: number
  urgentPoolCaseCount: number
  myRequests: MyRequest[]
  activeCases: ActiveCase[]
  studentEmail: string
  studentFullName: string
  studentPhone: string
}

type ProgressComposerMode = 'appointment' | 'treatment_start' | 'progress_note' | 'reschedule'

type ProgressFormValues = {
  appointmentDate: string
  appointmentTime: string
  note: string
  whatWasDone: string
  nextStep: string
  nextAppointmentDate: string
  nextAppointmentTime: string
}

const EMPTY_PROGRESS_FORM: ProgressFormValues = {
  appointmentDate: '',
  appointmentTime: '',
  note: '',
  whatWasDone: '',
  nextStep: '',
  nextAppointmentDate: '',
  nextAppointmentTime: '',
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
    case 'student_approved':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'contacted':
      return 'bg-cyan-50 text-cyan-700 border border-cyan-200'
    case 'appointment_scheduled':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    case 'in_treatment':
      return 'bg-purple-50 text-purple-700 border border-purple-200'
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'cancelled':
      return 'bg-slate-100 text-slate-500 border border-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

function getStepIndex(status: string): number {
  const order = [
    'student_approved',
    'contacted',
    'appointment_scheduled',
    'in_treatment',
    'completed',
  ]
  return order.indexOf(status)
}

function buildProgressEntriesMap(activeCases: ActiveCase[]) {
  return Object.fromEntries(activeCases.map((c) => [c.caseId, c.progressEntries]))
}

export function DashboardClient({
  poolCases,
  poolCaseCount,
  urgentPoolCaseCount,
  myRequests,
  activeCases,
  studentEmail,
  studentFullName,
  studentPhone,
}: Props) {
  const router = useRouter()
  const { t, locale } = useI18n()

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>(
    () => Object.fromEntries(activeCases.map((c) => [c.caseId, c.status]))
  )
  const [progressEntriesByCase, setProgressEntriesByCase] = useState<Record<string, ProgressEntry[]>>(
    () => buildProgressEntriesMap(activeCases)
  )
  const [openTimelines, setOpenTimelines] = useState<Record<string, boolean>>({})
  const [openComposer, setOpenComposer] = useState<{
    caseId: string
    mode: ProgressComposerMode
  } | null>(null)
  const [progressForm, setProgressForm] = useState<ProgressFormValues>(EMPTY_PROGRESS_FORM)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const ui =
    locale === 'tr'
      ? {
          nextAction: 'Sonraki Adım',
          nothingUrgent: 'Şu anda acil bir işlem gerekmiyor.',
          contactPatient: 'Hastayla iletişime geç',
          confirmAppointment: 'Randevuyu onayla',
          startTreatment: 'Tedaviyi başlat',
          studentProfile: 'Öğrenci Profili',
          phoneOnFile: 'Kayıtlı telefon',
          notAdded: 'Henüz eklenmedi',
          callNow: 'Hemen ara',
          copyNumber: 'Numarayı kopyala',
          copied: 'Kopyalandı',
          activePatients: 'Aktif Hastalarım',
          activePatientsDesc: 'Şu anda size atanmış hastalar',
          noImmediateAction: 'Şu anda bekleyen işlem yok',
          continueWork: 'Çalışmaya devam et',
          manageAssignedCases: 'Atanmış vakalarınızı yönetin',
          pendingSummary: 'Bekleyen İstekler',
          pendingSummaryDesc: 'Fakülte onayı bekleyen talepleriniz',
        }
      : {
          nextAction: 'Next Action',
          nothingUrgent: 'No urgent action is required right now.',
          contactPatient: 'Contact patient',
          confirmAppointment: 'Confirm appointment',
          startTreatment: 'Start treatment',
          studentProfile: 'Student Profile',
          phoneOnFile: 'Phone on file',
          notAdded: 'Not added yet',
          callNow: 'Call now',
          copyNumber: 'Copy number',
          copied: 'Copied',
          activePatients: 'My Active Patients',
          activePatientsDesc: 'Patients currently assigned to you',
          noImmediateAction: 'No pending action right now',
          continueWork: 'Continue work',
          manageAssignedCases: 'Manage your assigned cases',
          pendingSummary: 'Pending Requests',
          pendingSummaryDesc: 'Requests still waiting for faculty review',
        }

  function tTreatment(v: string): string {
    const map: Record<string, string> = {
      'Initial Examination / Consultation': t('request.treatments.initialExam'),
      'Dental Cleaning': t('request.treatments.cleaning'),
      'Fillings': t('request.treatments.fillings'),
      'Tooth Extraction': t('request.treatments.extraction'),
      'Root Canal Treatment': t('request.treatments.rootCanal'),
      'Gum Treatment': t('request.treatments.gum'),
      'Prosthetics / Crowns': t('request.treatments.prosthetics'),
      'Orthodontics': t('request.treatments.orthodontics'),
      'Pediatric Dentistry': t('request.treatments.pediatric'),
      'Esthetic Dentistry': t('request.treatments.esthetic'),
      'Other': t('request.treatments.other'),
    }
    return map[v] ?? v
  }

  function tDept(v: string | null): string {
    if (!v) return ''
    const map: Record<string, string> = {
      'Endodontics': t('landing.depts.endodontics.name'),
      'Oral & Maxillofacial Surgery': t('landing.depts.surgery.name'),
      'Orthodontics': t('landing.depts.orthodontics.name'),
      'Periodontology': t('landing.depts.periodontology.name'),
      'Restorative Dentistry': t('landing.depts.restorative.name'),
      'Prosthodontics': t('landing.depts.prosthodontics.name'),
      'Pedodontics': t('landing.depts.pedodontics.name'),
      'Oral Radiology': t('landing.depts.radiology.name'),
    }
    return map[v] ?? v
  }

  function tUrgency(v: string): string {
    switch ((v || '').toLowerCase()) {
      case 'high': return t('request.urgencyHigh').toUpperCase()
      case 'medium': return t('request.urgencyMedium').toUpperCase()
      case 'low': return t('request.urgencyLow').toUpperCase()
      default: return (v || 'Unknown').toUpperCase()
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
  }

  useEffect(() => {
    if (!profileMenuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [profileMenuOpen])

  async function handleLifecycleAction(
    caseId: string,
    action: 'mark_contacted' | 'mark_appointment_scheduled' | 'mark_in_treatment'
  ) {
    if (actionLoading) return

    setActionLoading(caseId)
    setActionErrors((prev) => {
      const next = { ...prev }
      delete next[caseId]
      return next
    })

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

  function resetProgressComposer() {
    setOpenComposer(null)
    setProgressForm(EMPTY_PROGRESS_FORM)
  }

  function toggleTimeline(caseId: string) {
    setOpenTimelines((prev) => ({ ...prev, [caseId]: !prev[caseId] }))
  }

  function openProgressComposer(caseId: string, mode: ProgressComposerMode) {
    setActionErrors((prev) => {
      const next = { ...prev }
      delete next[caseId]
      return next
    })
    setProgressForm(EMPTY_PROGRESS_FORM)
    setOpenComposer({ caseId, mode })
    setOpenTimelines((prev) => ({ ...prev, [caseId]: true }))
  }

  async function handleProgressSubmit(caseId: string) {
    if (!openComposer || openComposer.caseId !== caseId) {
      return
    }

    const mode = openComposer.mode
    const note = progressForm.note.trim()

    if ((mode === 'appointment' || mode === 'reschedule') && !progressForm.appointmentDate) {
      setActionErrors((prev) => ({
        ...prev,
        [caseId]: t('student.dashboard.appointmentDateRequired'),
      }))
      return
    }

    if ((mode === 'treatment_start' || mode === 'progress_note') && !note) {
      setActionErrors((prev) => ({
        ...prev,
        [caseId]: t('student.dashboard.progressNoteRequired'),
      }))
      return
    }

    setActionLoading(caseId)
    setActionErrors((prev) => {
      const next = { ...prev }
      delete next[caseId]
      return next
    })

    let requestInit: { url: string; method: string; body: object }

    if (mode === 'progress_note') {
      requestInit = {
        url: `/api/student/cases/${caseId}/progress`,
        method: 'POST',
        body: {
          note,
          what_was_done: progressForm.whatWasDone.trim() || undefined,
          next_step: progressForm.nextStep.trim() || undefined,
          next_appointment_date: progressForm.nextAppointmentDate || undefined,
          next_appointment_time: progressForm.nextAppointmentTime || undefined,
        },
      }
    } else if (mode === 'reschedule') {
      requestInit = {
        url: `/api/student/cases/${caseId}/status`,
        method: 'PATCH',
        body: {
          action: 'reschedule_appointment',
          appointment_date: progressForm.appointmentDate || undefined,
          appointment_time: progressForm.appointmentTime || undefined,
          note: progressForm.note.trim() || undefined,
        },
      }
    } else {
      requestInit = {
        url: `/api/student/cases/${caseId}/status`,
        method: 'PATCH',
        body: {
          action: mode === 'appointment' ? 'mark_appointment_scheduled' : 'mark_in_treatment',
          appointment_date: progressForm.appointmentDate || undefined,
          appointment_time: progressForm.appointmentTime || undefined,
          note: note || undefined,
          what_was_done: progressForm.whatWasDone.trim() || undefined,
          next_step: progressForm.nextStep.trim() || undefined,
          next_appointment_date: progressForm.nextAppointmentDate || undefined,
          next_appointment_time: progressForm.nextAppointmentTime || undefined,
        },
      }
    }

    const res = await fetch(requestInit.url, {
      method: requestInit.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestInit.body),
    })

    setActionLoading(null)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }))
      setActionErrors((prev) => ({
        ...prev,
        [caseId]: (body as { error?: string }).error ?? 'Failed to save progress',
      }))
      return
    }

    const payload = (await res.json()) as {
      data?: { status?: string; progressEntry?: ProgressEntry }
    }

    if (payload.data?.status) {
      setLocalStatuses((prev) => ({ ...prev, [caseId]: payload.data?.status ?? prev[caseId] }))
    }

    if (payload.data?.progressEntry) {
      setProgressEntriesByCase((prev) => ({
        ...prev,
        [caseId]: [payload.data!.progressEntry!, ...(prev[caseId] ?? [])],
      }))
    }

    setOpenTimelines((prev) => ({ ...prev, [caseId]: true }))
    resetProgressComposer()
  }

  function getActiveCaseStatusLabelShort(status: string): string {
    switch (status) {
      case 'student_approved':
        return t('student.dashboard.assigned')
      case 'contacted':
        return t('student.dashboard.stepContacted')
      case 'appointment_scheduled':
        return t('student.dashboard.stepApptSet')
      case 'in_treatment':
        return t('student.dashboard.stepInTreatment')
      case 'completed':
        return t('student.dashboard.statusCompleted')
      case 'cancelled':
        return t('student.dashboard.caseCancelledText')
      default:
        return status.replace(/_/g, ' ')
    }
  }

  function formatTimelineDateTime(iso: string): string {
    return new Date(iso).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function formatOptionalDate(value: string | null): string {
    if (!value) return ''
    return new Date(`${value}T00:00:00`).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
      dateStyle: 'medium',
    })
  }

  function formatOptionalTime(value: string | null): string {
    if (!value) return ''
    return value.slice(0, 5)
  }

  function getTimelinePrimaryText(entry: ProgressEntry): string {
    if (entry.note?.trim()) {
      return entry.note
    }

    if (entry.status_at_time === 'appointment_scheduled') {
      return t('student.dashboard.timelineNoNoteFallbackAppointment')
    }

    if (entry.status_at_time === 'rescheduled') {
      return t('student.dashboard.timelineRescheduled')
    }

    return t('student.dashboard.timelineNoNoteFallbackProgress')
  }

  const recentCases = useMemo(() => poolCases.slice(0, 5), [poolCases])

  const stats = useMemo(
    () => ({
      available: poolCaseCount,
      urgent: urgentPoolCaseCount,
      pending: myRequests.filter((r) => r.status === 'pending').length,
      approved: activeCases.filter((c) =>
        !['completed', 'cancelled'].includes((c.status || '').toLowerCase())
      ).length,
    }),
    [poolCaseCount, urgentPoolCaseCount, myRequests, activeCases]
  )

  const displayName = studentFullName?.trim() || ''
  const studentInitials = displayName
    ? displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : (studentEmail[0] ?? 'S').toUpperCase()

  const liveActiveCases = activeCases.map((c) => ({
    ...c,
    liveStatus: localStatuses[c.caseId] ?? c.status,
    progressEntries: progressEntriesByCase[c.caseId] ?? [],
  }))

  const trulyActiveCases = liveActiveCases.filter(
    (c) => !['completed', 'cancelled'].includes(c.liveStatus)
  )
  const closedCases = liveActiveCases.filter((c) =>
    ['completed', 'cancelled'].includes(c.liveStatus)
  )

  const actionRequiredCases = liveActiveCases.filter((c) => {
    return (
      c.liveStatus === 'student_approved' ||
      c.liveStatus === 'contacted' ||
      c.liveStatus === 'appointment_scheduled'
    )
  })

  const nextActionCase = actionRequiredCases[0] ?? null

  const nextActionLabel = nextActionCase
    ? nextActionCase.liveStatus === 'student_approved'
      ? ui.contactPatient
      : nextActionCase.liveStatus === 'contacted'
      ? ui.confirmAppointment
      : ui.startTreatment
    : ui.noImmediateAction

  const steps = [
    { label: t('student.dashboard.stepContacted'), step: 0 },
    { label: t('student.dashboard.stepApptSet'), step: 1 },
    { label: t('student.dashboard.stepInTreatment'), step: 2 },
  ]

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img src="/dentbridge-icon.png" alt="DentBridge" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm sm:text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
              <p className="hidden sm:block truncate text-[10px] uppercase tracking-wider text-slate-400">
                {t('student.nav.clinicalPlatform')}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: '/student/dashboard', labelKey: 'student.nav.dashboard', active: true },
              { href: '/student/cases', labelKey: 'student.nav.casePool', active: false },
              { href: '/student/requests', labelKey: 'student.nav.myRequests', active: false },
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
            <Link
              href="/student/exchange"
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-50"
            >
              {t('student.nav.exchange')}
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-600">
                {t('student.exchange.comingSoonTitle')}
              </span>
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />

            {actionRequiredCases.length > 0 && (
              <div className="relative flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] sm:text-[9px] font-bold text-white">
                  {actionRequiredCases.length}
                </span>
              </div>
            )}

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 pr-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-expanded={profileMenuOpen}
              >
                <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] sm:text-xs font-bold text-white ring-2 ring-slate-100">
                  {studentInitials}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <Link
                    href="/student/planner"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    {t('student.nav.planner')}
                  </Link>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {t('student.nav.signOut')}
            </button>
          </div>
        </div>
      </header>

      <InstallBanner />

      <section className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-4 sm:mb-8 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-slate-900 text-sm sm:text-xl font-bold text-white shadow-sm">
                {studentInitials}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
                  {t('student.dashboard.welcomeBack')}
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

          {actionRequiredCases.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 border-t border-amber-100 bg-amber-50 px-4 py-2 sm:px-8 sm:py-3">
              <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-600" />
              <p className="text-xs sm:text-sm text-amber-800 truncate">
                <span className="font-semibold">
                  {actionRequiredCases.length === 1
                    ? t('student.dashboard.caseNeedsAttention')
                    : `${actionRequiredCases.length} ${t(
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
                  {tTreatment(nextActionCase.treatment_type)}
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
            <p className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">{trulyActiveCases.length}</p>
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
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('student.dashboard.statActiveLabel')}
              </p>
              <p className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {stats.approved}
              </p>
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

        {trulyActiveCases.length > 0 && (
          <div id="my-active-cases" className="mb-6 sm:mb-10 w-full">
            <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {t('student.dashboard.myActiveCases')}
              </h2>
            </div>

            <div className="grid w-full gap-3 sm:gap-5 md:grid-cols-2">
              {trulyActiveCases.map((c) => {
                const liveStatus = c.liveStatus
                const isLoading = actionLoading === c.caseId
                const error = actionErrors[c.caseId]
                const isClosed = liveStatus === 'completed' || liveStatus === 'cancelled'
                const stepIdx = getStepIndex(liveStatus)
                const caseEntries = c.progressEntries
                const timelineOpen = openTimelines[c.caseId] ?? false
                const isComposerOpen = openComposer?.caseId === c.caseId

                return (
                  <div
                    key={c.caseId}
                    className="min-w-0 overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-5 sm:py-4">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 sm:px-2 sm:py-1 font-mono text-[10px] sm:text-xs font-bold text-slate-600">
                        #{c.caseId.slice(0, 8).toUpperCase()}
                      </span>
                      <span
                        className={`inline-flex whitespace-nowrap items-center rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold ${getActiveCaseStatusBadge(
                          liveStatus
                        )}`}
                      >
                        {getActiveCaseStatusLabelShort(liveStatus)}
                      </span>
                    </div>

                    <div className="p-3 sm:p-5">
                      <p className="truncate text-sm sm:text-base font-bold text-slate-900">{tTreatment(c.treatment_type)}</p>

                      {!isClosed && (
                        <div className="mt-3 w-full">
                          <div className="flex items-center gap-1">
                            {steps.map((s) => {
                              const done = stepIdx > s.step
                              const active = stepIdx === s.step
                              return (
                                <div
                                  key={s.label}
                                  className="flex min-w-0 flex-1 flex-col items-center gap-0.5 sm:gap-1"
                                >
                                  <div
                                    className={`h-1 sm:h-1.5 w-full rounded-full transition-all ${
                                      done
                                        ? 'bg-emerald-500'
                                        : active
                                        ? 'bg-blue-500'
                                        : 'bg-slate-200'
                                    }`}
                                  />
                                  <span
                                    className={`truncate text-[8px] sm:text-[10px] font-medium ${
                                      done
                                        ? 'text-emerald-600'
                                        : active
                                        ? 'text-blue-700'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {s.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 rounded-lg sm:rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 sm:p-3.5">
                        <p className="mb-0.5 sm:mb-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                          {t('student.dashboard.patientContact')}
                        </p>
                        <p className="break-words text-xs sm:text-sm font-bold text-slate-900">{c.full_name}</p>
                        <div className="mt-2 flex flex-row gap-2">
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-white transition hover:bg-emerald-700"
                          >
                            <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            {ui.callNow}
                          </a>
                        </div>
                      </div>

                      {(caseEntries.length > 0 || liveStatus === 'in_treatment') && (
                        <div className="mt-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => toggleTimeline(c.caseId)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-900">
                                {t('student.dashboard.progressTimelineTitle')}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {caseEntries.length > 0
                                  ? `${caseEntries.length}`
                                  : t('student.dashboard.progressTimelineEmpty')}
                              </p>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                                timelineOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {timelineOpen && (
                            <div className="border-t border-slate-200 px-3 py-3 sm:px-4">
                              {liveStatus === 'in_treatment' && (
                                <div className="mb-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => openProgressComposer(c.caseId, 'progress_note')}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                  >
                                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                    {t('student.dashboard.addProgressNote')}
                                  </button>
                                </div>
                              )}

                              {isComposerOpen && openComposer?.mode === 'progress_note' && (
                                <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {t('student.dashboard.progressComposerTitle')}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {t('student.dashboard.progressComposerDesc')}
                                  </p>
                                  <div className="mt-3 space-y-3">
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        {t('student.dashboard.progressNoteLabel')} *
                                      </label>
                                      <textarea
                                        value={progressForm.note}
                                        onChange={(event) =>
                                          setProgressForm((prev) => ({
                                            ...prev,
                                            note: event.target.value,
                                          }))
                                        }
                                        rows={3}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                        placeholder={t('student.dashboard.progressNotePlaceholder')}
                                      />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                          {t('student.dashboard.whatWasDoneLabel')}
                                        </label>
                                        <textarea
                                          value={progressForm.whatWasDone}
                                          onChange={(event) =>
                                            setProgressForm((prev) => ({
                                              ...prev,
                                              whatWasDone: event.target.value,
                                            }))
                                          }
                                          rows={2}
                                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                          placeholder={t('student.dashboard.whatWasDonePlaceholder')}
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                          {t('student.dashboard.nextStepLabel')}
                                        </label>
                                        <textarea
                                          value={progressForm.nextStep}
                                          onChange={(event) =>
                                            setProgressForm((prev) => ({
                                              ...prev,
                                              nextStep: event.target.value,
                                            }))
                                          }
                                          rows={2}
                                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                          placeholder={t('student.dashboard.nextStepPlaceholder')}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                          {t('student.dashboard.nextAppointmentDateLabel')}
                                        </label>
                                        <input
                                          type="date"
                                          value={progressForm.nextAppointmentDate}
                                          onChange={(event) =>
                                            setProgressForm((prev) => ({
                                              ...prev,
                                              nextAppointmentDate: event.target.value,
                                            }))
                                          }
                                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                          {t('student.dashboard.nextAppointmentTimeLabel')}
                                        </label>
                                        <input
                                          type="time"
                                          value={progressForm.nextAppointmentTime}
                                          onChange={(event) =>
                                            setProgressForm((prev) => ({
                                              ...prev,
                                              nextAppointmentTime: event.target.value,
                                            }))
                                          }
                                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                      <button
                                        type="button"
                                        onClick={() => handleProgressSubmit(c.caseId)}
                                        disabled={isLoading}
                                        className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                                      >
                                        {isLoading
                                          ? t('student.dashboard.updating')
                                          : t('student.dashboard.saveProgressNote')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={resetProgressComposer}
                                        disabled={isLoading}
                                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                      >
                                        {t('student.dashboard.cancelForm')}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {caseEntries.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                  {t('student.dashboard.progressTimelineEmpty')}
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {caseEntries.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-3"
                                    >
                                      {entry.appointment_date ? (
                                        <>
                                          <p className="text-sm font-semibold text-slate-900">
                                            {t('student.dashboard.timelineAppointmentInfo')}{' '}
                                            {formatOptionalDate(entry.appointment_date)}
                                            {entry.appointment_time
                                              ? ` • ${formatOptionalTime(entry.appointment_time)}`
                                              : ''}
                                          </p>
                                          <p className="mt-1.5 text-sm text-slate-700">
                                            {getTimelinePrimaryText(entry)}
                                          </p>
                                          <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                                            <p className="text-[11px] text-slate-400">
                                              {formatTimelineDateTime(entry.created_at)}
                                            </p>
                                            {entry.student_name && (
                                              <span className="text-[11px] text-slate-400">
                                                {entry.student_name}
                                              </span>
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-xs font-semibold text-slate-900">
                                              {formatTimelineDateTime(entry.created_at)}
                                            </p>
                                            {entry.student_name && (
                                              <span className="text-[11px] text-slate-500">
                                                {entry.student_name}
                                              </span>
                                            )}
                                          </div>
                                          <p className="mt-2 text-sm text-slate-700">
                                            {getTimelinePrimaryText(entry)}
                                          </p>
                                        </>
                                      )}
                                      {entry.what_was_done && (
                                        <p className="mt-1 text-xs text-slate-500">
                                          {t('student.dashboard.timelineWhatDone')} {entry.what_was_done}
                                        </p>
                                      )}
                                      {entry.next_step && (
                                        <p className="mt-1 text-xs text-slate-500">
                                          {t('student.dashboard.timelineNextStep')} {entry.next_step}
                                        </p>
                                      )}
                                      {entry.next_appointment_date && (
                                        <p className="mt-1 text-xs text-slate-500">
                                          {t('student.dashboard.timelineNextAppointment')}{' '}
                                          {formatOptionalDate(entry.next_appointment_date)}
                                          {entry.next_appointment_time
                                            ? ` • ${formatOptionalTime(entry.next_appointment_time)}`
                                            : ''}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {!isClosed && (
                        <div className="mt-3">
                          {error && (
                            <p className="mb-2 flex items-center gap-1.5 text-xs text-red-600">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span className="break-words">{error}</span>
                            </p>
                          )}

                          {liveStatus === 'student_approved' && (
                            <button
                              type="button"
                              onClick={() => handleLifecycleAction(c.caseId, 'mark_contacted')}
                              disabled={isLoading}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-blue-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                              {isLoading ? (
                                <span className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              ) : (
                                <Phone className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              )}
                              <span className="truncate">{t('student.dashboard.btnMarkContacted')}</span>
                            </button>
                          )}

                          {liveStatus === 'contacted' && (
                            <button
                              type="button"
                              onClick={() => openProgressComposer(c.caseId, 'appointment')}
                              disabled={isLoading}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-indigo-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                            >
                              <CalendarCheck className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="truncate">{t('student.dashboard.btnMarkApptScheduled')}</span>
                            </button>
                          )}

                          {isComposerOpen && openComposer?.mode === 'appointment' && (
                            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-sm font-semibold text-slate-900">
                                {t('student.dashboard.appointmentComposerTitle')}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {t('student.dashboard.appointmentComposerDesc')}
                              </p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {t('student.dashboard.appointmentDateLabel')} *
                                  </label>
                                  <input
                                    type="date"
                                    value={progressForm.appointmentDate}
                                    onChange={(event) =>
                                      setProgressForm((prev) => ({
                                        ...prev,
                                        appointmentDate: event.target.value,
                                      }))
                                    }
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {t('student.dashboard.appointmentTimeLabel')}
                                  </label>
                                  <input
                                    type="time"
                                    value={progressForm.appointmentTime}
                                    onChange={(event) =>
                                      setProgressForm((prev) => ({
                                        ...prev,
                                        appointmentTime: event.target.value,
                                      }))
                                    }
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                  />
                                </div>
                              </div>
                              <div className="mt-3">
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                  {t('student.dashboard.noteLabel')}
                                </label>
                                <textarea
                                  value={progressForm.note}
                                  onChange={(event) =>
                                    setProgressForm((prev) => ({
                                      ...prev,
                                      note: event.target.value,
                                    }))
                                  }
                                  rows={3}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                  placeholder={t('student.dashboard.notePlaceholder')}
                                />
                              </div>
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={() => handleProgressSubmit(c.caseId)}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                                >
                                  {isLoading
                                    ? t('student.dashboard.updating')
                                    : t('student.dashboard.saveAppointment')}
                                </button>
                                <button
                                  type="button"
                                  onClick={resetProgressComposer}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                >
                                  {t('student.dashboard.cancelForm')}
                                </button>
                              </div>
                            </div>
                          )}

                          {liveStatus === 'appointment_scheduled' && (
                            <button
                              type="button"
                              onClick={() => openProgressComposer(c.caseId, 'treatment_start')}
                              disabled={isLoading}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-purple-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                            >
                              <Stethoscope className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="truncate">{t('student.dashboard.btnMarkInTreatment')}</span>
                            </button>
                          )}

                          {isComposerOpen && openComposer?.mode === 'treatment_start' && (
                            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-sm font-semibold text-slate-900">
                                {t('student.dashboard.treatmentStartTitle')}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {t('student.dashboard.treatmentStartDesc')}
                              </p>
                              <div className="mt-3 space-y-3">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {t('student.dashboard.progressNoteLabel')} *
                                  </label>
                                  <textarea
                                    value={progressForm.note}
                                    onChange={(event) =>
                                      setProgressForm((prev) => ({
                                        ...prev,
                                        note: event.target.value,
                                      }))
                                    }
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                    placeholder={t('student.dashboard.progressNotePlaceholder')}
                                  />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                      {t('student.dashboard.whatWasDoneLabel')}
                                    </label>
                                    <textarea
                                      value={progressForm.whatWasDone}
                                      onChange={(event) =>
                                        setProgressForm((prev) => ({
                                          ...prev,
                                          whatWasDone: event.target.value,
                                        }))
                                      }
                                      rows={2}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                      placeholder={t('student.dashboard.whatWasDonePlaceholder')}
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                      {t('student.dashboard.nextStepLabel')}
                                    </label>
                                    <textarea
                                      value={progressForm.nextStep}
                                      onChange={(event) =>
                                        setProgressForm((prev) => ({
                                          ...prev,
                                          nextStep: event.target.value,
                                        }))
                                      }
                                      rows={2}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                      placeholder={t('student.dashboard.nextStepPlaceholder')}
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                      {t('student.dashboard.nextAppointmentDateLabel')}
                                    </label>
                                    <input
                                      type="date"
                                      value={progressForm.nextAppointmentDate}
                                      onChange={(event) =>
                                        setProgressForm((prev) => ({
                                          ...prev,
                                          nextAppointmentDate: event.target.value,
                                        }))
                                      }
                                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                      {t('student.dashboard.nextAppointmentTimeLabel')}
                                    </label>
                                    <input
                                      type="time"
                                      value={progressForm.nextAppointmentTime}
                                      onChange={(event) =>
                                        setProgressForm((prev) => ({
                                          ...prev,
                                          nextAppointmentTime: event.target.value,
                                        }))
                                      }
                                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <button
                                    type="button"
                                    onClick={() => handleProgressSubmit(c.caseId)}
                                    disabled={isLoading}
                                    className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                                  >
                                    {isLoading
                                      ? t('student.dashboard.updating')
                                      : t('student.dashboard.saveTreatmentStart')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={resetProgressComposer}
                                    disabled={isLoading}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                  >
                                    {t('student.dashboard.cancelForm')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {liveStatus === 'in_treatment' && (
                            <div className="flex w-full items-center justify-center gap-2 rounded-lg sm:rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-purple-700">
                              <Clock className="h-3 w-3 sm:h-4 w-4 shrink-0" />
                              <span className="truncate">{t('student.dashboard.treatmentInProgress')}</span>
                            </div>
                          )}

                          {(liveStatus === 'appointment_scheduled' || liveStatus === 'in_treatment') && !(isComposerOpen && openComposer?.mode === 'reschedule') && (
                            <button
                              type="button"
                              onClick={() => openProgressComposer(c.caseId, 'reschedule')}
                              disabled={isLoading}
                              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                              <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                              <span className="truncate">{t('student.dashboard.rescheduleAppointmentBtn')}</span>
                            </button>
                          )}

                          {isComposerOpen && openComposer?.mode === 'reschedule' && (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-sm font-semibold text-slate-900">
                                {t('student.dashboard.rescheduleComposerTitle')}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {t('student.dashboard.rescheduleComposerDesc')}
                              </p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {t('student.dashboard.appointmentDateLabel')} *
                                  </label>
                                  <input
                                    type="date"
                                    value={progressForm.appointmentDate}
                                    onChange={(event) =>
                                      setProgressForm((prev) => ({
                                        ...prev,
                                        appointmentDate: event.target.value,
                                      }))
                                    }
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {t('student.dashboard.appointmentTimeLabel')}
                                  </label>
                                  <input
                                    type="time"
                                    value={progressForm.appointmentTime}
                                    onChange={(event) =>
                                      setProgressForm((prev) => ({
                                        ...prev,
                                        appointmentTime: event.target.value,
                                      }))
                                    }
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                  />
                                </div>
                              </div>
                              <div className="mt-3">
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                  {t('student.dashboard.rescheduleReasonLabel')}
                                </label>
                                <textarea
                                  value={progressForm.note}
                                  onChange={(event) =>
                                    setProgressForm((prev) => ({
                                      ...prev,
                                      note: event.target.value,
                                    }))
                                  }
                                  rows={2}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                  placeholder={t('student.dashboard.rescheduleReasonPlaceholder')}
                                />
                              </div>
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={() => handleProgressSubmit(c.caseId)}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                                >
                                  {isLoading
                                    ? t('student.dashboard.updating')
                                    : t('student.dashboard.saveReschedule')}
                                </button>
                                <button
                                  type="button"
                                  onClick={resetProgressComposer}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                >
                                  {t('student.dashboard.cancelForm')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isClosed && (
                        <div
                          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg sm:rounded-xl border px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold ${
                            liveStatus === 'completed'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="truncate">
                            {liveStatus === 'completed'
                              ? t('student.dashboard.caseClosed')
                              : t('student.dashboard.caseCancelledText')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {closedCases.length > 0 && (
          <div className="mb-6 sm:mb-10 w-full">
            <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {t('student.dashboard.completedTreatments')}
              </h2>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {closedCases.length}{' '}
                {closedCases.length === 1
                  ? t('student.dashboard.treatmentCompleted')
                  : t('student.dashboard.treatmentsCompleted')}
              </span>
            </div>

            <div className="grid w-full gap-3 sm:gap-5 md:grid-cols-2">
              {closedCases.map((c) => (
                <div
                  key={c.caseId}
                  className="min-w-0 overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-5 sm:py-4">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 sm:px-2 sm:py-1 font-mono text-[10px] sm:text-xs font-bold text-slate-600">
                      #{c.caseId.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`inline-flex whitespace-nowrap items-center rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold ${getActiveCaseStatusBadge(
                        c.liveStatus
                      )}`}
                    >
                      {getActiveCaseStatusLabelShort(c.liveStatus)}
                    </span>
                  </div>
                  <div className="p-3 sm:p-5">
                    <p className="truncate text-sm sm:text-base font-bold text-slate-900">{tTreatment(c.treatment_type)}</p>
                    {c.assigned_department && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-slate-500">
                        <Stethoscope className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-blue-500" />
                        <span className="truncate">{tDept(c.assigned_department)}</span>
                      </div>
                    )}
                    <div
                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg sm:rounded-xl border px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold ${
                        c.liveStatus === 'completed'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span className="truncate">
                        {c.liveStatus === 'completed'
                          ? t('student.dashboard.caseClosed')
                          : t('student.dashboard.caseCancelledText')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

              {trulyActiveCases.length > 0 && (
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
      </section>
    </main>
  )
}
