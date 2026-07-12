'use client'

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import InstallBanner from '@/components/InstallBanner'
import { supabase } from '@/lib/supabase'
import { portalFetch } from '@/lib/api/portal-fetch'
import { useI18n } from '@/lib/i18n'
import { StudentActiveCasesSection } from '@/components/student/dashboard/StudentActiveCasesSection'
import { StudentCompletedCasesSection } from '@/components/student/dashboard/StudentCompletedCasesSection'
import { StudentDashboardHeader } from '@/components/student/dashboard/StudentDashboardHeader'
import { StudentDashboardOverview } from '@/components/student/dashboard/StudentDashboardOverview'
import { StudentDashboardWorkspace } from '@/components/student/dashboard/StudentDashboardWorkspace'
import type {
  ActiveCase,
  LifecycleAction,
  MyRequest,
  PoolCase,
  ProgressComposerMode,
  ProgressEntry,
  ProgressFormValues,
} from '@/components/student/dashboard/types'

interface Props {
  poolCases: PoolCase[]
  poolCaseCount: number
  urgentPoolCaseCount: number
  myRequests: MyRequest[]
  activeCases: ActiveCase[]
  studentEmail: string
  studentFullName: string
  studentPhone: string
}

const EMPTY_PROGRESS_FORM: ProgressFormValues = {
  appointmentDate: '',
  appointmentTime: '',
  note: '',
  whatWasDone: '',
  nextStep: '',
  nextAppointmentDate: '',
  nextAppointmentTime: '',
}

const STUDENT_AVATAR_DB_NAME = 'dentbridge-student-avatar'
const STUDENT_AVATAR_STORE_NAME = 'avatars'
const STUDENT_AVATAR_MAX_BYTES = 2 * 1024 * 1024
const STUDENT_AVATAR_SIZE = 256

function getStudentAvatarKey(email: string) {
  return `student-avatar:${email.trim().toLowerCase()}`
}

function openStudentAvatarDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available.'))
      return
    }

    const request = indexedDB.open(STUDENT_AVATAR_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STUDENT_AVATAR_STORE_NAME)) {
        db.createObjectStore(STUDENT_AVATAR_STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open avatar storage.'))
  })
}

async function getStoredStudentAvatar(key: string): Promise<Blob | null> {
  const db = await openStudentAvatarDb()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STUDENT_AVATAR_STORE_NAME, 'readonly')
    const request = transaction.objectStore(STUDENT_AVATAR_STORE_NAME).get(key)

    request.onsuccess = () => {
      const result = request.result
      resolve(result instanceof Blob ? result : null)
    }
    request.onerror = () => reject(request.error ?? new Error('Unable to read avatar.'))
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => {
      db.close()
      reject(transaction.error ?? new Error('Unable to read avatar.'))
    }
  })
}

async function saveStoredStudentAvatar(key: string, blob: Blob): Promise<void> {
  const db = await openStudentAvatarDb()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STUDENT_AVATAR_STORE_NAME, 'readwrite')
    transaction.objectStore(STUDENT_AVATAR_STORE_NAME).put(blob, key)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error ?? new Error('Unable to save avatar.'))
    }
  })
}

async function deleteStoredStudentAvatar(key: string): Promise<void> {
  const db = await openStudentAvatarDb()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STUDENT_AVATAR_STORE_NAME, 'readwrite')
    transaction.objectStore(STUDENT_AVATAR_STORE_NAME).delete(key)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error ?? new Error('Unable to remove avatar.'))
    }
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to read this image.'))
    }
    image.src = objectUrl
  })
}

async function resizeStudentAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  if (file.size > STUDENT_AVATAR_MAX_BYTES) {
    throw new Error('Please choose an image smaller than 2 MB.')
  }

  const image = await loadImageFromFile(file)
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)

  if (!sourceSize) {
    throw new Error('This image could not be used.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = STUDENT_AVATAR_SIZE
  canvas.height = STUDENT_AVATAR_SIZE

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Image processing is not available in this browser.')
  }

  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2)
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2)

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    STUDENT_AVATAR_SIZE,
    STUDENT_AVATAR_SIZE
  )

  const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.86)
  if (webpBlob?.type === 'image/webp') {
    return webpBlob
  }

  const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.86)
  if (jpegBlob) {
    return jpegBlob
  }

  throw new Error('Unable to prepare this image.')
}

function buildProgressEntriesMap(activeCases: ActiveCase[]) {
  return Object.fromEntries(activeCases.map((c) => [c.caseId, c.progressEntries]))
}

export function DashboardClient({
  poolCases,
  poolCaseCount,
  urgentPoolCaseCount,
  myRequests,
  activeCases,
  studentEmail,
  studentFullName,
  studentPhone,
}: Props) {
  const router = useRouter()
  const { t, locale } = useI18n()

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>(
    // `status` is nullable in the schema; a null status behaves like '' in every
    // downstream comparison, so normalize here to keep this map string-valued.
    () => Object.fromEntries(activeCases.map((c) => [c.caseId, c.status ?? '']))
  )
  const [progressEntriesByCase, setProgressEntriesByCase] = useState<Record<string, ProgressEntry[]>>(
    () => buildProgressEntriesMap(activeCases)
  )
  const [openTimelines, setOpenTimelines] = useState<Record<string, boolean>>({})
  const [openComposer, setOpenComposer] = useState<{
    caseId: string
    mode: ProgressComposerMode
  } | null>(null)
  const [progressForm, setProgressForm] = useState<ProgressFormValues>(EMPTY_PROGRESS_FORM)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [avatarSaving, setAvatarSaving] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const avatarObjectUrlRef = useRef('')

  const ui =
    locale === 'tr'
      ? {
          heroHeading: 'Klinik panelinize hoş geldiniz',
          nextAction: 'Sonraki Adım',
          nothingUrgent: 'Şu anda acil bir işlem gerekmiyor.',
          contactPatient: 'Hastayla iletişime geç',
          confirmAppointment: 'Randevuyu onayla',
          startTreatment: 'Tedaviyi başlat',
          studentProfile: 'Öğrenci Profili',
          phoneOnFile: 'Telefon numarası',
          notAdded: 'Henüz eklenmedi',
          callNow: 'Hemen ara',
          copyNumber: 'Numarayı kopyala',
          copied: 'Kopyalandı',
          activePatients: 'Aktif Hastalarım',
          activePatientsDesc: 'Şu anda size atanmış hastalar',
          completedCases: 'Tamamlanan Vakalar',
          completedCasesDesc: 'Bölüme göre tamamladığınız vakalar',
          viewCompleted: 'Tamamlanan vakaları gör',
          noCompletedCases: 'Henüz tamamlanan vaka yok.',
          caseReference: 'Vaka referansı',
          completedStatus: 'Tamamlandı',
          completedDate: 'Tamamlanma tarihi',
          notRecorded: 'Kaydedilmedi',
          departmentFallback: 'Genel',
          noImmediateAction: 'Şu anda bekleyen işlem yok',
          continueWork: 'Çalışmaya devam et',
          manageAssignedCases: 'Atanmış vakalarınızı yönetin',
          pendingSummary: 'Bekleyen İstekler',
          pendingSummaryDesc: 'Fakülte onayı bekleyen talepleriniz',
          initialRequest: 'İlk talep:',
          changePhoto: 'Fotoğrafı değiştir',
          removePhoto: 'Fotoğrafı kaldır',
          photoSaving: 'Kaydediliyor...',
        }
      : {
          heroHeading: 'Welcome to your clinical dashboard',
          nextAction: 'Next Action',
          nothingUrgent: 'No urgent action is required right now.',
          contactPatient: 'Contact patient',
          confirmAppointment: 'Confirm appointment',
          startTreatment: 'Start treatment',
          studentProfile: 'Student Profile',
          phoneOnFile: 'Phone number',
          notAdded: 'Not added yet',
          callNow: 'Call now',
          copyNumber: 'Copy number',
          copied: 'Copied',
          activePatients: 'My Active Patients',
          activePatientsDesc: 'Patients currently assigned to you',
          completedCases: 'Completed Cases',
          completedCasesDesc: 'Cases you have completed by department',
          viewCompleted: 'View completed cases',
          noCompletedCases: 'No completed cases yet.',
          caseReference: 'Case reference',
          completedStatus: 'Completed',
          completedDate: 'Completed date',
          notRecorded: 'Not recorded',
          departmentFallback: 'General',
          noImmediateAction: 'No pending action right now',
          continueWork: 'Continue work',
          manageAssignedCases: 'Manage your assigned cases',
          pendingSummary: 'Pending Requests',
          pendingSummaryDesc: 'Requests still waiting for faculty review',
          initialRequest: 'Initial request:',
          changePhoto: 'Change photo',
          removePhoto: 'Remove photo',
          photoSaving: 'Saving...',
        }

  function tTreatment(v: string): string {
    const map: Record<string, string> = {
      'Initial Examination / Consultation': t('request.treatments.initialExam'),
      'Dental Cleaning': t('request.treatments.cleaning'),
      'Fillings': t('request.treatments.fillings'),
      'Tooth Extraction': t('request.treatments.extraction'),
      'Root Canal Treatment': t('request.treatments.rootCanal'),
      'Gum Treatment': t('request.treatments.gum'),
      'Prosthetics / Crowns': t('request.treatments.prosthetics'),
      'Orthodontics': t('request.treatments.orthodontics'),
      'Pediatric Dentistry': t('request.treatments.pediatric'),
      'Esthetic Dentistry': t('request.treatments.esthetic'),
      'Other': t('request.treatments.other'),
    }
    return map[v] ?? v
  }

  function tDept(v: string | null): string {
    if (!v) return ''
    const map: Record<string, string> = {
      'Endodontics': t('landing.depts.endodontics.name'),
      'Oral & Maxillofacial Surgery': t('landing.depts.surgery.name'),
      'Orthodontics': t('landing.depts.orthodontics.name'),
      'Periodontology': t('landing.depts.periodontology.name'),
      'Restorative Dentistry': t('landing.depts.restorative.name'),
      'Prosthodontics': t('landing.depts.prosthodontics.name'),
      'Pedodontics': t('landing.depts.pedodontics.name'),
      'Oral Radiology': t('landing.depts.radiology.name'),
    }
    return map[v] ?? v
  }

  function tUrgency(v: string): string {
    switch ((v || '').toLowerCase()) {
      case 'high': return t('request.urgencyHigh').toUpperCase()
      case 'medium': return t('request.urgencyMedium').toUpperCase()
      case 'low': return t('request.urgencyLow').toUpperCase()
      default: return (v || 'Unknown').toUpperCase()
    }
  }

  const avatarStorageKey = getStudentAvatarKey(studentEmail)

  function replaceAvatarUrl(blob: Blob | null) {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current)
      avatarObjectUrlRef.current = ''
    }

    if (!blob) {
      setAvatarUrl('')
      return
    }

    const nextUrl = URL.createObjectURL(blob)
    avatarObjectUrlRef.current = nextUrl
    setAvatarUrl(nextUrl)
  }

  useEffect(() => {
    let cancelled = false

    async function loadLocalAvatar() {
      try {
        const storedAvatar = await getStoredStudentAvatar(avatarStorageKey)
        if (!cancelled) {
          replaceAvatarUrl(storedAvatar)
        }
      } catch {
        if (!cancelled) {
          replaceAvatarUrl(null)
        }
      }
    }

    void loadLocalAvatar()

    return () => {
      cancelled = true
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current)
        avatarObjectUrlRef.current = ''
      }
    }
  }, [avatarStorageKey])

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setAvatarError('')

    if (!file) {
      return
    }

    setAvatarSaving(true)

    try {
      const resizedAvatar = await resizeStudentAvatar(file)
      await saveStoredStudentAvatar(avatarStorageKey, resizedAvatar)
      replaceAvatarUrl(resizedAvatar)
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Unable to save this photo.')
      replaceAvatarUrl(null)
    } finally {
      setAvatarSaving(false)
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError('')
    setAvatarSaving(true)

    try {
      await deleteStoredStudentAvatar(avatarStorageKey)
    } catch {
      // Removal is local-only. Even if IndexedDB fails, the visible avatar can still fall back.
    } finally {
      replaceAvatarUrl(null)
      setAvatarSaving(false)
    }
  }

  function handleAvatarImageError() {
    setAvatarError('')
    replaceAvatarUrl(null)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
  }

  useEffect(() => {
    if (!profileMenuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [profileMenuOpen])

  async function handleLifecycleAction(caseId: string, action: LifecycleAction) {
    if (actionLoading) return

    setActionLoading(caseId)
    setActionErrors((prev) => {
      const next = { ...prev }
      delete next[caseId]
      return next
    })

    const res = await portalFetch('student', `/api/student/cases/${caseId}/status`, {
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

  function resetProgressComposer() {
    setOpenComposer(null)
    setProgressForm(EMPTY_PROGRESS_FORM)
  }

  function toggleTimeline(caseId: string) {
    setOpenTimelines((prev) => ({ ...prev, [caseId]: !prev[caseId] }))
  }

  function openProgressComposer(caseId: string, mode: ProgressComposerMode) {
    setActionErrors((prev) => {
      const next = { ...prev }
      delete next[caseId]
      return next
    })
    setProgressForm(EMPTY_PROGRESS_FORM)
    setOpenComposer({ caseId, mode })
    setOpenTimelines((prev) => ({ ...prev, [caseId]: true }))
  }

  async function handleProgressSubmit(caseId: string) {
    if (!openComposer || openComposer.caseId !== caseId) {
      return
    }

    const mode = openComposer.mode
    const note = progressForm.note.trim()

    if ((mode === 'appointment' || mode === 'reschedule') && !progressForm.appointmentDate) {
      setActionErrors((prev) => ({
        ...prev,
        [caseId]: t('student.dashboard.appointmentDateRequired'),
      }))
      return
    }

    if ((mode === 'treatment_start' || mode === 'progress_note') && !note) {
      setActionErrors((prev) => ({
        ...prev,
        [caseId]: t('student.dashboard.progressNoteRequired'),
      }))
      return
    }

    setActionLoading(caseId)
    setActionErrors((prev) => {
      const next = { ...prev }
      delete next[caseId]
      return next
    })

    let requestInit: { url: string; method: string; body: object }

    if (mode === 'progress_note') {
      requestInit = {
        url: `/api/student/cases/${caseId}/progress`,
        method: 'POST',
        body: {
          note,
          what_was_done: progressForm.whatWasDone.trim() || undefined,
          next_step: progressForm.nextStep.trim() || undefined,
          next_appointment_date: progressForm.nextAppointmentDate || undefined,
          next_appointment_time: progressForm.nextAppointmentTime || undefined,
        },
      }
    } else if (mode === 'reschedule') {
      requestInit = {
        url: `/api/student/cases/${caseId}/status`,
        method: 'PATCH',
        body: {
          action: 'reschedule_appointment',
          appointment_date: progressForm.appointmentDate || undefined,
          appointment_time: progressForm.appointmentTime || undefined,
          note: progressForm.note.trim() || undefined,
        },
      }
    } else {
      requestInit = {
        url: `/api/student/cases/${caseId}/status`,
        method: 'PATCH',
        body: {
          action: mode === 'appointment' ? 'mark_appointment_scheduled' : 'mark_in_treatment',
          appointment_date: progressForm.appointmentDate || undefined,
          appointment_time: progressForm.appointmentTime || undefined,
          note: note || undefined,
          what_was_done: progressForm.whatWasDone.trim() || undefined,
          next_step: progressForm.nextStep.trim() || undefined,
          next_appointment_date: progressForm.nextAppointmentDate || undefined,
          next_appointment_time: progressForm.nextAppointmentTime || undefined,
        },
      }
    }

    const res = await portalFetch('student', requestInit.url, {
      method: requestInit.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestInit.body),
    })

    setActionLoading(null)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }))
      setActionErrors((prev) => ({
        ...prev,
        [caseId]: (body as { error?: string }).error ?? 'Failed to save progress',
      }))
      return
    }

    const payload = (await res.json()) as {
      data?: { status?: string; progressEntry?: ProgressEntry }
    }

    if (payload.data?.status) {
      setLocalStatuses((prev) => ({ ...prev, [caseId]: payload.data?.status ?? prev[caseId] }))
    }

    if (payload.data?.progressEntry) {
      setProgressEntriesByCase((prev) => ({
        ...prev,
        [caseId]: [payload.data!.progressEntry!, ...(prev[caseId] ?? [])],
      }))
    }

    setOpenTimelines((prev) => ({ ...prev, [caseId]: true }))
    resetProgressComposer()
  }

  function getActiveCaseStatusLabelShort(status: string): string {
    switch (status) {
      case 'student_approved':
        return t('student.dashboard.assigned')
      case 'contacted':
        return t('student.dashboard.stepContacted')
      case 'appointment_scheduled':
        return t('student.dashboard.stepApptSet')
      case 'in_treatment':
        return t('student.dashboard.stepInTreatment')
      case 'faculty_review':
        return t('student.dashboard.stepFacultyReview')
      case 'completed':
        return t('student.dashboard.statusCompleted')
      case 'cancelled':
        return t('student.dashboard.caseCancelledText')
      default:
        return status.replace(/_/g, ' ')
    }
  }

  function formatTimelineDateTime(iso: string): string {
    return new Date(iso).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function formatOptionalDate(value: string | null): string {
    if (!value) return ''
    return new Date(`${value}T00:00:00`).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
      dateStyle: 'medium',
    })
  }

  function formatOptionalTime(value: string | null): string {
    if (!value) return ''
    return value.slice(0, 5)
  }

  function getTimelinePrimaryText(entry: ProgressEntry): string {
    if (entry.note?.trim()) {
      return entry.note
    }

    if (entry.status_at_time === 'appointment_scheduled') {
      return t('student.dashboard.timelineNoNoteFallbackAppointment')
    }

    if (entry.status_at_time === 'rescheduled') {
      return t('student.dashboard.timelineRescheduled')
    }

    return t('student.dashboard.timelineNoNoteFallbackProgress')
  }

  function getCompletedDate(c: ActiveCase & { liveStatus: string; progressEntries: ProgressEntry[] }) {
    const completedEntry = c.progressEntries.find((entry) => entry.status_at_time === 'completed')
    return completedEntry?.created_at ?? ''
  }

  function handleProgressFormChange(values: Partial<ProgressFormValues>) {
    setProgressForm((prev) => ({ ...prev, ...values }))
  }

  const recentCases = useMemo(() => poolCases.slice(0, 5), [poolCases])

  const displayName = studentFullName?.trim() || ''
  const studentInitials = displayName
    ? displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : (studentEmail[0] ?? 'S').toUpperCase()

  const liveActiveCases = activeCases.map((c) => ({
    ...c,
    liveStatus: localStatuses[c.caseId] ?? c.status,
    progressEntries: progressEntriesByCase[c.caseId] ?? [],
  }))

  const trulyActiveCases = liveActiveCases.filter(
    (c) => !['completed', 'cancelled', 'faculty_review'].includes(c.liveStatus)
  )
  const completedCases = liveActiveCases.filter((c) => c.liveStatus === 'completed')
  const completedCasesByDepartment = completedCases.reduce<
    { department: string; cases: typeof completedCases }[]
  >((groups, c) => {
    const department = c.assigned_department ? tDept(c.assigned_department) : ui.departmentFallback
    const existingGroup = groups.find((group) => group.department === department)

    if (existingGroup) {
      existingGroup.cases.push(c)
    } else {
      groups.push({ department, cases: [c] })
    }

    return groups
  }, [])

  const stats = useMemo(
    () => ({
      available: poolCaseCount,
      urgent: urgentPoolCaseCount,
      pending: myRequests.filter((r) => r.status === 'pending').length,
      completed: completedCases.length,
    }),
    [poolCaseCount, urgentPoolCaseCount, myRequests, completedCases.length]
  )

  const actionRequiredCases = liveActiveCases.filter((c) => {
    return (
      c.liveStatus === 'student_approved' ||
      c.liveStatus === 'contacted' ||
      c.liveStatus === 'appointment_scheduled'
    )
  })

  const nextActionCase = actionRequiredCases[0] ?? null

  const nextActionLabel = nextActionCase
    ? nextActionCase.liveStatus === 'student_approved'
      ? ui.contactPatient
      : nextActionCase.liveStatus === 'contacted'
      ? ui.confirmAppointment
      : ui.startTreatment
    : ui.noImmediateAction

  const steps = [
    { label: t('student.dashboard.stepContacted'), step: 0 },
    { label: t('student.dashboard.stepApptSet'), step: 1 },
    { label: t('student.dashboard.stepInTreatment'), step: 2 },
    { label: t('student.dashboard.stepFacultyReview'), step: 3 },
  ]

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900">
      <StudentDashboardHeader
        actionRequiredCount={actionRequiredCases.length}
        profileMenuRef={profileMenuRef}
        avatarInputRef={avatarInputRef}
        profileMenuOpen={profileMenuOpen}
        avatarUrl={avatarUrl}
        avatarSaving={avatarSaving}
        avatarError={avatarError}
        studentInitials={studentInitials}
        ui={ui}
        onProfileMenuToggle={() => setProfileMenuOpen((prev) => !prev)}
        onCloseProfileMenu={() => setProfileMenuOpen(false)}
        onAvatarFileChange={handleAvatarFileChange}
        onAvatarImageError={handleAvatarImageError}
        onOpenAvatarPicker={() => avatarInputRef.current?.click()}
        onRemoveAvatar={handleRemoveAvatar}
        onSignOut={handleSignOut}
      />

      <InstallBanner />

      <section className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <StudentDashboardOverview
          actionRequiredCount={actionRequiredCases.length}
          nextActionCase={nextActionCase}
          nextActionLabel={nextActionLabel}
          trulyActiveCaseCount={trulyActiveCases.length}
          stats={stats}
          displayName={displayName}
          studentEmail={studentEmail}
          studentPhone={studentPhone}
          studentInitials={studentInitials}
          avatarUrl={avatarUrl}
          ui={ui}
          onAvatarImageError={handleAvatarImageError}
          tTreatment={tTreatment}
          tDept={tDept}
        />

        <StudentActiveCasesSection
          cases={trulyActiveCases}
          steps={steps}
          actionLoading={actionLoading}
          actionErrors={actionErrors}
          openTimelines={openTimelines}
          openComposer={openComposer}
          progressForm={progressForm}
          ui={ui}
          tTreatment={tTreatment}
          tDept={tDept}
          getActiveCaseStatusLabelShort={getActiveCaseStatusLabelShort}
          formatTimelineDateTime={formatTimelineDateTime}
          formatOptionalDate={formatOptionalDate}
          formatOptionalTime={formatOptionalTime}
          getTimelinePrimaryText={getTimelinePrimaryText}
          onToggleTimeline={toggleTimeline}
          onOpenProgressComposer={openProgressComposer}
          onProgressFormChange={handleProgressFormChange}
          onProgressSubmit={handleProgressSubmit}
          onResetProgressComposer={resetProgressComposer}
          onLifecycleAction={handleLifecycleAction}
        />

        <StudentCompletedCasesSection
          completedCases={completedCases}
          completedCasesByDepartment={completedCasesByDepartment}
          ui={ui}
          getCompletedDate={getCompletedDate}
          formatTimelineDateTime={formatTimelineDateTime}
        />

        <StudentDashboardWorkspace
          recentCases={recentCases}
          hasActiveCases={trulyActiveCases.length > 0}
          ui={ui}
          tTreatment={tTreatment}
          tUrgency={tUrgency}
        />
      </section>
    </main>
  )
}
