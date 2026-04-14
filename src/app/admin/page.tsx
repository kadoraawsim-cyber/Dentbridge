'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  LogOut,
  Clock,
  Inbox,
  Activity,
} from 'lucide-react'

type PatientRequest = {
  id: string
  full_name: string
  treatment_type: string
  urgency: string
  status: string
  assigned_department: string | null
  created_at: string | null
}

type DepartmentCaseItem = {
  name: string
  count: number
  barWidth: number
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

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function RelativeBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-teal-500 transition-all duration-500"
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState<PatientRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [adminEmail, setAdminEmail] = useState<string>('')

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setAdminEmail(user.email)
    })
  }, [])

  useEffect(() => {
    async function loadRequests() {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('patient_requests')
        .select('id, full_name, treatment_type, urgency, status, assigned_department, created_at')
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

    const newToday = requests.filter((r) => {
      if (!r.created_at) return false
      return new Date(r.created_at) >= todayStart
    }).length

    const pendingReview = requests.filter((r) =>
      ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
    ).length

    const activeTreatments = requests.filter((r) =>
      (r.status || '').toLowerCase() === 'matched'
    ).length

    const total = requests.length

    return { newToday, pendingReview, activeTreatments, total }
  }, [requests])

  // 5 most recent requests for the activity feed
  const recentRequests = useMemo(() => requests.slice(0, 5), [requests])

  // Up to 3 high-urgency cases still awaiting faculty review
  const urgentUnreviewedList = useMemo(
    () =>
      requests
        .filter(
          (r) =>
            (r.urgency || '').toLowerCase() === 'high' &&
            ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
        )
        .slice(0, 3),
    [requests]
  )

  // Real case counts per department — excludes rejected and completed.
  const departmentCases = useMemo<DepartmentCaseItem[]>(() => {
    const departmentNames = [
      'Endodontics',
      'Oral & Maxillofacial Surgery',
      'Orthodontics',
      'Periodontology',
      'Restorative Dentistry',
      'Prosthodontics',
      'Pedodontics',
      'Oral Radiology',
    ]

    const counts = departmentNames.map((name) => ({
      name,
      count: requests.filter(
        (r) =>
          (r.assigned_department || '').toLowerCase() === name.toLowerCase() &&
          !['rejected', 'completed'].includes((r.status || '').toLowerCase())
      ).length,
    }))

    const withCases = counts.filter((d) => d.count > 0)
    if (withCases.length === 0) return []

    const maxCount = Math.max(...withCases.map((d) => d.count))
    return withCases.map((d) => ({
      ...d,
      barWidth: Math.round((d.count / maxCount) * 100),
    }))
  }, [requests])

  const urgentCasesCount = useMemo(
    () =>
      requests.filter(
        (r) =>
          (r.urgency || '').toLowerCase() === 'high' &&
          ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
      ).length,
    [requests]
  )

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
            {adminEmail && (
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                <span className="max-w-[200px] truncate">{adminEmail}</span>
              </div>
            )}
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

        {/* ── Page title + CTA ───────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Faculty Dashboard
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-teal-500" />
              Systems online
              {!loading && dashboardStats.pendingReview > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="font-semibold text-amber-600">
                    {dashboardStats.pendingReview} case
                    {dashboardStats.pendingReview !== 1 ? 's' : ''} awaiting review
                  </span>
                </>
              )}
            </p>
          </div>
          <Link
            href="/admin/requests"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:self-auto"
          >
            Open Work Queue
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Inbox className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                New Today
              </span>
            </div>
            <div className="text-5xl font-bold tracking-tight text-blue-900">
              {loading ? '…' : dashboardStats.newToday}
            </div>
            <div className="mt-2 text-sm text-slate-500">Submitted today</div>
          </div>

          <div
            className={`rounded-2xl border bg-white p-6 shadow-sm transition ${
              !loading && dashboardStats.pendingReview > 0
                ? 'border-amber-200'
                : 'border-slate-200'
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending Review
              </span>
            </div>
            <div
              className={`text-5xl font-bold tracking-tight ${
                !loading && dashboardStats.pendingReview > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {loading ? '…' : dashboardStats.pendingReview}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-slate-500">Needs faculty assessment</span>
              {!loading && dashboardStats.pendingReview > 0 && (
                <Link
                  href="/admin/requests"
                  className="text-xs font-semibold text-amber-600 hover:underline"
                >
                  Review →
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Matched Cases
              </span>
            </div>
            <div className="text-5xl font-bold tracking-tight text-violet-700">
              {loading ? '…' : dashboardStats.activeTreatments}
            </div>
            <div className="mt-2 text-sm text-slate-500">Released to student pool</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Requests
              </span>
            </div>
            <div className="text-5xl font-bold tracking-tight text-teal-600">
              {loading ? '…' : dashboardStats.total}
            </div>
            <div className="mt-2 text-sm text-slate-500">All time</div>
          </div>
        </div>

        {/* ── Priority queue: urgent unreviewed cases ─────────────────────── */}
        {!loading && urgentUnreviewedList.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  High-Urgency Cases Awaiting Review
                </h2>
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                  {urgentUnreviewedList.length}
                </span>
              </div>
              <Link
                href="/admin/requests"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
              {urgentUnreviewedList.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-4 px-6 py-4 ${
                    i < urgentUnreviewedList.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{r.full_name}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{r.treatment_type}</p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs text-slate-400">{relativeTime(r.created_at)}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                  >
                    Review Now
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.9fr_1fr]">
          {/* ── Recent requests table ────────────────────────────────────── */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Recent Requests
              </h2>
              <Link
                href="/admin/requests"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="px-5 py-3 font-semibold">Issue</th>
                    <th className="px-5 py-3 font-semibold">Urgency</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Submitted</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-sm text-slate-500">
                        Loading requests…
                      </td>
                    </tr>
                  ) : recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-sm text-slate-500">
                        No requests found.
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map((r) => (
                      <tr key={r.id} className="group transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <Link href={`/admin/requests/${r.id}`} className="block">
                            <div className="font-semibold text-slate-900 group-hover:text-blue-900">
                              {r.full_name}
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                              {r.id.slice(0, 8)}
                            </div>
                          </Link>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">{r.treatment_type}</td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getUrgencyBadgeClass(
                              r.urgency
                            )}`}
                          >
                            {(r.urgency || 'Unknown').toUpperCase()}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                              r.status
                            )}`}
                          >
                            {r.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/requests/${r.id}`}
                            className="flex items-center justify-end gap-1 text-xs text-slate-400 hover:text-blue-700"
                          >
                            {relativeTime(r.created_at)}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-xl font-bold tracking-tight text-slate-900">
                Cases by Department
              </h2>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading…</p>
                ) : departmentCases.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No cases are currently assigned to departments.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {departmentCases.map((dept) => (
                      <div key={dept.name}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{dept.name}</span>
                          <span className="font-bold text-slate-700">{dept.count}</span>
                        </div>
                        <RelativeBar value={dept.barWidth} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`rounded-2xl border p-6 shadow-sm ${
                urgentCasesCount > 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    urgentCasesCount > 0 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <h3
                    className={`text-base font-bold ${
                      urgentCasesCount > 0 ? 'text-amber-900' : 'text-slate-700'
                    }`}
                  >
                    {loading ? 'Checking queue…' : urgentCasesCount > 0 ? 'Action Required' : 'Queue Clear'}
                  </h3>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      urgentCasesCount > 0 ? 'text-amber-800' : 'text-slate-500'
                    }`}
                  >
                    {loading
                      ? ''
                      : urgentCasesCount > 0
                      ? `${urgentCasesCount} urgent case${urgentCasesCount > 1 ? 's are' : ' is'} waiting for faculty review. Please review to avoid delays.`
                      : 'No urgent cases are currently awaiting review.'}
                  </p>

                  {urgentCasesCount > 0 && (
                    <Link href="/admin/requests">
                      <button className="mt-4 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100">
                        Review Now
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
