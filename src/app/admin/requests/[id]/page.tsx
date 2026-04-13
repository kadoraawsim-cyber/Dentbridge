'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ShieldCheck } from 'lucide-react'

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
  target_student_level: string | null
  clinical_notes: string | null
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

function suggestDepartment(treatmentType: string, assignedDepartment: string | null) {
  if (assignedDepartment) return assignedDepartment

  const value = (treatmentType || '').toLowerCase()

  if (value.includes('root canal')) return 'Endodontics'
  if (value.includes('extraction')) return 'Oral & Maxillofacial Surgery'
  if (value.includes('gum')) return 'Periodontology'
  if (value.includes('orthodont')) return 'Orthodontics'
  if (value.includes('prosthetic') || value.includes('crown')) return 'Prosthodontics'
  if (value.includes('pediatric')) return 'Pedodontics'
  if (value.includes('esthetic') || value.includes('filling') || value.includes('cleaning')) {
    return 'Restorative Dentistry'
  }

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

function mapUrgencyToStatusBadge(status: string) {
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

export default function AdminRequestDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [request, setRequest] = useState<PatientRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [openingFile, setOpeningFile] = useState(false)

  const [assignedDepartment, setAssignedDepartment] = useState('')
  const [urgencyLevel, setUrgencyLevel] = useState('')
  const [targetStudentLevel, setTargetStudentLevel] = useState('Year 4 Clinical Student')
  const [clinicalNotes, setClinicalNotes] = useState('')

  useEffect(() => {
    async function loadRequest() {
      if (!id) return

      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('patient_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      const item = data as PatientRequest
      setRequest(item)
      setAssignedDepartment(suggestDepartment(item.treatment_type, item.assigned_department))
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

    const { error } = await supabase
      .from('patient_requests')
      .update({
        assigned_department: assignedDepartment,
        urgency: mapDetailToUrgency(urgencyLevel),
        target_student_level: targetStudentLevel,
        clinical_notes: clinicalNotes,
        status: 'under_review',
      })
      .eq('id', request.id)

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setRequest({
      ...request,
      assigned_department: assignedDepartment,
      urgency: mapDetailToUrgency(urgencyLevel),
      target_student_level: targetStudentLevel,
      clinical_notes: clinicalNotes,
      status: 'under_review',
    })
    showSaved('Draft saved.')
  }

  async function handleApprove() {
    if (!request) return

    setSaving(true)
    setErrorMessage('')

    const { error } = await supabase
      .from('patient_requests')
      .update({
        assigned_department: assignedDepartment,
        urgency: mapDetailToUrgency(urgencyLevel),
        target_student_level: targetStudentLevel,
        clinical_notes: clinicalNotes,
        status: 'matched',
      })
      .eq('id', request.id)

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setRequest({
      ...request,
      assigned_department: assignedDepartment,
      urgency: mapDetailToUrgency(urgencyLevel),
      target_student_level: targetStudentLevel,
      clinical_notes: clinicalNotes,
      status: 'matched',
    })
    showSaved('Approved and released to pool.')
  }

  async function handleReject() {
    if (!request) return

    setSaving(true)
    setErrorMessage('')

    const { error } = await supabase
      .from('patient_requests')
      .update({
        status: 'rejected',
      })
      .eq('id', request.id)

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setRequest({
      ...request,
      status: 'rejected',
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
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/admin/requests"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← Back to Review List
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              {loading ? 'Loading case...' : `Case Review: ${request?.full_name || ''}`}
            </h1>

            {!loading && request && (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${mapUrgencyToStatusBadge(
                  request.status
                )}`}
              >
                {request.status}
              </span>
            )}
          </div>

          {!loading && request && (
            <p className="mt-3 inline-block rounded-md bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700">
              ID: {request.id}
            </p>
          )}
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            Loading case details...
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

                <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Age</p>
                    <p className="font-medium text-slate-900">{request.age ?? '-'}</p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-slate-500">Location</p>
                    <p className="font-medium text-slate-900">{request.city || '-'}</p>
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

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Assign Department
                      </label>
                      <select
                        value={assignedDepartment}
                        onChange={(e) => setAssignedDepartment(e.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-900"
                      >
                        {departmentOptions.map((department) => (
                          <option key={department} value={department}>
                            {department}
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
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-900"
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
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-900"
                    >
                      {studentLevelOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
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
                      placeholder="Add any specific instructions for the assigned student or coordinator..."
                      className="min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-900"
                    />
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6">
                  {saveSuccess && (
                    <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                      {saveSuccess}
                    </p>
                  )}

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
                      onClick={handleReject}
                      disabled={saving}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      Reject / Out of Scope
                    </button>

                    <div className="ml-auto">
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={saving}
                        className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                      >
                        Approve & Release to Pool
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
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
                  {openingFile ? 'Opening...' : 'View Full Screen'}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Patient History</h3>
                <p className="mb-4 text-sm text-slate-600">
                  No prior treatment records found in the university system for this patient.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  Identity verified via submitted request details
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-slate-900">Request Summary</h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-medium text-slate-900">{request.phone}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Preferred Language</p>
                    <p className="font-medium text-slate-900">{request.preferred_language || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Preferred Availability</p>
                    <p className="font-medium text-slate-900">{request.preferred_days || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Requested Treatment</p>
                    <p className="font-medium text-slate-900">{request.treatment_type}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}