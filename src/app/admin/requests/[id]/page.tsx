'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Calendar, Clock, LogOut, Phone, ShieldCheck } from 'lucide-react'

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

// Returns a department name based on keyword matching only.
// This is a heuristic pre-fill, not an intelligent routing system.
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

function formatReviewDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function waitingDays(iso: string | null): string {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Submitted today'
  if (days === 1) return 'Waiting 1 day'
  return `Waiting ${days} days`
}

export default function AdminRequestDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [request, setRequest] = useState<PatientRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [openingFile, setOpeningFile] = useState(false)
  const [adminEmail, setAdminEmail] = useState<string>('')

  // 'reject' or 'approve' means a confirmation is pending; null means normal button state
  const [pendingAction, setPendingAction] = useState<'reject' | 'approve' | null>(null)

  const [assignedDepartment, setAssignedDepartment] = useState('')
  const [urgencyLevel, setUrgencyLevel] = useState('')
  const [targetStudentLevel, setTargetStudentLevel] = useState('Year 4 Clinical Student')
  const [clinicalNotes, setClinicalNotes] = useState('')

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
    async function loadRequest() {
      if (!id) return

      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('patient_requests')
        .select(
          'id, full_name, age, phone, city, preferred_language, treatment_type, complaint_text, urgency, preferred_days, consent, status, attachment_path, attachment_name, assigned_department, target_student_level, clinical_notes, reviewed_by, reviewed_at, created_at'
        )
        .eq('id', id)
        .single()

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      const item = data as PatientRequest
      setRequest(item)
      setAssignedDepartment(keywordRoutingHint(item.treatment_type, item.assigned_department))
      setUrgencyLevel(mapUrgencyToDetail(item.urgency))
      setTargetStudentLevel(item.target_student_level || 'Year 4 Clinical Student')
      setClinicalNotes(item.clinical_notes || '')
      setLoading(false)
    }

    loadRequest()
  }, [id])

  const attachmentLabel = useMemo(() => {
    if (!request?.attachment_name) return 'Uploaded file'
    return request.attachment_name
  }, [request])

  // Terminal states: matched = released to pool (no further admin edits);
  // rejected/completed = case closed. All three block further form edits.
  const isTerminal =
    request !== null &&
    ['matched', 'rejected', 'completed'].includes((request.status || '').toLowerCase())

  async function handleViewAttachment() {
    if (!request?.attachment_path) return

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

  async function handleSaveDraft() {
    if (!request) return

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

    const { data } = (await res.json()) as { data: { reviewed_by: string | null; reviewed_at: string } }
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
    showSaved('Draft saved.')
  }

  async function confirmApprove() {
    if (!request) return

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

    const { data } = (await res.json()) as { data: { reviewed_by: string | null; reviewed_at: string } }
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
    showSaved('Approved and released to pool.')
  }

  async function confirmReject() {
    if (!request) return

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

    const { data } = (await res.json()) as { data: { reviewed_by: string | null; reviewed_at: string } }
    setRequest({
      ...request,
      status: 'rejected',
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
    })
    showSaved('Case marked as rejected.')
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
            <Link href="/admin" className="hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/admin/requests" className="text-slate-900">
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

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/admin/requests"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Review List
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              {loading ? 'Loading case…' : `Case Review: ${request?.full_name || ''}`}
            </h1>

            {!loading && request && (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                  request.status
                )}`}
              >
                {request.status}
              </span>
            )}
          </div>

          {!loading && request && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <p className="inline-block rounded-md bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700">
                Ref: {request.id.slice(0, 8)}
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
          )}
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading case details…
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!loading && request && (
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-6 border-b border-slate-100 pb-4 text-xl font-bold text-slate-900">
                  Patient Profile & Complaint
                </h3>

                <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Age</p>
                    <p className="font-medium text-slate-900">{request.age ?? '—'}</p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-slate-500">Location</p>
                    <p className="font-medium text-slate-900">{request.city || '—'}</p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-slate-500">Phone</p>
                    <p className="flex items-center gap-1.5 font-medium text-slate-900">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {request.phone}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-slate-500">Preferred Language</p>
                    <p className="font-medium text-slate-900">
                      {request.preferred_language || '—'}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="mb-1 text-xs text-slate-500">Preferred Availability</p>
                    <p className="font-medium text-slate-900">{request.preferred_days || '—'}</p>
                  </div>

                  <div className="col-span-2">
                    <p className="mb-1 text-xs text-slate-500">Primary Complaint</p>
                    <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 font-medium text-slate-900">
                      {request.complaint_text}
                    </p>
                  </div>
                </div>

                <h3 className="mb-4 border-b border-slate-100 pb-4 text-xl font-bold text-slate-900">
                  Faculty Triage Decision
                </h3>

                {isTerminal && (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    {(request.status || '').toLowerCase() === 'matched'
                      ? 'This case has been released to the student pool. No further edits can be made from this view.'
                      : 'This case is closed. No further changes can be made.'}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Assign Department{' '}
                        <span className="font-normal text-xs text-slate-400">(keyword pre-fill — verify)</span>
                      </label>
                      <select
                        value={assignedDepartment}
                        onChange={(e) => setAssignedDepartment(e.target.value)}
                        disabled={isTerminal || saving}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        {departmentOptions.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Urgency Level
                      </label>
                      <select
                        value={urgencyLevel}
                        onChange={(e) => setUrgencyLevel(e.target.value)}
                        disabled={isTerminal || saving}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option>High (Emergency / Severe Pain)</option>
                        <option>Medium (Discomfort)</option>
                        <option>Low (Routine)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Target Student Level
                    </label>
                    <select
                      value={targetStudentLevel}
                      onChange={(e) => setTargetStudentLevel(e.target.value)}
                      disabled={isTerminal || saving}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {studentLevelOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Clinical Notes & Instructions
                    </label>
                    <textarea
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      disabled={isTerminal || saving}
                      placeholder="Add any specific instructions for the assigned student or coordinator…"
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
                        Reject this case?
                      </p>
                      <p className="mb-4 text-sm text-red-700">
                        This will mark the case as out of scope. The patient will see it as
                        rejected. This action cannot be undone from this view.
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setPendingAction(null)}
                          disabled={saving}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={confirmReject}
                          disabled={saving}
                          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          {saving ? 'Rejecting…' : 'Confirm Reject'}
                        </button>
                      </div>
                    </div>
                  ) : pendingAction === 'approve' ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <p className="mb-3 text-sm font-semibold text-blue-900">
                        Release this case to the student pool?
                      </p>
                      <ul className="mb-4 space-y-1 text-sm text-blue-800">
                        <li>Department: <strong>{assignedDepartment}</strong></li>
                        <li>Urgency: <strong>{mapDetailToUrgency(urgencyLevel)}</strong></li>
                        <li>Student level: <strong>{targetStudentLevel}</strong></li>
                      </ul>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setPendingAction(null)}
                          disabled={saving}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={confirmApprove}
                          disabled={saving}
                          className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                        >
                          {saving ? 'Releasing…' : 'Confirm & Release'}
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
                        Save Draft
                      </button>

                      <button
                        type="button"
                        onClick={() => setPendingAction('reject')}
                        disabled={saving}
                        className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        Reject / Out of Scope
                      </button>

                      <div className="ml-auto">
                        <button
                          type="button"
                          onClick={() => setPendingAction('approve')}
                          disabled={saving}
                          className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                        >
                          Approve & Release to Pool
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Faculty Review Record — sourced from reviewed_by / reviewed_at columns */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-900">Faculty Review Record</h3>
                </div>

                {request.reviewed_by || request.reviewed_at ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Reviewed by</p>
                      <p className="break-all font-medium text-slate-900">
                        {request.reviewed_by ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last reviewed</p>
                      <p className="font-medium text-slate-900">
                        {formatReviewDate(request.reviewed_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No faculty action has been recorded yet.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Uploaded Images</h3>

                <div className="mb-4 flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100">
                  {request.attachment_path ? (
                    <p className="px-4 text-center text-xs text-slate-500">{attachmentLabel}</p>
                  ) : (
                    <p className="px-4 text-center text-xs text-slate-400">No uploaded image</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleViewAttachment}
                  disabled={!request.attachment_path || openingFile}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {openingFile ? 'Opening…' : 'View Full Screen'}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Prior Records</h3>
                <p className="mb-4 text-sm text-slate-500">
                  Patient history lookup is not yet connected. Check the university system
                  separately if prior records are needed.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  Details taken from submitted request only
                </div>
              </div>

            </div>
          </div>
        )}
      </section>
    </main>
  )
}
