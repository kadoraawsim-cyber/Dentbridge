'use client'

import { AlertCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface FacultyActionBannerProps {
  pendingCount: number
}

/**
 * Prominent faculty-action banner shown while at least one student request is
 * pending. Purely navigational: the button anchors to the existing Student
 * Requests panel (#student-requests), which remains the only surface with
 * Approve / Reject actions — no mutation or authorization logic lives here.
 */
export function FacultyActionBanner({ pendingCount }: FacultyActionBannerProps) {
  const { t } = useI18n()

  if (pendingCount <= 0) return null

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-600" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-fuchsia-900">
            {t('admin.detail.actionBannerTitle')}
          </p>
          <p className="mt-0.5 break-words text-sm text-fuchsia-800">
            {pendingCount === 1
              ? t('admin.detail.actionBannerBodyOne')
              : `${pendingCount} ${t('admin.detail.actionBannerBodySuffix')}`}
          </p>
        </div>
      </div>
      <a
        href="#student-requests"
        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-700"
      >
        {pendingCount === 1
          ? t('admin.detail.actionBannerCtaOne')
          : t('admin.detail.actionBannerCtaMany')}
      </a>
    </div>
  )
}
