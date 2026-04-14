'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, Stethoscope } from 'lucide-react'

type PatientRequest = {
  id: string
  treatment_type: string
  status: string
  created_at: string | null
  preferred_days: string | null
  assigned_department: string | null
}

// The normal forward path of a case. Rejected / cancelled are side-states
// shown separately and do not appear in the stepper.
const STATUS_FLOW = [
  { key: 'submitted',             label: 'Submitted' },
  { key: 'under_review',          label: 'Under Review' },
  { key: 'matched',               label: 'Assigned to Dept.' },
  { key: 'student_approved',      label: 'Student Assigned' },
  { key: 'contacted',             label: 'Contacted' },
  { key: 'appointment_scheduled', label: 'Appt. Scheduled' },
  { key: 'in_treatment',          label: 'In Treatment' },
  { key: 'completed',             label: 'Completed' },
]

function StatusStepper({ status }: { status: string }) {
  const normalised = (status || '').toLowerCase()
  const isClosed = normalised === 'rejected' || normalised === 'cancelled'
  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === normalised)

  return (
    <div>
      {isClosed && (
        <p className="mb-3 text-xs font-semibold text-rose-600">
          {normalised === 'cancelled'
            ? 'This case has been cancelled.'
            : 'Case marked as out of scope — no further steps required.'}
        </p>
      )}
      <div className="flex items-center">
        {STATUS_FLOW.map((step, i) => {
          const isDone = !isClosed && i < currentIndex
          const isCurrent = !isClosed && i === currentIndex
          return (
            <React.Fragment key={step.key}>
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${
                  isDone
                    ? 'bg-teal-500'
                    : isCurrent
                    ? 'border-2 border-teal-500 bg-white'
                    : 'bg-slate-200'
                }`}
              />
              {i < STATUS_FLOW.length - 1 && (
                <div
                  className={`h-px flex-1 transition-colors ${
                    isDone ? 'bg-teal-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between">
        {STATUS_FLOW.map((step, i) => {
          const isDone = !isClosed && i < currentIndex
          const isCurrent = !isClosed && i === currentIndex
          return (
            <span
              key={step.key}
              className={`text-[10px] font-medium leading-tight ${
                isCurrent ? 'text-teal-700' : isDone ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function getStatusBadgeClass(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return 'bg-slate-100 text-slate-700 border border-slate-200'
    case 'under_review':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'matched':
      return 'bg-violet-50 text-violet-700 border border-violet-200'
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
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    case 'cancelled':
      return 'bg-slate-100 text-slate-500 border border-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

function getStatusLabel(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return 'Submitted — Awaiting Review'
    case 'under_review':
      return 'Under Faculty Review'
    case 'matched':
      return 'Assigned to Department — Awaiting Student'
    case 'student_approved':
      return 'Student Assigned — Preparing Contact'
    case 'contacted':
      return 'Patient Contacted by Student'
    case 'appointment_scheduled':
      return 'Appointment Scheduled'
    case 'in_treatment':
      return 'Currently In Treatment'
    case 'completed':
      return 'Treatment Completed'
    case 'rejected':
      return 'Out of Scope'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function PatientStatusPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [result, setResult] = useState<PatientRequest | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSearch(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage('')
    setResult(null)
    setSearched(false)

    const trimmed = phone.trim()
    if (!trimmed) return

    setLoading(true)

    const { data, error } = await supabase
      .rpc('get_request_status_by_phone', { lookup_phone: trimmed })
      .maybeSingle()

    setLoading(false)
    setSearched(true)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setResult(data as PatientRequest | null)
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
            <Link href="/patient/status" className="text-slate-900">
              My Portal
            </Link>
            <Link href="/patient/request" className="hover:text-slate-900">
              New Treatment Request
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0"
                />
              </svg>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Check Your Request Status
          </h1>
          <p className="mt-3 text-slate-600">
            Enter the phone number you used when submitting your treatment request to view its current status.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              <h2 className="text-lg font-semibold text-slate-900">Patient Lookup</h2>
            </div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Phone Number
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? 'Searching…' : 'Check Status'}
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </div>
        </form>

        {!loading && searched && !result && !errorMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <Search className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-700">No request found</p>
              <p className="mt-1 text-sm text-slate-500">
                We couldn't find a request for that number. Double-check and try again, or{' '}
                <Link href="/patient/request" className="text-teal-600 hover:underline">
                  submit a new request
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {!loading && result && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <span className="font-mono text-xs font-bold text-slate-400">
                REF #{result.id.slice(0, 8).toUpperCase()}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(result.status)}`}>
                {getStatusLabel(result.status)}
              </span>
            </div>

            <div className="p-5 sm:p-7">
              {/* Progress stepper */}
              <div className="mb-6">
                <StatusStepper status={result.status} />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-5">
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Treatment</p>
                  <p className="text-sm font-semibold text-slate-900">{result.treatment_type}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Submitted</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(result.created_at)}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Availability</p>
                  <p className="text-sm font-semibold text-slate-900">{result.preferred_days || '—'}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Department</p>
                  {result.assigned_department ? (
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                      <p className="text-sm font-semibold text-blue-900">{result.assigned_department}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Pending review</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <p className="text-xs text-slate-400">
                Showing your most recent request. For questions, contact the clinic directly.
              </p>
            </div>
          </div>
        )}
      </section>

      <footer className="bg-slate-950 py-14 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/dentbridge-icon.png"
                alt="DentBridge icon"
                className="h-10 w-10 object-contain"
              />
              <div>
                <p className="font-bold text-white">DentBridge</p>
                <p className="text-xs text-slate-400">
                  Faculty-Supported Clinical Platform
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Connecting patients with affordable, supervised dental care through
              structured academic workflows.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Patient Services</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/patient/request" className="hover:text-white">
                  Request Treatment
                </Link>
              </li>
              <li>
                <Link href="/patient/status" className="hover:text-white">
                  Check Status
                </Link>
              </li>
              <li>
                <span className="cursor-default text-slate-600">Affordable Care Information</span>
              </li>
              <li>
                <span className="cursor-default text-slate-600">FAQ</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Clinical Portals</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/student/dashboard" className="hover:text-white">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white">
                  Faculty Portal
                </Link>
              </li>
              <li>
                <Link href="/student/cases" className="hover:text-white">
                  Case Pool
                </Link>
              </li>
              <li>
                <span className="cursor-default text-slate-600">Clinical Requirements</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Contact</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Istanbul, Türkiye</li>
              <li>University-supported pilot platform</li>
              <li>WhatsApp support available</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-800 px-4 pt-6 text-xs text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} DentBridge. All treatments are provided under
          academic supervision.
        </div>
      </footer>
    </main>
  )
}
