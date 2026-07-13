'use client'

import { Phone } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAdminCaseLabels } from './useAdminCaseLabels'
import type { PatientRequest } from './types'

interface PatientSummarySectionProps {
  request: PatientRequest
  attachmentLabel: string
  previewUrl: string | null
  previewLoading: boolean
  openingFile: boolean
  onViewAttachment: () => void
}

/**
 * Patient profile, full submission details, and the uploaded-attachment
 * preview block. Rendered inside the main case card; the signed-URL fetch
 * lifecycle stays in the container.
 */
export function PatientSummarySection({
  request,
  attachmentLabel,
  previewUrl,
  previewLoading,
  openingFile,
  onViewAttachment,
}: PatientSummarySectionProps) {
  const { t } = useI18n()
  const {
    tLanguage,
    tDays,
    tGender,
    tTreatmentType,
    tDuration,
    tMedicalCondition,
    tContactMethod,
    tContactTime,
  } = useAdminCaseLabels()

  return (
    <>
      <h3 className="mb-6 border-b border-slate-100 pb-4 text-xl font-bold text-slate-900">
        {t('admin.detail.patientProfileTitle')}
      </h3>

      <div className="mb-8 grid gap-y-5 sm:grid-cols-2 sm:gap-x-8">
        <div className="min-w-0">
          <p className="mb-1 text-xs text-slate-500">{t('admin.detail.ageLabel')}</p>
          <p className="font-medium text-slate-900">{request.age ?? '—'}</p>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-xs text-slate-500">{t('admin.detail.phoneLabel')}</p>
          <p className="flex min-w-0 items-center gap-1.5 break-all font-medium text-slate-900">
            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {request.phone}
          </p>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-xs text-slate-500">{t('admin.detail.langLabel')}</p>
          <p className="font-medium text-slate-900">
            {tLanguage(request.preferred_language)}
          </p>
        </div>

        <div className="min-w-0 sm:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t('admin.detail.availabilityLabel')}</p>
          <p className="break-words font-medium text-slate-900">{tDays(request.preferred_days)}</p>
        </div>

        <div className="min-w-0 sm:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t('admin.detail.complaintLabel')}</p>
          <p className="break-words rounded-lg border border-slate-100 bg-slate-50 p-3 font-medium text-slate-900">
            {request.complaint_text}
          </p>
        </div>
      </div>

      {/* Full Patient Submission */}
      <div className="mb-8 border-t border-slate-100 pt-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          {t('admin.detail.fullSubmissionTitle')}
        </h3>
        <div className="grid gap-y-5 sm:grid-cols-2 sm:gap-x-8">
          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-500">{t('admin.detail.fullNameLabel')}</p>
            <p className="break-words font-medium text-slate-900">{request.full_name}</p>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-500">{t('admin.detail.genderLabel')}</p>
            <p className="font-medium text-slate-900">{tGender(request.gender)}</p>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-500">{t('admin.detail.treatmentTypeLabel')}</p>
            <p className="break-words font-medium text-slate-900">{tTreatmentType(request.treatment_type)}</p>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-500">{t('admin.detail.painScoreLabel')}</p>
            <p className="font-medium text-slate-900">
              {request.pain_score !== null && request.pain_score !== undefined
                ? String(request.pain_score)
                : t('admin.detail.notProvided')}
            </p>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-500">{t('admin.detail.symptomDurationLabel')}</p>
            <p className="break-words font-medium text-slate-900">{tDuration(request.symptom_duration)}</p>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-500">{t('admin.detail.medicalConditionLabel')}</p>
            <p className="break-words font-medium text-slate-900">{tMedicalCondition(request.medical_condition)}</p>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-500">{t('admin.detail.contactMethodLabel')}</p>
            <p className={`font-medium ${request.contact_method ? 'text-slate-900' : 'text-slate-400'}`}>
              {tContactMethod(request.contact_method)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-500">{t('admin.detail.bestContactTimeLabel')}</p>
            <p className={`font-medium ${request.best_contact_time ? 'text-slate-900' : 'text-slate-400'}`}>
              {tContactTime(request.best_contact_time)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 border-t border-slate-100 pt-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          {t('admin.detail.uploadedImagesTitle')}
        </h3>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {!request.attachment_file_id ? (
              <div className="flex aspect-video items-center justify-center">
                <p className="px-4 text-center text-xs text-slate-400">{t('admin.detail.noUploadedImage')}</p>
              </div>
            ) : previewLoading ? (
              <div className="flex aspect-video items-center justify-center">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              </div>
            ) : previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- Signed upload preview URLs are short-lived and may not match static Next image remote patterns. */}
                <img
                  src={previewUrl}
                  alt={attachmentLabel}
                  className="aspect-video w-full object-contain"
                />
              </>
            ) : (
              <div className="flex aspect-video items-center justify-center">
                <p className="px-4 text-center text-xs text-slate-500">{attachmentLabel}</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {request.attachment_file_id ? (
              <p className="min-w-0 truncate text-xs text-slate-400">{attachmentLabel}</p>
            ) : (
              <p className="text-xs text-slate-400">{t('admin.detail.noUploadedImage')}</p>
            )}

            <button
              type="button"
              onClick={onViewAttachment}
              disabled={!request.attachment_file_id || openingFile}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {openingFile ? t('admin.detail.openingFile') : t('admin.detail.viewFullScreen')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
