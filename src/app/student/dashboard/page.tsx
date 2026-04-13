'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  GraduationCap,
  CheckCircle2,
  Stethoscope,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Users,
  RefreshCw,
} from 'lucide-react'

type CaseItem = {
  id: string
  full_name: string
  age: number | null
  city: string | null
  treatment_type: string
  urgency: string
  assigned_department: string | null
  target_student_level: string | null
  status: string
  created_at: string | null
}

// Mock student profile — replace with real auth when ready
const STUDENT = {
  name: 'Yusuf Aydın',
  year: 'Year 4 Clinical Student',
  university: 'Istanbul University',
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

export default function StudentDashboardPage() {
  const [poolCases, setPoolCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('patient_requests')
        .select(
          'id, full_name, age, city, treatment_type, urgency, assigned_department, target_student_level, status, created_at'
        )
        .eq('status', 'matched')
        .order('created_at', { ascending: false })

      setLoading(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setPoolCases((data as CaseItem[]) || [])
    }
    load()
  }, [])

  const recentCases = useMemo(() => poolCases.slice(0, 4), [poolCases])

  const stats = useMemo(
    () => ({
      available: poolCases.length,
      urgent: poolCases.filter((c) => (c.urgency || '').toLowerCase() === 'high').length,
      // Mock per-student stats — replace with real assignment table query
      activeCases: 2,
      completed: 7,
    }),
    [poolCases]
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
        {/* Welcome card */}
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back, {STUDENT.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium">
                  <span className="text-slate-500">
                    {STUDENT.year} · {STUDENT.university}
                  </span>
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

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Stat cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Active Cases
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-blue-900">
              {stats.activeCases}
            </div>
            <div className="mt-3 text-sm text-slate-500">Currently assigned to you</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Completed
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-emerald-600">
              {stats.completed}
            </div>
            <div className="mt-3 text-sm text-slate-500">Cases finished this semester</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Pool Available
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-slate-900">
              {loading ? '...' : stats.available}
            </div>
            <div className="mt-3 text-sm font-medium text-blue-600">Ready to claim</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Urgent in Pool
            </div>
            <div className="mt-3 text-5xl font-bold tracking-tight text-red-600">
              {loading ? '...' : stats.urgent}
            </div>
            <div className="mt-3 text-sm text-slate-500">High-priority cases</div>
          </div>
        </div>

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
                    <th className="px-6 py-4 font-semibold">Patient</th>
                    <th className="px-6 py-4 font-semibold">Treatment</th>
                    <th className="px-6 py-4 font-semibold">Department</th>
                    <th className="px-6 py-4 font-semibold">Urgency</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-sm text-slate-500">
                        Loading available cases...
                      </td>
                    </tr>
                  ) : recentCases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-sm text-slate-500">
                        No cases in the pool yet.
                      </td>
                    </tr>
                  ) : (
                    recentCases.map((c) => (
                      <tr key={c.id} className="transition hover:bg-slate-50">
                        <td className="px-6 py-5">
                          <div className="font-semibold text-slate-900">{c.full_name}</div>
                          <div className="mt-0.5 font-mono text-xs text-slate-400">
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

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-blue-900">Semester Progress</h3>
                  <p className="mt-1 text-sm text-blue-800">
                    You have completed{' '}
                    <strong>7 of 12</strong> required clinical cases this semester.
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: '58%' }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-blue-700">58% — 5 cases remaining</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
