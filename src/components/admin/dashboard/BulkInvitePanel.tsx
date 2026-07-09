'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Download, Pause, Play, Square } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { escapeCsvValue } from './csv'

/**
 * Bulk student invitation panel (Phase 8 extraction from dashboard-client).
 * Fully self-contained UI orchestration: paste/preview parsing, a throttled
 * send queue against the existing single-invite endpoint, pause/stop/resume,
 * localStorage progress restore, and CSV reporting. Business rules and the
 * invitation API are unchanged.
 */

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

export function BulkInvitePanel() {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB'
  const [bulkInput, setBulkInput] = useState('')
  const [bulkRows, setBulkRows] = useState<BulkInviteRow[]>([])
  const [bulkRunState, setBulkRunState] = useState<BulkRunState>('idle')
  const [bulkMessage, setBulkMessage] = useState('')
  const [nextBulkInviteAt, setNextBulkInviteAt] = useState<string>('')
  const [bulkStorageReady, setBulkStorageReady] = useState(false)
  const bulkRowsRef = useRef<BulkInviteRow[]>([])
  const bulkRunStateRef = useRef<BulkRunState>('idle')
  const nextBulkInviteAtRef = useRef('')
  const bulkProcessingRef = useRef(false)
  const bulkCopy = bulkInviteCopy[locale]

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

  return (
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
  )
}
