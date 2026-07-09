'use client'

import { CalendarDays, Clock3, Users } from 'lucide-react'

import { useI18n } from '@/lib/i18n'

import type { ActivePatient, PlannerEvent } from './types'

type EventTone = {
  card: string
  badge: string
  subtle: string
}

interface PlannerSidebarProps {
  selectedDateLabel: string
  selectedDateEvents: PlannerEvent[]
  upcomingEvents: PlannerEvent[]
  activePatients: ActivePatient[]
  patientMap: Record<string, string>
  dateLocale: string
  isLinkedCaseAppointment: (event: PlannerEvent) => boolean
  isPastEvent: (event: PlannerEvent) => boolean
  getEventTone: (event: PlannerEvent) => EventTone
  formatTimeRange: (event: PlannerEvent, locale: string, t: (key: string) => string) => string
  formatUpcomingDateTimeLabel: (event: PlannerEvent, locale: string) => string
  onEditEvent: (event: PlannerEvent) => void
}

export function PlannerSidebar({
  selectedDateLabel,
  selectedDateEvents,
  upcomingEvents,
  activePatients,
  patientMap,
  dateLocale,
  isLinkedCaseAppointment,
  isPastEvent,
  getEventTone,
  formatTimeRange,
  formatUpcomingDateTimeLabel,
  onEditEvent,
}: PlannerSidebarProps) {
  const { t } = useI18n()

  return (
    <aside className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('student.planner.selectedDateTitle')}
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">
          {selectedDateLabel}
        </h3>

        <div className="mt-4 space-y-3">
          {selectedDateEvents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              {t('student.planner.noEventsForDay')}
            </p>
          ) : (
            selectedDateEvents.map((event) => {
              const eventTone = getEventTone(event)
              const isPastLinkedAppointment = isLinkedCaseAppointment(event) && isPastEvent(event)
              const eventCardClass = isLinkedCaseAppointment(event)
                ? eventTone.card
                : 'border-slate-100 bg-slate-50'

              return (
                <div key={event.id} className={`rounded-xl border px-4 py-3 ${eventCardClass}`}>
                  <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatTimeRange(event, dateLocale, t)}
                  </div>
                  {isPastLinkedAppointment && (
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eventTone.badge}`}>
                      {t('student.planner.pastAppointment')}
                    </span>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {event.patient_id
                      ? `${t('student.planner.linkedPatient')}: ${patientMap[event.patient_id] ?? event.patient_id}`
                      : t('student.planner.noLinkedPatient')}
                  </p>
                  {isLinkedCaseAppointment(event) && (
                    <p className="mt-2 text-xs text-slate-500">{t('student.planner.managedFromCaseCard')}</p>
                  )}
                </div>
              )
            })
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
                  onClick={() => onEditEvent(event)}
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
  )
}
