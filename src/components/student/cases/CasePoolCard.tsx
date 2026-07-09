'use client'

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  Stethoscope,
  XCircle,
} from 'lucide-react'

import { useI18n } from '@/lib/i18n'

type CaseCardCase = {
  id: string
  treatment_type: string
  urgency: string
  assigned_department: string | null
  age: number | null
  complaint_text: string | null
  pain_score: number | null
  symptom_duration: string | null
  preferred_days: string | null
  medical_condition: string | null
  attachment_path: string | null
  clinical_notes: string | null
}

type CaseCardRequest = {
  requestId: string
  status: string
}

type CaseCardContact = {
  full_name: string
  phone: string
}

function getUrgencyBadgeClass(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':   return 'bg-red-50 text-red-700 border border-red-200'
    case 'medium': return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'low':    return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    default:       return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

function getUrgencyDot(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':   return 'bg-red-500'
    case 'medium': return 'bg-amber-400'
    case 'low':    return 'bg-emerald-500'
    default:       return 'bg-slate-300'
  }
}

interface CasePoolCardProps {
  caseItem: CaseCardCase
  myRequest: CaseCardRequest | undefined
  contact: CaseCardContact | undefined
  isSubmitting: boolean
  error: string | undefined
  onRequest: (caseId: string) => void
  tTreatment: (value: string) => string
  tDept: (value: string | null) => string
  tAvailability: (value: string) => string
  tDuration: (value: string) => string
  tUrgency: (value: string) => string
  tMedicalCondition: (value: string | null) => string
  tAttachmentSummary: (caseItem: CaseCardCase) => string
}

export function CasePoolCard({
  caseItem: c,
  myRequest,
  contact,
  isSubmitting,
  error,
  onRequest,
  tTreatment,
  tDept,
  tAvailability,
  tDuration,
  tUrgency,
  tMedicalCondition,
  tAttachmentSummary,
}: CasePoolCardProps) {
  const { t } = useI18n()
  const hasRequest = !!myRequest
  const isApproved = myRequest?.status === 'approved'
  const isPending = myRequest?.status === 'pending'
  const isRejected = myRequest?.status === 'rejected'
  const isRevoked = myRequest?.status === 'revoked'
  const facultyGuidance = c.clinical_notes?.trim()

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        isApproved
          ? 'border-emerald-200'
          : isPending
            ? 'border-amber-200'
            : isRevoked
              ? 'border-slate-300'
              : 'border-slate-200'
      }`}
    >
      <div className={`flex flex-wrap items-center justify-between gap-y-1 border-b px-4 py-3 sm:px-5 ${
        isApproved
          ? 'border-emerald-100 bg-emerald-50/60'
          : isPending
            ? 'border-amber-100 bg-amber-50/60'
            : isRevoked
              ? 'border-slate-200 bg-slate-100/80'
              : 'border-slate-100 bg-slate-50/60'
      }`}>
        <span className="font-mono text-xs font-bold text-slate-500">
          #{c.id.slice(0, 8).toUpperCase()}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getUrgencyBadgeClass(c.urgency)}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${getUrgencyDot(c.urgency)}`} />
            {tUrgency(c.urgency)}
          </span>
          {isApproved && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5" /> {t('student.cases.badgeApproved')}
            </span>
          )}
          {isPending && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <Clock className="h-2.5 w-2.5" /> {t('student.cases.badgePending')}
            </span>
          )}
          {isRevoked && (
            <span className="flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              <XCircle className="h-2.5 w-2.5" /> {t('student.cases.badgeRevoked')}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-base font-bold text-slate-900">
          {c.assigned_department ? tDept(c.assigned_department) : tTreatment(c.treatment_type)}
        </p>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
          <p>
            <span className="font-semibold text-slate-700">{t('student.cases.ageLabel')}:</span>{' '}
            {c.age ?? '\u2014'} yrs
          </p>

          <p className="line-clamp-2">
            <span className="font-semibold text-slate-700">
              {t('student.cases.mainComplaint')}:
            </span>{' '}
            {c.complaint_text || t('student.cases.noComplaint')}
          </p>

          <p>
            <span className="font-semibold text-slate-700">{t('student.cases.department')}:</span>{' '}
            <span className="inline-flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="text-blue-900">
                {c.assigned_department ? tDept(c.assigned_department) : t('student.cases.unassigned')}
              </span>
            </span>
          </p>

          <p>
            <span className="font-semibold text-slate-700">{t('student.cases.urgency')}:</span>{' '}
            {tUrgency(c.urgency)}
          </p>

          <p>
            <span className="font-semibold text-slate-700">{t('student.cases.painScore')}:</span>{' '}
            {c.pain_score ?? '\u2014'}/10
          </p>

          <p>
            <span className="font-semibold text-slate-700">{t('student.cases.duration')}:</span>{' '}
            {c.symptom_duration ? tDuration(c.symptom_duration) : '\u2014'}
          </p>

          <p>
            <span className="font-semibold text-slate-700">{t('student.cases.availability')}:</span>{' '}
            {c.preferred_days ? tAvailability(c.preferred_days) : '\u2014'}
          </p>

          <p className="line-clamp-2">
            <span className="font-semibold text-slate-700">{t('student.cases.medicalNote')}:</span>{' '}
            {tMedicalCondition(c.medical_condition)}
          </p>

          <p>
            <span className="font-semibold text-slate-700">{t('student.cases.attachments')}:</span>{' '}
            {tAttachmentSummary(c)}
          </p>
        </div>

        {facultyGuidance && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-700">
              {t('student.cases.facultyGuidance')}
            </p>
            <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
              {facultyGuidance}
            </p>
          </div>
        )}

        {isApproved && contact && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              {t('student.cases.patientContact')}
            </p>
            <p className="text-sm font-bold text-slate-900">{contact.full_name}</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {contact.phone}
            </div>
            <p className="mt-2 text-xs text-emerald-700">
              {t('student.cases.contactPatientMsg')}
            </p>
          </div>
        )}

        <div className="flex-1" />

        <div className="mt-4 border-t border-slate-100 pt-4">
          {error && (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {!hasRequest && (
            <button
              type="button"
              onClick={() => onRequest(c.id)}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {t('student.cases.submitting')}</>
              ) : (
                t('student.cases.btnRequest')
              )}
            </button>
          )}

          {isPending && (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700">
              <Clock className="h-4 w-4" />
              {t('student.cases.pendingFacultyReview')}
            </div>
          )}

          {isApproved && (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {t('student.cases.approvedCheckDashboard')}
            </div>
          )}

          {isRejected && (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
              <XCircle className="h-4 w-4" />
              {t('student.cases.requestDeclined')}
            </div>
          )}

          {isRevoked && (
            <>
              <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
                <XCircle className="h-4 w-4" />
                {t('student.cases.requestRevokedByFaculty')}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {t('student.cases.requestRevokedNote')}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
