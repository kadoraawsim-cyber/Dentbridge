'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, Stethoscope } from 'lucide-react'

type PatientRequest = {
  id: string
  full_name: string
  age: number | null
  phone: string
  city: string | null
  preferred_university: string | null
  preferred_language: string | null
  treatment_type: string
  complaint_text: string
  urgency: string
  preferred_days: string | null
  consent: boolean
  status: string
  attachment_path: string | null
  attachment_name: string | null
  assigned_department: string | null
  created_at: string | null
}

function getUrgencyBadgeClass(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':
      return 'bg-red-50 text-red-700 border border-red-200'
    case 'medium':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'low':
      return 'bg-slate-50 text-slate-700 border border-slate-200'
    default:
      return 'bg-slate-50 text-slate-700 border border-slate-200'
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

function getStatusBadgeClass(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return 'bg-slate-100 text-slate-700 border border-slate-200'
    case 'under_review':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
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

function getStatusLabel(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return 'Submitted'
    case 'under_review':
      return 'Under Review'
    case 'matched':
      return 'Matched'
    case 'contacted':
      return 'Contacted'
    case 'completed':
      return 'Completed'
    case 'rejected':
      return 'Rejected'
    default:
      return status || 'Unknown'
  }
}

function suggestDepartment(treatmentType: string, assignedDepartment: string | null) {
  if (assignedDepartment) return assignedDepartment

  const value = (treatmentType || '').toLowerCase()

  if (value.includes('root canal')) return 'Endodontics'
  if (value.includes('extraction')) return 'Oral & Maxillofacial Surgery'
  if (value.includes('gum')) return 'Periodontology'
  if (value.includes('orthodont')) return 'Orthodontics'
  if (value.includes('prosthetic') || value.includes('crown') || value.includes('denture')) return 'Prosthodontics'
  if (value.includes('pediatric')) return 'Pedodontics'
  if (value.includes('esthetic') || value.includes('filling') || value.includes('cleaning')) {
    return 'Restorative Dentistry'
  }

  return 'General Review'
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<PatientRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function loadRequests() {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('patient_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setRequests((data as PatientRequest[]) || [])
      setLoading(false)
    }

    loadRequests()
  }, [])

  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    if (!q) return requests

    return requests.filter((request) => {
      return (
        request.full_name?.toLowerCase().includes(q) ||
        request.id?.toLowerCase().includes(q) ||
        request.phone?.toLowerCase().includes(q) ||
        request.treatment_type?.toLowerCase().includes(q) ||
        request.city?.toLowerCase().includes(q)
      )
    })
  }, [requests, searchTerm])

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
            <Link href="/admin" className="hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/admin/requests" className="text-slate-900">
              Patient Triage & Case Review
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
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Link
              href="/admin"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Patient Triage & Case Review
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
              Review incoming patient requests, assign urgency, and route to appropriate clinical departments.
            </p>
          </div>

          <div className="relative w-full max-w-md lg:justify-self-end">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            Loading requests...
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && filteredRequests.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <div className="flex items-start gap-3">
              <Search className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-700">No requests found</p>
                <p className="mt-1 text-sm text-slate-500">
                  {searchTerm.trim()
                    ? 'No requests match your search. Try a different name, phone, or treatment.'
                    : 'No patient requests have been submitted yet.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !errorMessage && filteredRequests.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {filteredRequests.map((request) => {
              const suggestion = suggestDepartment(
                request.treatment_type,
                request.assigned_department
              )

              return (
                <article
                  key={request.id}
                  className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">
                        {request.id.slice(0, 8)}
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                            request.status
                          )}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${getUrgencyBadgeClass(
                            request.urgency
                          )}`}
                        >
                          {getUrgencyLabel(request.urgency)}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold tracking-tight text-slate-900">
                      {request.full_name}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      {request.age ?? '-'} years old
                      {request.city ? ` • ${request.city}` : ''}
                    </p>

                    <div className="mt-8">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reported Issue
                      </p>
                      <p className="text-xl font-semibold text-slate-900">
                        {request.treatment_type}
                      </p>
                    </div>

                    <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        System Suggestion
                      </p>

                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-blue-600" />
                        <span className="text-base font-semibold text-blue-900">
                          {suggestion}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-slate-100 bg-slate-50/70 p-4">
                    <Link
                      href={`/admin/requests/${request.id}`}
                      className="flex w-full items-center justify-center rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                    >
                      Review & Assign
                    </Link>
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