'use client'

import React, { useMemo, useState } from 'react'
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

function getUrgencyLabel(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':
      return 'HIGH URGENCY'
    case 'medium':
      return 'MEDIUM URGENCY'
    case 'low':
      return 'LOW URGENCY'
    default:
      return 'UNSPECIFIED'
  }
}

export function CasesClient({ initialCases, requestsByCaseId, contactDetails }: Props) {
  const router = useRouter()

  // Local copy of request states — updated optimistically on successful API calls.
  const [localRequests, setLocalRequests] =
    useState<Record<string, RequestInfo>>(requestsByCaseId)

  // Which case_id is currently mid-request (prevents double-submit).
  const [submitting, setSubmitting] = useState<string | null>(null)

  // Per-case error messages.
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({})

  const [searchTerm, setSearchTerm] = useState('')
  const [activeDepartment, setActiveDepartment] = useState('All')

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
  }

  async function handleRequest(caseId: string) {
    if (submitting) return
    setSubmitting(caseId)
    setRequestErrors((prev) => {
      const next = { ...prev }
      delete next[caseId]
      return next
    })

    const res = await fetch(`/api/student/cases/${caseId}/request`, {
      method: 'POST',
    })

    setSubmitting(null)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }))
      setRequestErrors((prev) => ({
        ...prev,
        [caseId]: (body as { error?: string }).error ?? 'Request failed',
      }))
      return
    }

    const { data } = (await res.json()) as {
      data: { id: string; case_id: string; status: string }
    }
    setLocalRequests((prev) => ({
      ...prev,
      [caseId]: { requestId: data.id, status: 'pending' },
    }))
  }

  const filtered = useMemo(() => {
    let result = initialCases

    if (activeDepartment !== 'All') {
      result = result.filter(
        (c) =>
          (c.assigned_department || '').toLowerCase() === activeDepartment.toLowerCase()
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
  }, [initialCases, searchTerm, activeDepartment])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
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
                Faculty-Supported Clinical Platform
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/student/dashboard" className="hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/student/cases" className="text-slate-900">
              Available Cases
            </Link>
            <Link href="/student/exchange" className="hover:text-slate-900">
              Case Exchange
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500">
              <GraduationCap className="h-4 w-4" />
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Link
              href="/student/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Available Cases</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
              Faculty-approved cases released to the clinical pool. Review details and request the
              ones that match your training level and department rotation.
            </p>
          </div>

          <div className="relative w-full max-w-md lg:justify-self-end">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by treatment, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>
        </div>

        {/* Department filter chips */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="mr-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Department:
          </div>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setActiveDepartment(dept)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                activeDepartment === dept
                  ? 'bg-blue-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <div className="flex items-start gap-3">
              <Search className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {initialCases.length === 0 ? 'No cases available yet' : 'No cases match your filter'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {initialCases.length === 0
                    ? 'No cases have been released to the pool yet. Check back after faculty review.'
                    : 'Try a different department or clear your search to see all available cases.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((c) => {
              const myRequest = localRequests[c.id]
              const contact = contactDetails[c.id]
              const isSubmittingThis = submitting === c.id
              const errorForThis = requestErrors[c.id]

              return (
                <article
                  key={c.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">
                        {c.id.slice(0, 8)}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${getUrgencyBadgeClass(c.urgency)}`}
                      >
                        {getUrgencyLabel(c.urgency)}
                      </span>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Treatment
                      </p>
                      <p className="text-lg font-bold text-slate-900">{c.treatment_type}</p>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {c.age ?? '-'} years old{c.city ? ` · ${c.city}` : ''}
                    </p>

                    {c.complaint_text && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
                        {c.complaint_text}
                      </p>
                    )}

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Assigned Department
                      </p>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-blue-600" />
                        <span className="text-base font-semibold text-blue-900">
                          {c.assigned_department || 'Unassigned'}
                        </span>
                      </div>
                    </div>

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

                    {/* Contact details — only shown when this student is approved */}
                    {myRequest?.status === 'approved' && contact && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
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
                  </div>

                  <div className="mt-auto border-t border-slate-100 bg-slate-50/70 p-4">
                    {errorForThis && (
                      <p className="mb-2 text-center text-xs text-red-600">{errorForThis}</p>
                    )}

                    {!myRequest && (
                      <button
                        type="button"
                        onClick={() => handleRequest(c.id)}
                        disabled={isSubmittingThis}
                        className="flex w-full items-center justify-center rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmittingThis ? 'Submitting…' : 'Request This Case'}
                      </button>
                    )}

                    {myRequest?.status === 'pending' && (
                      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                        <Clock className="h-4 w-4" />
                        Request Pending Faculty Review
                      </div>
                    )}

                    {myRequest?.status === 'approved' && (
                      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Request Approved
                      </div>
                    )}

                    {myRequest?.status === 'rejected' && (
                      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        <XCircle className="h-4 w-4" />
                        Request Declined
                      </div>
                    )}
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
