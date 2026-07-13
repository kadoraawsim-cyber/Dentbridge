'use client'

import { useI18n } from '@/lib/i18n'
import { useAdminCaseLabels } from './useAdminCaseLabels'
import type { StudentCaseRequest } from './types'

type StudentRequestAction =
  | 'approve_student_request'
  | 'reject_student_request'
  | 'undo_reject_student_request'

interface StudentRequestsPanelProps {
  studentRequests: StudentCaseRequest[]
  studentOpenCaseCounts: Record<string, number>
  requestActionId: string | null
  pendingStudentAction: { requestId: string; kind: 'reject' | 'undo' } | null
  studentActionReason: string
  formatReviewDate: (iso: string | null) => string
  onStudentActionReasonChange: (value: string) => void
  onStartStudentAction: (requestId: string, kind: 'reject' | 'undo') => void
  onCancelStudentAction: () => void
  onStudentRequestAction: (requestId: string, action: StudentRequestAction, reason?: string) => void
}

/** Student case request list with approve / reject / undo flows and reason capture. */
export function StudentRequestsPanel({
  studentRequests,
  studentOpenCaseCounts,
  requestActionId,
  pendingStudentAction,
  studentActionReason,
  formatReviewDate,
  onStudentActionReasonChange,
  onStartStudentAction,
  onCancelStudentAction,
  onStudentRequestAction,
}: StudentRequestsPanelProps) {
  const { t } = useI18n()
  const { tStudentReqStatus } = useAdminCaseLabels()

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">{t('admin.detail.studentRequestsTitle')}</h3>
        {studentRequests.length > 0 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {studentRequests.length}{' '}
            {studentRequests.length === 1
              ? t('admin.detail.studentRequestCountSuffix')
              : t('admin.detail.studentRequestsCountSuffix')}
          </span>
        )}
      </div>

      {studentRequests.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t('admin.detail.noStudentRequests')}
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {studentRequests.map((req) => (
            <div
              key={req.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {req.student_email}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {t('admin.detail.requestedAtLabel')} {formatReviewDate(req.created_at)}
                </p>
                {req.status === 'pending' && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t('admin.detail.studentActiveCasesLabel')} {studentOpenCaseCounts[req.student_email] ?? 0}
                  </p>
                )}
                {req.reviewed_by && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t('admin.detail.reviewedByAtLabel')} {req.reviewed_by} · {formatReviewDate(req.reviewed_at)}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      req.status === 'approved'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : req.status === 'rejected'
                          ? 'border border-red-200 bg-red-50 text-red-700'
                          : req.status === 'revoked'
                            ? 'border border-slate-200 bg-slate-100 text-slate-700'
                          : 'border border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {tStudentReqStatus(req.status).toUpperCase()}
                  </span>

                  {req.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          onStudentRequestAction(req.id, 'approve_student_request')
                        }
                        disabled={requestActionId === req.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {requestActionId === req.id ? '…' : t('admin.detail.approveBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartStudentAction(req.id, 'reject')}
                        disabled={requestActionId === req.id}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        {t('admin.detail.rejectBtn')}
                      </button>
                    </>
                  )}

                  {req.status === 'rejected' && (
                    <button
                      type="button"
                      onClick={() => onStartStudentAction(req.id, 'undo')}
                      disabled={requestActionId === req.id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      {requestActionId === req.id ? '…' : t('admin.detail.undoRejection')}
                    </button>
                  )}
                </div>

                {pendingStudentAction?.requestId === req.id && (
                  <div className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      {pendingStudentAction.kind === 'reject'
                        ? t('admin.detail.confirmStudentReject')
                        : t('admin.detail.confirmUndoRejection')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t('admin.detail.reasonLabel')} *
                    </p>
                    <input
                      type="text"
                      value={studentActionReason}
                      onChange={(e) => onStudentActionReasonChange(e.target.value)}
                      placeholder={t('admin.detail.reasonPlaceholder')}
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                    />
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={onCancelStudentAction}
                        disabled={requestActionId === req.id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {t('admin.detail.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onStudentRequestAction(
                            req.id,
                            pendingStudentAction.kind === 'reject'
                              ? 'reject_student_request'
                              : 'undo_reject_student_request',
                            studentActionReason.trim()
                          )
                        }
                        disabled={requestActionId === req.id || !studentActionReason.trim()}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-60 ${
                          pendingStudentAction.kind === 'reject'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        {pendingStudentAction.kind === 'reject'
                          ? t('admin.detail.confirmStudentReject')
                          : t('admin.detail.confirmUndoRejection')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
