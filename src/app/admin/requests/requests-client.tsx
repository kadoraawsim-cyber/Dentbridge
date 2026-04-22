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
  preferred_language: string | null
  treatment_type: string
  complaint_text: string
  urgency: string
  status: string
  assigned_department: string | null
  target_student_level: string | null
  created_at: string | null
}

type WorkflowTab = 'all' | 'needs_review' | 'needs_routing' | 'released' | 'active' | 'closed'
type QuickAction =
  | 'save_draft'
  | 'approve'
  | 'reject'
  | 'mark_contacted'
  | 'mark_appointment_scheduled'
  | 'mark_in_treatment'
  | 'mark_completed'
type DraftUrgency = 'high' | 'medium' | 'low'

type RequestDraft = {
  assignedDepartment: string
  urgency: DraftUrgency
  action: QuickAction
}

type FeedbackState = {
  type: 'success' | 'error'
  message: string
}

interface Props {
  initialRequests: PatientRequest[]
  adminEmail: string
}

const URGENCY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
const TRIAGE_STATUSES = ['submitted', 'under_review']
const ACTIVE_STATUSES = ['student_approved', 'contacted', 'appointment_scheduled', 'in_treatment']
const CLOSED_STATUSES = ['completed', 'rejected', 'cancelled']
const DEPARTMENT_OPTIONS = [
  'Endodontics',
  'Oral & Maxillofacial Surgery',
  'Orthodontics',
  'Periodontology',
  'Restorative Dentistry',
  'Prosthodontics',
  'Pedodontics',
  'Oral Radiology',
]

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
    case 'cancelled':
      return 'bg-slate-100 text-slate-500 border border-slate-200'
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

  return 'Oral Radiology'
}

function isTriageStatus(status: string): boolean {
  return TRIAGE_STATUSES.includes((status || '').toLowerCase())
}

function normalizeUrgency(urgency: string | null | undefined): DraftUrgency {
  switch ((urgency || '').toLowerCase()) {
    case 'high':
      return 'high'
    case 'low':
      return 'low'
    default:
      return 'medium'
  }
}

function toApiUrgency(urgency: DraftUrgency): 'High' | 'Medium' | 'Low' {
  switch (urgency) {
    case 'high':
      return 'High'
    case 'low':
      return 'Low'
    default:
      return 'Medium'
  }
}

function isNeedsRouting(request: PatientRequest): boolean {
  return (
    isTriageStatus(request.status) &&
    (!request.assigned_department || !(request.urgency || '').trim())
  )
}

function matchesWorkflowTab(request: PatientRequest, tab: WorkflowTab): boolean {
  const status = (request.status || '').toLowerCase()

  switch (tab) {
    case 'needs_review':
      return TRIAGE_STATUSES.includes(status)
    case 'needs_routing':
      return isNeedsRouting(request)
    case 'released':
      return status === 'matched'
    case 'active':
      return ACTIVE_STATUSES.includes(status)
    case 'closed':
      return CLOSED_STATUSES.includes(status)
    default:
      return true
  }
}

function getNextStatusForAction(action: QuickAction): PatientRequest['status'] {
  switch (action) {
    case 'save_draft':
      return 'under_review'
    case 'approve':
      return 'matched'
    case 'reject':
      return 'rejected'
    case 'mark_contacted':
      return 'contacted'
    case 'mark_appointment_scheduled':
      return 'appointment_scheduled'
    case 'mark_in_treatment':
      return 'in_treatment'
    case 'mark_completed':
      return 'completed'
    default:
      return 'under_review'
  }
}

export function RequestsClient({ initialRequests, adminEmail }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB'

  const [requests, setRequests] = useState(initialRequests)
  const [searchTerm, setSearchTerm] = useState('')
  const [workflowTab, setWorkflowTab] = useState<WorkflowTab>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [drafts, setDrafts] = useState<Record<string, RequestDraft>>({})
  const [feedbackById, setFeedbackById] = useState<Record<string, FeedbackState>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const requestMap = useMemo(
    () => Object.fromEntries(requests.map((request) => [request.id, request])),
    [requests]
  )

  function relativeTime(iso: string | null): string {
    if (!iso) return '\u2014'
    const ms = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 2) return t('admin.db.timeJustNow')
    if (mins < 60) return `${mins}${t('admin.db.timeMinutesSuffix')}`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}${t('admin.db.timeHoursSuffix')}`
    const days = Math.floor(hrs / 24)
    if (days === 1) return t('admin.db.timeYesterday')
    if (days < 7) return `${days}${t('admin.db.timeDaysSuffix')}`
    return new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
  }

  function tTreatment(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'initial examination / consultation':
        return t('admin.db.treatmentInitialExam')
      case 'dental cleaning':
        return t('admin.db.treatmentCleaning')
      case 'fillings':
        return t('admin.db.treatmentFillings')
      case 'tooth extraction':
        return t('admin.db.treatmentExtraction')
      case 'root canal treatment':
        return t('admin.db.treatmentRootCanal')
      case 'gum treatment':
        return t('admin.db.treatmentGum')
      case 'prosthetics / crowns':
        return t('admin.db.treatmentProsthetics')
      case 'orthodontics':
        return t('admin.db.treatmentOrthodontics')
      case 'pediatric dentistry':
        return t('admin.db.treatmentPediatric')
      case 'esthetic dentistry':
        return t('admin.db.treatmentEsthetic')
      case 'other':
        return t('admin.db.treatmentOther')
      default:
        return type
    }
  }

  function tDepartment(dept: string): string {
    switch ((dept || '').toLowerCase()) {
      case 'endodontics':
        return t('admin.db.deptEndodontics')
      case 'oral & maxillofacial surgery':
        return t('admin.db.deptSurgery')
      case 'orthodontics':
        return t('admin.db.deptOrthodontics')
      case 'periodontology':
        return t('admin.db.deptPeriodontology')
      case 'restorative dentistry':
        return t('admin.db.deptRestorative')
      case 'prosthodontics':
        return t('admin.db.deptProsthodontics')
      case 'pedodontics':
        return t('admin.db.deptPedodontics')
      case 'oral radiology':
        return t('admin.db.deptRadiology')
      case 'general review':
        return t('admin.db.deptGeneralReview')
      default:
        return dept
    }
  }

  function tLanguage(lang: string | null): string {
    switch ((lang || '').toLowerCase()) {
      case 'turkish':
        return t('admin.db.langTurkish')
      case 'english':
        return t('admin.db.langEnglish')
      case 'arabic':
        return t('admin.db.langArabic')
      default:
        return lang || ''
    }
  }

  function getStatusLabel(status: string) {
    switch ((status || '').toLowerCase()) {
      case 'submitted':
        return t('admin.requests.statusLabelSubmitted')
      case 'under_review':
        return t('admin.requests.statusLabelUnderReview')
      case 'matched':
        return t('admin.requests.statusLabelMatched')
      case 'student_approved':
        return t('admin.requests.statusLabelStudentApproved')
      case 'contacted':
        return t('admin.requests.statusLabelContacted')
      case 'appointment_scheduled':
        return t('admin.requests.statusLabelAppointmentScheduled')
      case 'in_treatment':
        return t('admin.requests.statusLabelInTreatment')
      case 'completed':
        return t('admin.requests.statusLabelCompleted')
      case 'cancelled':
        return t('admin.requests.statusLabelCancelled')
      case 'rejected':
        return t('admin.requests.statusLabelRejected')
      default:
        return status || t('admin.requests.urgencyLabelUnspecified')
    }
  }

  function getUrgencyLabel(urgency: string) {
    switch ((urgency || '').toLowerCase()) {
      case 'high':
        return t('admin.requests.urgencyLabelHigh')
      case 'medium':
        return t('admin.requests.urgencyLabelMedium')
      case 'low':
        return t('admin.requests.urgencyLabelLow')
      default:
        return t('admin.requests.urgencyLabelUnspecified')
    }
  }

  function getEffectiveDepartment(request: PatientRequest): string {
    return request.assigned_department || keywordRoutingHint(request.treatment_type, null)
  }

  function getInitialDraft(request: PatientRequest): RequestDraft {
    const actionOptions = getQuickActionOptions(request)

    return {
      assignedDepartment: getEffectiveDepartment(request),
      urgency: normalizeUrgency(request.urgency),
      action: actionOptions[0] ?? 'save_draft',
    }
  }

  function getDraft(request: PatientRequest): RequestDraft {
    return drafts[request.id] ?? getInitialDraft(request)
  }

  function getQuickActionOptions(request: PatientRequest): QuickAction[] {
    const status = (request.status || '').toLowerCase()

    switch (status) {
      case 'submitted':
      case 'under_review':
        return ['save_draft', 'approve', 'reject']
      case 'student_approved':
        return ['mark_contacted']
      case 'contacted':
        return ['mark_appointment_scheduled']
      case 'appointment_scheduled':
        return ['mark_in_treatment']
      case 'in_treatment':
        return ['mark_completed']
      default:
        return []
    }
  }

  function getQuickActionLabel(action: QuickAction): string {
    switch (action) {
      case 'save_draft':
        return t('admin.requests.statusUnderReview')
      case 'approve':
        return t('admin.requests.statusMatched')
      case 'reject':
        return t('admin.requests.statusRejected')
      case 'mark_contacted':
        return t('admin.requests.statusContacted')
      case 'mark_appointment_scheduled':
        return t('admin.requests.statusAppointmentScheduled')
      case 'mark_in_treatment':
        return t('admin.requests.statusInTreatment')
      case 'mark_completed':
        return t('admin.requests.statusCompleted')
      default:
        return action
    }
  }

  function setDraftValue(
    requestId: string,
    updater: (current: RequestDraft) => RequestDraft
  ) {
    setDrafts((current) => {
      const source = requestMap[requestId]
      if (!source) return current

      return {
        ...current,
        [requestId]: updater(current[requestId] ?? getInitialDraft(source)),
      }
    })

    setFeedbackById((current) => {
      if (!current[requestId]) return current
      const next = { ...current }
      delete next[requestId]
      return next
    })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  async function handleQuickApply(request: PatientRequest) {
    const draft = getDraft(request)
    const quickOptions = getQuickActionOptions(request)
    const action = draft.action

    if (!quickOptions.includes(action)) return

    const assignedDepartment = draft.assignedDepartment.trim()

    const requiresRoutingFields = action === 'save_draft' || action === 'approve'

    if (requiresRoutingFields && !assignedDepartment) {
      setFeedbackById((current) => ({
        ...current,
        [request.id]: { type: 'error', message: t('admin.requests.quickDepartmentRequired') },
      }))
      return
    }

    if (requiresRoutingFields && !draft.urgency) {
      setFeedbackById((current) => ({
        ...current,
        [request.id]: { type: 'error', message: t('admin.requests.quickUrgencyRequired') },
      }))
      return
    }

    setSavingId(request.id)

    const payload = requiresRoutingFields
      ? {
          action,
          assigned_department: assignedDepartment,
          urgency: toApiUrgency(draft.urgency),
          target_student_level: request.target_student_level || 'Year 4 Clinical Student',
        }
      : { action }

    const response = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSavingId(null)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '' }))
      setFeedbackById((current) => ({
        ...current,
        [request.id]: {
          type: 'error',
          message:
            (errorData as { error?: string }).error || t('admin.requests.quickApplyError'),
        },
      }))
      return
    }

    setRequests((current) =>
      current.map((entry) =>
        entry.id === request.id
          ? {
              ...entry,
              assigned_department: requiresRoutingFields ? assignedDepartment : entry.assigned_department,
              urgency: requiresRoutingFields ? toApiUrgency(draft.urgency) : entry.urgency,
              target_student_level:
                entry.target_student_level || 'Year 4 Clinical Student',
              status: getNextStatusForAction(action),
            }
          : entry
      )
    )

    setDrafts((current) => {
      const next = { ...current }
      delete next[request.id]
      return next
    })

    setFeedbackById((current) => ({
      ...current,
      [request.id]: {
        type: 'success',
        message:
          action === 'approve'
            ? t('admin.detail.savedApproved')
            : action === 'save_draft'
              ? t('admin.detail.savedDraft')
              : action === 'reject'
                ? t('admin.detail.savedRejected')
                : t('admin.detail.statusUpdated'),
      },
    }))
  }

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    let result = requests.filter((request) => {
      const effectiveDepartment = getEffectiveDepartment(request).toLowerCase()

      const matchesSearch =
        !query ||
        request.full_name?.toLowerCase().includes(query) ||
        request.id?.toLowerCase().includes(query) ||
        request.phone?.toLowerCase().includes(query) ||
        request.treatment_type?.toLowerCase().includes(query) ||
        request.complaint_text?.toLowerCase().includes(query) ||
        effectiveDepartment.includes(query)

      const matchesWorkflow = matchesWorkflowTab(request, workflowTab)
      const matchesStatus =
        statusFilter === 'all' || (request.status || '').toLowerCase() === statusFilter
      const matchesUrgency =
        urgencyFilter === 'all' || (request.urgency || '').toLowerCase() === urgencyFilter
      const matchesDepartment =
        departmentFilter === 'all' || effectiveDepartment.toLowerCase() === departmentFilter

      return matchesSearch && matchesWorkflow && matchesStatus && matchesUrgency && matchesDepartment
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
  }, [requests, searchTerm, workflowTab, statusFilter, urgencyFilter, departmentFilter, sortBy])

  const queueStats = useMemo(
    () => ({
      pending: requests.filter((request) => TRIAGE_STATUSES.includes((request.status || '').toLowerCase()))
        .length,
      urgent: requests.filter(
        (request) =>
          (request.urgency || '').toLowerCase() === 'high' &&
          TRIAGE_STATUSES.includes((request.status || '').toLowerCase())
      ).length,
    }),
    [requests]
  )

  const tabCounts = useMemo(
    () => ({
      all: requests.length,
      needs_review: requests.filter((request) => matchesWorkflowTab(request, 'needs_review')).length,
      needs_routing: requests.filter((request) => matchesWorkflowTab(request, 'needs_routing')).length,
      released: requests.filter((request) => matchesWorkflowTab(request, 'released')).length,
      active: requests.filter((request) => matchesWorkflowTab(request, 'active')).length,
      closed: requests.filter((request) => matchesWorkflowTab(request, 'closed')).length,
    }),
    [requests]
  )

  const workflowTabs: Array<{ key: WorkflowTab; label: string; count: number }> = [
    { key: 'all', label: t('admin.requests.queueTabAll'), count: tabCounts.all },
    { key: 'needs_review', label: t('admin.requests.queueTabNeedsReview'), count: tabCounts.needs_review },
    { key: 'needs_routing', label: t('admin.requests.queueTabNeedsRouting'), count: tabCounts.needs_routing },
    { key: 'released', label: t('admin.requests.queueTabReleased'), count: tabCounts.released },
    { key: 'active', label: t('admin.requests.queueTabActive'), count: tabCounts.active },
    { key: 'closed', label: t('admin.requests.queueTabClosed'), count: tabCounts.closed },
  ]

  const isFiltered =
    searchTerm.trim() !== '' ||
    workflowTab !== 'all' ||
    statusFilter !== 'all' ||
    departmentFilter !== 'all' ||
    urgencyFilter !== 'all'

  function renderQuickActions(request: PatientRequest, compact = false) {
    const draft = getDraft(request)
    const actionOptions = getQuickActionOptions(request)
    const feedback = feedbackById[request.id]

    return (
      <div className={`space-y-2 ${compact ? '' : 'min-w-[220px]'}`}>
        {actionOptions.length > 0 ? (
          <>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {t('admin.requests.quickActionLabel')}
              </label>
              <select
                value={draft.action}
                onChange={(e) =>
                  setDraftValue(request.id, (current) => ({
                    ...current,
                    action: e.target.value as QuickAction,
                  }))
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-900"
              >
                {actionOptions.map((action) => (
                  <option key={action} value={action}>
                    {getQuickActionLabel(action)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleQuickApply(request)}
              disabled={savingId === request.id}
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
            >
              {savingId === request.id ? t('admin.requests.quickApplying') : t('admin.requests.quickApply')}
            </button>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-slate-500">
            {t('admin.requests.quickOnlyForTriage')}
          </p>
        )}

        <Link
          href={`/admin/requests/${request.id}`}
          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          {t('admin.requests.openCaseFile')}
        </Link>

        {feedback && (
          <p
            className={`text-xs ${feedback.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}
          >
            {feedback.message}
          </p>
        )}
      </div>
    )
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
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
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

        <div className="mb-5 flex flex-wrap gap-2">
          {workflowTabs.map((tab) => {
            const active = workflowTab === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setWorkflowTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

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
            <option value="student_approved">{t('admin.requests.statusStudentApproved')}</option>
            <option value="contacted">{t('admin.requests.statusContacted')}</option>
            <option value="appointment_scheduled">
              {t('admin.requests.statusAppointmentScheduled')}
            </option>
            <option value="in_treatment">{t('admin.requests.statusInTreatment')}</option>
            <option value="completed">{t('admin.requests.statusCompleted')}</option>
            <option value="cancelled">{t('admin.requests.statusCancelled')}</option>
            <option value="rejected">{t('admin.requests.statusRejected')}</option>
          </select>

          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t('admin.requests.departmentFilterLabel')}
          </span>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-900"
          >
            <option value="all">{t('admin.requests.departmentAll')}</option>
            {DEPARTMENT_OPTIONS.map((department) => (
              <option key={department} value={department.toLowerCase()}>
                {tDepartment(department)}
              </option>
            ))}
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
              ? `${filteredRequests.length} ${t('admin.requests.countOf')} ${requests.length} ${t('admin.requests.countCasesSuffix')}`
              : `${requests.length} ${requests.length === 1 ? t('admin.requests.countCaseSuffix') : t('admin.requests.countCasesSuffix')}`}
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
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">{t('admin.requests.columnPatient')}</th>
                      <th className="px-4 py-3">{t('admin.requests.columnIssue')}</th>
                      <th className="px-4 py-3">{t('admin.requests.columnRouting')}</th>
                      <th className="px-4 py-3">{t('admin.requests.columnUrgency')}</th>
                      <th className="px-4 py-3">{t('admin.requests.columnStatus')}</th>
                      <th className="px-4 py-3">{t('admin.requests.columnSubmitted')}</th>
                      <th className="px-4 py-3">{t('admin.requests.columnQuickActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((request) => {
                      const draft = getDraft(request)
                      const triageRow = isTriageStatus(request.status)

                      return (
                        <tr key={request.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="min-w-[180px]">
                              <Link href={`/admin/requests/${request.id}`} className="font-semibold text-slate-900 hover:text-blue-900">
                                {request.full_name}
                              </Link>
                              <p className="mt-1 font-mono text-[11px] text-slate-400">
                                #{request.id.slice(0, 8)}
                              </p>
                              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                {request.phone}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {request.age ?? '\u2014'} yrs
                                {request.preferred_language &&
                                request.preferred_language.toLowerCase() !== 'english'
                                  ? ` \u00b7 ${tLanguage(request.preferred_language)}`
                                  : ''}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-[220px]">
                              <p className="text-sm font-semibold text-slate-900">
                                {tTreatment(request.treatment_type)}
                              </p>
                              {request.complaint_text && (
                                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">
                                  {request.complaint_text}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-[220px]">
                              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                {request.assigned_department
                                  ? t('admin.requests.assignedDept')
                                  : t('admin.requests.suggestedDept')}
                              </label>
                              <select
                                value={draft.assignedDepartment}
                                disabled={!triageRow}
                                onChange={(e) =>
                                  setDraftValue(request.id, (current) => ({
                                    ...current,
                                    assignedDepartment: e.target.value,
                                  }))
                                }
                                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                {DEPARTMENT_OPTIONS.map((department) => (
                                  <option key={department} value={department}>
                                    {tDepartment(department)}
                                  </option>
                                ))}
                              </select>
                              {!request.assigned_department && (
                                <p className="mt-1 text-[11px] text-slate-400">
                                  {t('admin.requests.verify')}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-[140px]">
                              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                {t('admin.requests.columnUrgency')}
                              </label>
                              <select
                                value={draft.urgency}
                                disabled={!triageRow}
                                onChange={(e) =>
                                  setDraftValue(request.id, (current) => ({
                                    ...current,
                                    urgency: e.target.value as DraftUrgency,
                                  }))
                                }
                                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                <option value="high">{t('admin.requests.urgencyLabelHigh')}</option>
                                <option value="medium">{t('admin.requests.urgencyLabelMedium')}</option>
                                <option value="low">{t('admin.requests.urgencyLabelLow')}</option>
                              </select>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-[160px] space-y-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(request.status)}`}
                              >
                                {getStatusLabel(request.status)}
                              </span>
                              <div>
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getUrgencyBadgeClass(request.urgency)}`}
                                >
                                  {getUrgencyLabel(request.urgency)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-[120px]">
                              <p className="text-sm font-medium text-slate-700">
                                {relativeTime(request.created_at)}
                              </p>
                              {request.created_at && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {new Date(request.created_at).toLocaleDateString(dateLocale)}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            {renderQuickActions(request)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 lg:hidden">
              {filteredRequests.map((request) => {
                const draft = getDraft(request)
                const triageRow = isTriageStatus(request.status)

                return (
                  <article
                    key={request.id}
                    className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${getUrgencyBorderClass(request.urgency)}`}
                  >
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

                      <Link href={`/admin/requests/${request.id}`} className="block">
                        <h3 className="text-lg font-bold tracking-tight text-slate-900">
                          {request.full_name}
                        </h3>
                      </Link>

                      <p className="mt-1 text-sm text-slate-500">
                        {request.age ?? '\u2014'} yrs
                        {request.preferred_language &&
                        request.preferred_language.toLowerCase() !== 'english'
                          ? ` \u00b7 ${tLanguage(request.preferred_language)}`
                          : ''}
                      </p>

                      <div className="mt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {t('admin.requests.reportedIssue')}
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {tTreatment(request.treatment_type)}
                        </p>
                        {request.complaint_text && (
                          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">
                            {request.complaint_text}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {request.assigned_department
                              ? t('admin.requests.assignedDept')
                              : t('admin.requests.suggestedDept')}
                          </label>
                          <select
                            value={draft.assignedDepartment}
                            disabled={!triageRow}
                            onChange={(e) =>
                              setDraftValue(request.id, (current) => ({
                                ...current,
                                assignedDepartment: e.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            {DEPARTMENT_OPTIONS.map((department) => (
                              <option key={department} value={department}>
                                {tDepartment(department)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {t('admin.requests.columnUrgency')}
                          </label>
                          <select
                            value={draft.urgency}
                            disabled={!triageRow}
                            onChange={(e) =>
                              setDraftValue(request.id, (current) => ({
                                ...current,
                                urgency: e.target.value as DraftUrgency,
                              }))
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            <option value="high">{t('admin.requests.urgencyLabelHigh')}</option>
                            <option value="medium">{t('admin.requests.urgencyLabelMedium')}</option>
                            <option value="low">{t('admin.requests.urgencyLabelLow')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 px-5 py-4">
                      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {request.phone}
                        </span>
                        <span>{relativeTime(request.created_at)}</span>
                      </div>
                      {renderQuickActions(request, true)}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
