'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  GraduationCap,
  CheckCircle2,
  Stethoscope,
  ArrowRight,
  BookOpen,
  ChevronRight,
  RefreshCw,
  LogOut,
  Clock,
  Phone,
} from 'lucide-react'

type PoolCase = {
  id: string
  treatment_type: string
  urgency: string
  assigned_department: string | null
  target_student_level: string | null
  created_at: string | null
}

type MyRequest = {
  id: string
  case_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

type ActiveCase = {
  caseId: string
  treatment_type: string
  assigned_department: string | null
  status: string
  full_name: string
  phone: string
}

interface Props {
  poolCases: PoolCase[]
  myRequests: MyRequest[]
  activeCases: ActiveCase[]
  studentEmail: string
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

function getActiveCaseStatusLabel(status: string) {
  switch (status) {
    case 'student_approved':   return 'Contact patient to begin'
    case 'contacted':          return 'Patient contacted — schedule appointment'
    case 'appointment_scheduled': return 'Appointment set — mark when treatment begins'
    case 'in_treatment':       return 'Treatment in progress — faculty will close case'
    case 'completed':          return 'Treatment completed'
    case 'cancelled':          return 'Case cancelled'
    default:                   return status.replace(/_/g, ' ')
  }
}

function getActiveCaseStatusBadge(status: string) {
  switch (status) {
    case 'student_approved':      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'contacted':             return 'bg-cyan-50 text-cyan-700 border border-cyan-200'
    case 'appointment_scheduled': return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    case 'in_treatment':          return 'bg-purple-50 text-purple-700 border border-purple-200'
    case 'completed':             return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'cancelled':             return 'bg-slate-100 text-slate-500 border border-slate-200'
    default:                      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

export function DashboardClient({ poolCases, myRequests, activeCases, studentEmail }: Props) {
  const router = useRouter()

  // Per-case loading and error state for lifecycle actions
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})

  // Local copy of active case statuses for optimistic updates
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>(
    () => Object.fromEntries(activeCases.map((c) => [c.caseId, c.status]))
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
  }

  async function handleLifecycleAction(
    caseId: string,
    action: 'mark_contacted' | 'mark_appointment_scheduled' | 'mark_in_treatment'
  ) {
    if (actionLoading) return
    setActionLoading(caseId)
    setActionErrors((prev) => { const next = { ...prev }; delete next[caseId]; return next })

    const res = await fetch(`/api/student/cases/${caseId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    setActionLoading(null)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }))
      setActionErrors((prev) => ({
        ...prev,
        [caseId]: (body as { error?: string }).error ?? 'Failed to update status',
      }))
      return
    }

    const { data } = (await res.json()) as { data: { status: string } }
    setLocalStatuses((prev) => ({ ...prev, [caseId]: data.status }))
  }

  const recentCases = useMemo(() => poolCases.slice(0, 4), [poolCases])

  const stats = useMemo(
    () => ({
      available: poolCases.length,
      urgent: poolCases.filter((c) => (c.urgency || '').toLowerCase() === 'high').length,
      pending: myRequests.filter((r) => r.status === 'pending').length,
      approved: activeCases.length,
    }),
    [poolCases, myRequests, activeCases]
  )

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
            <Link href="/student/dashboard" className="text-slate-900">
              Dashboard
            </Link>
            <Link href="/student/cases" className="hover:text-slate-900">
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
        {/* Welcome card */}
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium">
                  <span className="max-w-xs truncate text-slate-500">{studentEmail}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1 text-teal-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Enrolled &amp; Active
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/student/cases">
                <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">
                  Browse Available Cases
                </button>
              </Link>
              <Link href="/student/exchange">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Case Exchange
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              My Pending Requests
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-amber-600">
              {stats.pending}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Awaiting faculty review
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Active Cases
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-emerald-600">
              {stats.approved}
            </div>
            <div className="mt-3 text-sm font-medium text-emerald-600">
              {stats.approved > 0 ? 'Cases you are assigned to' : 'No active cases yet'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Pool Available
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-slate-900">
              {stats.available}
            </div>
            <div className="mt-3 text-sm font-medium text-blue-600">Ready to request</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Urgent in Pool
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-red-600">
              {stats.urgent}
            </div>
            <div className="mt-3 text-sm text-slate-500">High-priority cases</div>
          </div>
        </div>

        {/* Active Cases — shown only when the student has approved cases */}
        {activeCases.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">
              My Active Cases
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {activeCases.map((c) => {
                const liveStatus = localStatuses[c.caseId] ?? c.status
                const isLoading = actionLoading === c.caseId
                const error = actionErrors[c.caseId]
                const isClosed = liveStatus === 'completed' || liveStatus === 'cancelled'

                return (
                  <div
                    key={c.caseId}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="p-6">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">
                          {c.caseId.slice(0, 8)}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${getActiveCaseStatusBadge(liveStatus)}`}
                        >
                          {liveStatus.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>

                      <p className="text-lg font-bold text-slate-900">{c.treatment_type}</p>
                      {c.assigned_department && (
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                          <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                          {c.assigned_department}
                        </div>
                      )}

                      <p className="mt-2 text-sm text-slate-500">
                        {getActiveCaseStatusLabel(liveStatus)}
                      </p>

                      {/* Patient contact — always visible for active approved cases */}
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Patient Contact
                        </p>
                        <p className="text-sm font-bold text-slate-900">{c.full_name}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {c.phone}
                        </div>
                      </div>
                    </div>

                    {!isClosed && (
                      <div className="border-t border-slate-100 bg-slate-50/70 p-4">
                        {error && (
                          <p className="mb-2 text-center text-xs text-red-600">{error}</p>
                        )}

                        {liveStatus === 'student_approved' && (
                          <button
                            type="button"
                            onClick={() => handleLifecycleAction(c.caseId, 'mark_contacted')}
                            disabled={isLoading}
                            className="flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
                          >
                            {isLoading ? 'Updating…' : 'Mark Patient Contacted'}
                          </button>
                        )}

                        {liveStatus === 'contacted' && (
                          <button
                            type="button"
                            onClick={() => handleLifecycleAction(c.caseId, 'mark_appointment_scheduled')}
                            disabled={isLoading}
                            className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {isLoading ? 'Updating…' : 'Mark Appointment Scheduled'}
                          </button>
                        )}

                        {liveStatus === 'appointment_scheduled' && (
                          <button
                            type="button"
                            onClick={() => handleLifecycleAction(c.caseId, 'mark_in_treatment')}
                            disabled={isLoading}
                            className="flex w-full items-center justify-center rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                          >
                            {isLoading ? 'Updating…' : 'Mark In Treatment'}
                          </button>
                        )}

                        {liveStatus === 'in_treatment' && (
                          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700">
                            <Clock className="h-4 w-4" />
                            Treatment in progress — faculty will close case
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="mt-10 grid gap-8 xl:grid-cols-[1.9fr_1fr]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Recently Added to Pool
              </h2>
              <Link
                href="/student/cases"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4 font-semibold">Case Ref</th>
                    <th className="px-6 py-4 font-semibold">Treatment</th>
                    <th className="px-6 py-4 font-semibold">Department</th>
                    <th className="px-6 py-4 font-semibold">Urgency</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentCases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-sm text-slate-500">
                        No cases in the pool yet.
                      </td>
                    </tr>
                  ) : (
                    recentCases.map((c) => (
                      <tr key={c.id} className="transition hover:bg-slate-50">
                        <td className="px-6 py-5">
                          <div className="font-mono text-sm font-semibold text-slate-700">
                            {c.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-700">{c.treatment_type}</td>
                        <td className="px-6 py-5 text-sm text-slate-700">
                          {c.assigned_department || '—'}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getUrgencyBadgeClass(c.urgency)}`}
                          >
                            {(c.urgency || 'Unknown').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Link href="/student/cases">
                            <button className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-800">
                              View
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

          {/* Sidebar */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Quick Actions</h2>

            <div className="space-y-3">
              <Link
                href="/student/cases"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Browse Case Pool</p>
                    <p className="text-xs text-slate-500">Find and request available cases</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/student/exchange"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Case Exchange</p>
                    <p className="text-xs text-slate-500">Trade cases with other students</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/student/cases"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Clinical Requirements</p>
                    <p className="text-xs text-slate-500">Track your graduation case log</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
