'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogOut,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'

type PlannerView = 'month' | 'week' | 'day'

type PlannerEvent = {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  patient_id: string | null
  language: string | null
  created_at: string
  source_kind: string | null
  source_case_id: string | null
  linked_appointment_date: string | null
  linked_appointment_time: string | null
}

type ActivePatient = {
  id: string
  full_name: string
  treatment_type: string
  assigned_department: string | null
  status: string
}

type PlannerResponse = {
  data: {
    events: PlannerEvent[]
    activePatients: ActivePatient[]
  }
}

interface Props {
  studentEmail: string
  studentFullName: string
}

type PlannerFormState = {
  title: string
  description: string
  startAt: string
  endAt: string
  patientId: string
}

const CASE_APPOINTMENT_SOURCE_KIND = 'case_appointment'
const DEFAULT_LINKED_APPOINTMENT_TIME = '09:00'
const CLINIC_TIMEZONE_OFFSET = '+03:00'

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const offset = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - offset)
  return next
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDateTimeInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function buildDefaultRange(baseDate: Date) {
  const start = new Date(baseDate)
  start.setHours(9, 0, 0, 0)

  const end = new Date(start)
  end.setHours(end.getHours() + 1)

  return {
    startAt: toDateTimeInputValue(start),
    endAt: toDateTimeInputValue(end),
  }
}

function formatDateLabel(date: Date, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, options).format(date)
}

function isLinkedCaseAppointment(event: PlannerEvent) {
  return event.source_kind === CASE_APPOINTMENT_SOURCE_KIND
}

function normalizeLinkedAppointmentTime(value: string | null) {
  if (!value) {
    return DEFAULT_LINKED_APPOINTMENT_TIME
  }

  return value.slice(0, 5)
}

function getEventComparableTime(event: PlannerEvent) {
  if (isLinkedCaseAppointment(event) && event.linked_appointment_date) {
    return new Date(
      `${event.linked_appointment_date}T${normalizeLinkedAppointmentTime(event.linked_appointment_time)}:00${CLINIC_TIMEZONE_OFFSET}`
    ).getTime()
  }

  return new Date(event.start_at).getTime()
}

function getEventDateKey(event: PlannerEvent) {
  if (isLinkedCaseAppointment(event) && event.linked_appointment_date) {
    return event.linked_appointment_date
  }

  return toDateKey(new Date(event.start_at))
}

function formatTimeRange(event: PlannerEvent, locale: string, t: (key: string) => string) {
  if (isLinkedCaseAppointment(event) && event.linked_appointment_date) {
    return `${t('student.planner.eventStarts')}: ${normalizeLinkedAppointmentTime(event.linked_appointment_time)}`
  }

  const start = new Date(event.start_at)
  const end = event.end_at ? new Date(event.end_at) : null
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (!end) {
    return `${t('student.planner.eventStarts')}: ${formatter.format(start)}`
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`
}

function formatUpcomingDateTimeLabel(
  event: PlannerEvent,
  locale: string
) {
  if (isLinkedCaseAppointment(event) && event.linked_appointment_date) {
    const displayDate = new Date(`${event.linked_appointment_date}T00:00:00`)
    return `${formatDateLabel(displayDate, locale, {
      day: 'numeric',
      month: 'short',
    })}, ${normalizeLinkedAppointmentTime(event.linked_appointment_time)}`
  }

  return formatDateLabel(new Date(event.start_at), locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(fullName: string, email: string) {
  const source = fullName.trim() || email.trim()
  if (!source) return 'ST'

  const pieces = source.split(/\s+/).filter(Boolean)
  if (pieces.length >= 2) {
    return `${pieces[0][0] ?? ''}${pieces[1][0] ?? ''}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

function sortPlannerEvents(items: PlannerEvent[]) {
  return [...items].sort(
    (left, right) => getEventComparableTime(left) - getEventComparableTime(right)
  )
}

function getEventTone(event: PlannerEvent) {
  if (event.patient_id) {
    return {
      card: 'border-teal-200 bg-teal-50/90 hover:bg-teal-100/80',
      badge: 'bg-teal-100 text-teal-700',
      subtle: 'text-teal-700',
    }
  }

  return {
    card: 'border-indigo-200 bg-indigo-50/90 hover:bg-indigo-100/80',
    badge: 'bg-indigo-100 text-indigo-700',
    subtle: 'text-indigo-700',
  }
}

export function PlannerClient({ studentEmail, studentFullName }: Props) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB'

  const [view, setView] = useState<PlannerView>('month')
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [events, setEvents] = useState<PlannerEvent[]>([])
  const [activePatients, setActivePatients] = useState<ActivePatient[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [form, setForm] = useState<PlannerFormState>(() => {
    const range = buildDefaultRange(new Date())
    return {
      title: '',
      description: '',
      startAt: range.startAt,
      endAt: range.endAt,
      patientId: '',
    }
  })

  const studentInitials = useMemo(
    () => getInitials(studentFullName, studentEmail),
    [studentEmail, studentFullName]
  )
  const isEditing = !!editingEventId

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
  }

  async function loadPlannerData() {
    setLoading(true)
    setLoadError('')

    const response = await fetch('/api/student/planner', { cache: 'no-store' })

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: t('student.planner.loadError') }))
      setLoadError((body as { error?: string }).error ?? t('student.planner.loadError'))
      setLoading(false)
      return
    }

    const body = (await response.json()) as PlannerResponse
    setEvents(body.data.events)
    setActivePatients(body.data.activePatients)
    setLoading(false)
  }

  useEffect(() => {
    void loadPlannerData()
  }, [])

  const patientMap = useMemo(
    () =>
      Object.fromEntries(
        activePatients.map((patient) => [
          patient.id,
          `${patient.full_name}${patient.assigned_department ? ` - ${patient.assigned_department}` : ''}`,
        ])
      ),
    [activePatients]
  )

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, PlannerEvent[]> = {}

    for (const event of events) {
      const key = getEventDateKey(event)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(event)
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((left, right) => getEventComparableTime(left) - getEventComparableTime(right))
    }

    return grouped
  }, [events])

  const selectedDateKey = toDateKey(selectedDate)
  const selectedDateEvents = eventsByDate[selectedDateKey] ?? []

  const upcomingEvents = useMemo(() => {
    const now = Date.now()
    return [...events]
      .filter((event) => getEventComparableTime(event) >= now - 24 * 60 * 60 * 1000)
      .sort((left, right) => getEventComparableTime(left) - getEventComparableTime(right))
      .slice(0, 6)
  }, [events])

  function openAddModal(baseDate?: Date) {
    const range = buildDefaultRange(baseDate ?? selectedDate)
    setEditingEventId(null)
    setForm({
      title: '',
      description: '',
      startAt: range.startAt,
      endAt: range.endAt,
      patientId: '',
    })
    setSaveError('')
    setShowModal(true)
  }

  function openEditModal(event: PlannerEvent) {
    if (isLinkedCaseAppointment(event)) {
      return
    }

    setEditingEventId(event.id)
    setForm({
      title: event.title,
      description: event.description || '',
      startAt: toDateTimeInputValue(new Date(event.start_at)),
      endAt: event.end_at
        ? toDateTimeInputValue(new Date(event.end_at))
        : toDateTimeInputValue(new Date(event.start_at)),
      patientId: event.patient_id || '',
    })
    setSaveError('')
    setShowModal(true)
  }

  async function handleSubmitEvent() {
    if (!form.title.trim()) {
      setSaveError(t('student.planner.requiredTitle'))
      return
    }

    const startAt = new Date(form.startAt)
    const endAt = form.endAt ? new Date(form.endAt) : null

    if (Number.isNaN(startAt.getTime())) {
      setSaveError(t('student.planner.saveError'))
      return
    }

    if (endAt && (Number.isNaN(endAt.getTime()) || endAt <= startAt)) {
      setSaveError(t('student.planner.invalidRange'))
      return
    }

    setSaving(true)
    setSaveError('')

    const response = await fetch(
      editingEventId ? `/api/student/planner/${editingEventId}` : '/api/student/planner',
      {
        method: editingEventId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim(),
        start_at: startAt.toISOString(),
        end_at: endAt ? endAt.toISOString() : null,
        patient_id: form.patientId || null,
        language: locale,
      }),
      }
    )

    setSaving(false)

    if (!response.ok) {
      const body = await response.json().catch(() => ({
        error: editingEventId ? t('student.planner.updateError') : t('student.planner.saveError'),
      }))
      setSaveError(
        (body as { error?: string }).error ??
          (editingEventId ? t('student.planner.updateError') : t('student.planner.saveError'))
      )
      return
    }

    const body = (await response.json()) as { data: PlannerEvent }
    setEvents((prev) =>
      editingEventId
        ? sortPlannerEvents(prev.map((event) => (event.id === body.data.id ? body.data : event)))
        : sortPlannerEvents([...prev, body.data])
    )
    setSelectedDate(startOfDay(new Date(body.data.start_at)))
    setCurrentDate(startOfDay(new Date(body.data.start_at)))
    setShowModal(false)
    setEditingEventId(null)
    setSaveSuccess(
      editingEventId ? t('student.planner.updateSuccess') : t('student.planner.saveSuccess')
    )
    window.setTimeout(() => setSaveSuccess(''), 2500)
  }

  async function handleDeleteEvent() {
    if (!editingEventId) return

    setDeleting(true)
    setSaveError('')

    const response = await fetch(`/api/student/planner/${editingEventId}`, {
      method: 'DELETE',
    })

    setDeleting(false)

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: t('student.planner.deleteError') }))
      setSaveError((body as { error?: string }).error ?? t('student.planner.deleteError'))
      return
    }

    setEvents((prev) => prev.filter((event) => event.id !== editingEventId))
    setShowModal(false)
    setEditingEventId(null)
    setSaveSuccess(t('student.planner.deleteSuccess'))
    window.setTimeout(() => setSaveSuccess(''), 2500)
  }

  function movePeriod(direction: 'prev' | 'next') {
    const multiplier = direction === 'next' ? 1 : -1
    const nextDate = new Date(currentDate)

    if (view === 'month') {
      nextDate.setMonth(nextDate.getMonth() + multiplier)
    } else if (view === 'week') {
      nextDate.setDate(nextDate.getDate() + 7 * multiplier)
    } else {
      nextDate.setDate(nextDate.getDate() + multiplier)
    }

    setCurrentDate(startOfDay(nextDate))
    setSelectedDate(startOfDay(nextDate))
  }

  function renderEventPill(event: PlannerEvent) {
    const tone = getEventTone(event)

    if (isLinkedCaseAppointment(event)) {
      return (
        <div
          key={event.id}
          className={`w-full rounded-lg border px-2.5 py-2 text-left ${tone.card}`}
        >
          <p className="truncate text-xs font-semibold text-slate-900">{event.title}</p>
          <p className="mt-1 text-[11px] text-slate-500">{formatTimeRange(event, dateLocale, t)}</p>
          <p className="mt-1 text-[11px] text-slate-500">{t('student.planner.managedFromCaseCard')}</p>
        </div>
      )
    }

    return (
      <button
        key={event.id}
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation()
          openEditModal(event)
        }}
        className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${tone.card}`}
      >
        <p className="truncate text-xs font-semibold text-slate-900">{event.title}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {formatTimeRange(event, dateLocale, t)}
        </p>
      </button>
    )
  }

  function renderMonthView() {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const gridStart = startOfWeek(monthStart)
    const weekdayBase = startOfWeek(new Date())
    const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {Array.from({ length: 7 }, (_, index) => addDays(weekdayBase, index)).map((day) => (
            <div
              key={toDateKey(day)}
              className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            >
              {formatDateLabel(day, dateLocale, { weekday: 'short' })}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayKey = toDateKey(day)
            const dayEvents = eventsByDate[dayKey] ?? []
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = dayKey === toDateKey(new Date())
            const isSelected = dayKey === selectedDateKey

            return (
              <div
                key={dayKey}
                onClick={() => setSelectedDate(startOfDay(day))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedDate(startOfDay(day))
                  }
                }}
                role="button"
                tabIndex={0}
                className={`min-h-[130px] border-r border-b border-slate-100 px-3 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200 ${
                  isSelected ? 'bg-teal-50/70' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      isToday
                        ? 'bg-slate-900 text-white'
                        : isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-300'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {dayEvents.slice(0, 3).map(renderEventPill)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderWeekView() {
    const weekStart = startOfWeek(currentDate)
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

    return (
      <div className="grid gap-4 lg:grid-cols-7">
        {days.map((day) => {
          const dayKey = toDateKey(day)
          const dayEvents = eventsByDate[dayKey] ?? []
          const isSelected = dayKey === selectedDateKey
          const isToday = dayKey === toDateKey(new Date())

          return (
            <div
              key={dayKey}
              onClick={() => setSelectedDate(startOfDay(day))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedDate(startOfDay(day))
                }
              }}
              role="button"
              tabIndex={0}
              className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-200 ${
                isSelected
                  ? 'border-teal-200 bg-teal-50/70'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {formatDateLabel(day, dateLocale, { weekday: 'short' })}
                  </p>
                  <p className={`mt-1 text-xl font-bold ${isToday ? 'text-slate-900' : 'text-slate-700'}`}>
                    {day.getDate()}
                  </p>
                </div>
                {dayEvents.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-slate-400">{t('student.planner.noEventsForDay')}</p>
                ) : (
                  dayEvents.map(renderEventPill)
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderDayView() {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('student.planner.selectedDateTitle')}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {formatDateLabel(selectedDate, dateLocale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => openAddModal(selectedDate)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {t('student.planner.addEvent')}
          </button>
        </div>

        <div className="space-y-3">
          {selectedDateEvents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              {t('student.planner.noEventsForDay')}
            </p>
          ) : (
            selectedDateEvents.map((event) => (
              isLinkedCaseAppointment(event) ? (
                <div
                  key={event.id}
                  className={`w-full rounded-2xl border px-4 py-4 text-left ${getEventTone(event).card}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{event.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatTimeRange(event, dateLocale, t)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {event.patient_id
                        ? `${t('student.planner.linkedPatient')}: ${patientMap[event.patient_id] ?? event.patient_id}`
                        : t('student.planner.noLinkedPatient')}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{t('student.planner.managedFromCaseCard')}</p>
                  {event.description && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                      {event.description}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEditModal(event)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${getEventTone(event).card}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{event.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatTimeRange(event, dateLocale, t)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {event.patient_id
                        ? `${t('student.planner.linkedPatient')}: ${patientMap[event.patient_id] ?? event.patient_id}`
                        : t('student.planner.noLinkedPatient')}
                    </span>
                  </div>
                  {event.description && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                      {event.description}
                    </p>
                  )}
                </button>
              )
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <img src="/dentbridge-icon.png" alt="DentBridge" className="h-9 w-9 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-slate-400">
                {t('student.nav.clinicalPlatform')}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm ring-2 ring-slate-100">
              {studentInitials}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('student.nav.signOut')}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/student/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('student.planner.backToDashboard')}
        </Link>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              <CalendarDays className="h-3.5 w-3.5" />
              {t('student.nav.planner')}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {t('student.planner.pageTitle')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              {t('student.planner.pageDesc')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openAddModal(selectedDate)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {t('student.planner.addEvent')}
          </button>
        </div>

        {saveSuccess && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {saveSuccess}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">{t('student.planner.loading')}</p>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center shadow-sm">
            <p className="text-sm text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadPlannerData()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              {t('student.planner.retry')}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {(['month', 'week', 'day'] as PlannerView[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setView(option)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      view === option
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option === 'month'
                      ? t('student.planner.monthView')
                      : option === 'week'
                        ? t('student.planner.weekView')
                        : t('student.planner.dayView')}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => movePeriod('prev')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('student.planner.previous')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = startOfDay(new Date())
                    setCurrentDate(today)
                    setSelectedDate(today)
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  {t('student.planner.today')}
                </button>
                <button
                  type="button"
                  onClick={() => movePeriod('next')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  {t('student.planner.next')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {view === 'month'
                  ? formatDateLabel(currentDate, dateLocale, { month: 'long', year: 'numeric' })
                  : view === 'week'
                    ? `${formatDateLabel(startOfWeek(currentDate), dateLocale, {
                        day: 'numeric',
                        month: 'short',
                      })} - ${formatDateLabel(addDays(startOfWeek(currentDate), 6), dateLocale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    : formatDateLabel(selectedDate, dateLocale, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
              </h2>
            </div>

            {events.length === 0 && (
              <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
                <p className="text-base font-semibold text-slate-800">
                  {t('student.planner.emptyStateTitle')}
                </p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                  {t('student.planner.emptyStateDesc')}
                </p>
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.95fr)]">
              <div>
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'day' && renderDayView()}
              </div>

              <aside className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('student.planner.selectedDateTitle')}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">
                    {formatDateLabel(selectedDate, dateLocale, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h3>

                  <div className="mt-4 space-y-3">
                    {selectedDateEvents.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                        {t('student.planner.noEventsForDay')}
                      </p>
                    ) : (
                      selectedDateEvents.map((event) => (
                        <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatTimeRange(event, dateLocale, t)}
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {event.patient_id
                              ? `${t('student.planner.linkedPatient')}: ${patientMap[event.patient_id] ?? event.patient_id}`
                              : t('student.planner.noLinkedPatient')}
                          </p>
                          {isLinkedCaseAppointment(event) && (
                            <p className="mt-2 text-xs text-slate-500">{t('student.planner.managedFromCaseCard')}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {t('student.planner.upcomingTitle')}
                    </h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {upcomingEvents.length === 0 ? (
                      <p className="text-sm text-slate-400">{t('student.planner.noEventsForDay')}</p>
                    ) : (
                      upcomingEvents.map((event) => (
                        isLinkedCaseAppointment(event) ? (
                          <div
                            key={event.id}
                            className={`w-full rounded-xl border px-4 py-3 text-left ${getEventTone(event).card}`}
                          >
                            <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatUpcomingDateTimeLabel(event, dateLocale)}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">{t('student.planner.managedFromCaseCard')}</p>
                          </div>
                        ) : (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => openEditModal(event)}
                            className={`w-full rounded-xl border px-4 py-3 text-left transition ${getEventTone(event).card}`}
                          >
                            <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatUpcomingDateTimeLabel(event, dateLocale)}
                            </p>
                          </button>
                        )
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {t('student.planner.activePatientsTitle')}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {t('student.planner.activePatientsDesc')}
                  </p>
                  <div className="mt-4 space-y-3">
                    {activePatients.length === 0 ? (
                      <p className="text-sm text-slate-400">{t('student.planner.noActivePatients')}</p>
                    ) : (
                      activePatients.map((patient) => (
                        <div key={patient.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">{patient.full_name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {patient.assigned_department || patient.treatment_type}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isEditing ? t('student.planner.editEvent') : t('student.planner.addModalTitle')}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{t('student.planner.addModalDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setEditingEventId(null)
                  setSaveError('')
                }}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {saveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t('student.planner.titleLabel')} *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder={t('student.planner.titlePlaceholder')}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {t('student.planner.startLabel')}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, startAt: event.target.value }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {t('student.planner.endLabel')}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, endAt: event.target.value }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t('student.planner.descriptionLabel')}
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder={t('student.planner.descriptionPlaceholder')}
                  className="min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t('student.planner.patientLabel')}
                </label>
                <select
                  value={form.patientId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, patientId: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">{t('student.planner.patientPlaceholder')}</option>
                  {activePatients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name}
                      {patient.assigned_department ? ` - ${patient.assigned_department}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={saving || deleting}
                  className="mr-auto inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? t('student.planner.deletingEvent') : t('student.planner.deleteEvent')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setEditingEventId(null)
                  setSaveError('')
                }}
                disabled={saving || deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {t('student.planner.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmitEvent}
                disabled={saving || deleting}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving
                  ? isEditing
                    ? t('student.planner.updatingEvent')
                    : t('student.planner.savingEvent')
                  : isEditing
                    ? t('student.planner.updateEvent')
                    : t('student.planner.saveEvent')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
