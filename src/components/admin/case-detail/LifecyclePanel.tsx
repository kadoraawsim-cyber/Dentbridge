'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import type { AdminLifecycleAction } from '@/lib/cases/case-lifecycle'
import { departmentOptions, STATUS_ORDER, studentLevelOptions } from './helpers'
import { useAdminCaseLabels } from './useAdminCaseLabels'

interface LifecyclePanelProps {
  currentStatus: string
  isLifecyclePhase: boolean
  isClosed: boolean
  lifecycleLoading: boolean
  pendingCancel: boolean
  cancelReason: string
  assignedDepartment: string
  targetStudentLevel: string
  onAssignedDepartmentChange: (value: string) => void
  onTargetStudentLevelChange: (value: string) => void
  onCancelReasonChange: (value: string) => void
  onStartCancel: () => void
  onDismissCancel: () => void
  onLifecycleAction: (action: AdminLifecycleAction, reason?: string) => void
  onReleaseNextStage: () => void
}

/**
 * Post-pool lifecycle section: status trail, stage action buttons, the
 * faculty-review routing box, and the cancel-case confirmation flow.
 */
export function LifecyclePanel({
  currentStatus,
  isLifecyclePhase,
  isClosed,
  lifecycleLoading,
  pendingCancel,
  cancelReason,
  assignedDepartment,
  targetStudentLevel,
  onAssignedDepartmentChange,
  onTargetStudentLevelChange,
  onCancelReasonChange,
  onStartCancel,
  onDismissCancel,
  onLifecycleAction,
  onReleaseNextStage,
}: LifecyclePanelProps) {
  const { t } = useI18n()
  const { tDepartment, tStudentLevel } = useAdminCaseLabels()

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold text-slate-900">{t('admin.detail.lifecycleTitle')}</h3>

      {/* Status trail */}
      <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4">
        {[
          { key: 'matched',               label: t('admin.detail.stepReleasedToPool') },
          { key: 'student_approved',       label: t('admin.detail.stepStudentAssigned') },
          { key: 'contacted',              label: t('admin.detail.stepPatientContacted') },
          { key: 'appointment_scheduled',  label: t('admin.detail.stepApptScheduled') },
          { key: 'in_treatment',           label: t('admin.detail.stepInTreatment') },
          { key: 'faculty_review',         label: t('admin.detail.stepFacultyReview') },
          { key: 'completed',              label: t('admin.detail.stepCompleted') },
          { key: 'cancelled',              label: t('admin.detail.stepCancelled') },
        ].map((step) => {
          const reached =
            STATUS_ORDER.indexOf(currentStatus) >= STATUS_ORDER.indexOf(step.key) ||
            (currentStatus === 'cancelled' && step.key === 'cancelled') ||
            (currentStatus === 'completed' && step.key === 'completed')
          return (
            <div key={step.key} className="flex items-center gap-2">
              {currentStatus === step.key ? (
                <div className="h-2 w-2 shrink-0 rounded-full border-2 border-teal-500 bg-white" />
              ) : reached ? (
                <div className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
              ) : (
                <div className="h-2 w-2 shrink-0 rounded-full bg-slate-200" />
              )}
              <span
                className={`text-xs font-medium ${
                  currentStatus === step.key
                    ? 'text-teal-700'
                    : reached
                    ? 'text-slate-600'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      {isLifecyclePhase && (
        <>
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
          {currentStatus === 'student_approved' && (
            <button
              type="button"
              onClick={() => onLifecycleAction('mark_contacted')}
              disabled={lifecycleLoading}
              className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
            >
              {lifecycleLoading ? '…' : t('admin.detail.markContacted')}
            </button>
          )}
          {currentStatus === 'contacted' && (
            <button
              type="button"
              onClick={() => onLifecycleAction('mark_appointment_scheduled')}
              disabled={lifecycleLoading}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {lifecycleLoading ? '…' : t('admin.detail.markApptScheduled')}
            </button>
          )}
          {currentStatus === 'appointment_scheduled' && (
            <button
              type="button"
              onClick={() => onLifecycleAction('mark_in_treatment')}
              disabled={lifecycleLoading}
              className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
            >
              {lifecycleLoading ? '…' : t('admin.detail.markInTreatment')}
            </button>
          )}
          {currentStatus === 'in_treatment' && (
            <button
              type="button"
              onClick={() => onLifecycleAction('mark_completed')}
              disabled={lifecycleLoading}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {lifecycleLoading ? '…' : t('admin.detail.markCompleted')}
            </button>
          )}
          {currentStatus === 'faculty_review' && (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                {t('admin.detail.stageReviewActionsTitle')}
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {t('admin.detail.stageReviewActionsDesc')}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {t('admin.detail.releaseNextStageTitle')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('admin.detail.releaseNextStageDesc')}
                  </p>
                  <div className="mt-3 space-y-3">
                    <select
                      value={assignedDepartment}
                      onChange={(event) => onAssignedDepartmentChange(event.target.value)}
                      disabled={lifecycleLoading}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-900"
                    >
                      {departmentOptions.map((dept) => (
                        <option key={dept} value={dept}>
                          {tDepartment(dept)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={targetStudentLevel}
                      onChange={(event) => onTargetStudentLevelChange(event.target.value)}
                      disabled={lifecycleLoading}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-900"
                    >
                      {studentLevelOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {tStudentLevel(opt)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={onReleaseNextStage}
                      disabled={lifecycleLoading}
                      className="w-full rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                    >
                      {lifecycleLoading ? '…' : t('admin.detail.releaseNextStageButton')}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {t('admin.detail.markFullCompletedTitle')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('admin.detail.markFullCompletedDesc')}
                  </p>
                  <button
                    type="button"
                    onClick={() => onLifecycleAction('mark_completed')}
                    disabled={lifecycleLoading}
                    className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {lifecycleLoading ? '…' : t('admin.detail.markFullCompletedButton')}
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onStartCancel}
              disabled={lifecycleLoading}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              {t('admin.detail.markCancelled')}
            </button>
          </div>
          </div>

          {pendingCancel && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="mb-2 text-sm font-semibold text-red-800">
              {t('admin.detail.cancelCaseConfirmTitle')}
            </p>
            <p className="mb-3 text-sm text-red-700">
              {t('admin.detail.cancelCaseWarning')}
            </p>
            <label className="mb-2 block text-sm font-semibold text-red-800">
              {t('admin.detail.reasonLabel')} *
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => onCancelReasonChange(e.target.value)}
              placeholder={t('admin.detail.reasonPlaceholder')}
              className="h-11 w-full rounded-lg border border-red-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-red-500"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={onDismissCancel}
                disabled={lifecycleLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {t('admin.detail.cancel')}
              </button>
              <button
                type="button"
                onClick={() => onLifecycleAction('mark_cancelled', cancelReason.trim())}
                disabled={lifecycleLoading || !cancelReason.trim()}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {lifecycleLoading ? t('admin.detail.cancelling') : t('admin.detail.confirmCancelCase')}
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {isClosed && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {currentStatus === 'completed' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          {currentStatus === 'completed'
            ? t('admin.detail.closedCompleted')
            : currentStatus === 'cancelled'
            ? t('admin.detail.closedCancelledMsg')
            : t('admin.detail.closedGenericMsg')}
        </div>
      )}
    </div>
  )
}
