'use client'

import {
  AlertCircle,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Phone,
  Stethoscope,
} from 'lucide-react'

import { useI18n } from '@/lib/i18n'

import type {
  DashboardStep,
  DashboardUiText,
  LifecycleAction,
  LiveActiveCase,
  ProgressComposerMode,
  ProgressEntry,
  ProgressFormValues,
} from './types'

function getActiveCaseStatusBadge(status: string): string {
  switch (status) {
    case 'student_approved':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'contacted':
      return 'bg-cyan-50 text-cyan-700 border border-cyan-200'
    case 'appointment_scheduled':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    case 'in_treatment':
      return 'bg-purple-50 text-purple-700 border border-purple-200'
    case 'faculty_review':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'cancelled':
      return 'bg-slate-100 text-slate-500 border border-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

function getStepIndex(status: string): number {
  const order = [
    'student_approved',
    'contacted',
    'appointment_scheduled',
    'in_treatment',
    'faculty_review',
    'completed',
  ]
  return order.indexOf(status)
}

interface StudentActiveCasesSectionProps {
  cases: LiveActiveCase[]
  steps: DashboardStep[]
  actionLoading: string | null
  actionErrors: Record<string, string>
  openTimelines: Record<string, boolean>
  openComposer: { caseId: string; mode: ProgressComposerMode } | null
  progressForm: ProgressFormValues
  ui: DashboardUiText
  tTreatment: (value: string) => string
  tDept: (value: string | null) => string
  getActiveCaseStatusLabelShort: (status: string) => string
  formatTimelineDateTime: (iso: string) => string
  formatOptionalDate: (value: string | null) => string
  formatOptionalTime: (value: string | null) => string
  getTimelinePrimaryText: (entry: ProgressEntry) => string
  onToggleTimeline: (caseId: string) => void
  onOpenProgressComposer: (caseId: string, mode: ProgressComposerMode) => void
  onProgressFormChange: (values: Partial<ProgressFormValues>) => void
  onProgressSubmit: (caseId: string) => void
  onResetProgressComposer: () => void
  onLifecycleAction: (caseId: string, action: LifecycleAction) => void
}

export function StudentActiveCasesSection({
  cases,
  steps,
  actionLoading,
  actionErrors,
  openTimelines,
  openComposer,
  progressForm,
  ui,
  tTreatment,
  tDept,
  getActiveCaseStatusLabelShort,
  formatTimelineDateTime,
  formatOptionalDate,
  formatOptionalTime,
  getTimelinePrimaryText,
  onToggleTimeline,
  onOpenProgressComposer,
  onProgressFormChange,
  onProgressSubmit,
  onResetProgressComposer,
  onLifecycleAction,
}: StudentActiveCasesSectionProps) {
  const { t } = useI18n()

  if (cases.length === 0) {
    return null
  }

  return (
    <div id="my-active-cases" className="mb-6 sm:mb-10 w-full">
      <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
          {t('student.dashboard.myActiveCases')}
        </h2>
      </div>

      <div className="grid w-full gap-3 sm:gap-5 md:grid-cols-2">
        {cases.map((c) => {
          const liveStatus = c.liveStatus
          const isLoading = actionLoading === c.caseId
          const error = actionErrors[c.caseId]
          const isClosed = liveStatus === 'completed' || liveStatus === 'cancelled'
          const stepIdx = getStepIndex(liveStatus)
          const caseEntries = c.progressEntries
          const timelineOpen = openTimelines[c.caseId] ?? false
          const isComposerOpen = openComposer?.caseId === c.caseId

          return (
            <div
              key={c.caseId}
              className="min-w-0 overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-5 sm:py-4">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 sm:px-2 sm:py-1 font-mono text-[10px] sm:text-xs font-bold text-slate-600">
                  #{c.caseId.slice(0, 8).toUpperCase()}
                </span>
                <span
                  className={`inline-flex whitespace-nowrap items-center rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold ${getActiveCaseStatusBadge(
                    liveStatus
                  )}`}
                >
                  {getActiveCaseStatusLabelShort(liveStatus)}
                </span>
              </div>

              <div className="p-3 sm:p-5">
                <p className="truncate text-sm sm:text-base font-bold text-slate-900">
                  {c.assigned_department ? tDept(c.assigned_department) : tTreatment(c.treatment_type)}
                </p>
                {c.assigned_department && (
                  <p className="mt-0.5 truncate text-[10px] sm:text-xs text-slate-400">
                    {ui.initialRequest} {tTreatment(c.treatment_type)}
                  </p>
                )}

                {!isClosed && (
                  <div className="mt-3 w-full">
                    <div className="flex items-center gap-1">
                      {steps.map((s) => {
                        const done = stepIdx > s.step
                        const active = stepIdx === s.step
                        return (
                          <div
                            key={s.label}
                            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 sm:gap-1"
                          >
                            <div
                              className={`h-1 sm:h-1.5 w-full rounded-full transition-all ${
                                done
                                  ? 'bg-emerald-500'
                                  : active
                                  ? 'bg-blue-500'
                                  : 'bg-slate-200'
                              }`}
                            />
                            <span
                              className={`truncate text-[8px] sm:text-[10px] font-medium ${
                                done
                                  ? 'text-emerald-600'
                                  : active
                                  ? 'text-blue-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-lg sm:rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 sm:p-3.5">
                  <p className="mb-0.5 sm:mb-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    {t('student.dashboard.patientContact')}
                  </p>
                  <p className="break-words text-xs sm:text-sm font-bold text-slate-900">{c.full_name}</p>
                  <div className="mt-2 flex flex-row gap-2">
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                      {ui.callNow}
                    </a>
                  </div>
                </div>

                {(caseEntries.length > 0 || liveStatus === 'in_treatment') && (
                  <div className="mt-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => onToggleTimeline(c.caseId)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {t('student.dashboard.progressTimelineTitle')}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {caseEntries.length > 0
                            ? `${caseEntries.length}`
                            : t('student.dashboard.progressTimelineEmpty')}
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                          timelineOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {timelineOpen && (
                      <div className="border-t border-slate-200 px-3 py-3 sm:px-4">
                        {liveStatus === 'in_treatment' && (
                          <div className="mb-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onOpenProgressComposer(c.caseId, 'progress_note')}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                              <BookOpen className="h-3.5 w-3.5 shrink-0" />
                              {t('student.dashboard.addProgressNote')}
                            </button>
                          </div>
                        )}

                        {isComposerOpen && openComposer?.mode === 'progress_note' && (
                          <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {t('student.dashboard.progressComposerTitle')}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {t('student.dashboard.progressComposerDesc')}
                            </p>
                            <div className="mt-3 space-y-3">
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                  {t('student.dashboard.progressNoteLabel')} *
                                </label>
                                <textarea
                                  value={progressForm.note}
                                  onChange={(event) => onProgressFormChange({ note: event.target.value })}
                                  rows={3}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                  placeholder={t('student.dashboard.progressNotePlaceholder')}
                                />
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {t('student.dashboard.whatWasDoneLabel')}
                                  </label>
                                  <textarea
                                    value={progressForm.whatWasDone}
                                    onChange={(event) => onProgressFormChange({ whatWasDone: event.target.value })}
                                    rows={2}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                    placeholder={t('student.dashboard.whatWasDonePlaceholder')}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {t('student.dashboard.nextStepLabel')}
                                  </label>
                                  <textarea
                                    value={progressForm.nextStep}
                                    onChange={(event) => onProgressFormChange({ nextStep: event.target.value })}
                                    rows={2}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                    placeholder={t('student.dashboard.nextStepPlaceholder')}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {t('student.dashboard.nextAppointmentDateLabel')}
                                  </label>
                                  <input
                                    type="date"
                                    value={progressForm.nextAppointmentDate}
                                    onChange={(event) => onProgressFormChange({ nextAppointmentDate: event.target.value })}
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {t('student.dashboard.nextAppointmentTimeLabel')}
                                  </label>
                                  <input
                                    type="time"
                                    value={progressForm.nextAppointmentTime}
                                    onChange={(event) => onProgressFormChange({ nextAppointmentTime: event.target.value })}
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={() => onProgressSubmit(c.caseId)}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                                >
                                  {isLoading
                                    ? t('student.dashboard.updating')
                                    : t('student.dashboard.saveProgressNote')}
                                </button>
                                <button
                                  type="button"
                                  onClick={onResetProgressComposer}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                >
                                  {t('student.dashboard.cancelForm')}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {caseEntries.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            {t('student.dashboard.progressTimelineEmpty')}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {caseEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-3"
                              >
                                {entry.appointment_date ? (
                                  <>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {t('student.dashboard.timelineAppointmentInfo')}{' '}
                                      {formatOptionalDate(entry.appointment_date)}
                                      {entry.appointment_time
                                        ? ` • ${formatOptionalTime(entry.appointment_time)}`
                                        : ''}
                                    </p>
                                    <p className="mt-1.5 text-sm text-slate-700">
                                      {getTimelinePrimaryText(entry)}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                                      <p className="text-[11px] text-slate-400">
                                        {formatTimelineDateTime(entry.created_at)}
                                      </p>
                                      {entry.student_name && (
                                        <span className="text-[11px] text-slate-400">
                                          {entry.student_name}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-xs font-semibold text-slate-900">
                                        {formatTimelineDateTime(entry.created_at)}
                                      </p>
                                      {entry.student_name && (
                                        <span className="text-[11px] text-slate-500">
                                          {entry.student_name}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-2 text-sm text-slate-700">
                                      {getTimelinePrimaryText(entry)}
                                    </p>
                                  </>
                                )}
                                {entry.what_was_done && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {t('student.dashboard.timelineWhatDone')} {entry.what_was_done}
                                  </p>
                                )}
                                {entry.next_step && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {t('student.dashboard.timelineNextStep')} {entry.next_step}
                                  </p>
                                )}
                                {entry.next_appointment_date && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {t('student.dashboard.timelineNextAppointment')}{' '}
                                    {formatOptionalDate(entry.next_appointment_date)}
                                    {entry.next_appointment_time
                                      ? ` • ${formatOptionalTime(entry.next_appointment_time)}`
                                      : ''}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!isClosed && (
                  <div className="mt-3">
                    {error && (
                      <p className="mb-2 flex items-center gap-1.5 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">{error}</span>
                      </p>
                    )}

                    {liveStatus === 'student_approved' && (
                      <button
                        type="button"
                        onClick={() => onLifecycleAction(c.caseId, 'mark_contacted')}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-blue-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                      >
                        {isLoading ? (
                          <span className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <Phone className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        )}
                        <span className="truncate">{t('student.dashboard.btnMarkContacted')}</span>
                      </button>
                    )}

                    {liveStatus === 'contacted' && (
                      <button
                        type="button"
                        onClick={() => onOpenProgressComposer(c.caseId, 'appointment')}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-indigo-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                      >
                        <CalendarCheck className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate">{t('student.dashboard.btnMarkApptScheduled')}</span>
                      </button>
                    )}

                    {isComposerOpen && openComposer?.mode === 'appointment' && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {t('student.dashboard.appointmentComposerTitle')}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t('student.dashboard.appointmentComposerDesc')}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              {t('student.dashboard.appointmentDateLabel')} *
                            </label>
                            <input
                              type="date"
                              value={progressForm.appointmentDate}
                              onChange={(event) => onProgressFormChange({ appointmentDate: event.target.value })}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              {t('student.dashboard.appointmentTimeLabel')}
                            </label>
                            <input
                              type="time"
                              value={progressForm.appointmentTime}
                              onChange={(event) => onProgressFormChange({ appointmentTime: event.target.value })}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            {t('student.dashboard.noteLabel')}
                          </label>
                          <textarea
                            value={progressForm.note}
                            onChange={(event) => onProgressFormChange({ note: event.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                            placeholder={t('student.dashboard.notePlaceholder')}
                          />
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => onProgressSubmit(c.caseId)}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {isLoading
                              ? t('student.dashboard.updating')
                              : t('student.dashboard.saveAppointment')}
                          </button>
                          <button
                            type="button"
                            onClick={onResetProgressComposer}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {t('student.dashboard.cancelForm')}
                          </button>
                        </div>
                      </div>
                    )}

                    {liveStatus === 'appointment_scheduled' && (
                      <button
                        type="button"
                        onClick={() => onOpenProgressComposer(c.caseId, 'treatment_start')}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-purple-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                      >
                        <Stethoscope className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate">{t('student.dashboard.btnMarkInTreatment')}</span>
                      </button>
                    )}

                    {isComposerOpen && openComposer?.mode === 'treatment_start' && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {t('student.dashboard.treatmentStartTitle')}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t('student.dashboard.treatmentStartDesc')}
                        </p>
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              {t('student.dashboard.progressNoteLabel')} *
                            </label>
                            <textarea
                              value={progressForm.note}
                              onChange={(event) => onProgressFormChange({ note: event.target.value })}
                              rows={3}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                              placeholder={t('student.dashboard.progressNotePlaceholder')}
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">
                                {t('student.dashboard.whatWasDoneLabel')}
                              </label>
                              <textarea
                                value={progressForm.whatWasDone}
                                onChange={(event) => onProgressFormChange({ whatWasDone: event.target.value })}
                                rows={2}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                placeholder={t('student.dashboard.whatWasDonePlaceholder')}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">
                                {t('student.dashboard.nextStepLabel')}
                              </label>
                              <textarea
                                value={progressForm.nextStep}
                                onChange={(event) => onProgressFormChange({ nextStep: event.target.value })}
                                rows={2}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                                placeholder={t('student.dashboard.nextStepPlaceholder')}
                              />
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">
                                {t('student.dashboard.nextAppointmentDateLabel')}
                              </label>
                              <input
                                type="date"
                                value={progressForm.nextAppointmentDate}
                                onChange={(event) => onProgressFormChange({ nextAppointmentDate: event.target.value })}
                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">
                                {t('student.dashboard.nextAppointmentTimeLabel')}
                              </label>
                              <input
                                type="time"
                                value={progressForm.nextAppointmentTime}
                                onChange={(event) => onProgressFormChange({ nextAppointmentTime: event.target.value })}
                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => onProgressSubmit(c.caseId)}
                              disabled={isLoading}
                              className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                            >
                              {isLoading
                                ? t('student.dashboard.updating')
                                : t('student.dashboard.saveTreatmentStart')}
                            </button>
                            <button
                              type="button"
                              onClick={onResetProgressComposer}
                              disabled={isLoading}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                              {t('student.dashboard.cancelForm')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {liveStatus === 'in_treatment' && (
                      <div className="space-y-2">
                        <div className="flex w-full items-center justify-center gap-2 rounded-lg sm:rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-purple-700">
                          <Clock className="h-3 w-3 sm:h-4 w-4 shrink-0" />
                          <span className="truncate">{t('student.dashboard.treatmentInProgress')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onLifecycleAction(c.caseId, 'submit_stage_for_review')}
                          disabled={isLoading}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-amber-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                        >
                          {isLoading ? (
                            <span className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          )}
                          <span className="truncate">{t('student.dashboard.btnSubmitStageReview')}</span>
                        </button>
                        <p className="text-center text-[11px] text-slate-500">
                          {t('student.dashboard.submitStageReviewDesc')}
                        </p>
                      </div>
                    )}

                    {liveStatus === 'faculty_review' && (
                      <div className="flex w-full items-center justify-center gap-2 rounded-lg sm:rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-amber-700">
                        <Clock className="h-3 w-3 sm:h-4 w-4 shrink-0" />
                        <span className="truncate">{t('student.dashboard.statusAwaitingFacultyReview')}</span>
                      </div>
                    )}

                    {(liveStatus === 'appointment_scheduled' || liveStatus === 'in_treatment') && !(isComposerOpen && openComposer?.mode === 'reschedule') && (
                      <button
                        type="button"
                        onClick={() => onOpenProgressComposer(c.caseId, 'reschedule')}
                        disabled={isLoading}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                        <span className="truncate">{t('student.dashboard.rescheduleAppointmentBtn')}</span>
                      </button>
                    )}

                    {isComposerOpen && openComposer?.mode === 'reschedule' && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {t('student.dashboard.rescheduleComposerTitle')}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t('student.dashboard.rescheduleComposerDesc')}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              {t('student.dashboard.appointmentDateLabel')} *
                            </label>
                            <input
                              type="date"
                              value={progressForm.appointmentDate}
                              onChange={(event) => onProgressFormChange({ appointmentDate: event.target.value })}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              {t('student.dashboard.appointmentTimeLabel')}
                            </label>
                            <input
                              type="time"
                              value={progressForm.appointmentTime}
                              onChange={(event) => onProgressFormChange({ appointmentTime: event.target.value })}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            {t('student.dashboard.rescheduleReasonLabel')}
                          </label>
                          <textarea
                            value={progressForm.note}
                            onChange={(event) => onProgressFormChange({ note: event.target.value })}
                            rows={2}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                            placeholder={t('student.dashboard.rescheduleReasonPlaceholder')}
                          />
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => onProgressSubmit(c.caseId)}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                          >
                            {isLoading
                              ? t('student.dashboard.updating')
                              : t('student.dashboard.saveReschedule')}
                          </button>
                          <button
                            type="button"
                            onClick={onResetProgressComposer}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {t('student.dashboard.cancelForm')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isClosed && (
                  <div
                    className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg sm:rounded-xl border px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold ${
                      liveStatus === 'completed'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">
                      {liveStatus === 'completed'
                        ? t('student.dashboard.caseClosed')
                        : t('student.dashboard.caseCancelledText')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
