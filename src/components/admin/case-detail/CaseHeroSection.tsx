'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { getStatusBadgeClass } from '@/components/shared/status-badge'
import { mapDetailToUrgency } from './helpers'
import { useAdminCaseLabels } from './useAdminCaseLabels'
import type { PatientRequest } from './types'

interface CaseHeroSectionProps {
  request: PatientRequest
  assignedDepartment: string
  urgencyLevel: string
  targetStudentLevel: string
  formatReviewDate: (iso: string | null) => string
  waitingDays: (iso: string | null) => string
}

/** Page hero: back link, patient title, status badge, and triage summary chips. */
export function CaseHeroSection({
  request,
  assignedDepartment,
  urgencyLevel,
  targetStudentLevel,
  formatReviewDate,
  waitingDays,
}: CaseHeroSectionProps) {
  const { t } = useI18n()
  const { tStatus, tDepartment, tUrgency, tStudentLevel } = useAdminCaseLabels()

  return (
    <div className="mb-8">
      <Link
        href="/admin/requests"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('admin.detail.backToReviewList')}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {t('admin.detail.caseReviewPrefix')} {request.full_name}
        </h1>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
            request.status
          )}`}
        >
          {tStatus(request.status)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <p className="inline-block rounded-md bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700">
          {t('admin.detail.refLabel')} {request.id.slice(0, 8)}
        </p>
        <span className="flex items-center gap-1.5 text-sm text-slate-500">
          <Calendar className="h-4 w-4 text-slate-400" />
          {formatReviewDate(request.created_at)}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
          <Clock className="h-4 w-4" />
          {waitingDays(request.created_at)}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
          <span className="text-slate-400">{t('admin.detail.assignDeptLabel')}</span>
          <span className="font-semibold text-slate-900">{tDepartment(assignedDepartment)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
          <span className="text-amber-500/80">{t('admin.detail.urgencyLabel')}</span>
          <span className="font-semibold">{tUrgency(mapDetailToUrgency(urgencyLevel))}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700">
          <span className="font-semibold">{tStatus(request.status)}</span>
        </span>
        {targetStudentLevel && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">
            <span className="text-blue-500/80">{t('admin.detail.studentLevelLabel')}</span>
            <span className="font-semibold">{tStudentLevel(targetStudentLevel)}</span>
          </span>
        )}
      </div>
    </div>
  )
}
