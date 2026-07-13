'use client'

import { ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { departmentOptions, mapDetailToUrgency, studentLevelOptions } from './helpers'
import { useAdminCaseLabels } from './useAdminCaseLabels'

interface TriagePanelProps {
  status: string | null
  isTerminal: boolean
  isTriagePhase: boolean
  canEditTriage: boolean
  isEditingTriage: boolean
  canReturnToPool: boolean
  departmentChanged: boolean
  departmentChangeWarning: boolean
  saving: boolean
  saveSuccess: string
  pendingAction: 'reject' | 'approve' | null
  pendingReturnToPool: boolean
  assignedDepartment: string
  urgencyLevel: string
  targetStudentLevel: string
  clinicalNotes: string
  triageReason: string
  returnToPoolReason: string
  onAssignedDepartmentChange: (value: string) => void
  onUrgencyLevelChange: (value: string) => void
  onTargetStudentLevelChange: (value: string) => void
  onClinicalNotesChange: (value: string) => void
  onTriageReasonChange: (value: string) => void
  onReturnToPoolReasonChange: (value: string) => void
  onPendingActionChange: (action: 'reject' | 'approve' | null) => void
  onStartEditTriage: () => void
  onCancelEditTriage: () => void
  onStartReturnToPool: () => void
  onCancelReturnToPool: () => void
  onSaveDraft: () => void
  onConfirmApprove: () => void
  onConfirmReject: () => void
  onUpdateTriage: () => void
  onReturnToPool: () => void
}

/**
 * Faculty triage form: department / urgency / student level / clinical notes,
 * plus the approve / reject / update / return-to-pool action flows. All state
 * and API calls stay in the container; this panel is purely presentational.
 */
export function TriagePanel({
  status,
  isTerminal,
  isTriagePhase,
  canEditTriage,
  isEditingTriage,
  canReturnToPool,
  departmentChanged,
  departmentChangeWarning,
  saving,
  saveSuccess,
  pendingAction,
  pendingReturnToPool,
  assignedDepartment,
  urgencyLevel,
  targetStudentLevel,
  clinicalNotes,
  triageReason,
  returnToPoolReason,
  onAssignedDepartmentChange,
  onUrgencyLevelChange,
  onTargetStudentLevelChange,
  onClinicalNotesChange,
  onTriageReasonChange,
  onReturnToPoolReasonChange,
  onPendingActionChange,
  onStartEditTriage,
  onCancelEditTriage,
  onStartReturnToPool,
  onCancelReturnToPool,
  onSaveDraft,
  onConfirmApprove,
  onConfirmReject,
  onUpdateTriage,
  onReturnToPool,
}: TriagePanelProps) {
  const { t } = useI18n()
  const { tStatus, tDepartment, tUrgency, tStudentLevel } = useAdminCaseLabels()

  return (
    <section
      aria-labelledby="faculty-triage-title"
      className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm ring-1 ring-blue-100/70"
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-blue-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 id="faculty-triage-title" className="text-xl font-bold text-slate-950">
              {t('admin.detail.triageTitle')}
            </h3>
          </div>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            isTerminal
              ? 'border-slate-200 bg-white text-slate-500'
              : isTriagePhase
              ? 'border-blue-200 bg-white text-blue-900'
              : 'border-teal-200 bg-white text-teal-700'
          }`}
        >
          {tStatus(status)}
        </span>
      </div>

      {isTerminal && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-500">
          {(status || '').toLowerCase() === 'matched'
            ? t('admin.detail.triageReleasedNote')
            : t('admin.detail.triageClosedNote')}
        </div>
      )}

      {!isTriagePhase && canEditTriage && !isEditingTriage && (
        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={onStartEditTriage}
            className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50"
          >
            {t('admin.detail.editCase')}
          </button>
        </div>
      )}

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {t('admin.detail.assignDeptLabel')}{' '}
              <span className="text-xs font-normal text-slate-400">
                {t('admin.detail.assignDeptHint')}
              </span>
            </label>
            <select
              value={assignedDepartment}
              onChange={(e) => onAssignedDepartmentChange(e.target.value)}
              disabled={saving || (!isTriagePhase && !isEditingTriage)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {tDepartment(dept)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {t('admin.detail.urgencyLabel')}
            </label>
            <select
              value={urgencyLevel}
              onChange={(e) => onUrgencyLevelChange(e.target.value)}
              disabled={saving || (!isTriagePhase && !isEditingTriage)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="High (Emergency / Severe Pain)">{t('admin.detail.urgencyHighOption')}</option>
              <option value="Medium (Discomfort)">{t('admin.detail.urgencyMediumOption')}</option>
              <option value="Low (Routine)">{t('admin.detail.urgencyLowOption')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            {t('admin.detail.studentLevelLabel')}
          </label>
          <select
            value={targetStudentLevel}
            onChange={(e) => onTargetStudentLevelChange(e.target.value)}
            disabled={saving || (!isTriagePhase && !isEditingTriage)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            {studentLevelOptions.map((opt) => (
              <option key={opt} value={opt}>
                {tStudentLevel(opt)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            {t('admin.detail.clinicalNotesLabel')}{' '}
            <span className="font-normal text-slate-400">{t('admin.detail.optionalLabel')}</span>
          </label>
          <textarea
            value={clinicalNotes}
            onChange={(e) => onClinicalNotesChange(e.target.value)}
            disabled={saving || (!isTriagePhase && !isEditingTriage)}
            placeholder={t('admin.detail.clinicalNotesPlaceholder')}
            className="min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {!isTriagePhase && canEditTriage && departmentChanged && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {departmentChangeWarning
              ? t('admin.detail.deptChangeWarningAssigned')
              : t('admin.detail.deptChangeWarningGeneral')}
          </div>
        )}

        {departmentChanged && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {/* In the triage phase every action (save draft, reject, release
                  to pool) submits without a reason; only the post-release
                  "Update Triage" edit enforces one when the department
                  changed, so the indicator must follow the phase. */}
              {t('admin.detail.reasonLabel')}{' '}
              {isTriagePhase ? (
                <span className="font-normal text-slate-400">
                  {t('admin.detail.optionalLabel')}
                </span>
              ) : (
                '*'
              )}
            </label>
            <input
              type="text"
              value={triageReason}
              onChange={(e) => onTriageReasonChange(e.target.value)}
              placeholder={t('admin.detail.reasonPlaceholder')}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
            />
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-blue-100 bg-white/80 p-4">
        {saveSuccess && (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            {saveSuccess}
          </p>
        )}

        {isTriagePhase ? pendingAction === 'reject' ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="mb-3 text-sm font-semibold text-red-800">
              {t('admin.detail.rejectConfirmTitle')}
            </p>
            <p className="mb-4 text-sm text-red-700">
              {t('admin.detail.rejectConfirmDesc')}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onPendingActionChange(null)}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {t('admin.detail.cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirmReject}
                disabled={saving}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? t('admin.detail.rejecting') : t('admin.detail.confirmReject')}
              </button>
            </div>
          </div>
        ) : pendingAction === 'approve' ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="mb-3 text-sm font-semibold text-blue-900">
              {t('admin.detail.releaseConfirmTitle')}
            </p>
            <ul className="mb-4 space-y-1 text-sm text-blue-800">
              <li>
                {t('admin.detail.releaseDeptLabel')} <strong>{tDepartment(assignedDepartment)}</strong>
              </li>
              <li>
                {t('admin.detail.releaseUrgencyLabel')} <strong>{tUrgency(mapDetailToUrgency(urgencyLevel))}</strong>
              </li>
              <li>
                {t('admin.detail.releaseStudentLevelLabel')} <strong>{tStudentLevel(targetStudentLevel)}</strong>
              </li>
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onPendingActionChange(null)}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {t('admin.detail.cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirmApprove}
                disabled={saving}
                className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? t('admin.detail.releasing') : t('admin.detail.confirmRelease')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {t('admin.detail.saveDraft')}
            </button>

            <button
              type="button"
              onClick={() => onPendingActionChange('reject')}
              disabled={saving}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {t('admin.detail.rejectOutOfScope')}
            </button>

            <div className="sm:ml-auto">
              <button
                type="button"
                onClick={() => onPendingActionChange('approve')}
                disabled={saving}
                className="w-full rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60 sm:w-auto"
              >
                {t('admin.detail.approveReleaseToPool')}
              </button>
            </div>
          </div>
        ) : canEditTriage && isEditingTriage ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onCancelEditTriage}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {t('admin.detail.cancel')}
            </button>

            {canReturnToPool && (
              <button
                type="button"
                onClick={onStartReturnToPool}
                disabled={saving}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
              >
                {t('admin.detail.returnToPoolButton')}
              </button>
            )}

            <button
              type="button"
              onClick={onUpdateTriage}
              disabled={saving}
              className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? '…' : t('admin.detail.updateTriage')}
            </button>
          </div>
        ) : null}

        {canEditTriage && isEditingTriage && pendingReturnToPool && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-semibold text-amber-900">
              {t('admin.detail.returnToPoolConfirmTitle')}
            </p>
            <p className="mb-2 text-sm text-amber-800">
              {t('admin.detail.returnToPoolConfirmDesc')}
            </p>
            <p className="mb-3 text-sm text-amber-700">
              {t('admin.detail.returnToPoolWarning')}
            </p>
            <label className="mb-2 block text-sm font-semibold text-amber-900">
              {t('admin.detail.returnToPoolReasonLabel')} *
            </label>
            <input
              type="text"
              value={returnToPoolReason}
              onChange={(e) => onReturnToPoolReasonChange(e.target.value)}
              placeholder={t('admin.detail.returnToPoolReasonPlaceholder')}
              className="h-11 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-amber-500"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onCancelReturnToPool}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {t('admin.detail.cancel')}
              </button>
              <button
                type="button"
                onClick={onReturnToPool}
                disabled={saving || !returnToPoolReason.trim()}
                className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60"
              >
                {saving
                  ? t('admin.detail.returningToPool')
                  : t('admin.detail.confirmReturnToPool')}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
