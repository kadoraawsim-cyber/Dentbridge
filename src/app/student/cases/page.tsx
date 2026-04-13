'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Search, Stethoscope, GraduationCap, Filter, CheckCircle2 } from 'lucide-react'

type CaseItem = {
  id: string
  full_name: string
  age: number | null
  city: string | null
  treatment_type: string
  complaint_text: string
  urgency: string
  assigned_department: string | null
  target_student_level: string | null
  preferred_days: string | null
  status: string
  created_at: string | null
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

export default function StudentCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeDepartment, setActiveDepartment] = useState('All')
  const [requestedId, setRequestedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('patient_requests')
        .select(
          'id, full_name, age, city, treatment_type, complaint_text, urgency, assigned_department, target_student_level, preferred_days, status, created_at'
        )
        .eq('status', 'matched')
        .order('created_at', { ascending: false })

      setLoading(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setCases((data as CaseItem[]) || [])
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = cases

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
          c.full_name?.toLowerCase().includes(q) ||
          c.treatment_type?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.assigned_department?.toLowerCase().includes(q)
      )
    }

    return result
  }, [cases, searchTerm, activeDepartment])

  function handleRequest(id: string) {
    // Placeholder — full claiming logic requires a student_case_assignments table
    setRequestedId(id)
    setTimeout(() => setRequestedId(null), 3000)
  }

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
            <div className="hidden items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 sm:flex">
              <button type="button" className="rounded px-1 text-slate-900">
                EN
              </button>
              <span className="text-slate-300">|</span>
              <button type="button" className="rounded px-1 hover:text-slate-900">
                TR
              </button>
              <span className="text-slate-300">|</span>
              <button type="button" className="rounded px-1 hover:text-slate-900">
                AR
              </button>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500">
              <GraduationCap className="h-4 w-4" />
            </div>
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
              ← Back to Dashboard
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
              placeholder="Search by name, treatment, city..."
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

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            Loading available cases...
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            {cases.length === 0
              ? 'No cases have been released to the pool yet. Check back after faculty review.'
              : 'No cases match your current filter.'}
          </div>
        )}

        {!loading && !errorMessage && filtered.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((c) => (
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
                    <p className="text-xl font-bold text-slate-900">{c.treatment_type}</p>
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
                </div>

                <div className="mt-auto border-t border-slate-100 bg-slate-50/70 p-4">
                  {requestedId === c.id ? (
                    <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Request sent — pending faculty confirmation
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequest(c.id)}
                      className="flex w-full items-center justify-center rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                    >
                      Request This Case
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
