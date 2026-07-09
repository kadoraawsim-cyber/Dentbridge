'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { Plus } from 'lucide-react'
import { PlannerEventModal } from '@/components/student/planner/PlannerEventModal'
import { PlannerHeader } from '@/components/student/planner/PlannerHeader'
import { PlannerHero } from '@/components/student/planner/PlannerHero'
import { PlannerSidebar } from '@/components/student/planner/PlannerSidebar'
import { PlannerToolbar } from '@/components/student/planner/PlannerToolbar'
import type {
  ActivePatient,
  PlannerEvent,
  PlannerFormState,
  PlannerView,
} from '@/components/student/planner/types'

interface Props {
  studentEmail: string
  studentFullName: string
  initialEvents: PlannerEvent[]
  initialActivePatients: ActivePatient[]
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

function normalizeDateTimeInputValue(value: string) {
  return value.length === 16 ? `${value}:00` : value
}

function parseLocalDateTime(value: string) {
  return new Date(value.replace(' ', 'T'))
}

function getPrivateEventStart(event: PlannerEvent) {
  return parseLocalDateTime(event.start_at)
}

function getPrivateEventEnd(event: PlannerEvent) {
  return event.end_at ? parseLocalDateTime(event.end_at) : null
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

  return getPrivateEventStart(event).getTime()
}

function isPastEvent(event: PlannerEvent, now = Date.now()) {
  return getEventComparableTime(event) < now
}

function getEventDateKey(event: PlannerEvent) {
  if (isLinkedCaseAppointment(event) && event.linked_appointment_date) {
    return event.linked_appointment_date
  }

  return toDateKey(getPrivateEventStart(event))
}

function formatTimeRange(event: PlannerEvent, locale: string, t: (key: string) => string) {
  if (isLinkedCaseAppointment(event) && event.linked_appointment_date) {
    return `${t('student.planner.eventStarts')}: ${normalizeLinkedAppointmentTime(event.linked_appointment_time)}`
  }

  const start = getPrivateEventStart(event)
  const end = getPrivateEventEnd(event)
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (!end) {
    return `${t('student.planner.eventStarts')}: ${formatter.format(start)}`
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`
}

function formatCompactTimeRange(event: PlannerEvent, locale: string) {
  if (isLinkedCaseAppointment(event) && event.linked_appointment_date) {
    return normalizeLinkedAppointmentTime(event.linked_appointment_time)
  }

  const start = getPrivateEventStart(event)
  const end = getPrivateEventEnd(event)
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (!end) {
    return formatter.format(start)
  }

  return `${formatter.format(start)}-${formatter.format(end)}`
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

  return formatDateLabel(getPrivateEventStart(event), locale, {
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
  if (isLinkedCaseAppointment(event) && isPastEvent(event)) {
    return {
      card: 'border-slate-200 bg-slate-50/90 hover:bg-slate-100/80',
      badge: 'bg-slate-100 text-slate-600',
      subtle: 'text-slate-500',
    }
  }

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

export function PlannerClient({ studentEmail, studentFullName, initialEvents, initialActivePatients }: Props) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB'

  const [view, setView] = useState<PlannerView>('month')
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [events, setEvents] = useState<PlannerEvent[]>(initialEvents)
  const [activePatients] = useState<ActivePatient[]>(initialActivePatients)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
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
    const now = new Date().getTime()
    return [...events]
      .filter((event) => getEventComparableTime(event) >= now)
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

    const eventStart = getPrivateEventStart(event)
    const eventEnd = getPrivateEventEnd(event)

    setEditingEventId(event.id)
    setForm({
      title: event.title,
      description: event.description || '',
      startAt: toDateTimeInputValue(eventStart),
      endAt: eventEnd ? toDateTimeInputValue(eventEnd) : toDateTimeInputValue(eventStart),
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

    const startAt = parseLocalDateTime(form.startAt)
    const endAt = form.endAt ? parseLocalDateTime(form.endAt) : null

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
        start_at: normalizeDateTimeInputValue(form.startAt),
        end_at: form.endAt ? normalizeDateTimeInputValue(form.endAt) : null,
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
    setSelectedDate(startOfDay(getPrivateEventStart(body.data)))
    setCurrentDate(startOfDay(getPrivateEventStart(body.data)))
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

  function handleTodayClick() {
    const today = startOfDay(new Date())
    setCurrentDate(today)
    setSelectedDate(today)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditingEventId(null)
    setSaveError('')
  }

  function handleFormChange(values: Partial<PlannerFormState>) {
    setForm((prev) => ({ ...prev, ...values }))
  }

  const periodLabel =
    view === 'month'
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
          })

  const selectedDateLabel = formatDateLabel(selectedDate, dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

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

  function renderMonthEventChip(event: PlannerEvent) {
    const tone = getEventTone(event)
    const chipClass = `block min-w-0 max-w-full overflow-hidden rounded-md border px-1.5 py-1 text-left transition sm:rounded-lg sm:px-2 sm:py-1.5 ${tone.card}`
    const content = (
      <>
        <p className="block min-w-0 truncate whitespace-nowrap text-[10px] font-semibold leading-tight text-slate-900 sm:text-xs">
          {event.title}
        </p>
        <p className="mt-0.5 hidden min-w-0 truncate whitespace-nowrap text-[9px] font-medium leading-tight text-slate-500 min-[420px]:block sm:text-[11px]">
          {formatCompactTimeRange(event, dateLocale)}
        </p>
      </>
    )

    if (isLinkedCaseAppointment(event)) {
      return (
        <div key={event.id} className={chipClass} title={`${event.title} · ${formatCompactTimeRange(event, dateLocale)}`}>
          {content}
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
        className={chipClass}
        title={`${event.title} · ${formatCompactTimeRange(event, dateLocale)}`}
      >
        {content}
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
              className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:px-3 sm:py-3 sm:text-[11px]"
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
                className={`min-h-[96px] min-w-0 border-r border-b border-slate-100 px-1 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200 sm:min-h-[130px] sm:px-3 sm:py-3 ${
                  isSelected ? 'bg-teal-50/70' : 'bg-white'
                }`}
              >
                <div className="flex min-w-0 items-center justify-between gap-1">
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm ${
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
                    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 sm:px-2 sm:text-[10px]">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="mt-2 min-w-0 space-y-1 sm:mt-3 sm:space-y-2">
                  {dayEvents.slice(0, 3).map(renderMonthEventChip)}
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
            selectedDateEvents.map((event) => {
              const eventTone = getEventTone(event)
              const isPastLinkedAppointment = isLinkedCaseAppointment(event) && isPastEvent(event)

              return isLinkedCaseAppointment(event) ? (
                <div
                  key={event.id}
                  className={`w-full rounded-2xl border px-4 py-4 text-left ${eventTone.card}`}
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
                  {isPastLinkedAppointment && (
                    <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eventTone.badge}`}>
                      {t('student.planner.pastAppointment')}
                    </span>
                  )}
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
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${eventTone.card}`}
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
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PlannerHeader studentInitials={studentInitials} onSignOut={handleSignOut} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PlannerHero onAddEvent={() => openAddModal(selectedDate)} />

        {saveSuccess && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {saveSuccess}
          </div>
        )}

          <>
            <PlannerToolbar
              view={view}
              periodLabel={periodLabel}
              onViewChange={setView}
              onPrevious={() => movePeriod('prev')}
              onToday={handleTodayClick}
              onNext={() => movePeriod('next')}
            />

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

              <PlannerSidebar
                selectedDateLabel={selectedDateLabel}
                selectedDateEvents={selectedDateEvents}
                upcomingEvents={upcomingEvents}
                activePatients={activePatients}
                patientMap={patientMap}
                dateLocale={dateLocale}
                isLinkedCaseAppointment={isLinkedCaseAppointment}
                isPastEvent={isPastEvent}
                getEventTone={getEventTone}
                formatTimeRange={formatTimeRange}
                formatUpcomingDateTimeLabel={formatUpcomingDateTimeLabel}
                onEditEvent={openEditModal}
              />
            </div>
          </>
      </section>

      {showModal && (
        <PlannerEventModal
          isEditing={isEditing}
          form={form}
          activePatients={activePatients}
          saveError={saveError}
          saving={saving}
          deleting={deleting}
          onFormChange={handleFormChange}
          onClose={handleCloseModal}
          onSubmit={handleSubmitEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </main>
  )
}
