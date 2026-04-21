'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LogOut, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import type { RequestRow, CaseInfo } from './page'

interface Props {
  myRequests: RequestRow[]
  caseMap: Record<string, CaseInfo>
}

export function RequestsClient({ myRequests, caseMap }: Props) {
  const router = useRouter()
  const { t } = useI18n()

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

  function getStatusStyles(status: string) {
    switch ((status || '').toLowerCase()) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case 'pending':  return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'rejected': return 'bg-red-50 text-red-700 border border-red-200'
      case 'revoked':  return 'bg-slate-100 text-slate-700 border border-slate-200'
      default:         return 'bg-slate-100 text-slate-700 border border-slate-200'
    }
  }

  function getStatusLabel(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'approved': return t('student.requests.statusApproved')
      case 'pending':  return t('student.requests.statusPending')
      case 'rejected': return t('student.requests.statusRejected')
      case 'revoked':  return t('student.requests.statusRevoked')
      default:         return status.toUpperCase()
    }
  }

  function getUrgencyStyles(urgency: string) {
    switch ((urgency || '').toLowerCase()) {
      case 'high':   return 'bg-red-50 text-red-700 border border-red-200'
      case 'medium': return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'low':    return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      default:       return 'bg-slate-100 text-slate-700 border border-slate-200'
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
  }

  // Split into sections
  const activeAndPending = myRequests.filter((req) => {
    if (req.status === 'pending') return true
    if (req.status === 'approved') {
      const cs = caseMap[req.case_id]?.caseStatus ?? ''
      return !['completed', 'cancelled'].includes(cs.toLowerCase())
    }
    return false
  })

  const completedRequests = myRequests.filter((req) => {
    if (req.status !== 'approved') return false
    const cs = caseMap[req.case_id]?.caseStatus ?? ''
    return ['completed', 'cancelled'].includes(cs.toLowerCase())
  })

  const rejectedRequests = myRequests.filter((req) => req.status === 'rejected')
  const revokedRequests = myRequests.filter((req) => req.status === 'revoked')

  function renderCard(req: RequestRow) {
    const caseInfo = caseMap[req.case_id]
    const isCompleted =
      req.status === 'approved' &&
      ['completed', 'cancelled'].includes((caseInfo?.caseStatus ?? '').toLowerCase())

    return (
      <article
        key={req.id}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <span className="font-mono text-xs font-bold text-slate-500">
            REQ #{req.id.slice(0, 8).toUpperCase()}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusStyles(req.status)}`}
          >
            {getStatusLabel(req.status)}
          </span>
        </div>

        <div className="p-5">
          <p className="text-base font-bold text-slate-900">
            {caseInfo ? tTreatment(caseInfo.treatment_type) : '—'}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {caseInfo?.assigned_department && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                {tDept(caseInfo.assigned_department)}
              </span>
            )}
            {caseInfo?.urgency && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getUrgencyStyles(caseInfo.urgency)}`}
              >
                {tUrgency(caseInfo.urgency)}
              </span>
            )}
          </div>

          {caseInfo?.city && (
            <p className="mt-3 text-sm text-slate-500">
              {t('student.requests.cityLabel')} {caseInfo.city}
            </p>
          )}

          <p className="mt-2 text-sm text-slate-500">
            {t('student.requests.submittedLabel')} {formatDate(req.created_at)}
          </p>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {req.status === 'pending' && t('student.requests.messagePending')}
            {req.status === 'approved' && !isCompleted && t('student.requests.messageApproved')}
            {isCompleted && t('student.requests.completedNote')}
            {req.status === 'rejected' && t('student.requests.messageRejected')}
            {req.status === 'revoked' && t('student.requests.messageRevoked')}
          </div>

          {req.status === 'approved' && !isCompleted && (
            <Link
              href="/student/dashboard"
              className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {t('student.requests.goToDashboard')}
            </Link>
          )}
        </div>
      </article>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
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
              { href: '/student/dashboard', labelKey: 'student.nav.dashboard',  active: false },
              { href: '/student/cases',     labelKey: 'student.nav.casePool',   active: false },
              { href: '/student/requests',  labelKey: 'student.nav.myRequests', active: true  },
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
        <Link
          href="/student/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-800"
        >
          ← {t('student.requests.backToDashboard')}
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {t('student.requests.pageTitle')}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            {t('student.requests.pageDesc')}
          </p>
        </div>

        {myRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-700">
              {t('student.requests.noRequests')}
            </p>
            <p className="mt-1.5 max-w-xs text-sm text-slate-400">
              {t('student.requests.noRequestsDesc')}
            </p>
            <Link
              href="/student/cases"
              className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {t('student.requests.browseCasePool')}
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {activeAndPending.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('student.requests.sectionActive')}
                  </h2>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {activeAndPending.length}
                  </span>
                </div>
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {activeAndPending.map(renderCard)}
                </div>
              </div>
            )}

            {completedRequests.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('student.requests.sectionCompleted')}
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    {completedRequests.length}
                  </span>
                </div>
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {completedRequests.map(renderCard)}
                </div>
              </div>
            )}

            {rejectedRequests.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('student.requests.sectionRejected')}
                  </h2>
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                    {rejectedRequests.length}
                  </span>
                </div>
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {rejectedRequests.map(renderCard)}
                </div>
              </div>
            )}

            {revokedRequests.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-slate-500" />
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('student.requests.sectionRevoked')}
                  </h2>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {revokedRequests.length}
                  </span>
                </div>
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {revokedRequests.map(renderCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
