'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildCaseTimeline } from '@/lib/case-timeline'
import { useI18n } from '@/lib/i18n'
import { AdminPortalHeader } from '@/components/admin/AdminPortalHeader'
import { ActivityLogPanel } from '@/components/admin/case-detail/ActivityLogPanel'
import { CaseHeroSection } from '@/components/admin/case-detail/CaseHeroSection'
import { LifecyclePanel } from '@/components/admin/case-detail/LifecyclePanel'
import { PatientSummarySection } from '@/components/admin/case-detail/PatientSummarySection'
import { ReviewRecordCard } from '@/components/admin/case-detail/ReviewRecordCard'
import { StudentRequestsPanel } from '@/components/admin/case-detail/StudentRequestsPanel'
import { TreatmentJourneyPanel } from '@/components/admin/case-detail/TreatmentJourneyPanel'
import { TriagePanel } from '@/components/admin/case-detail/TriagePanel'
import {
  buildInitialActivityLog,
  keywordRoutingHint,
  makeLogEntry,
  mapDetailToUrgency,
  mapUrgencyToDetail,
} from '@/components/admin/case-detail/helpers'
import type {
  ActivityLogEntry,
  CaseProgressEntry,
  CaseRoutingStage,
  PatientRequest,
  StudentCaseRequest,
} from '@/components/admin/case-detail/types'

interface Props {
  initialRequest: PatientRequest
  adminEmail: string
  initialStudentRequests: StudentCaseRequest[]
  initialProgressEntries: CaseProgressEntry[]
  initialRoutingStages: CaseRoutingStage[]
  studentOpenCaseCounts: Record<string, number>
}

const PREVIEW_SIGNED_URL_TTL_MS = 120 * 1000
const SIGNED_URL_FRESHNESS_BUFFER_MS = 30 * 1000

type SignedFileUrlResponse = {
  success: true
  signedUrl: string
  expiresAt: string
}

export function CaseDetailClient({
  initialRequest,
  adminEmail,
  initialStudentRequests,
  initialProgressEntries,
  initialRoutingStages,
  studentOpenCaseCounts,
}: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB'
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setNow(Date.now())
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  function formatReviewDate(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(dateLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function waitingDays(iso: string | null): string {
    if (!iso) return '—'
    if (now === null) return '—'
    const days = Math.floor((now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return t('admin.detail.submittedToday')
    if (days === 1) return t('admin.detail.waitingOneDay')
    return `${t('admin.detail.waitingDaysPrefix')} ${days} ${t('admin.detail.waitingDaysSuffix')}`
  }

  function formatDateOnly(value: string | null): string {
    if (!value) return '—'
    return new Date(`${value}T00:00:00`).toLocaleDateString(dateLocale, {
      dateStyle: 'medium',
    })
  }

  function formatTimeOnly(value: string | null): string {
    if (!value) return ''
    return value.slice(0, 5)
  }

  const [request, setRequest] = useState<PatientRequest>(initialRequest)
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [openingFile, setOpeningFile] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(!!request.attachment_file_id)
  const previewUrlExpiresAtRef = useRef(0)
  const saveSuccessTimeoutRef = useRef<number | null>(null)

  // 'reject' or 'approve' means a confirmation is pending; null means normal button state
  const [pendingAction, setPendingAction] = useState<'reject' | 'approve' | null>(null)

  // Lifecycle action currently in flight (post-pool stage transitions)
  const [lifecycleLoading, setLifecycleLoading] = useState(false)

  // Student request management
  const [studentRequests, setStudentRequests] =
    useState<StudentCaseRequest[]>(initialStudentRequests)
  const [routingStages, setRoutingStages] = useState<CaseRoutingStage[]>(initialRoutingStages)
  // Which request_id is currently being approved/rejected (disables that row's buttons)
  const [requestActionId, setRequestActionId] = useState<string | null>(null)
  const [pendingStudentAction, setPendingStudentAction] = useState<{
    requestId: string
    kind: 'reject' | 'undo'
  } | null>(null)
  const [studentActionReason, setStudentActionReason] = useState('')
  const [pendingCancel, setPendingCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [nextStageReason, setNextStageReason] = useState('')
  const [triageReason, setTriageReason] = useState('')
  const [pendingReturnToPool, setPendingReturnToPool] = useState(false)
  const [returnToPoolReason, setReturnToPoolReason] = useState('')
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(
    () => buildInitialActivityLog(initialRequest, initialStudentRequests)
  )

  const [assignedDepartment, setAssignedDepartment] = useState(
    keywordRoutingHint(initialRequest.treatment_type, initialRequest.assigned_department)
  )
  const [urgencyLevel, setUrgencyLevel] = useState(mapUrgencyToDetail(initialRequest.urgency))
  const [targetStudentLevel, setTargetStudentLevel] = useState(
    initialRequest.target_student_level || 'Year 4 Clinical Student'
  )
  const [clinicalNotes, setClinicalNotes] = useState(initialRequest.clinical_notes || '')
  const [isEditingTriage, setIsEditingTriage] = useState(false)

  useEffect(() => {
    if (!request.attachment_file_id) {
      previewUrlExpiresAtRef.current = 0
      const resetFrameId = window.requestAnimationFrame(() => {
        setPreviewUrl(null)
        setPreviewLoading(false)
      })

      return () => {
        window.cancelAnimationFrame(resetFrameId)
      }
    }

    let cancelled = false
    const loadingFrameId = window.requestAnimationFrame(() => {
      if (!cancelled) {
        setPreviewLoading(true)
      }
    })

    fetch(`/api/v1/files/${request.attachment_file_id}/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'preview' }),
    })
      .then(async (response) => {
        if (!response.ok) {
          return null
        }
        return (await response.json()) as SignedFileUrlResponse
      })
      .then((data) => {
        if (!cancelled) {
          setPreviewUrl(data?.signedUrl ?? null)
          previewUrlExpiresAtRef.current = data?.expiresAt
            ? new Date(data.expiresAt).getTime()
            : data?.signedUrl
              ? Date.now() + PREVIEW_SIGNED_URL_TTL_MS
              : 0
          setPreviewLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(null)
          previewUrlExpiresAtRef.current = 0
          setPreviewLoading(false)
        }
      })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(loadingFrameId)
    }
  }, [request.attachment_file_id])

  useEffect(() => {
    return () => {
      if (saveSuccessTimeoutRef.current !== null) {
        window.clearTimeout(saveSuccessTimeoutRef.current)
      }
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  const attachmentLabel = useMemo(() => {
    if (!request.attachment_name) return t('admin.detail.uploadedFileFallback')
    return request.attachment_name
  }, [request, t])

  const sortedActivityLog = useMemo(
    () => [...activityLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [activityLog]
  )
  const treatmentJourney = useMemo(
    () =>
      buildCaseTimeline({
        request,
        studentRequests,
        progressEntries: initialProgressEntries,
        routingStages,
      }),
    [request, studentRequests, initialProgressEntries, routingStages]
  )

  const currentStatus = (request.status || '').toLowerCase()

  // Triage phase: faculty can edit department/urgency/notes and approve/reject
  const isTriagePhase = ['submitted', 'under_review'].includes(currentStatus)

  // Lifecycle phase: case is active post-pool; faculty advances through stages
  const isLifecyclePhase = [
    'matched', 'student_approved', 'contacted',
    'appointment_scheduled', 'in_treatment', 'faculty_review',
  ].includes(currentStatus)

  // Closed: no further actions possible
  const isClosed = ['rejected', 'completed', 'cancelled'].includes(currentStatus)

  // Allow post-release triage edits without changing the current case status.
  const canEditTriage = ['matched', 'student_approved', 'contacted', 'appointment_scheduled', 'in_treatment'].includes(currentStatus)
  const canReturnToPool = ['student_approved', 'contacted', 'appointment_scheduled'].includes(currentStatus)

  // Keep the old isTerminal alias so the triage form disable logic still works
  const isTerminal = !isTriagePhase
  const originalDepartment =
    request.assigned_department || keywordRoutingHint(request.treatment_type, request.assigned_department)
  const departmentChanged = assignedDepartment !== originalDepartment
  const departmentChangeWarning = !isTriagePhase && departmentChanged && ['student_approved', 'contacted', 'appointment_scheduled', 'in_treatment'].includes(currentStatus)

  async function handleViewAttachment() {
    if (!request.attachment_file_id) return

    if (
      previewUrl &&
      previewUrlExpiresAtRef.current - Date.now() > SIGNED_URL_FRESHNESS_BUFFER_MS
    ) {
      window.open(previewUrl, '_blank')
      return
    }

    setOpeningFile(true)
    setErrorMessage('')

    let data: SignedFileUrlResponse | null = null
    try {
      const response = await fetch(`/api/v1/files/${request.attachment_file_id}/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'download' }),
      })

      if (response.ok) {
        data = (await response.json()) as SignedFileUrlResponse
      }
    } catch {
      data = null
    }

    setOpeningFile(false)

    if (!data?.signedUrl) {
      setErrorMessage('Unable to open this attachment right now.')
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  function showSaved(message: string) {
    setSaveSuccess(message)
    if (saveSuccessTimeoutRef.current !== null) {
      window.clearTimeout(saveSuccessTimeoutRef.current)
    }
    saveSuccessTimeoutRef.current = window.setTimeout(() => {
      setSaveSuccess('')
      saveSuccessTimeoutRef.current = null
    }, 3000)
  }

  function resetTriageForm() {
    setAssignedDepartment(
      keywordRoutingHint(request.treatment_type, request.assigned_department)
    )
    setUrgencyLevel(mapUrgencyToDetail(request.urgency))
    setTargetStudentLevel(request.target_student_level || 'Year 4 Clinical Student')
    setClinicalNotes(request.clinical_notes || '')
  }

  async function handleStudentRequestAction(
    requestId: string,
    action: 'approve_student_request' | 'reject_student_request' | 'undo_reject_student_request',
    reason?: string
  ) {
    setRequestActionId(requestId)
    setErrorMessage('')

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, request_id: requestId, reason }),
    })

    setRequestActionId(null)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setErrorMessage((err as { error?: string }).error ?? 'Failed to update student request.')
      return
    }

    const { data: resultData } = (await res.json()) as {
      data: {
        status: string
        reviewed_by: string | null
        reviewed_at: string | null
      }
    }
    const reviewedAt =
      action === 'undo_reject_student_request'
        ? null
        : resultData.reviewed_at ?? new Date().toISOString()
    const reviewedBy =
      action === 'undo_reject_student_request'
        ? null
        : resultData.reviewed_by ?? adminEmail

    const approvedStageId =
      action === 'approve_student_request'
        ? studentRequests.find((studentRequest) => studentRequest.id === requestId)?.stage_id ?? null
        : null

    setStudentRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: resultData.status,
              reviewed_by: reviewedBy,
              reviewed_at: reviewedAt,
            }
          : // auto-reject other pending rows when one is approved
            action === 'approve_student_request' &&
              r.status === 'pending' &&
              (!approvedStageId || r.stage_id === approvedStageId)
            ? { ...r, status: 'rejected', reviewed_by: adminEmail, reviewed_at: reviewedAt ?? new Date().toISOString() }
            : r
      )
    )

    if (action === 'reject_student_request' && resultData.status === 'rejected') {
      setActivityLog((prev) => [
        makeLogEntry('student_request_rejected', reviewedAt ?? new Date().toISOString()),
        ...prev,
      ])
    }

    if (action === 'undo_reject_student_request' && resultData.status === 'pending') {
      setActivityLog((prev) => [
        makeLogEntry('rejection_undone', new Date().toISOString()),
        ...prev,
      ])
    }

    if (action === 'approve_student_request' && resultData.status === 'approved') {
      setActivityLog((prev) => [
        makeLogEntry('student_request_approved', reviewedAt ?? new Date().toISOString()),
        ...prev,
      ])
    }

    // Approving a student advances the case to student_approved
    if (action === 'approve_student_request') {
      setRequest((prev) => ({
        ...prev,
        status: 'student_approved',
        reviewed_by: adminEmail,
        reviewed_at: new Date().toISOString(),
      }))
    }

    setPendingStudentAction(null)
    setStudentActionReason('')
  }

  async function handleUpdateTriage() {
    setSaving(true)
    setErrorMessage('')

    const originalDepartment =
      request.assigned_department || keywordRoutingHint(request.treatment_type, request.assigned_department)
    const departmentChanged = assignedDepartment !== originalDepartment
    const notesChanged = clinicalNotes !== (request.clinical_notes || '')

    if (departmentChanged && !triageReason.trim()) {
      setSaving(false)
      setErrorMessage(t('admin.detail.reasonRequired'))
      return
    }

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_triage',
        assigned_department: assignedDepartment,
        urgency: mapDetailToUrgency(urgencyLevel),
        target_student_level: targetStudentLevel,
        clinical_notes: clinicalNotes,
        reason: triageReason.trim() || undefined,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setErrorMessage((err as { error?: string }).error ?? 'Failed to update triage.')
      return
    }

    const { data } = (await res.json()) as {
      data: { reviewed_by: string | null; reviewed_at: string }
    }

    setRequest((prev) => ({
      ...prev,
      assigned_department: assignedDepartment,
      urgency: mapDetailToUrgency(urgencyLevel),
      target_student_level: targetStudentLevel,
      clinical_notes: clinicalNotes,
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
    }))
    const nextEntries: ActivityLogEntry[] = []
    if (departmentChanged) {
      nextEntries.push(makeLogEntry('department_changed', data.reviewed_at, assignedDepartment))
    }
    if (notesChanged) {
      nextEntries.push(makeLogEntry('clinical_notes_updated', data.reviewed_at))
    }
    if (nextEntries.length > 0) {
      setActivityLog((prev) => [...nextEntries, ...prev])
    }
    setPendingReturnToPool(false)
    setReturnToPoolReason('')
    setTriageReason('')
    setIsEditingTriage(false)
    showSaved(t('admin.detail.savedTriageUpdated'))
  }

  async function handleReturnToPool() {
    if (!canReturnToPool) {
      setErrorMessage(t('admin.detail.returnToPoolNotAllowed'))
      return
    }

    const trimmedReason = returnToPoolReason.trim()
    if (!trimmedReason) {
      setErrorMessage(t('admin.detail.reasonRequired'))
      return
    }

    setSaving(true)
    setErrorMessage('')

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'return_to_pool',
        assigned_department: assignedDepartment,
        urgency: mapDetailToUrgency(urgencyLevel),
        target_student_level: targetStudentLevel,
        clinical_notes: clinicalNotes,
        reason: trimmedReason,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setErrorMessage(
        (err as { error?: string }).error ?? t('admin.detail.returnToPoolErrorGeneric')
      )
      return
    }

    const { data } = (await res.json()) as {
      data: {
        status: string
        reviewed_by: string | null
        reviewed_at: string
        request_id?: string
      }
    }

    setRequest((prev) => ({
      ...prev,
      assigned_department: assignedDepartment,
      urgency: mapDetailToUrgency(urgencyLevel),
      target_student_level: targetStudentLevel,
      clinical_notes: clinicalNotes,
      status: data.status,
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
    }))

    const revokedRequest = data.request_id
      ? studentRequests.find((studentRequest) => studentRequest.id === data.request_id)
      : null

    if (data.request_id) {
      setStudentRequests((prev) =>
        prev.map((studentRequest) =>
          studentRequest.id === data.request_id
            ? {
                ...studentRequest,
                status: 'revoked',
                reviewed_by: data.reviewed_by ?? adminEmail,
                reviewed_at: data.reviewed_at,
              }
            : studentRequest
        )
      )
    }

    setActivityLog((prev) => [
      makeLogEntry('case_returned_to_pool', data.reviewed_at),
      ...(data.request_id
        ? [makeLogEntry('student_request_revoked', data.reviewed_at, revokedRequest?.student_email ?? null)]
        : []),
      ...prev,
    ])
    setPendingReturnToPool(false)
    setReturnToPoolReason('')
    setTriageReason('')
    setIsEditingTriage(false)
    showSaved(t('admin.detail.savedReturnedToPool'))
  }

  async function handleLifecycleAction(
    action:
      | 'mark_contacted'
      | 'mark_appointment_scheduled'
      | 'mark_in_treatment'
      | 'mark_completed'
      | 'mark_cancelled',
    reason?: string
  ) {
    setLifecycleLoading(true)
    setErrorMessage('')

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
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
      routing_completed_at:
        action === 'mark_completed' ? data.reviewed_at : prev.routing_completed_at,
    }))
    if (action === 'mark_cancelled') {
      setActivityLog((prev) => [
        makeLogEntry('case_cancelled', data.reviewed_at),
        ...prev,
      ])
      setPendingCancel(false)
      setCancelReason('')
    }
    showSaved(t('admin.detail.statusUpdated'))
  }

  async function handleReleaseNextStage() {
    if (currentStatus !== 'faculty_review') {
      setErrorMessage(t('admin.detail.nextStageNotAllowed'))
      return
    }
    const trimmedReason = nextStageReason.trim()
    if (trimmedReason.length < 3) {
      setErrorMessage(t('admin.detail.reasonRequired'))
      return
    }

    setLifecycleLoading(true)
    setErrorMessage('')

    const res = await fetch(`/api/admin/cases/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'release_next_stage',
        assigned_department: assignedDepartment,
        urgency: mapDetailToUrgency(urgencyLevel),
        target_student_level: targetStudentLevel,
        clinical_notes: clinicalNotes,
        reason: trimmedReason,
      }),
    })

    setLifecycleLoading(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setErrorMessage((err as { error?: string }).error ?? t('admin.detail.nextStageReleaseError'))
      return
    }

    const { data } = (await res.json()) as {
      data: {
        status: string
        reviewed_by: string | null
        reviewed_at: string
        stage_id: string
        sequence: number
      }
    }

    setRequest((prev) => ({
      ...prev,
      assigned_department: assignedDepartment,
      urgency: mapDetailToUrgency(urgencyLevel),
      target_student_level: targetStudentLevel,
      clinical_notes: clinicalNotes,
      status: data.status,
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
    }))
    setRoutingStages((prev) => [
      ...prev,
      {
        id: data.stage_id,
        case_id: request.id,
        sequence: data.sequence,
        department: assignedDepartment,
        target_student_level: targetStudentLevel,
        status: 'released',
        faculty_notes: clinicalNotes || null,
        student_request_id: null,
        student_id: null,
        student_email: null,
        released_by: data.reviewed_by,
        released_at: data.reviewed_at,
        assigned_by: null,
        assigned_at: null,
        stage_submitted_by: null,
        stage_submitted_at: null,
        stage_reviewed_by: null,
        stage_reviewed_at: null,
        completed_at: null,
        cancelled_at: null,
        created_at: data.reviewed_at,
        updated_at: data.reviewed_at,
      },
    ])
    setActivityLog((prev) => [
      makeLogEntry('case_released', data.reviewed_at, assignedDepartment),
      ...prev,
    ])
    setNextStageReason('')
    showSaved(t('admin.detail.nextStageReleased'))
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
    setIsEditingTriage(false)
    setPendingReturnToPool(false)
    setReturnToPoolReason('')
    setTriageReason('')
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
    setActivityLog((prev) => [
      makeLogEntry('case_released', data.reviewed_at, assignedDepartment),
      ...prev,
    ])
    setIsEditingTriage(false)
    setPendingReturnToPool(false)
    setReturnToPoolReason('')
    setTriageReason('')
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
    setIsEditingTriage(false)
    setPendingReturnToPool(false)
    setReturnToPoolReason('')
    setTriageReason('')
    showSaved(t('admin.detail.savedRejected'))
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <AdminPortalHeader adminEmail={adminEmail} onSignOut={handleSignOut} />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <CaseHeroSection
          request={request}
          assignedDepartment={assignedDepartment}
          urgencyLevel={urgencyLevel}
          targetStudentLevel={targetStudentLevel}
          formatReviewDate={formatReviewDate}
          waitingDays={waitingDays}
        />

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid items-start gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <PatientSummarySection
                request={request}
                attachmentLabel={attachmentLabel}
                previewUrl={previewUrl}
                previewLoading={previewLoading}
                openingFile={openingFile}
                onViewAttachment={handleViewAttachment}
              />

              <TriagePanel
                status={request.status}
                isTerminal={isTerminal}
                isTriagePhase={isTriagePhase}
                canEditTriage={canEditTriage}
                isEditingTriage={isEditingTriage}
                canReturnToPool={canReturnToPool}
                departmentChanged={departmentChanged}
                departmentChangeWarning={departmentChangeWarning}
                saving={saving}
                saveSuccess={saveSuccess}
                pendingAction={pendingAction}
                pendingReturnToPool={pendingReturnToPool}
                assignedDepartment={assignedDepartment}
                urgencyLevel={urgencyLevel}
                targetStudentLevel={targetStudentLevel}
                clinicalNotes={clinicalNotes}
                triageReason={triageReason}
                returnToPoolReason={returnToPoolReason}
                onAssignedDepartmentChange={setAssignedDepartment}
                onUrgencyLevelChange={setUrgencyLevel}
                onTargetStudentLevelChange={setTargetStudentLevel}
                onClinicalNotesChange={setClinicalNotes}
                onTriageReasonChange={setTriageReason}
                onReturnToPoolReasonChange={setReturnToPoolReason}
                onPendingActionChange={setPendingAction}
                onStartEditTriage={() => setIsEditingTriage(true)}
                onCancelEditTriage={() => {
                  resetTriageForm()
                  setIsEditingTriage(false)
                  setPendingReturnToPool(false)
                  setReturnToPoolReason('')
                }}
                onStartReturnToPool={() => {
                  setPendingReturnToPool(true)
                  setReturnToPoolReason('')
                  setErrorMessage('')
                }}
                onCancelReturnToPool={() => {
                  setPendingReturnToPool(false)
                  setReturnToPoolReason('')
                }}
                onSaveDraft={handleSaveDraft}
                onConfirmApprove={confirmApprove}
                onConfirmReject={confirmReject}
                onUpdateTriage={handleUpdateTriage}
                onReturnToPool={handleReturnToPool}
              />
            </div>
          </div>

          <div className="space-y-6">
            <ReviewRecordCard
              reviewedBy={request.reviewed_by}
              reviewedAt={request.reviewed_at}
              formatReviewDate={formatReviewDate}
            />

            <TreatmentJourneyPanel
              items={treatmentJourney}
              formatReviewDate={formatReviewDate}
              formatDateOnly={formatDateOnly}
              formatTimeOnly={formatTimeOnly}
            />

            <ActivityLogPanel
              entries={sortedActivityLog}
              formatReviewDate={formatReviewDate}
            />
          </div>
        </div>

        {/* Lifecycle actions — visible once the case is in the post-pool phase */}
        {(isLifecyclePhase || isClosed) && (
          <LifecyclePanel
            currentStatus={currentStatus}
            isLifecyclePhase={isLifecyclePhase}
            isClosed={isClosed}
            lifecycleLoading={lifecycleLoading}
            pendingCancel={pendingCancel}
            cancelReason={cancelReason}
            nextStageReason={nextStageReason}
            assignedDepartment={assignedDepartment}
            targetStudentLevel={targetStudentLevel}
            onAssignedDepartmentChange={setAssignedDepartment}
            onTargetStudentLevelChange={setTargetStudentLevel}
            onCancelReasonChange={setCancelReason}
            onNextStageReasonChange={setNextStageReason}
            onStartCancel={() => {
              setPendingCancel(true)
              setCancelReason('')
            }}
            onDismissCancel={() => {
              setPendingCancel(false)
              setCancelReason('')
            }}
            onLifecycleAction={handleLifecycleAction}
            onReleaseNextStage={handleReleaseNextStage}
          />
        )}

        {/* Student Requests — visible when case is in pool or requests exist */}
        {(isLifecyclePhase || isClosed || studentRequests.length > 0) && (
          <StudentRequestsPanel
            studentRequests={studentRequests}
            studentOpenCaseCounts={studentOpenCaseCounts}
            requestActionId={requestActionId}
            pendingStudentAction={pendingStudentAction}
            studentActionReason={studentActionReason}
            formatReviewDate={formatReviewDate}
            onStudentActionReasonChange={setStudentActionReason}
            onStartStudentAction={(requestId, kind) => {
              setPendingStudentAction({ requestId, kind })
              setStudentActionReason('')
            }}
            onCancelStudentAction={() => {
              setPendingStudentAction(null)
              setStudentActionReason('')
            }}
            onStudentRequestAction={handleStudentRequestAction}
          />
        )}
      </section>
    </main>
  )
}
