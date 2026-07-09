'use client'

import { Trash2, X } from 'lucide-react'

import { useI18n } from '@/lib/i18n'

import type { ActivePatient, PlannerFormState } from './types'

interface PlannerEventModalProps {
  isEditing: boolean
  form: PlannerFormState
  activePatients: ActivePatient[]
  saveError: string
  saving: boolean
  deleting: boolean
  onFormChange: (values: Partial<PlannerFormState>) => void
  onClose: () => void
  onSubmit: () => void
  onDelete: () => void
}

export function PlannerEventModal({
  isEditing,
  form,
  activePatients,
  saveError,
  saving,
  deleting,
  onFormChange,
  onClose,
  onSubmit,
  onDelete,
}: PlannerEventModalProps) {
  const { t } = useI18n()

  return (
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
            onClick={onClose}
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
              onChange={(event) => onFormChange({ title: event.target.value })}
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
                onChange={(event) => onFormChange({ startAt: event.target.value })}
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
                onChange={(event) => onFormChange({ endAt: event.target.value })}
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
              onChange={(event) => onFormChange({ description: event.target.value })}
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
              onChange={(event) => onFormChange({ patientId: event.target.value })}
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
              onClick={onDelete}
              disabled={saving || deleting}
              className="mr-auto inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? t('student.planner.deletingEvent') : t('student.planner.deleteEvent')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {t('student.planner.cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
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
  )
}
