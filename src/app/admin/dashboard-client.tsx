'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Download,
  LogOut,
  ChevronDown,
  KeyRound,
  Clock,
  Inbox,
  Activity,
  Copy,
  Pause,
  Play,
  Square,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { isAdminRole } from '@/lib/roles'

type PatientRequest = {
  id: string
  full_name: string
  treatment_type: string
  urgency: string
  status: string
  assigned_department: string | null
  created_at: string | null
  reviewed_at: string | null
}

type DepartmentCaseItem = {
  name: string
  count: number
  barWidth: number
}

type BulkInviteStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'skipped_duplicate'
  | 'invalid_email'

type BulkRunState = 'idle' | 'sending' | 'paused' | 'stopped' | 'complete'

type BulkInviteRow = {
  id: string
  sourceLine: string
  email: string
  status: BulkInviteStatus
  errorMessage: string
  timestamp: string
}

interface Props {
  initialRequests: PatientRequest[]
  adminEmail: string
  currentRole: string | null
}

const BULK_INVITE_STORAGE_KEY = 'dentbridge.bulkStudentInvites.v1'
const BULK_INVITE_DELAY_MS = 30_000
const EMAIL_EXTRACT_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const EMAIL_VALIDATE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const bulkInviteCopy = {
  en: {
    title: 'Bulk Student Invite',
    desc:
      'Paste one student per line. Preview first, then send one invitation every 30 seconds through the existing student invite flow.',
    pasteLabel: 'Student email list',
    placeholder: 'Full Name - email@stu.istinye.edu.tr\nemail@stu.istinye.edu.tr',
    preview: 'Preview list',
    start: 'Start bulk invite',
    resume: 'Resume',
    pause: 'Pause',
    stop: 'Stop',
    copyReport: 'Copy report',
    exportReport: 'Export CSV',
    clear: 'Clear',
    pending: 'Pending',
    sending: 'Sending',
    sent: 'Sent',
    failed: 'Failed',
    duplicate: 'Skipped duplicate',
    invalid: 'Invalid email',
    line: 'Line',
    email: 'Email',
    status: 'Status',
    timestamp: 'Timestamp',
    message: 'Message',
    previewReady: 'Preview ready. Review the list, then start when ready.',
    nothingToPreview: 'Paste at least one line before previewing.',
    nothingToSend: 'There are no pending valid emails to send.',
    running: 'Bulk invite is running.',
    paused: 'Bulk invite paused. Progress is saved in this browser.',
    stopped: 'Bulk invite stopped. Pending rows were not sent.',
    complete: 'Bulk invite complete.',
    copied: 'Report copied.',
    rateLimited:
      'A rate-limit response was received. The queue has been paused so you can resume safely later.',
    restored: 'Previous bulk invite progress was restored from this browser.',
    nextInvitePrefix: 'Next invite after',
  },
  tr: {
    title: 'Toplu Öğrenci Daveti',
    desc:
      'Her satıra bir öğrenci yazın. Önce önizleyin, ardından mevcut öğrenci davet akışıyla her 30 saniyede bir davet gönderin.',
    pasteLabel: 'Öğrenci e-posta listesi',
    placeholder: 'Ad Soyad - email@stu.istinye.edu.tr\nemail@stu.istinye.edu.tr',
    preview: 'Listeyi önizle',
    start: 'Toplu daveti başlat',
    resume: 'Sürdür',
    pause: 'Duraklat',
    stop: 'Durdur',
    copyReport: 'Raporu kopyala',
    exportReport: 'CSV dışa aktar',
    clear: 'Temizle',
    pending: 'Bekliyor',
    sending: 'Gönderiliyor',
    sent: 'Gönderildi',
    failed: 'Başarısız',
    duplicate: 'Tekrar atlandı',
    invalid: 'Geçersiz e-posta',
    line: 'Satır',
    email: 'E-posta',
    status: 'Durum',
    timestamp: 'Zaman',
    message: 'Mesaj',
    previewReady: 'Önizleme hazır. Listeyi kontrol edip hazır olduğunuzda başlatın.',
    nothingToPreview: 'Önizleme için en az bir satır yapıştırın.',
    nothingToSend: 'Gönderilecek geçerli bekleyen e-posta yok.',
    running: 'Toplu davet çalışıyor.',
    paused: 'Toplu davet duraklatıldı. İlerleme bu tarayıcıda saklandı.',
    stopped: 'Toplu davet durduruldu. Bekleyen satırlar gönderilmedi.',
    complete: 'Toplu davet tamamlandı.',
    copied: 'Rapor kopyalandı.',
    rateLimited:
      'Hız sınırı yanıtı alındı. Daha sonra güvenle sürdürebilmeniz için kuyruk duraklatıldı.',
    restored: 'Önceki toplu davet ilerlemesi bu tarayıcıdan geri yüklendi.',
    nextInvitePrefix: 'Sonraki davet zamanı',
  },
} as const

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

function getStatusBadgeClass(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return 'bg-slate-100 text-slate-700 border border-slate-200'
    case 'under_review':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
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

function getBulkStatusBadgeClass(status: BulkInviteStatus) {
  switch (status) {
    case 'sent':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'skipped_duplicate':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'invalid_email':
      return 'border-slate-200 bg-slate-100 text-slate-600'
    case 'sending':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    default:
      return 'border-slate-200 bg-white text-slate-600'
  }
}

function extractEmailFromLine(line: string) {
  const match = line.match(EMAIL_EXTRACT_REGEX)
  return match?.[0]?.trim().toLowerCase() ?? ''
}

function parseBulkInviteInput(input: string): BulkInviteRow[] {
  const seenEmails = new Set<string>()

  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const email = extractEmailFromLine(line)
      const id = `${Date.now()}-${index}-${line.slice(0, 16)}`

      if (!email || !EMAIL_VALIDATE_REGEX.test(email)) {
        return {
          id,
          sourceLine: line,
          email,
          status: 'invalid_email',
          errorMessage: 'No valid email found on this line.',
          timestamp: '',
        }
      }

      if (seenEmails.has(email)) {
        return {
          id,
          sourceLine: line,
          email,
          status: 'skipped_duplicate',
          errorMessage: 'Duplicate in pasted list.',
          timestamp: '',
        }
      }

      seenEmails.add(email)

      return {
        id,
        sourceLine: line,
        email,
        status: 'pending',
        errorMessage: '',
        timestamp: '',
      }
    })
}

function isRateLimitMessage(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('rate') ||
    normalized.includes('too many') ||
    normalized.includes('429')
  )
}

function RelativeBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-teal-500 transition-all duration-500"
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function DashboardClient({ initialRequests, adminEmail, currentRole }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB'
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [locale]
  )
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [facultyInviteEmail, setFacultyInviteEmail] = useState('')
  const [facultyInviteLoading, setFacultyInviteLoading] = useState(false)
  const [facultyInviteMessage, setFacultyInviteMessage] = useState('')
  const [facultyInviteError, setFacultyInviteError] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [bulkInput, setBulkInput] = useState('')
  const [bulkRows, setBulkRows] = useState<BulkInviteRow[]>([])
  const [bulkRunState, setBulkRunState] = useState<BulkRunState>('idle')
  const [bulkMessage, setBulkMessage] = useState('')
  const [nextBulkInviteAt, setNextBulkInviteAt] = useState<string>('')
  const [bulkStorageReady, setBulkStorageReady] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const bulkRowsRef = useRef<BulkInviteRow[]>([])
  const bulkRunStateRef = useRef<BulkRunState>('idle')
  const nextBulkInviteAtRef = useRef('')
  const bulkProcessingRef = useRef(false)
  const bulkCopy = bulkInviteCopy[locale]

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

  function tStatus(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'submitted':            return t('admin.db.statusSubmitted')
      case 'under_review':         return t('admin.db.statusUnderReview')
      case 'matched':              return t('admin.db.statusMatched')
      case 'student_approved':     return t('admin.db.statusStudentApproved')
      case 'contacted':            return t('admin.db.statusContacted')
      case 'appointment_scheduled':return t('admin.db.statusApptScheduled')
      case 'in_treatment':         return t('admin.db.statusInTreatment')
      case 'completed':            return t('admin.db.statusCompleted')
      case 'rejected':             return t('admin.db.statusRejected')
      case 'cancelled':            return t('admin.db.statusCancelled')
      default:                     return status
    }
  }

  function tTreatment(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'initial examination / consultation': return t('admin.db.treatmentInitialExam')
      case 'dental cleaning':                    return t('admin.db.treatmentCleaning')
      case 'fillings':                           return t('admin.db.treatmentFillings')
      case 'tooth extraction':                   return t('admin.db.treatmentExtraction')
      case 'root canal treatment':               return t('admin.db.treatmentRootCanal')
      case 'gum treatment':                      return t('admin.db.treatmentGum')
      case 'prosthetics / crowns':               return t('admin.db.treatmentProsthetics')
      case 'orthodontics':                       return t('admin.db.treatmentOrthodontics')
      case 'pediatric dentistry':                return t('admin.db.treatmentPediatric')
      case 'esthetic dentistry':                 return t('admin.db.treatmentEsthetic')
      case 'other':                              return t('admin.db.treatmentOther')
      default:                                   return type
    }
  }

  function tDepartment(dept: string): string {
    switch ((dept || '').toLowerCase()) {
      case 'endodontics':                   return t('admin.db.deptEndodontics')
      case 'oral & maxillofacial surgery':  return t('admin.db.deptSurgery')
      case 'orthodontics':                  return t('admin.db.deptOrthodontics')
      case 'periodontology':                return t('admin.db.deptPeriodontology')
      case 'restorative dentistry':         return t('admin.db.deptRestorative')
      case 'prosthodontics':                return t('admin.db.deptProsthodontics')
      case 'pedodontics':                   return t('admin.db.deptPedodontics')
      case 'oral radiology':                return t('admin.db.deptRadiology')
      case 'general review':                return t('admin.db.deptGeneralReview')
      default:                              return dept
    }
  }

  function tUrgency(urgency: string): string {
    switch ((urgency || '').toLowerCase()) {
      case 'high':   return t('request.urgencyHigh')
      case 'medium': return t('request.urgencyMedium')
      case 'low':    return t('request.urgencyLow')
      default:       return urgency || t('admin.requests.urgencyLabelUnspecified')
    }
  }

  function formatSubmittedDate(iso: string | null): string {
    if (!iso) return ''

    return new Date(iso).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function escapeCsvValue(value: string): string {
    const normalized = value.replaceAll('"', '""')
    return `"${normalized}"`
  }

  function handleExportCsv() {
    const headers = [
      t('admin.dashboard.csvHeaderPatientId'),
      t('admin.dashboard.csvHeaderPatientName'),
      t('admin.dashboard.csvHeaderIssue'),
      t('admin.dashboard.csvHeaderUrgency'),
      t('admin.dashboard.csvHeaderStatus'),
      t('admin.dashboard.csvHeaderAssignedDepartment'),
      t('admin.dashboard.csvHeaderSubmittedDate'),
    ]

    const rows = initialRequests.map((request) => [
      request.id,
      request.full_name,
      tTreatment(request.treatment_type),
      tUrgency(request.urgency),
      tStatus(request.status),
      request.assigned_department ? tDepartment(request.assigned_department) : '',
      formatSubmittedDate(request.created_at),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(String(value ?? ''))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateSuffix = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `${t('admin.dashboard.exportCsvFilename')}-${dateSuffix}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function updateBulkRows(updater: (current: BulkInviteRow[]) => BulkInviteRow[]) {
    setBulkRows((current) => {
      const nextRows = updater(current)
      bulkRowsRef.current = nextRows
      return nextRows
    })
  }

  function setBulkRunStateSafe(nextState: BulkRunState) {
    bulkRunStateRef.current = nextState
    setBulkRunState(nextState)
  }

  function setNextBulkInviteTime(value: string) {
    nextBulkInviteAtRef.current = value
    setNextBulkInviteAt(value)
  }

  function formatBulkStatus(status: BulkInviteStatus) {
    switch (status) {
      case 'sent':
        return bulkCopy.sent
      case 'failed':
        return bulkCopy.failed
      case 'skipped_duplicate':
        return bulkCopy.duplicate
      case 'invalid_email':
        return bulkCopy.invalid
      case 'sending':
        return bulkCopy.sending
      default:
        return bulkCopy.pending
    }
  }

  function formatBulkTimestamp(value: string) {
    if (!value) return ''

    return new Date(value).toLocaleString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  function buildBulkReportCsv() {
    const headers = [
      bulkCopy.line,
      bulkCopy.email,
      bulkCopy.status,
      bulkCopy.timestamp,
      bulkCopy.message,
    ]

    const rows = bulkRows.map((row) => [
      row.sourceLine,
      row.email,
      formatBulkStatus(row.status),
      row.timestamp,
      row.errorMessage,
    ])

    return [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(String(value ?? ''))).join(','))
      .join('\n')
  }

  async function sendBulkInviteAt(rowIndex: number): Promise<'sent' | 'failed' | 'rate-limited'> {
    const startedAt = new Date().toISOString()

    updateBulkRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? { ...row, status: 'sending', errorMessage: '', timestamp: startedAt }
          : row
      )
    )

    const row = bulkRowsRef.current[rowIndex]
    if (!row || !row.email) {
      return 'failed'
    }

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: row.email,
        }),
      })

      const result = (await response.json()) as { error?: string }
      const finishedAt = new Date().toISOString()

      if (!response.ok) {
        const message = result.error || t('admin.dashboard.inviteStudentErrorGeneric')

        if (isRateLimitMessage(message)) {
          updateBulkRows((current) =>
            current.map((item, index) =>
              index === rowIndex
                ? {
                    ...item,
                    status: 'pending',
                    errorMessage: message,
                    timestamp: finishedAt,
                  }
                : item
            )
          )
          return 'rate-limited'
        }

        updateBulkRows((current) =>
          current.map((item, index) =>
            index === rowIndex
              ? {
                  ...item,
                  status: 'failed',
                  errorMessage: message,
                  timestamp: finishedAt,
                }
              : item
          )
        )
        return 'failed'
      }

      updateBulkRows((current) =>
        current.map((item, index) =>
          index === rowIndex
            ? { ...item, status: 'sent', errorMessage: '', timestamp: finishedAt }
            : item
        )
      )
      return 'sent'
    } catch (error) {
      const message = error instanceof Error ? error.message : t('admin.dashboard.inviteStudentErrorGeneric')
      const finishedAt = new Date().toISOString()

      updateBulkRows((current) =>
        current.map((item, index) =>
          index === rowIndex
            ? {
                ...item,
                status: 'failed',
                errorMessage: message,
                timestamp: finishedAt,
              }
            : item
        )
      )
      return 'failed'
    }
  }

  async function waitForBulkThrottle() {
    const scheduledAt = nextBulkInviteAtRef.current
    if (!scheduledAt) return true

    while (bulkRunStateRef.current === 'sending') {
      const remainingMs = new Date(scheduledAt).getTime() - Date.now()
      if (remainingMs <= 0) {
        setNextBulkInviteTime('')
        return true
      }

      await new Promise((resolve) => window.setTimeout(resolve, Math.min(remainingMs, 1000)))
    }

    return false
  }

  async function processBulkQueue() {
    if (bulkProcessingRef.current) return

    bulkProcessingRef.current = true
    setBulkRunStateSafe('sending')
    setBulkMessage(bulkCopy.running)

    while (bulkRunStateRef.current === 'sending') {
      const canContinue = await waitForBulkThrottle()
      if (!canContinue) break

      const nextRowIndex = bulkRowsRef.current.findIndex((row) => row.status === 'pending')

      if (nextRowIndex === -1) {
        setBulkRunStateSafe('complete')
        setNextBulkInviteTime('')
        setBulkMessage(bulkCopy.complete)
        break
      }

      const result = await sendBulkInviteAt(nextRowIndex)

      if (result === 'rate-limited') {
        setBulkRunStateSafe('paused')
        setNextBulkInviteTime('')
        setBulkMessage(bulkCopy.rateLimited)
        break
      }

      if (bulkRunStateRef.current !== 'sending') {
        break
      }

      if (bulkRowsRef.current.some((row) => row.status === 'pending')) {
        setNextBulkInviteTime(new Date(Date.now() + BULK_INVITE_DELAY_MS).toISOString())
      }
    }

    bulkProcessingRef.current = false
  }

  function handleBulkPreview() {
    const rows = parseBulkInviteInput(bulkInput)

    if (rows.length === 0) {
      setBulkMessage(bulkCopy.nothingToPreview)
      return
    }

    bulkRowsRef.current = rows
    setBulkRows(rows)
    setBulkRunStateSafe('idle')
    setNextBulkInviteTime('')
    setBulkMessage(bulkCopy.previewReady)
  }

  function handleStartBulkInvite() {
    const hasPendingRows = bulkRowsRef.current.some((row) => row.status === 'pending')

    if (!hasPendingRows) {
      setBulkMessage(bulkCopy.nothingToSend)
      return
    }

    void processBulkQueue()
  }

  function handlePauseBulkInvite() {
    if (bulkRunStateRef.current !== 'sending') return
    setBulkRunStateSafe('paused')
    setBulkMessage(bulkCopy.paused)
  }

  function handleStopBulkInvite() {
    if (bulkRunStateRef.current !== 'sending' && bulkRunStateRef.current !== 'paused') return
    setBulkRunStateSafe('stopped')
    setNextBulkInviteTime('')
    setBulkMessage(bulkCopy.stopped)
  }

  async function handleCopyBulkReport() {
    if (bulkRows.length === 0) return

    try {
      await navigator.clipboard.writeText(buildBulkReportCsv())
      setBulkMessage(bulkCopy.copied)
    } catch {
      setBulkMessage(buildBulkReportCsv())
    }
  }

  function handleExportBulkReport() {
    if (bulkRows.length === 0) return

    const csv = buildBulkReportCsv()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateSuffix = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `dentbridge-bulk-student-invites-${dateSuffix}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function handleClearBulkInvites() {
    setBulkInput('')
    setBulkRows([])
    bulkRowsRef.current = []
    setBulkRunStateSafe('idle')
    setNextBulkInviteTime('')
    setBulkMessage('')
  }

  useEffect(() => {
    bulkRowsRef.current = bulkRows
  }, [bulkRows])

  useEffect(() => {
    bulkRunStateRef.current = bulkRunState
  }, [bulkRunState])

  useEffect(() => {
    try {
      const savedProgress = window.localStorage.getItem(BULK_INVITE_STORAGE_KEY)

      if (savedProgress) {
        const parsed = JSON.parse(savedProgress) as {
          input?: string
          rows?: BulkInviteRow[]
          runState?: BulkRunState
          nextInviteAt?: string
        }

        if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          const restoredRows = parsed.rows.map((row) =>
            row.status === 'sending' ? { ...row, status: 'pending' as const } : row
          )
          const restoredState =
            parsed.runState === 'sending' ? 'paused' : parsed.runState || 'idle'

          setBulkInput(parsed.input ?? '')
          bulkRowsRef.current = restoredRows
          setBulkRows(restoredRows)
          setBulkRunStateSafe(restoredState)
          setNextBulkInviteTime(restoredState === 'paused' ? parsed.nextInviteAt ?? '' : '')
          setBulkMessage(bulkCopy.restored)
        }
      }
    } catch {
      // Ignore malformed local progress and let the current dashboard session continue.
    }

    setBulkStorageReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!bulkStorageReady) return

    const stateToSave = bulkRunState === 'sending' ? 'paused' : bulkRunState

    window.localStorage.setItem(
      BULK_INVITE_STORAGE_KEY,
      JSON.stringify({
        input: bulkInput,
        rows: bulkRows,
        runState: stateToSave,
        nextInviteAt: nextBulkInviteAt,
      })
    )
  }, [bulkInput, bulkRows, bulkRunState, bulkStorageReady, nextBulkInviteAt])

  const bulkSummary = useMemo(
    () => ({
      pending: bulkRows.filter((row) => row.status === 'pending' || row.status === 'sending')
        .length,
      sent: bulkRows.filter((row) => row.status === 'sent').length,
      failed: bulkRows.filter((row) => row.status === 'failed').length,
      duplicate: bulkRows.filter((row) => row.status === 'skipped_duplicate').length,
      invalid: bulkRows.filter((row) => row.status === 'invalid_email').length,
    }),
    [bulkRows]
  )

  const avgTriageTimeLabel = useMemo(() => {
    const completedTriageDurations = initialRequests
      .filter((request) =>
        ['matched', 'rejected'].includes((request.status || '').toLowerCase()) &&
        request.created_at &&
        request.reviewed_at
      )
      .map((request) => {
        const createdAt = new Date(request.created_at as string).getTime()
        const reviewedAt = new Date(request.reviewed_at as string).getTime()
        return reviewedAt - createdAt
      })
      .filter((duration) => duration >= 0)

    if (completedTriageDurations.length === 0) {
      return t('admin.dashboard.statAvgTriageTimeNoData')
    }

    const avgMs =
      completedTriageDurations.reduce((sum, duration) => sum + duration, 0) /
      completedTriageDurations.length

    const hours = avgMs / (1000 * 60 * 60)

    if (hours < 24) {
      return `${numberFormatter.format(hours)} ${t('admin.dashboard.avgTriageHours')}`
    }

    const days = hours / 24
    return `${numberFormatter.format(days)} ${t('admin.dashboard.avgTriageDays')}`
  }, [initialRequests, numberFormatter, t])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
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

  async function handleInviteStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInviteMessage('')
    setInviteError('')

    const normalizedEmail = inviteEmail.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setInviteError(t('admin.dashboard.inviteStudentInvalidEmail'))
      return
    }

    setInviteLoading(true)

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setInviteError(result.error || t('admin.dashboard.inviteStudentErrorGeneric'))
        setInviteLoading(false)
        return
      }

      setInviteMessage(t('admin.dashboard.inviteStudentSuccess'))
      setInviteEmail('')
    } catch {
      setInviteError(t('admin.dashboard.inviteStudentErrorGeneric'))
    }

    setInviteLoading(false)
  }

  async function handleInviteFaculty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFacultyInviteMessage('')
    setFacultyInviteError('')

    const normalizedEmail = facultyInviteEmail.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFacultyInviteError(t('admin.dashboard.inviteFacultyInvalidEmail'))
      return
    }

    setFacultyInviteLoading(true)

    try {
      const response = await fetch('/api/admin/invitations/faculty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setFacultyInviteError(result.error || t('admin.dashboard.inviteFacultyErrorGeneric'))
        setFacultyInviteLoading(false)
        return
      }

      setFacultyInviteMessage(t('admin.dashboard.inviteFacultySuccess'))
      setFacultyInviteEmail('')
    } catch {
      setFacultyInviteError(t('admin.dashboard.inviteFacultyErrorGeneric'))
    }

    setFacultyInviteLoading(false)
  }

  const dashboardStats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const newToday = initialRequests.filter((r) => {
      if (!r.created_at) return false
      return new Date(r.created_at) >= todayStart
    }).length

    const pendingReview = initialRequests.filter((r) =>
      ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
    ).length

    const activeTreatments = initialRequests.filter(
      (r) => (r.status || '').toLowerCase() === 'matched'
    ).length

    const total = initialRequests.length

    const completed = initialRequests.filter(
      (r) => (r.status || '').toLowerCase() === 'completed'
    ).length

    const cancelled = initialRequests.filter(
      (r) => (r.status || '').toLowerCase() === 'cancelled'
    ).length

    const inTreatment = initialRequests.filter(
      (r) => (r.status || '').toLowerCase() === 'in_treatment'
    ).length

    return { newToday, pendingReview, activeTreatments, total, completed, cancelled, inTreatment }
  }, [initialRequests])

  const recentRequests = useMemo(() => initialRequests.slice(0, 5), [initialRequests])

  const urgentUnreviewedList = useMemo(
    () =>
      initialRequests
        .filter(
          (r) =>
            (r.urgency || '').toLowerCase() === 'high' &&
            ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
        )
        .slice(0, 3),
    [initialRequests]
  )

  const departmentCases = useMemo<DepartmentCaseItem[]>(() => {
    const departmentNames = [
      'Endodontics',
      'Oral & Maxillofacial Surgery',
      'Orthodontics',
      'Periodontology',
      'Restorative Dentistry',
      'Prosthodontics',
      'Pedodontics',
      'Oral Radiology',
    ]

    const counts = departmentNames.map((name) => ({
      name,
      count: initialRequests.filter(
        (r) =>
          (r.assigned_department || '').toLowerCase() === name.toLowerCase() &&
          !['rejected', 'completed', 'cancelled'].includes((r.status || '').toLowerCase())
      ).length,
    }))

    const withCases = counts.filter((d) => d.count > 0)
    if (withCases.length === 0) return []

    const maxCount = Math.max(...withCases.map((d) => d.count))
    return withCases.map((d) => ({
      ...d,
      barWidth: Math.round((d.count / maxCount) * 100),
    }))
  }, [initialRequests])

  const urgentCasesCount = useMemo(
    () =>
      initialRequests.filter(
        (r) =>
          (r.urgency || '').toLowerCase() === 'high' &&
          ['submitted', 'under_review'].includes((r.status || '').toLowerCase())
      ).length,
    [initialRequests]
  )

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img
              src="/dentbridge-icon.webp"
              alt="DentBridge icon"
              className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm sm:text-lg font-bold leading-none text-slate-900">DentBridge</p>
              <p className="hidden sm:block truncate text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-500">
                {t('admin.shared.clinicalPlatform')}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/admin" className="text-slate-900">
              {t('admin.shared.navDashboard')}
            </Link>
            <Link href="/admin/requests" className="hover:text-slate-900">
              {t('admin.shared.navTriageReview')}
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {adminEmail && (
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                <span className="max-w-[150px] truncate">{adminEmail}</span>
              </div>
            )}
            <LanguageSwitcher />
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-expanded={profileMenuOpen}
                aria-label="Open account menu"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                <span className="hidden sm:inline">Account</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <Link
                    href="/change-password"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    Change Password
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <LogOut className="h-4 w-4 text-slate-400" />
                    {t('admin.shared.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        {/* ── Page title + CTA ───────────────────────────────────────────── */}
        <div className="mb-4 sm:mb-8 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {t('admin.dashboard.pageTitle')}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-slate-500">
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-teal-500" />
              <span>{t('admin.dashboard.systemsOnline')}</span>
              {dashboardStats.pendingReview > 0 && (
                <>
                  <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                  <span className="font-semibold text-amber-600">
                    {dashboardStats.pendingReview === 1
                      ? t('admin.dashboard.caseAwaitingReview')
                      : `${dashboardStats.pendingReview} ${t('admin.dashboard.casesAwaitingReview')}`}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 sm:w-auto sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('admin.dashboard.exportCsvButton')}
            </button>

            <Link
              href="/admin/requests"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-blue-900 px-4 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:w-auto"
            >
              {t('admin.dashboard.openWorkQueue')}
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
            <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
              <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-slate-400" />
              <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.dashboard.statNewTodayLabel')}
              </span>
            </div>
            <div className="truncate text-xl sm:text-5xl font-bold tracking-tight text-blue-900">
              {dashboardStats.newToday}
            </div>
            <div className="mt-0.5 sm:mt-2 truncate text-[10px] sm:text-sm text-slate-500">{t('admin.dashboard.statNewTodayDesc')}</div>
          </div>

          <div
            className={`min-w-0 rounded-xl sm:rounded-2xl border bg-white p-3 sm:p-6 shadow-sm transition ${
              dashboardStats.pendingReview > 0 ? 'border-amber-200' : 'border-slate-200'
            }`}
          >
            <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-500" />
              <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.dashboard.statPendingLabel')}
              </span>
            </div>
            <div
              className={`truncate text-xl sm:text-5xl font-bold tracking-tight ${
                dashboardStats.pendingReview > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {dashboardStats.pendingReview}
            </div>
            <div className="mt-0.5 sm:mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-1 sm:gap-2">
              <span className="truncate text-[10px] sm:text-sm text-slate-500">{t('admin.dashboard.statPendingDesc')}</span>
              {dashboardStats.pendingReview > 0 && (
                <Link
                  href="/admin/requests"
                  className="shrink-0 text-[10px] sm:text-xs font-semibold text-amber-600 hover:underline"
                >
                  {t('admin.dashboard.statPendingReviewLink')}
                </Link>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
            <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-violet-500" />
              <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.dashboard.statMatchedLabel')}
              </span>
            </div>
            <div className="truncate text-xl sm:text-5xl font-bold tracking-tight text-violet-700">
              {dashboardStats.activeTreatments}
            </div>
            <div className="mt-0.5 sm:mt-2 truncate text-[10px] sm:text-sm text-slate-500">{t('admin.dashboard.statMatchedDesc')}</div>
          </div>

          <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
            <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-teal-500" />
              <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.dashboard.statTotalLabel')}
              </span>
            </div>
            <div className="truncate text-xl sm:text-5xl font-bold tracking-tight text-teal-600">
              {dashboardStats.total}
            </div>
            <div className="mt-0.5 sm:mt-2 truncate text-[10px] sm:text-sm text-slate-500">{t('admin.dashboard.statTotalDesc')}</div>
          </div>

          <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
            <div className="mb-1.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-cyan-600" />
              <span className="truncate text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.dashboard.statAvgTriageTimeLabel')}
              </span>
            </div>
            <div className="truncate text-lg sm:text-4xl font-bold tracking-tight text-cyan-700">
              {avgTriageTimeLabel}
            </div>
            <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-sm text-slate-500">
              {t('admin.dashboard.statAvgTriageTimeDesc')}
            </div>
          </div>
        </div>

        {/* ── Outcome summary pills ──────────────────────────────────────── */}
        <div className="mt-3 sm:mt-4 grid w-full grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 sm:px-4 sm:py-3">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <div className="min-w-0">
              <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                {t('admin.dashboard.statCompletedLabel')}
              </p>
              <p className="truncate text-base sm:text-xl font-bold leading-tight text-emerald-800">
                {dashboardStats.completed}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 sm:px-4 sm:py-3">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full bg-rose-400" />
            <div className="min-w-0">
              <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                {t('admin.dashboard.statCancelledLabel')}
              </p>
              <p className="truncate text-base sm:text-xl font-bold leading-tight text-rose-800">
                {dashboardStats.cancelled}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 sm:px-4 sm:py-3">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full bg-blue-500" />
            <div className="min-w-0">
              <p className="truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                {t('admin.dashboard.statInTreatmentLabel')}
              </p>
              <p className="truncate text-base sm:text-xl font-bold leading-tight text-blue-800">
                {dashboardStats.inTreatment}
              </p>
            </div>
          </div>
        </div>

        {isAdminRole(currentRole) && (
          <>
          <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="max-w-3xl">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  {t('admin.dashboard.inviteStudentTitle')}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                  {t('admin.dashboard.inviteStudentDesc')}
                </p>
              </div>

              <form onSubmit={handleInviteStudent} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('admin.dashboard.inviteStudentEmailLabel')}
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t('admin.dashboard.inviteStudentEmailPlaceholder')}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {inviteLoading
                    ? t('admin.dashboard.inviteStudentSending')
                    : t('admin.dashboard.inviteStudentButton')}
                </button>
              </form>

              {inviteError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {inviteError}
                </div>
              )}

              {inviteMessage && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {inviteMessage}
                </div>
              )}
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="max-w-3xl">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  {t('admin.dashboard.inviteFacultyTitle')}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                  {t('admin.dashboard.inviteFacultyDesc')}
                </p>
              </div>

              <form onSubmit={handleInviteFaculty} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('admin.dashboard.inviteFacultyEmailLabel')}
                  </label>
                  <input
                    type="email"
                    value={facultyInviteEmail}
                    onChange={(e) => setFacultyInviteEmail(e.target.value)}
                    placeholder={t('admin.dashboard.inviteFacultyEmailPlaceholder')}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={facultyInviteLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {facultyInviteLoading
                    ? t('admin.dashboard.inviteFacultySending')
                    : t('admin.dashboard.inviteFacultyButton')}
                </button>
              </form>

              {facultyInviteError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {facultyInviteError}
                </div>
              )}

              {facultyInviteMessage && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {facultyInviteMessage}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  {bulkCopy.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                  {bulkCopy.desc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5 lg:min-w-[520px]">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="font-semibold text-slate-500">{bulkCopy.pending}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{bulkSummary.pending}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="font-semibold text-emerald-700">{bulkCopy.sent}</p>
                  <p className="mt-1 text-lg font-bold text-emerald-800">{bulkSummary.sent}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="font-semibold text-red-700">{bulkCopy.failed}</p>
                  <p className="mt-1 text-lg font-bold text-red-800">{bulkSummary.failed}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="font-semibold text-amber-800">{bulkCopy.duplicate}</p>
                  <p className="mt-1 text-lg font-bold text-amber-900">{bulkSummary.duplicate}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="font-semibold text-slate-500">{bulkCopy.invalid}</p>
                  <p className="mt-1 text-lg font-bold text-slate-700">{bulkSummary.invalid}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
              <div className="min-w-0">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {bulkCopy.pasteLabel}
                </label>
                <textarea
                  value={bulkInput}
                  onChange={(event) => setBulkInput(event.target.value)}
                  disabled={bulkRunState === 'sending'}
                  placeholder={bulkCopy.placeholder}
                  className="h-64 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 font-mono text-xs leading-relaxed outline-none transition focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleBulkPreview}
                    disabled={bulkRunState === 'sending'}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkCopy.preview}
                  </button>

                  <button
                    type="button"
                    onClick={handleStartBulkInvite}
                    disabled={
                      bulkRunState === 'sending' ||
                      bulkSummary.pending === 0 ||
                      bulkRows.length === 0
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Play className="h-4 w-4" />
                    {bulkRunState === 'paused' || bulkRunState === 'stopped'
                      ? bulkCopy.resume
                      : bulkCopy.start}
                  </button>

                  <button
                    type="button"
                    onClick={handlePauseBulkInvite}
                    disabled={bulkRunState !== 'sending'}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pause className="h-4 w-4" />
                    {bulkCopy.pause}
                  </button>

                  <button
                    type="button"
                    onClick={handleStopBulkInvite}
                    disabled={bulkRunState !== 'sending' && bulkRunState !== 'paused'}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Square className="h-4 w-4" />
                    {bulkCopy.stop}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBulkReport}
                    disabled={bulkRows.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" />
                    {bulkCopy.copyReport}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportBulkReport}
                    disabled={bulkRows.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {bulkCopy.exportReport}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearBulkInvites}
                    disabled={bulkRunState === 'sending'}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkCopy.clear}
                  </button>
                </div>

                {(bulkMessage || nextBulkInviteAt) && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    {bulkMessage}
                    {nextBulkInviteAt && bulkRunState === 'sending' && (
                      <span className="block pt-1 text-xs font-semibold text-blue-700">
                        {bulkCopy.nextInvitePrefix}:{' '}
                        {formatBulkTimestamp(nextBulkInviteAt)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
                <div className="max-h-[28rem] overflow-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">{bulkCopy.line}</th>
                        <th className="px-4 py-3 font-semibold">{bulkCopy.email}</th>
                        <th className="px-4 py-3 font-semibold">{bulkCopy.status}</th>
                        <th className="px-4 py-3 font-semibold">{bulkCopy.timestamp}</th>
                        <th className="px-4 py-3 font-semibold">{bulkCopy.message}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {bulkRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                            {bulkCopy.nothingToPreview}
                          </td>
                        </tr>
                      ) : (
                        bulkRows.map((row) => (
                          <tr key={row.id}>
                            <td className="max-w-[220px] px-4 py-3 align-top text-xs text-slate-600">
                              <span className="line-clamp-2 break-words">{row.sourceLine}</span>
                            </td>
                            <td className="px-4 py-3 align-top font-mono text-xs text-slate-700">
                              {row.email || '-'}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getBulkStatusBadgeClass(
                                  row.status
                                )}`}
                              >
                                {formatBulkStatus(row.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-slate-500">
                              {formatBulkTimestamp(row.timestamp) || '-'}
                            </td>
                            <td className="max-w-[260px] px-4 py-3 align-top text-xs text-slate-600">
                              <span className="line-clamp-3 break-words">
                                {row.errorMessage || '-'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          </>
        )}

        {/* ── Layout מותאם למובייל ומחשב: הכל נכנס למסגרות שלא חורגות מהרוחב ── */}
        <div className="mt-6 sm:mt-8 flex w-full flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start">
          
          {/* ── Left Column (Tables & Queues) ── */}
          <div className="min-w-0 flex-1 space-y-6 sm:space-y-8 w-full">
            
            {/* Priority queue: urgent unreviewed cases */}
            {urgentUnreviewedList.length > 0 && (
              <div className="w-full">
                <div className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-red-600" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {t('admin.dashboard.urgentQueueTitle')}
                    </h2>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 sm:px-2.5 sm:py-0.5 text-[10px] sm:text-xs font-bold text-red-700">
                      {urgentUnreviewedList.length}
                    </span>
                  </div>
                  <Link
                    href="/admin/requests"
                    className="text-xs sm:text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {t('admin.dashboard.viewAll')}
                  </Link>
                </div>

                <div className="w-full overflow-hidden rounded-xl sm:rounded-2xl border border-red-200 bg-white shadow-sm">
                  {urgentUnreviewedList.map((r, i) => (
                    <div
                      key={r.id}
                      className={`flex flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 ${
                        i < urgentUnreviewedList.length - 1 ? 'border-b border-slate-100' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3 sm:flex-1 sm:items-center">
                        <div className="mt-1 h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full bg-red-500 sm:mt-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm sm:text-base font-semibold text-slate-900">{r.full_name}</p>
                          <p className="mt-0.5 break-words text-xs sm:text-sm text-slate-500">
                            {tTreatment(r.treatment_type)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:block sm:text-right">
                        <p className="text-[10px] sm:text-xs text-slate-400">{relativeTime(r.created_at)}</p>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 sm:px-2.5 sm:py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                            r.status
                          )}`}
                        >
                          {tStatus(r.status)}
                        </span>
                      </div>

                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 sm:w-auto"
                      >
                        {t('admin.dashboard.reviewNow')}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Requests Table */}
            <div className="w-full">
              <div className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    Recent Requests
                  </h2>
                </div>
                <Link
                  href="/admin/requests"
                  className="flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
                >
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="w-full overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Mobile cards */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {recentRequests.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500 text-center">
                      {t('admin.dashboard.noRequests')}
                    </div>
                  ) : (
                    recentRequests.map((r) => (
                      <Link
                        key={r.id}
                        href={`/admin/requests/${r.id}`}
                        className="block w-full px-4 py-4 transition hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{r.full_name}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                              {r.id.slice(0, 8)}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {relativeTime(r.created_at)}
                          </span>
                        </div>

                        <p className="mt-2 break-words text-xs text-slate-600">
                          {tTreatment(r.treatment_type)}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold ${getUrgencyBadgeClass(
                              r.urgency
                            )}`}
                          >
                            {tUrgency(r.urgency)}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                              r.status
                            )}`}
                          >
                            {tStatus(r.status)}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                
                {/* Desktop / tablet table */}
                <div className="hidden w-full overflow-x-auto md:block">
                  <table className="w-full min-w-[600px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tablePatient')}</th>
                        <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tableIssue')}</th>
                        <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tableUrgency')}</th>
                        <th className="px-5 py-3 font-semibold">{t('admin.dashboard.tableStatus')}</th>
                        <th className="px-5 py-3 text-right font-semibold">
                          {t('admin.dashboard.tableSubmitted')}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {recentRequests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-sm text-slate-500 text-center">
                            {t('admin.dashboard.noRequests')}
                          </td>
                        </tr>
                      ) : (
                        recentRequests.map((r) => (
                          <tr key={r.id} className="group transition hover:bg-slate-50">
                            <td className="px-5 py-4">
                              <Link href={`/admin/requests/${r.id}`} className="block">
                                <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-900">
                                  {r.full_name}
                                </div>
                                <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                                  {r.id.slice(0, 8)}
                                </div>
                              </Link>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {tTreatment(r.treatment_type)}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getUrgencyBadgeClass(
                                  r.urgency
                                )}`}
                              >
                                {tUrgency(r.urgency).toUpperCase()}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                                  r.status
                                )}`}
                              >
                                {tStatus(r.status)}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <Link
                                href={`/admin/requests/${r.id}`}
                                className="flex items-center justify-end gap-1 whitespace-nowrap text-xs text-slate-400 hover:text-blue-700"
                              >
                                {relativeTime(r.created_at)}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="w-full min-w-0 space-y-4 sm:space-y-6 lg:w-80 lg:shrink-0 xl:w-96">
            <div className="w-full">
              <h2 className="mb-2 sm:mb-4 text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {t('admin.dashboard.casesByDept')}
              </h2>

              <div className="min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                {departmentCases.length === 0 ? (
                  <p className="text-xs sm:text-sm text-slate-500 text-center">
                    {t('admin.dashboard.noDeptCases')}
                  </p>
                ) : (
                  <div className="space-y-4 sm:space-y-5">
                    {departmentCases.map((dept) => (
                      <div key={dept.name} className="w-full">
                        <div className="mb-1.5 flex items-center justify-between text-xs sm:text-sm">
                          <span className="truncate pr-2 font-medium text-slate-700">{tDepartment(dept.name)}</span>
                          <span className="font-bold text-slate-700">{dept.count}</span>
                        </div>
                        <RelativeBar value={dept.barWidth} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`min-w-0 w-full rounded-xl sm:rounded-2xl border p-4 sm:p-6 shadow-sm ${
                urgentCasesCount > 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-2.5 sm:gap-3">
                <AlertCircle
                  className={`mt-0.5 h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${
                    urgentCasesCount > 0 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0">
                  <h3
                    className={`truncate text-sm sm:text-base font-bold ${
                      urgentCasesCount > 0 ? 'text-amber-900' : 'text-slate-700'
                    }`}
                  >
                    {urgentCasesCount > 0
                      ? t('admin.dashboard.actionRequired')
                      : t('admin.dashboard.queueClear')}
                  </h3>

                  <p
                    className={`mt-1 sm:mt-2 break-words text-xs sm:text-sm leading-relaxed ${
                      urgentCasesCount > 0 ? 'text-amber-800' : 'text-slate-500'
                    }`}
                  >
                    {urgentCasesCount > 0
                      ? urgentCasesCount === 1
                        ? t('admin.dashboard.urgentWaitingSingle')
                        : `${urgentCasesCount} ${t('admin.dashboard.urgentWaitingPluralSuffix')}`
                      : t('admin.dashboard.noUrgentCases')}
                  </p>

                  {urgentCasesCount > 0 && (
                    <Link
                      href="/admin/requests"
                      className="mt-3 sm:mt-4 inline-flex w-full justify-center rounded-lg sm:rounded-xl border border-amber-300 bg-white px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-amber-800 transition hover:bg-amber-100 sm:w-auto"
                    >
                      {t('admin.dashboard.reviewNow')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
