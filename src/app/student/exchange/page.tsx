'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  GraduationCap,
  LogOut,
  RefreshCw,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react'

// Mock data — replace with Supabase `exchange_requests` table when ready.
// Schema hint: id, case_id (→ patient_requests), offered_by (→ students),
// reason, status (open|accepted|approved|cancelled), created_at

type MyCase = {
  id: string
  patientName: string
  treatment: string
  department: string
  urgency: string
}

type ExchangeOffer = {
  id: string
  caseId: string
  patientName: string
  treatment: string
  department: string
  urgency: string
  offeredBy: string
  offeredByYear: string
  reason: string
  postedAt: string
}

const MOCK_MY_CASES: MyCase[] = [
  {
    id: 'mc-001',
    patientName: 'Fatma Demir',
    treatment: 'Root Canal Treatment',
    department: 'Endodontics',
    urgency: 'medium',
  },
  {
    id: 'mc-002',
    patientName: 'Mehmet Şahin',
    treatment: 'Gum Treatment',
    department: 'Periodontology',
    urgency: 'low',
  },
]

const MOCK_EXCHANGE_BOARD: ExchangeOffer[] = [
  {
    id: 'ex-001',
    caseId: 'a3b2c1d4',
    patientName: 'Ayşe Kaya',
    treatment: 'Tooth Extraction',
    department: 'Oral & Maxillofacial Surgery',
    urgency: 'high',
    offeredBy: 'Selin Yıldız',
    offeredByYear: 'Year 5',
    reason: 'Scheduling conflict with clinical rotation',
    postedAt: '2 hours ago',
  },
  {
    id: 'ex-002',
    caseId: 'b7e5f2a9',
    patientName: 'Hüseyin Arslan',
    treatment: 'Orthodontic Consultation',
    department: 'Orthodontics',
    urgency: 'low',
    offeredBy: 'Burak Çelik',
    offeredByYear: 'Year 4',
    reason: 'Need a periodontology case for graduation requirement',
    postedAt: '5 hours ago',
  },
  {
    id: 'ex-003',
    caseId: 'c1d8e3b6',
    patientName: 'Zeynep Öztürk',
    treatment: 'Dental Cleaning',
    department: 'Restorative Dentistry',
    urgency: 'low',
    offeredBy: 'Elif Güneş',
    offeredByYear: 'Year 4',
    reason: 'Supervisor recommended a more complex case for my skill level',
    postedAt: '1 day ago',
  },
  {
    id: 'ex-004',
    caseId: 'd4f1g2h5',
    patientName: 'Ali Yılmaz',
    treatment: 'Prosthodontics / Crown',
    department: 'Prosthodontics',
    urgency: 'medium',
    offeredBy: 'Emre Koç',
    offeredByYear: 'Year 5',
    reason: 'Conflict with external elective schedule',
    postedAt: '1 day ago',
  },
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

export default function StudentExchangePage() {
  const router = useRouter()
  const [acceptedId, setAcceptedId] = useState<string | null>(null)
  const [offeredId, setOfferedId] = useState<string | null>(null)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function handleAccept(id: string) {
    setAcceptedId(id)
    setTimeout(() => setAcceptedId(null), 3000)
  }

  function handleOffer(id: string) {
    setOfferedId(id)
    setTimeout(() => setOfferedId(null), 3000)
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
            <Link href="/student/cases" className="hover:text-slate-900">
              Available Cases
            </Link>
            <Link href="/student/exchange" className="text-slate-900">
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
        <div className="mb-8">
          <Link
            href="/student/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">Case Exchange</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                Offer your active cases for exchange or accept cases from other students. All
                exchanges require faculty approval before taking effect.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <Clock className="h-4 w-4 shrink-0 text-amber-600" />
              Exchanges pending faculty approval
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">
            Preview — this page shows example data only.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Case exchange is not yet connected to the database. No actions on this page will write any data. The full workflow will be enabled once the exchange table and faculty approval step are built.
          </p>
        </div>

        <div className="grid gap-10 xl:grid-cols-[1fr_1.6fr]">
          {/* My active cases — eligible for exchange */}
          <div>
            <h2 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">
              My Active Cases
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              Example cases shown below.{' '}
              <span className="italic text-slate-400">Real data requires assignment tracking.</span>
            </p>

            <div className="space-y-4">
              {MOCK_MY_CASES.map((mc) => (
                <div
                  key={mc.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getUrgencyBadgeClass(mc.urgency)}`}
                      >
                        {(mc.urgency || '').toUpperCase()}
                      </span>
                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{mc.patientName}</h3>
                    <p className="mt-1 text-sm text-slate-600">{mc.treatment}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                      {mc.department}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                    {offeredId === mc.id ? (
                      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Exchange request posted
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOffer(mc.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Offer for Exchange
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm leading-relaxed text-slate-600">
                <strong className="text-slate-800">How exchanges work:</strong> Post a case to the
                board, another student accepts it, and a faculty member confirms the swap before it
                takes effect.
              </p>
            </div>
          </div>

          {/* Exchange board */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Exchange Board</h2>
              <span className="rounded-full bg-blue-900 px-3 py-1 text-xs font-bold text-white">
                {MOCK_EXCHANGE_BOARD.length} open
              </span>
            </div>
            <p className="mb-5 text-sm text-slate-500">
              Cases offered by other students. Accept one to initiate the swap request.
            </p>

            <div className="space-y-4">
              {MOCK_EXCHANGE_BOARD.map((ex) => (
                <div
                  key={ex.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">
                        {ex.caseId}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getUrgencyBadgeClass(ex.urgency)}`}
                      >
                        {(ex.urgency || '').toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{ex.treatment}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">Patient: {ex.patientName}</p>

                    <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                      {ex.department}
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Offered by
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {ex.offeredBy}{' '}
                        <span className="font-normal text-slate-500">· {ex.offeredByYear}</span>
                      </p>
                      <p className="mt-1 text-xs italic text-slate-500">"{ex.reason}"</p>
                    </div>

                    <p className="mt-3 text-xs text-slate-400">Posted {ex.postedAt}</p>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                    {acceptedId === ex.id ? (
                      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Accepted — awaiting faculty approval
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAccept(ex.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                      >
                        Accept Exchange
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
