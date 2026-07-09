'use client'

import { Clock } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface ReviewRecordCardProps {
  reviewedBy: string | null
  reviewedAt: string | null
  formatReviewDate: (iso: string | null) => string
}

/** Sidebar card: who last reviewed the case and when. */
export function ReviewRecordCard({ reviewedBy, reviewedAt, formatReviewDate }: ReviewRecordCardProps) {
  const { t } = useI18n()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0 text-slate-400" />
        <h3 className="text-sm font-bold text-slate-900">{t('admin.detail.reviewRecordTitle')}</h3>
      </div>

      {reviewedBy || reviewedAt ? (
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">{t('admin.detail.reviewedByLabel')}</p>
            <p className="break-all font-medium text-slate-900">
              {reviewedBy ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('admin.detail.lastReviewedLabel')}</p>
            <p className="font-medium text-slate-900">
              {formatReviewDate(reviewedAt)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          {t('admin.detail.noReviewYet')}
        </p>
      )}
    </div>
  )
}
