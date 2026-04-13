'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'

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

type DepartmentLoadItem = {
  name: string
  count: number
  capacity: number
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

function getStatusBadgeClass(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return 'bg-slate-100 text-slate-700 border border-slate-200'
    case 'under_review':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
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

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-teal-500 transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState<PatientRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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

  const dashboardStats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const newToday = requests.filter((request) => {
      if (!request.created_at) return false
      return new Date(request.created_at) >= todayStart
    }).length

    const pendingReview = requests.filter((request) =>
      ['submitted', 'under_review'].includes((request.status || '').toLowerCase())
    ).length

    const activeTreatments = requests.filter((request) =>
      ['matched', 'contacted'].includes((request.status || '').toLowerCase())
    ).length

    const exchangeApprovals = requests.filter(
      (request) =>
        (request.status || '').toLowerCase() === 'under_review' &&
        !!request.assigned_department
    ).length

    return {
      newToday,
      pendingReview,
      activeTreatments,
      exchangeApprovals,
    }
  }, [requests])

  const recentRequests = useMemo(() => requests.slice(0, 3), [requests])

  const departmentLoad = useMemo<DepartmentLoadItem[]>(() => {
    const departmentNames = [
      'Restorative Dentistry',
      'Endodontics',
      'Oral & Maxillofacial Surgery',
      'Periodontology',
    ]

    return departmentNames.map((name) => {
      const count = requests.filter(
        (request) => (request.assigned_department || '').toLowerCase() === name.toLowerCase()
      ).length

      return {
        name,
        count,
        capacity: Math.min(100, count * 12 + 15),
      }
    })
  }, [requests])

  const urgentCases = useMemo(() => {
    return requests.filter(
      (request) =>
        (request.urgency || '').toLowerCase() === 'high' &&
        ['submitted', 'under_review'].includes((request.status || '').toLowerCase())
    ).length
  }, [requests])

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
            <Link href="/admin" className="text-slate-900">
              Dashboard
            </Link>
            <Link href="/admin/requests" className="hover:text-slate-900">
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
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
                <ShieldCheck className="h-8 w-8" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Faculty Administrator Portal
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium">
                  <span className="text-slate-500">DentBridge Platform</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1 text-teal-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Systems Online
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/requests">
                <button className="inline-flex items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">
                  Review Pending Cases
                </button>
              </Link>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Analytics Report
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              New Requests Today
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-blue-900">
              {loading ? '...' : dashboardStats.newToday}
            </div>
            <div className="mt-3 text-sm font-medium text-blue-600">+ live from today</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Pending Review
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-amber-600">
              {loading ? '...' : dashboardStats.pendingReview}
            </div>
            <div className="mt-3 text-sm text-slate-500">Requires faculty assessment</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Active Treatments
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-slate-900">
              {loading ? '...' : dashboardStats.activeTreatments}
            </div>
            <div className="mt-3 text-sm text-slate-500">
              Currently assigned to students
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Exchange Approvals
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-teal-600">
              {loading ? '...' : dashboardStats.exchangeApprovals}
            </div>
            <div className="mt-3 text-sm text-slate-500">Student case exchanges</div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.9fr_1fr]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Recent Patient Requests
              </h2>

              <Link href="/admin/requests" className="text-sm font-semibold text-blue-600 hover:underline">
                View All
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4 font-semibold">Patient</th>
                    <th className="px-6 py-4 font-semibold">Reported Issue</th>
                    <th className="px-6 py-4 font-semibold">Urgency</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-sm text-slate-500">
                        Loading recent requests...
                      </td>
                    </tr>
                  ) : recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-sm text-slate-500">
                        No recent requests found.
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map((request) => (
                      <tr key={request.id} className="transition hover:bg-slate-50">
                        <td className="px-6 py-5">
                          <div className="font-semibold text-slate-900">{request.full_name}</div>
                          <div className="mt-1 text-xs text-slate-500">{request.id}</div>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-700">
                          {request.treatment_type}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getUrgencyBadgeClass(
                              request.urgency
                            )}`}
                          >
                            {(request.urgency || 'Unknown').toUpperCase()}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link href={`/admin/requests/${request.id}`}>
                            <button className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-800">
                              Review
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Department Load
            </h2>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-5">
                {departmentLoad.map((department) => (
                  <div key={department.name}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{department.name}</span>
                      <span className="text-slate-500">{department.capacity}% Capacity</span>
                    </div>
                    <ProgressBar value={department.capacity} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="text-base font-bold text-amber-900">Action Required</h3>
                  <p className="mt-2 text-sm leading-relaxed text-amber-800">
                    {urgentCases > 0
                      ? `${urgentCases} urgent case${urgentCases > 1 ? 's have' : ' has'} been waiting for faculty review. Please review to avoid delays.`
                      : 'No urgent cases are currently waiting for review.'}
                  </p>

                  <Link href="/admin/requests">
                    <button className="mt-4 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100">
                      Review Requests
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}