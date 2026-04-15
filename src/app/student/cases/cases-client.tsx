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

  const myRequestCount = Object.values(localRequests).length
  const pendingCount   = Object.values(localRequests).filter(r => r.status === 'pending').length

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
          c.city?.toLowerCase().includes(q) ||
          c.assigned_department?.toLowerCase().includes(q)
      )
    }

    return result
  }, [initialCases, searchTerm, activeDepartment, requestFilter, localRequests])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/dentbridge-icon.png" alt="DentBridge" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Clinical Platform</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: '/student/dashboard', label: 'Dashboard',   active: false },
              { href: '/student/cases',     label: 'Case Pool',   active: true  },
              { href: '/student/exchange',  label: 'Exchange',    active: false },
            ].map(({ href, label, active }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 sm:flex">
              <GraduationCap className="h-4 w-4" />
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
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
            Back to Dashboard
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Case Pool</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
                Faculty-approved cases open for student requests. Find cases that match your
                department rotation and training level.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full max-w-xs shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search treatment, city…"
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
              All Cases
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
              My Requests
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
              Dept:
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
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* ── Pending requests note ──────────────────────────────────────── */}
        {pendingCount > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{pendingCount} request{pendingCount !== 1 ? 's' : ''} pending faculty review.</span>
              {' '}You'll be notified once a decision is made.
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
                ? 'No requests yet'
                : initialCases.length === 0
                ? 'No cases in the pool yet'
                : 'No cases match your filter'}
            </p>
            <p className="mt-1.5 max-w-xs text-sm text-slate-400">
              {requestFilter === 'my_requests'
                ? 'Switch to "All Cases" to browse the pool and request a case.'
                : initialCases.length === 0
                ? 'Faculty releases cases after triage. Check back soon.'
                : 'Try a different department filter or clear your search.'}
            </p>
            {(requestFilter === 'my_requests' || activeDepartment !== 'All' || searchTerm) && (
              <button
                type="button"
                onClick={() => { setRequestFilter('all'); setActiveDepartment('All'); setSearchTerm('') }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Clear filters
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

              return (
                <article
                  key={c.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                    isApproved ? 'border-emerald-200' : isPending ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  {/* Card header strip */}
                  <div className={`flex flex-wrap items-center justify-between gap-y-1 border-b px-4 py-3 sm:px-5 ${
                    isApproved ? 'border-emerald-100 bg-emerald-50/60' : isPending ? 'border-amber-100 bg-amber-50/60' : 'border-slate-100 bg-slate-50/60'
                  }`}>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{c.id.slice(0, 8).toUpperCase()}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Urgency dot + badge */}
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getUrgencyBadgeClass(c.urgency)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${getUrgencyDot(c.urgency)}`} />
                        {(c.urgency || 'Unknown').toUpperCase()}
                      </span>
                      {/* Request state indicator */}
                      {isApproved && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-2.5 w-2.5" /> APPROVED
                        </span>
                      )}
                      {isPending && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          <Clock className="h-2.5 w-2.5" /> PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    {/* Treatment */}
                    <p className="text-base font-bold text-slate-900">{c.treatment_type}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {c.age ?? '—'} yrs{c.city ? ` · ${c.city}` : ''}
                    </p>

                    {c.complaint_text && (
                      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
                        {c.complaint_text}
                      </p>
                    )}

                    {/* Dept block */}
                    <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <Stethoscope className="h-4 w-4 shrink-0 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">
                        {c.assigned_department || 'Unassigned'}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="mt-3 space-y-1">
                      {c.target_student_level && (
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Required level:</span>{' '}
                          {c.target_student_level}
                        </p>
                      )}
                      {c.preferred_days && (
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Availability:</span>{' '}
                          {c.preferred_days}
                        </p>
                      )}
                    </div>

                    {/* Contact — approved only */}
                    {isApproved && contact && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                          Patient Contact
                        </p>
                        <p className="text-sm font-bold text-slate-900">{contact.full_name}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {contact.phone}
                        </div>
                        <p className="mt-2 text-xs text-emerald-700">
                          Contact the patient to schedule their appointment.
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
                            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Submitting…</>
                          ) : (
                            'Request This Case'
                          )}
                        </button>
                      )}

                      {isPending && (
                        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700">
                          <Clock className="h-4 w-4" />
                          Pending Faculty Review
                        </div>
                      )}

                      {isApproved && (
                        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Approved — check your dashboard
                        </div>
                      )}

                      {isRejected && (
                        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
                          <XCircle className="h-4 w-4" />
                          Request Declined
                        </div>
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
