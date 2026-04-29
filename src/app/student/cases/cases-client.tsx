'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  LogOut,
  Search,
  Stethoscope,
  GraduationCap,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  XCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import type { PoolCase, RequestInfo, ContactInfo } from './page'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface Props {
  initialCases: PoolCase[]
  requestsByCaseId: Record<string, RequestInfo>
  contactDetails: Record<string, ContactInfo>
}

const DEPARTMENTS = [
  'All',
  'Endodontics',
  'Oral & Maxillofacial Surgery',
  'Periodontology',
  'Orthodontics',
  'Restorative Dentistry',
  'Prosthodontics',
  'Pedodontics',
  'Oral Radiology',
]

type RequestFilter = 'all' | 'my_requests'

function getUrgencyBadgeClass(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':   return 'bg-red-50 text-red-700 border border-red-200'
    case 'medium': return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'low':    return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    default:       return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

function getUrgencyDot(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':   return 'bg-red-500'
    case 'medium': return 'bg-amber-400'
    case 'low':    return 'bg-emerald-500'
    default:       return 'bg-slate-300'
  }
}

export function CasesClient({ initialCases, requestsByCaseId, contactDetails }: Props) {
  const router = useRouter()
  const { t } = useI18n()

  const [localRequests, setLocalRequests] =
    useState<Record<string, RequestInfo>>(requestsByCaseId)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [activeDepartment, setActiveDepartment] = useState('All')
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all')

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
  }

  async function handleRequest(caseId: string) {
    if (submitting) return
    setSubmitting(caseId)
    setRequestErrors((prev) => { const next = { ...prev }; delete next[caseId]; return next })

    const res = await fetch(`/api/student/cases/${caseId}/request`, { method: 'POST' })
    setSubmitting(null)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }))
      setRequestErrors((prev) => ({
        ...prev,
        [caseId]: (body as { error?: string }).error ?? 'Request failed',
      }))
      return
    }

    const { data } = (await res.json()) as { data: { id: string; case_id: string; status: string } }
    setLocalRequests((prev) => ({
      ...prev,
      [caseId]: { requestId: data.id, status: 'pending' },
    }))
  }

  const myRequestCount = initialCases.filter((caseItem) => !!localRequests[caseItem.id]).length
  const pendingCount = Object.values(localRequests).filter((r) => r.status === 'pending').length

  const filtered = useMemo(() => {
    let result = initialCases

    if (requestFilter === 'my_requests') {
      result = result.filter((c) => !!localRequests[c.id])
    }

    if (activeDepartment !== 'All') {
      result = result.filter(
        (c) => (c.assigned_department || '').toLowerCase() === activeDepartment.toLowerCase()
      )
    }

    const q = searchTerm.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.treatment_type?.toLowerCase().includes(q) ||
          c.assigned_department?.toLowerCase().includes(q)
      )
    }

    return result
  }, [initialCases, searchTerm, activeDepartment, requestFilter, localRequests])

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

  function tAvailability(v: string): string {
    const map: Record<string, string> = {
      'No Preference': t('request.dayNoPreference'),
      'Weekday Mornings': t('request.dayWeekdayMornings'),
      'Weekday Afternoons': t('request.dayWeekdayAfternoons'),
      'As Soon As Possible': t('request.dayAsSoonAsPossible'),
    }
    return map[v] ?? v
  }

  function tDuration(v: string): string {
    const map: Record<string, string> = {
      Today: t('request.durationToday'),
      'A few days': t('request.durationFewDays'),
      '1-2 weeks': t('request.durationOneToTwoWeeks'),
      'More than a month': t('request.durationMoreThanMonth'),
    }
    return map[v] ?? v
  }

  function tUrgency(v: string): string {
    switch ((v || '').toLowerCase()) {
      case 'high': return t('request.urgencyHigh')
      case 'medium': return t('request.urgencyMedium')
      case 'low': return t('request.urgencyLow')
      default: return v || 'Unknown'
    }
  }

  function tMedicalCondition(v: string | null): string {
    if (!v) return t('student.cases.noMedicalNote')

    const map: Record<string, string> = {
      None: t('request.medicalNone'),
      Diabetes: t('request.medicalDiabetes'),
      Pregnancy: t('request.medicalPregnancy'),
      'Blood thinner use': t('request.medicalBloodThinner'),
      Allergy: t('request.medicalAllergy'),
      Other: t('request.medicalOther'),
    }

    return map[v] ?? v
  }

  function tAttachmentSummary(caseItem: PoolCase): string {
    return caseItem.attachment_path
      ? t('student.cases.oneImageAttachment')
      : t('student.cases.noAttachments')
  }

  // Translate department display label (keep 'All' sentinel as-is for filter logic)
  function getDeptLabel(dept: string) {
    return dept === 'All' ? t('student.cases.filterAll') : tDept(dept)
  }

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
              { href: '/student/dashboard', labelKey: 'student.nav.dashboard', active: false },
              { href: '/student/cases',     labelKey: 'student.nav.casePool',  active: true  },
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

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="hidden h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 sm:flex">
              <GraduationCap className="h-4 w-4" />
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('student.nav.signOut')}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mb-6">
          <Link
            href="/student/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('student.cases.backToDashboard')}
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {t('student.cases.pageTitle')}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
                {t('student.cases.pageDesc')}
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full max-w-xs shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('student.cases.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className="mb-6 space-y-3">
          {/* Request type filter */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRequestFilter('all')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                requestFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {t('student.cases.filterAll')}
              {initialCases.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  requestFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {initialCases.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setRequestFilter('my_requests')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                requestFilter === 'my_requests'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {t('student.cases.filterMyRequests')}
              {myRequestCount > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  requestFilter === 'my_requests' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  {myRequestCount}
                </span>
              )}
            </button>
          </div>

          {/* Department chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Filter className="h-3 w-3" />
              {t('student.cases.deptLabel')}
            </div>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setActiveDepartment(dept)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  activeDepartment === dept
                    ? 'bg-blue-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {getDeptLabel(dept)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Pending requests note ──────────────────────────────────────── */}
        {pendingCount > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">
                {pendingCount === 1
                  ? t('student.cases.requestPendingReview')
                  : `${pendingCount} ${t('student.cases.requestsPendingReview')}`}
              </span>
              {' '}{t('student.cases.pendingNoteNotify')}
            </p>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              {requestFilter === 'my_requests' ? (
                <Calendar className="h-7 w-7" />
              ) : (
                <Search className="h-7 w-7" />
              )}
            </div>
            <p className="text-base font-semibold text-slate-700">
              {requestFilter === 'my_requests'
                ? t('student.cases.emptyNoRequests')
                : initialCases.length === 0
                ? t('student.cases.emptyNoPool')
                : t('student.cases.emptyNoMatch')}
            </p>
            <p className="mt-1.5 max-w-xs text-sm text-slate-400">
              {requestFilter === 'my_requests'
                ? t('student.cases.emptyNoRequestsDesc')
                : initialCases.length === 0
                ? t('student.cases.emptyNoPoolDesc')
                : t('student.cases.emptyNoMatchDesc')}
            </p>
            {(requestFilter === 'my_requests' || activeDepartment !== 'All' || searchTerm) && (
              <button
                type="button"
                onClick={() => { setRequestFilter('all'); setActiveDepartment('All'); setSearchTerm('') }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('student.cases.clearFilters')}
              </button>
            )}
          </div>
        )}

        {/* ── Case grid ────────────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((c) => {
              const myRequest      = localRequests[c.id]
              const contact        = contactDetails[c.id]
              const isSubmitting   = submitting === c.id
              const errorForThis   = requestErrors[c.id]
              const hasRequest     = !!myRequest
              const isApproved     = myRequest?.status === 'approved'
              const isPending      = myRequest?.status === 'pending'
              const isRejected     = myRequest?.status === 'rejected'
              const isRevoked      = myRequest?.status === 'revoked'
              const facultyGuidance = c.clinical_notes?.trim()

              return (
                <article
                  key={c.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                    isApproved
                      ? 'border-emerald-200'
                      : isPending
                        ? 'border-amber-200'
                        : isRevoked
                          ? 'border-slate-300'
                          : 'border-slate-200'
                  }`}
                >
                  {/* Card header strip */}
                  <div className={`flex flex-wrap items-center justify-between gap-y-1 border-b px-4 py-3 sm:px-5 ${
                    isApproved
                      ? 'border-emerald-100 bg-emerald-50/60'
                      : isPending
                        ? 'border-amber-100 bg-amber-50/60'
                        : isRevoked
                          ? 'border-slate-200 bg-slate-100/80'
                          : 'border-slate-100 bg-slate-50/60'
                  }`}>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{c.id.slice(0, 8).toUpperCase()}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Urgency dot + badge */}
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getUrgencyBadgeClass(c.urgency)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${getUrgencyDot(c.urgency)}`} />
                        {tUrgency(c.urgency)}
                      </span>
                      {/* Request state indicator */}
                      {isApproved && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-2.5 w-2.5" /> {t('student.cases.badgeApproved')}
                        </span>
                      )}
                      {isPending && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          <Clock className="h-2.5 w-2.5" /> {t('student.cases.badgePending')}
                        </span>
                      )}
                      {isRevoked && (
                        <span className="flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          <XCircle className="h-2.5 w-2.5" /> {t('student.cases.badgeRevoked')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    {/* Treatment */}
                    <p className="text-base font-bold text-slate-900">{tTreatment(c.treatment_type)}</p>
                    <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-700">{t('student.cases.ageLabel')}:</span>{' '}
                        {c.age ?? '\u2014'} yrs
                      </p>

                      <p className="line-clamp-2">
                        <span className="font-semibold text-slate-700">
                          {t('student.cases.mainComplaint')}:
                        </span>{' '}
                        {c.complaint_text || t('student.cases.noComplaint')}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-700">{t('student.cases.department')}:</span>{' '}
                        <span className="inline-flex items-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                          <span className="text-blue-900">
                            {c.assigned_department ? tDept(c.assigned_department) : t('student.cases.unassigned')}
                          </span>
                        </span>
                      </p>

                      <p>
                        <span className="font-semibold text-slate-700">{t('student.cases.urgency')}:</span>{' '}
                        {tUrgency(c.urgency)}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-700">{t('student.cases.painScore')}:</span>{' '}
                        {c.pain_score ?? '\u2014'}/10
                      </p>

                      <p>
                        <span className="font-semibold text-slate-700">{t('student.cases.duration')}:</span>{' '}
                        {c.symptom_duration ? tDuration(c.symptom_duration) : '\u2014'}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-700">{t('student.cases.availability')}:</span>{' '}
                        {c.preferred_days ? tAvailability(c.preferred_days) : '\u2014'}
                      </p>

                      <p className="line-clamp-2">
                        <span className="font-semibold text-slate-700">{t('student.cases.medicalNote')}:</span>{' '}
                        {tMedicalCondition(c.medical_condition)}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-700">{t('student.cases.attachments')}:</span>{' '}
                        {tAttachmentSummary(c)}
                      </p>
                    </div>

                    {facultyGuidance && (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                          {t('student.cases.facultyGuidance')}
                        </p>
                        <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                          {facultyGuidance}
                        </p>
                      </div>
                    )}

                    {/* Contact — approved only */}
                    {isApproved && contact && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                          {t('student.cases.patientContact')}
                        </p>
                        <p className="text-sm font-bold text-slate-900">{contact.full_name}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {contact.phone}
                        </div>
                        <p className="mt-2 text-xs text-emerald-700">
                          {t('student.cases.contactPatientMsg')}
                        </p>
                      </div>
                    )}

                    {/* Spacer pushes footer down */}
                    <div className="flex-1" />

                    {/* Action footer */}
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {errorForThis && (
                        <p className="mb-2 flex items-center gap-1.5 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {errorForThis}
                        </p>
                      )}

                      {!hasRequest && (
                        <button
                          type="button"
                          onClick={() => handleRequest(c.id)}
                          disabled={isSubmitting}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmitting ? (
                            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {t('student.cases.submitting')}</>
                          ) : (
                            t('student.cases.btnRequest')
                          )}
                        </button>
                      )}

                      {isPending && (
                        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700">
                          <Clock className="h-4 w-4" />
                          {t('student.cases.pendingFacultyReview')}
                        </div>
                      )}

                      {isApproved && (
                        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          {t('student.cases.approvedCheckDashboard')}
                        </div>
                      )}

                      {isRejected && (
                        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
                          <XCircle className="h-4 w-4" />
                          {t('student.cases.requestDeclined')}
                        </div>
                      )}

                      {isRevoked && (
                        <>
                          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
                            <XCircle className="h-4 w-4" />
                            {t('student.cases.requestRevokedByFaculty')}
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-slate-500">
                            {t('student.cases.requestRevokedNote')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
