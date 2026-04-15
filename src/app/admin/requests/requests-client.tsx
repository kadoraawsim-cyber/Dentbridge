'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AlertCircle, ArrowLeft, LogOut, Phone, Search, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type PatientRequest = {
  id: string
  full_name: string
  age: number | null
  phone: string
  city: string | null
  preferred_language: string | null
  treatment_type: string
  complaint_text: string
  urgency: string
  status: string
  assigned_department: string | null
  created_at: string | null
}

interface Props {
  initialRequests: PatientRequest[]
  adminEmail: string
}

function relativeTime(iso: string | null): string {
  if (!iso) return '\u2014'
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

function getUrgencyBorderClass(urgency: string): string {
  switch ((urgency || '').toLowerCase()) {
    case 'high':
      return 'border-l-4 border-l-red-500'
    case 'medium':
      return 'border-l-4 border-l-amber-400'
    case 'low':
      return 'border-l-4 border-l-slate-300'
    default:
      return 'border-l-4 border-l-slate-200'
  }
}

function getUrgencyBadgeClass(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-700 border border-red-200'
    case 'medium':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'low':
      return 'bg-slate-100 text-slate-600 border border-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
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

function keywordRoutingHint(treatmentType: string, assignedDepartment: string | null): string {
  if (assignedDepartment) return assignedDepartment

  const value = (treatmentType || '').toLowerCase()

  if (value.includes('root canal')) return 'Endodontics'
  if (value.includes('extraction')) return 'Oral & Maxillofacial Surgery'
  if (value.includes('gum')) return 'Periodontology'
  if (value.includes('orthodont')) return 'Orthodontics'
  if (value.includes('prosthetic') || value.includes('crown') || value.includes('denture'))
    return 'Prosthodontics'
  if (value.includes('pediatric')) return 'Pedodontics'
  if (value.includes('esthetic') || value.includes('filling') || value.includes('cleaning'))
    return 'Restorative Dentistry'

  return 'General Review'
}

const URGENCY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function RequestsClient({ initialRequests, adminEmail }: Props) {
  const { t } = useI18n()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  function getStatusLabel(status: string) {
    switch ((status || '').toLowerCase()) {
      case 'submitted':   return t('admin.requests.statusLabelSubmitted')
      case 'under_review': return t('admin.requests.statusLabelUnderReview')
      case 'matched':     return t('admin.requests.statusLabelMatched')
      case 'contacted':   return t('admin.requests.statusLabelContacted')
      case 'completed':   return t('admin.requests.statusLabelCompleted')
      case 'rejected':    return t('admin.requests.statusLabelRejected')
      default:            return status || t('admin.requests.urgencyLabelUnspecified')
    }
  }

  function getUrgencyLabel(urgency: string) {
    switch ((urgency || '').toLowerCase()) {
      case 'high':    return t('admin.requests.urgencyLabelHigh')
      case 'medium':  return t('admin.requests.urgencyLabelMedium')
      case 'low':     return t('admin.requests.urgencyLabelLow')
      default:        return t('admin.requests.urgencyLabelUnspecified')
    }
  }

  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    let result = initialRequests.filter((r) => {
      const matchesSearch =
        !q ||
        r.full_name?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.treatment_type?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        r.complaint_text?.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'all' || (r.status || '').toLowerCase() === statusFilter

      const matchesUrgency =
        urgencyFilter === 'all' || (r.urgency || '').toLowerCase() === urgencyFilter

      return matchesSearch && matchesStatus && matchesUrgency
    })

    if (sortBy === 'oldest') {
      result = [...result].sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      )
    } else if (sortBy === 'urgency') {
      result = [...result].sort(
        (a, b) =>
          (URGENCY_ORDER[(a.urgency || '').toLowerCase()] ?? 3) -
          (URGENCY_ORDER[(b.urgency || '').toLowerCase()] ?? 3)
      )
    }

    return result
  }, [initialRequests, searchTerm, statusFilter, urgencyFilter, sortBy])

  const queueStats = useMemo(
    () => ({
      pending: initialRequests.filter((r) =>
        ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
      ).length,
      urgent: initialRequests.filter(
        (r) =>
          (r.urgency || '').toLowerCase() === 'high' &&
          ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
      ).length,
    }),
    [initialRequests]
  )

  const isFiltered =
    searchTerm.trim() !== '' || statusFilter !== 'all' || urgencyFilter !== 'all'

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
                {t('admin.shared.clinicalPlatform')}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/admin" className="hover:text-slate-900">
              {t('admin.shared.navDashboard')}
            </Link>
            <Link href="/admin/requests" className="text-slate-900">
              {t('admin.shared.navTriageReview')}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {adminEmail && (
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                <span className="max-w-[200px] truncate">{adminEmail}</span>
              </div>
            )}
            <LanguageSwitcher />
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('admin.shared.signOut')}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.requests.backToDashboard')}
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {t('admin.requests.pageTitle')}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {t('admin.requests.pageDesc')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {queueStats.pending} {t('admin.requests.pendingReviewSuffix')}
                </span>
                {queueStats.urgent > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    <AlertCircle className="h-3 w-3" />
                    {queueStats.urgent} {t('admin.requests.urgentSuffix')}
                  </span>
                )}
              </div>
            </div>

            <div className="relative w-full max-w-sm sm:w-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('admin.requests.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        {/* ── Filter / sort toolbar ───────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t('admin.requests.filterLabel')}
          </span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-900"
          >
            <option value="all">{t('admin.requests.statusAll')}</option>
            <option value="submitted">{t('admin.requests.statusSubmitted')}</option>
            <option value="under_review">{t('admin.requests.statusUnderReview')}</option>
            <option value="matched">{t('admin.requests.statusMatched')}</option>
            <option value="completed">{t('admin.requests.statusCompleted')}</option>
            <option value="rejected">{t('admin.requests.statusRejected')}</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-900"
          >
            <option value="all">{t('admin.requests.urgencyAll')}</option>
            <option value="high">{t('admin.requests.urgencyHighLabel')}</option>
            <option value="medium">{t('admin.requests.urgencyMediumLabel')}</option>
            <option value="low">{t('admin.requests.urgencyLowLabel')}</option>
          </select>

          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t('admin.requests.sortLabel')}
          </span>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-900"
          >
            <option value="newest">{t('admin.requests.sortNewest')}</option>
            <option value="oldest">{t('admin.requests.sortOldest')}</option>
            <option value="urgency">{t('admin.requests.sortByUrgency')}</option>
          </select>

          <span className="ml-auto text-xs text-slate-500">
            {isFiltered
              ? `${filteredRequests.length} ${t('admin.requests.countOf')} ${initialRequests.length} ${t('admin.requests.countCasesSuffix')}`
              : `${initialRequests.length} ${initialRequests.length === 1 ? t('admin.requests.countCaseSuffix') : t('admin.requests.countCasesSuffix')}`}
          </span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <div className="flex items-start gap-3">
              <Search className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-700">{t('admin.requests.noResultsTitle')}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {isFiltered
                    ? t('admin.requests.noResultsFilteredDesc')
                    : t('admin.requests.noResultsEmptyDesc')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filteredRequests.map((request) => {
              const hint = keywordRoutingHint(request.treatment_type, request.assigned_department)
              const isAssigned = !!request.assigned_department
              const isHighUrgency = (request.urgency || '').toLowerCase() === 'high'

              return (
                <article
                  key={request.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md ${getUrgencyBorderClass(request.urgency)}`}
                >
                  {/* ── Card header ──────────────────────────────────────── */}
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500">
                        #{request.id.slice(0, 8)}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(request.status)}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getUrgencyBadgeClass(request.urgency)}`}
                        >
                          {getUrgencyLabel(request.urgency)}
                        </span>
                      </div>
                    </div>

                    <Link href={`/admin/requests/${request.id}`} className="group block">
                      <h3 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-900">
                        {request.full_name}
                      </h3>
                    </Link>

                    <p className="mt-1 text-sm text-slate-500">
                      {request.age ?? '\u2014'} yrs
                      {request.city ? ` \u00b7 ${request.city}` : ''}
                      {request.preferred_language &&
                      request.preferred_language.toLowerCase() !== 'english'
                        ? ` \u00b7 ${request.preferred_language}`
                        : ''}
                    </p>

                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t('admin.requests.reportedIssue')}
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {request.treatment_type}
                      </p>
                    </div>

                    {request.complaint_text && (
                      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
                        {request.complaint_text}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {isAssigned ? t('admin.requests.assignedDept') : t('admin.requests.suggestedDept')}
                      </span>
                      <span
                        className={`text-sm font-semibold ${isAssigned ? 'text-blue-900' : 'text-slate-600'}`}
                      >
                        {hint}
                      </span>
                      {!isAssigned && (
                        <span className="text-[10px] text-slate-400">{t('admin.requests.verify')}</span>
                      )}
                    </div>
                  </div>

                  {/* ── Card footer ──────────────────────────────────────── */}
                  <div className="mt-auto border-t border-slate-100 px-5 py-4">
                    <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {request.phone}
                      </span>
                      <span>{relativeTime(request.created_at)}</span>
                    </div>
                    <Link
                      href={`/admin/requests/${request.id}`}
                      className={`flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                        isHighUrgency
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-blue-900 hover:bg-blue-800'
                      }`}
                    >
                      {t('admin.requests.openCaseFile')}
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
