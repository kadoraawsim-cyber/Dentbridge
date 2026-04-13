'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, Stethoscope } from 'lucide-react'

type PatientRequest = {
  id: string
  full_name: string
  treatment_type: string
  status: string
  created_at: string | null
  preferred_days: string | null
  assigned_department: string | null
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
      return 'Submitted — Awaiting Review'
    case 'under_review':
      return 'Under Faculty Review'
    case 'matched':
      return 'Matched with Department'
    case 'contacted':
      return 'Contacted by Clinic'
    case 'completed':
      return 'Treatment Completed'
    case 'rejected':
      return 'Out of Scope'
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
      .from('patient_requests')
      .select('id, full_name, treatment_type, status, created_at, preferred_days, assigned_department')
      .eq('phone', trimmed)
      .order('created_at', { ascending: false })
      .limit(1)
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
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="space-y-5 p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              <h2 className="text-xl font-semibold text-slate-900">Patient Lookup</h2>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
              />
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Search className="h-4 w-4" />
              {loading ? 'Searching...' : 'Check Status'}
            </button>
          </div>
        </form>

        {loading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Looking up your request...
          </div>
        )}

        {!loading && searched && !result && !errorMessage && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-700">No request found</p>
            <p className="mt-1 text-sm text-slate-500">
              We could not find a submitted request for that phone number. Please check the number and try again, or{' '}
              <Link href="/patient/request" className="text-teal-600 hover:underline">
                submit a new request
              </Link>
              .
            </p>
          </div>
        )}

        {!loading && result && (
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs font-bold text-slate-500">
                  ID: {result.id.slice(0, 8)}
                </p>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${getStatusBadgeClass(
                    result.status
                  )}`}
                >
                  {getStatusLabel(result.status)}
                </span>
              </div>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient Name
                </p>
                <p className="text-2xl font-bold text-slate-900">{result.full_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <p className="mb-1 text-xs text-slate-500">Treatment Requested</p>
                  <p className="font-medium text-slate-900">{result.treatment_type}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-slate-500">Date Submitted</p>
                  <p className="font-medium text-slate-900">{formatDate(result.created_at)}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-slate-500">Preferred Availability</p>
                  <p className="font-medium text-slate-900">{result.preferred_days || '-'}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-slate-500">Assigned Department</p>
                  {result.assigned_department ? (
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="h-4 w-4 text-blue-600" />
                      <p className="font-medium text-blue-900">{result.assigned_department}</p>
                    </div>
                  ) : (
                    <p className="font-medium text-slate-400">Pending review</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <p className="text-xs text-slate-500">
                This shows your most recently submitted request. For changes or questions, contact the clinic directly.
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
                <a href="#" className="hover:text-white">
                  Affordable Care Information
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  FAQ
                </a>
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
                <a href="#" className="hover:text-white">
                  Clinical Requirements
                </a>
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
