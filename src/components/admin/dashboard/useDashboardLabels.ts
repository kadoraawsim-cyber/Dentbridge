'use client'

/**
 * Translated label mappers for the admin dashboard (Phase 8 extraction).
 * Moved verbatim from dashboard-client.tsx. These variants intentionally
 * differ from the case-detail labels (e.g. tUrgency falls back to an
 * "unspecified" label); do not merge them without a behavior review.
 */

import { useI18n } from '@/lib/i18n'

export function useDashboardLabels() {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB'

  function relativeTime(iso: string | null): string {
    if (!iso) return '—'
    const ms = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 2) return t('admin.db.timeJustNow')
    if (mins < 60) return `${mins}${t('admin.db.timeMinutesSuffix')}`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}${t('admin.db.timeHoursSuffix')}`
    const days = Math.floor(hrs / 24)
    if (days === 1) return t('admin.db.timeYesterday')
    if (days < 7) return `${days}${t('admin.db.timeDaysSuffix')}`
    return new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
  }

  function tStatus(status: string | null): string {
    switch ((status || '').toLowerCase()) {
      case 'submitted':            return t('admin.db.statusSubmitted')
      case 'under_review':         return t('admin.db.statusUnderReview')
      case 'matched':              return t('admin.db.statusMatched')
      case 'student_approved':     return t('admin.db.statusStudentApproved')
      case 'contacted':            return t('admin.db.statusContacted')
      case 'appointment_scheduled':return t('admin.db.statusApptScheduled')
      case 'in_treatment':         return t('admin.db.statusInTreatment')
      case 'faculty_review':       return t('admin.db.statusFacultyReview')
      case 'completed':            return t('admin.db.statusCompleted')
      case 'rejected':             return t('admin.db.statusRejected')
      case 'cancelled':            return t('admin.db.statusCancelled')
      default:                     return status ?? ''
    }
  }

  function tTreatment(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'initial examination / consultation': return t('admin.db.treatmentInitialExam')
      case 'dental cleaning':                    return t('admin.db.treatmentCleaning')
      case 'fillings':                           return t('admin.db.treatmentFillings')
      case 'tooth extraction':                   return t('admin.db.treatmentExtraction')
      case 'root canal treatment':               return t('admin.db.treatmentRootCanal')
      case 'gum treatment':                      return t('admin.db.treatmentGum')
      case 'prosthetics / crowns':               return t('admin.db.treatmentProsthetics')
      case 'orthodontics':                       return t('admin.db.treatmentOrthodontics')
      case 'pediatric dentistry':                return t('admin.db.treatmentPediatric')
      case 'esthetic dentistry':                 return t('admin.db.treatmentEsthetic')
      case 'other':                              return t('admin.db.treatmentOther')
      default:                                   return type
    }
  }

  function tDepartment(dept: string): string {
    switch ((dept || '').toLowerCase()) {
      case 'endodontics':                   return t('admin.db.deptEndodontics')
      case 'oral & maxillofacial surgery':  return t('admin.db.deptSurgery')
      case 'orthodontics':                  return t('admin.db.deptOrthodontics')
      case 'periodontology':                return t('admin.db.deptPeriodontology')
      case 'restorative dentistry':         return t('admin.db.deptRestorative')
      case 'prosthodontics':                return t('admin.db.deptProsthodontics')
      case 'pedodontics':                   return t('admin.db.deptPedodontics')
      case 'oral radiology':                return t('admin.db.deptRadiology')
      case 'general review':                return t('admin.db.deptGeneralReview')
      default:                              return dept
    }
  }

  function tUrgency(urgency: string): string {
    switch ((urgency || '').toLowerCase()) {
      case 'high':   return t('request.urgencyHigh')
      case 'medium': return t('request.urgencyMedium')
      case 'low':    return t('request.urgencyLow')
      default:       return urgency || t('admin.requests.urgencyLabelUnspecified')
    }
  }

  function formatSubmittedDate(iso: string | null): string {
    if (!iso) return ''

    return new Date(iso).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return { relativeTime, tStatus, tTreatment, tDepartment, tUrgency, formatSubmittedDate }
}
