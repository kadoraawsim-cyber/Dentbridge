'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Calendar, CheckCircle2, Clock, LogOut, Phone, ShieldCheck, XCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type StudentCaseRequest = {
  id: string
  student_email: string
  status: string
  clinical_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

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
  preferred_days: string | null
  consent: boolean
  status: string
  attachment_path: string | null
  attachment_name: string | null
  assigned_department: string | null
  target_student_level: string | null
  clinical_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string | null
}

interface Props {
  initialRequest: PatientRequest
  adminEmail: string
  initialStudentRequests: StudentCaseRequest[]
}

// Used to determine which lifecycle steps have been reached when rendering
// the status trail in the Lifecycle section.
const STATUS_ORDER = [
  'submitted',
  'under_review',
  'matched',
  'student_approved',
  'contacted',
  'appointment_scheduled',
  'in_treatment',
  'completed',
]

const departmentOptions = [
  'Endodontics',
  'Oral & Maxillofacial Surgery',
  'Orthodontics',
  'Periodontology',
  'Restorative Dentistry',
  'Prosthodontics',
  'Pedodontics',
  'Oral Radiology',
]

const studentLevelOptions = [
  'Year 4 Clinical Student',
  'Year 5 Clinical Student',
  'Specialist Dentist',
]

function keywordRoutingHint(treatmentType: string, assignedDepartment: string | null) {
  if (assignedDepartment) return assignedDepartment

  const value = (treatmentType || '').toLowerCase()

  if (value.includes('root canal')) return 'Endodontics'
  if (value.includes('extraction')) return 'Oral & Maxillofacial Surgery'
  if (value.includes('gum')) return 'Periodontology'
  if (value.includes('orthodont')) return 'Orthodontics'
  if (value.includes('prosthetic') || value.includes('crown')) return 'Prosthodontics'
  if (value.includes('pediatric')) return 'Pedodontics'
  if (value.includes('esthetic') || value.includes('filling') || value.includes('cleaning'))
    return 'Restorative Dentistry'

  return 'Oral Radiology'
}

function mapUrgencyToDetail(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':
      return 'High (Emergency / Severe Pain)'
    case 'medium':
      return 'Medium (Discomfort)'
    case 'low':
      return 'Low (Routine)'
    default:
      return 'Medium (Discomfort)'
  }
}

function mapDetailToUrgency(detail: string) {
  const d = (detail || '').toLowerCase()
  if (d.startsWith('high')) return 'High'
  if (d.startsWith('low')) return 'Low'
  return 'Medium'
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

export function CaseDetailClient({ initialRequest, adminEmail, initialStudentRequests }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB'

  function formatReviewDate(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(dateLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function waitingDays(iso: string | null): string {
    if (!iso) return '—'
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return t('admin.detail.submittedToday')
    if (days === 1) return t('admin.detail.waitingOneDay')
    return `${t('admin.detail.waitingDaysPrefix')} ${days} ${t('admin.detail.waitingDaysSuffix')}`
  }

  function tUrgency(v: string): string {
    switch ((v || '').toLowerCase()) {
      case 'high': return t('request.urgencyHigh')
      case 'medium': return t('request.urgencyMedium')
      case 'low': return t('request.urgencyLow')
      default: return v
    }
  }

  function tStatus(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'submitted':             return t('admin.db.statusSubmitted')
      case 'under_review':          return t('admin.db.statusUnderReview')
      case 'matched':               return t('admin.db.statusMatched')
      case 'student_approved':      return t('admin.db.statusStudentApproved')
      case 'contacted':             return t('admin.db.statusContacted')
      case 'appointment_scheduled': return t('admin.db.statusApptScheduled')
      case 'in_treatment':          return t('admin.db.statusInTreatment')
      case 'completed':             return t('admin.db.statusCompleted')
      case 'rejected':              return t('admin.db.statusRejected')
      case 'cancelled':             return t('admin.db.statusCancelled')
      default:                      return status
    }
  }

  function tDepartment(dept: string): string {
    switch ((dept || '').toLowerCase()) {
      case 'endodontics':                  return t('admin.db.deptEndodontics')
      case 'oral & maxillofacial surgery': return t('admin.db.deptSurgery')
      case 'orthodontics':                 return t('admin.db.deptOrthodontics')
      case 'periodontology':               return t('admin.db.deptPeriodontology')
      case 'restorative dentistry':        return t('admin.db.deptRestorative')
      case 'prosthodontics':               return t('admin.db.deptProsthodontics')
      case 'pedodontics':                  return t('admin.db.deptPedodontics')
      case 'oral radiology':               return t('admin.db.deptRadiology')
      case 'general review':               return t('admin.db.deptGeneralReview')
      default:                             return dept
    }
  }

  function tStudentLevel(level: string): string {
    switch ((level || '').toLowerCase()) {
      case 'year 4 clinical student': return t('admin.db.levelYear4')
      case 'year 5 clinical student': return t('admin.db.levelYear5')
      case 'specialist dentist':      return t('admin.db.levelSpecialist')
      default:                        return level
    }
  }

  function tLanguage(lang: string | null): string {
    switch ((lang || '').toLowerCase()) {
      case 'turkish': return t('admin.db.langTurkish')
      case 'english': return t('admin.db.langEnglish')
      case 'arabic':  return t('admin.db.langArabic')
      default:        return lang || '—'
    }
  }

  function tDays(days: string | null): string {
    switch ((days || '').toLowerCase()) {
      case 'no preference':        return t('admin.db.daysNoPreference')
      case 'weekday mornings':     return t('admin.db.daysWeekdayMornings')
      case 'weekday afternoons':   return t('admin.db.daysWeekdayAfternoons')
      case 'as soon as possible':  return t('admin.db.daysAsSoonAsPossible')
      default:                     return days || '—'
    }
  }

  function tStudentReqStatus(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'pending':  return t('admin.db.studentReqPending')
      case 'approved': return t('admin.db.studentReqApproved')
      case 'rejected': return t('admin.db.studentReqRejected')
      default:         return status
    }
  }

  const [request, setRequest] = useState<PatientRequest>(initialRequest)
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [openingFile, setOpeningFile] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(!!request.attachment_path)

  // 'reject' or 'approve' means a confirmation is pending; null means normal button state
  const [pendingAction, setPendingAction] = useState<'reject' | 'approve' | null>(null)

  // Lifecycle action currently in flight (post-pool stage transitions)
  const [lifecycleLoading, setLifecycleLoading] = useState(false)

  // Student request management
  const [studentRequests, setStudentRequests] =
    useState<StudentCaseRequest[]>(initialStudentRequests)
  // Which request_id is currently being approved/rejected (disables that row's buttons)
  const [requestActionId, setRequestActionId] = useState<string | null>(null)

  const [assignedDepartment, setAssignedDepartment] = useState(
    keywordRoutingHint(initialRequest.treatment_type, initialRequest.assigned_department)
  )
  const [urgencyLevel, setUrgencyLevel] = useState(mapUrgencyToDetail(initialRequest.urgency))
  const [targetStudentLevel, setTargetStudentLevel] = useState(
    initialRequest.target_student_level || 'Year 4 Clinical Student'
  )
  const [clinicalNotes, setClinicalNotes] = useState(initialRequest.clinical_notes || '')

  useEffect(() => {
    if (!request.attachment_path) return
    let cancelled = false
    setPreviewLoading(true)
    supabase.storage
      .from('patient-uploads')
      .createSignedUrl(request.attachment_path, 3600)
      .then(({ data }) => {
        if (!cancelled) {
          setPreviewUrl(data?.signedUrl ?? null)
          setPreviewLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [request.attachment_path])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  const attachmentLabel = useMemo(() => {
    if (!request.attachment_name) return t('admin.detail.uploadedFileFallback')
    return request.attachment_name
  }, [request, t])

  const currentStatus = (request.status || '').toLowerCase()

  // Triage phase: faculty can edit department/urgency/notes and approve/reject
  const isTriagePhase = ['submitted', 'under_review'].includes(currentStatus)

  // Lifecycle phase: case is active post-pool; faculty advances through stages
  const isLifecyclePhase = [
    'matched', 'student_approved', 'contacted',
    'appointment_scheduled', 'in_treatment',
  ].includes(currentStatus)

  // Closed: no further actions possible
  const isClosed = ['rejected', 'completed', 'cancelled'].includes(currentStatus)

  // Keep the old isTerminal alias so the triage form disable logic still works
  const isTerminal = !isTriagePhase

  async function handleViewAttachment() {
    if (!request.attachment_path) return

    setOpeningFile(true)
    setErrorMessage('')

    const { data, error } = await supabase.storage
      .from('patient-uploads')
      .createSignedUrl(request.attachment_path, 60)

    setOpeningFile(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  function showSaved(message: string) {
    setSaveSuccess(message)
    setTimeout(() => setSaveSuccess(''), 3000)
  }

  async function handleStudentRequestAction(
    requestId: string,
    action: 'approve_student_request' | 'reject_student_request'
  ) {
    setRequestActionId(requestId)
    setErrorMessage('')

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, request_id: requestId }),
    })

    setRequestActionId(null)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setErrorMessage((err as { error?: string }).error ?? 'Failed to update student request.')
      return
    }

    const { data: resultData } = (await res.json()) as { data: { status: string } }

    setStudentRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: resultData.status,
              reviewed_by: adminEmail,
              reviewed_at: new Date().toISOString(),
            }
          : // auto-reject other pending rows when one is approved
            action === 'approve_student_request' && r.status === 'pending'
            ? { ...r, status: 'rejected', reviewed_by: adminEmail, reviewed_at: new Date().toISOString() }
            : r
      )
    )

    // Approving a student advances the case to student_approved
    if (action === 'approve_student_request') {
      setRequest((prev) => ({
        ...prev,
        status: 'student_approved',
        reviewed_by: adminEmail,
        reviewed_at: new Date().toISOString(),
      }))
    }
  }

  async function handleLifecycleAction(
    action:
      | 'mark_contacted'
      | 'mark_appointment_scheduled'
      | 'mark_in_treatment'
      | 'mark_completed'
      | 'mark_cancelled'
  ) {
    setLifecycleLoading(true)
    setErrorMessage('')

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    setLifecycleLoading(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setErrorMessage((err as { error?: string }).error ?? 'Failed to update case status.')
      return
    }

    const { data } = (await res.json()) as {
      data: { status: string; reviewed_by: string | null; reviewed_at: string }
    }
    setRequest((prev) => ({
      ...prev,
      status: data.status,
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
    }))
    showSaved(t('admin.detail.statusUpdated'))
  }

  async function handleSaveDraft() {
    setSaving(true)
    setErrorMessage('')

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_draft',
        assigned_department: assignedDepartment,
        urgency: mapDetailToUrgency(urgencyLevel),
        target_student_level: targetStudentLevel,
        clinical_notes: clinicalNotes,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setErrorMessage((err as { error?: string }).error ?? 'Failed to save draft.')
      return
    }

    const { data } = (await res.json()) as {
      data: { reviewed_by: string | null; reviewed_at: string }
    }
    setRequest({
      ...request,
      assigned_department: assignedDepartment,
      urgency: mapDetailToUrgency(urgencyLevel),
      target_student_level: targetStudentLevel,
      clinical_notes: clinicalNotes,
      status: 'under_review',
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
    })
    showSaved(t('admin.detail.savedDraft'))
  }

  async function confirmApprove() {
    setSaving(true)
    setErrorMessage('')
    setPendingAction(null)

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve',
        assigned_department: assignedDepartment,
        urgency: mapDetailToUrgency(urgencyLevel),
        target_student_level: targetStudentLevel,
        clinical_notes: clinicalNotes,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setErrorMessage((err as { error?: string }).error ?? 'Failed to approve.')
      return
    }

    const { data } = (await res.json()) as {
      data: { reviewed_by: string | null; reviewed_at: string }
    }
    setRequest({
      ...request,
      assigned_department: assignedDepartment,
      urgency: mapDetailToUrgency(urgencyLevel),
      target_student_level: targetStudentLevel,
      clinical_notes: clinicalNotes,
      status: 'matched',
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
    })
    showSaved(t('admin.detail.savedApproved'))
  }

  async function confirmReject() {
    setSaving(true)
    setErrorMessage('')
    setPendingAction(null)

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })

    setSaving(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setErrorMessage((err as { error?: string }).error ?? 'Failed to reject.')
      return
    }

    const { data } = (await res.json()) as {
      data: { reviewed_by: string | null; reviewed_at: string }
    }
    setRequest({
      ...request,
      status: 'rejected',
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
    })
    showSaved(t('admin.detail.savedRejected'))
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
            <LanguageSwitcher />
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
              {t('admin.shared.signOut')}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/admin/requests"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.detail.backToReviewList')}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              {t('admin.detail.caseReviewPrefix')} {request.full_name}
            </h1>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                request.status
              )}`}
            >
              {tStatus(request.status)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <p className="inline-block rounded-md bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700">
              {t('admin.detail.refLabel')} {request.id.slice(0, 8)}
            </p>
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Calendar className="h-4 w-4 text-slate-400" />
              {formatReviewDate(request.created_at)}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
              <Clock className="h-4 w-4" />
              {waitingDays(request.created_at)}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-6 border-b border-slate-100 pb-4 text-xl font-bold text-slate-900">
                {t('admin.detail.patientProfileTitle')}
              </h3>

              <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <p className="mb-1 text-xs text-slate-500">{t('admin.detail.ageLabel')}</p>
                  <p className="font-medium text-slate-900">{request.age ?? '—'}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-slate-500">{t('admin.detail.locationLabel')}</p>
                  <p className="font-medium text-slate-900">{request.city || '—'}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-slate-500">{t('admin.detail.phoneLabel')}</p>
                  <p className="flex items-center gap-1.5 font-medium text-slate-900">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {request.phone}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-slate-500">{t('admin.detail.langLabel')}</p>
                  <p className="font-medium text-slate-900">
                    {tLanguage(request.preferred_language)}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="mb-1 text-xs text-slate-500">{t('admin.detail.availabilityLabel')}</p>
                  <p className="font-medium text-slate-900">{tDays(request.preferred_days)}</p>
                </div>

                <div className="col-span-2">
                  <p className="mb-1 text-xs text-slate-500">{t('admin.detail.complaintLabel')}</p>
                  <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 font-medium text-slate-900">
                    {request.complaint_text}
                  </p>
                </div>
              </div>

              <h3 className="mb-4 border-b border-slate-100 pb-4 text-xl font-bold text-slate-900">
                {t('admin.detail.triageTitle')}
              </h3>

              {isTerminal && (
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {(request.status || '').toLowerCase() === 'matched'
                    ? t('admin.detail.triageReleasedNote')
                    : t('admin.detail.triageClosedNote')}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      {t('admin.detail.assignDeptLabel')}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        {t('admin.detail.assignDeptHint')}
                      </span>
                    </label>
                    <select
                      value={assignedDepartment}
                      onChange={(e) => setAssignedDepartment(e.target.value)}
                      disabled={isTerminal || saving}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {departmentOptions.map((dept) => (
                        <option key={dept} value={dept}>
                          {tDepartment(dept)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      {t('admin.detail.urgencyLabel')}
                    </label>
                    <select
                      value={urgencyLevel}
                      onChange={(e) => setUrgencyLevel(e.target.value)}
                      disabled={isTerminal || saving}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="High (Emergency / Severe Pain)">{t('admin.detail.urgencyHighOption')}</option>
                      <option value="Medium (Discomfort)">{t('admin.detail.urgencyMediumOption')}</option>
                      <option value="Low (Routine)">{t('admin.detail.urgencyLowOption')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {t('admin.detail.studentLevelLabel')}
                  </label>
                  <select
                    value={targetStudentLevel}
                    onChange={(e) => setTargetStudentLevel(e.target.value)}
                    disabled={isTerminal || saving}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {studentLevelOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {tStudentLevel(opt)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {t('admin.detail.clinicalNotesLabel')}
                  </label>
                  <textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    disabled={isTerminal || saving}
                    placeholder={t('admin.detail.clinicalNotesPlaceholder')}
                    className="min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                {saveSuccess && (
                  <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                    {saveSuccess}
                  </p>
                )}

                {isTerminal ? null : pendingAction === 'reject' ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-red-800">
                      {t('admin.detail.rejectConfirmTitle')}
                    </p>
                    <p className="mb-4 text-sm text-red-700">
                      {t('admin.detail.rejectConfirmDesc')}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setPendingAction(null)}
                        disabled={saving}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {t('admin.detail.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={confirmReject}
                        disabled={saving}
                        className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {saving ? t('admin.detail.rejecting') : t('admin.detail.confirmReject')}
                      </button>
                    </div>
                  </div>
                ) : pendingAction === 'approve' ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-blue-900">
                      {t('admin.detail.releaseConfirmTitle')}
                    </p>
                    <ul className="mb-4 space-y-1 text-sm text-blue-800">
                      <li>
                        {t('admin.detail.releaseDeptLabel')} <strong>{tDepartment(assignedDepartment)}</strong>
                      </li>
                      <li>
                        {t('admin.detail.releaseUrgencyLabel')} <strong>{tUrgency(mapDetailToUrgency(urgencyLevel))}</strong>
                      </li>
                      <li>
                        {t('admin.detail.releaseStudentLevelLabel')} <strong>{tStudentLevel(targetStudentLevel)}</strong>
                      </li>
                    </ul>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setPendingAction(null)}
                        disabled={saving}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {t('admin.detail.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={confirmApprove}
                        disabled={saving}
                        className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                      >
                        {saving ? t('admin.detail.releasing') : t('admin.detail.confirmRelease')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      {t('admin.detail.saveDraft')}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPendingAction('reject')}
                      disabled={saving}
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {t('admin.detail.rejectOutOfScope')}
                    </button>

                    <div className="ml-auto">
                      <button
                        type="button"
                        onClick={() => setPendingAction('approve')}
                        disabled={saving}
                        className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                      >
                        {t('admin.detail.approveReleaseToPool')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Faculty Review Record */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">{t('admin.detail.reviewRecordTitle')}</h3>
              </div>

              {request.reviewed_by || request.reviewed_at ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">{t('admin.detail.reviewedByLabel')}</p>
                    <p className="break-all font-medium text-slate-900">
                      {request.reviewed_by ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('admin.detail.lastReviewedLabel')}</p>
                    <p className="font-medium text-slate-900">
                      {formatReviewDate(request.reviewed_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  {t('admin.detail.noReviewYet')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">{t('admin.detail.uploadedImagesTitle')}</h3>

              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {!request.attachment_path ? (
                  <div className="flex aspect-video items-center justify-center">
                    <p className="px-4 text-center text-xs text-slate-400">{t('admin.detail.noUploadedImage')}</p>
                  </div>
                ) : previewLoading ? (
                  <div className="flex aspect-video items-center justify-center">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={attachmentLabel}
                    className="aspect-video w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center">
                    <p className="px-4 text-center text-xs text-slate-500">{attachmentLabel}</p>
                  </div>
                )}
              </div>

              {request.attachment_path && (
                <p className="mb-3 truncate text-xs text-slate-400">{attachmentLabel}</p>
              )}

              <button
                type="button"
                onClick={handleViewAttachment}
                disabled={!request.attachment_path || openingFile}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {openingFile ? t('admin.detail.openingFile') : t('admin.detail.viewFullScreen')}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h3 className="mb-2 text-sm font-bold text-slate-900">{t('admin.detail.priorRecordsTitle')}</h3>
              <p className="mb-4 text-sm text-slate-500">
                {t('admin.detail.priorRecordsDesc')}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                {t('admin.detail.priorRecordsNote')}
              </div>
            </div>
          </div>
        </div>

        {/* Lifecycle actions — visible once the case is in the post-pool phase */}
        {(isLifecyclePhase || isClosed) && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-bold text-slate-900">{t('admin.detail.lifecycleTitle')}</h3>

            {/* Status trail */}
            <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4">
              {[
                { key: 'matched',               label: t('admin.detail.stepReleasedToPool') },
                { key: 'student_approved',       label: t('admin.detail.stepStudentAssigned') },
                { key: 'contacted',              label: t('admin.detail.stepPatientContacted') },
                { key: 'appointment_scheduled',  label: t('admin.detail.stepApptScheduled') },
                { key: 'in_treatment',           label: t('admin.detail.stepInTreatment') },
                { key: 'completed',              label: t('admin.detail.stepCompleted') },
                { key: 'cancelled',              label: t('admin.detail.stepCancelled') },
              ].map((step) => {
                const reached =
                  STATUS_ORDER.indexOf(currentStatus) >= STATUS_ORDER.indexOf(step.key) ||
                  (currentStatus === 'cancelled' && step.key === 'cancelled') ||
                  (currentStatus === 'completed' && step.key === 'completed')
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    {currentStatus === step.key ? (
                      <div className="h-2 w-2 shrink-0 rounded-full border-2 border-teal-500 bg-white" />
                    ) : reached ? (
                      <div className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                    ) : (
                      <div className="h-2 w-2 shrink-0 rounded-full bg-slate-200" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        currentStatus === step.key
                          ? 'text-teal-700'
                          : reached
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Action buttons */}
            {isLifecyclePhase && (
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                {currentStatus === 'student_approved' && (
                  <button
                    type="button"
                    onClick={() => handleLifecycleAction('mark_contacted')}
                    disabled={lifecycleLoading}
                    className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
                  >
                    {lifecycleLoading ? '…' : t('admin.detail.markContacted')}
                  </button>
                )}
                {currentStatus === 'contacted' && (
                  <button
                    type="button"
                    onClick={() => handleLifecycleAction('mark_appointment_scheduled')}
                    disabled={lifecycleLoading}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {lifecycleLoading ? '…' : t('admin.detail.markApptScheduled')}
                  </button>
                )}
                {currentStatus === 'appointment_scheduled' && (
                  <button
                    type="button"
                    onClick={() => handleLifecycleAction('mark_in_treatment')}
                    disabled={lifecycleLoading}
                    className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                  >
                    {lifecycleLoading ? '…' : t('admin.detail.markInTreatment')}
                  </button>
                )}
                {currentStatus === 'in_treatment' && (
                  <button
                    type="button"
                    onClick={() => handleLifecycleAction('mark_completed')}
                    disabled={lifecycleLoading}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {lifecycleLoading ? '…' : t('admin.detail.markCompleted')}
                  </button>
                )}
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => handleLifecycleAction('mark_cancelled')}
                    disabled={lifecycleLoading}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    {t('admin.detail.markCancelled')}
                  </button>
                </div>
              </div>
            )}

            {isClosed && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {currentStatus === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                {currentStatus === 'completed'
                  ? t('admin.detail.closedCompleted')
                  : currentStatus === 'cancelled'
                  ? t('admin.detail.closedCancelledMsg')
                  : t('admin.detail.closedGenericMsg')}
              </div>
            )}
          </div>
        )}

        {/* Student Requests — visible when case is in pool or requests exist */}
        {(isLifecyclePhase || isClosed || studentRequests.length > 0) && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{t('admin.detail.studentRequestsTitle')}</h3>
              {studentRequests.length > 0 && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {studentRequests.length}{' '}
                  {studentRequests.length === 1
                    ? t('admin.detail.studentRequestCountSuffix')
                    : t('admin.detail.studentRequestsCountSuffix')}
                </span>
              )}
            </div>

            {studentRequests.length === 0 ? (
              <p className="text-sm text-slate-400">
                {t('admin.detail.noStudentRequests')}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {studentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {req.student_email}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {t('admin.detail.requestedAtLabel')} {formatReviewDate(req.created_at)}
                      </p>
                      {req.reviewed_by && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {t('admin.detail.reviewedByAtLabel')} {req.reviewed_by} · {formatReviewDate(req.reviewed_at)}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          req.status === 'approved'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : req.status === 'rejected'
                              ? 'border border-red-200 bg-red-50 text-red-700'
                              : 'border border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        {tStudentReqStatus(req.status).toUpperCase()}
                      </span>

                      {req.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleStudentRequestAction(req.id, 'approve_student_request')
                            }
                            disabled={requestActionId === req.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {requestActionId === req.id ? '…' : t('admin.detail.approveBtn')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStudentRequestAction(req.id, 'reject_student_request')
                            }
                            disabled={requestActionId === req.id}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            {t('admin.detail.rejectBtn')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
