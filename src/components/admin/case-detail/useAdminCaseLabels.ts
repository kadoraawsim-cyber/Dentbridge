'use client'

/**
 * Translated label mappers for the admin case detail screen (Phase 8
 * extraction). Moved verbatim from detail-client.tsx so the extracted section
 * components can share one implementation.
 *
 * Note: other admin/student screens still carry their own variants of some of
 * these mappers with slightly different fallbacks (for example tUrgency /
 * tStatus in the admin dashboard). Those variants are intentionally NOT
 * consolidated here because unifying them would change user-visible fallback
 * text; reviewing that is a separate follow-up.
 */

import { useI18n } from '@/lib/i18n'

export function useAdminCaseLabels() {
  const { t } = useI18n()

  function tUrgency(v: string): string {
    switch ((v || '').toLowerCase()) {
      case 'high': return t('request.urgencyHigh')
      case 'medium': return t('request.urgencyMedium')
      case 'low': return t('request.urgencyLow')
      default: return v
    }
  }

  function tStatus(status: string | null): string {
    switch ((status || '').toLowerCase()) {
      case 'submitted':             return t('admin.db.statusSubmitted')
      case 'under_review':          return t('admin.db.statusUnderReview')
      case 'matched':               return t('admin.db.statusMatched')
      case 'student_approved':      return t('admin.db.statusStudentApproved')
      case 'contacted':             return t('admin.db.statusContacted')
      case 'appointment_scheduled': return t('admin.db.statusApptScheduled')
      case 'in_treatment':          return t('admin.db.statusInTreatment')
      case 'faculty_review':        return t('admin.db.statusFacultyReview')
      case 'completed':             return t('admin.db.statusCompleted')
      case 'rejected':              return t('admin.db.statusRejected')
      case 'cancelled':             return t('admin.db.statusCancelled')
      default:                      return status ?? ''
    }
  }

  function tDepartment(dept: string): string {
    switch ((dept || '').toLowerCase()) {
      case 'endodontics':                  return t('admin.db.deptEndodontics')
      case 'oral & maxillofacial surgery': return t('admin.db.deptSurgery')
      case 'orthodontics':                 return t('admin.db.deptOrthodontics')
      case 'periodontology':               return t('admin.db.deptPeriodontology')
      case 'restorative dentistry':        return t('admin.db.deptRestorative')
      case 'prosthodontics':               return t('admin.db.deptProsthodontics')
      case 'pedodontics':                  return t('admin.db.deptPedodontics')
      case 'oral radiology':               return t('admin.db.deptRadiology')
      case 'general review':               return t('admin.db.deptGeneralReview')
      default:                             return dept
    }
  }

  function tStudentLevel(level: string): string {
    switch ((level || '').toLowerCase()) {
      case 'year 4 clinical student': return t('admin.db.levelYear4')
      case 'year 5 clinical student': return t('admin.db.levelYear5')
      case 'specialist dentist':      return t('admin.db.levelSpecialist')
      default:                        return level
    }
  }

  function tLanguage(lang: string | null): string {
    switch ((lang || '').toLowerCase()) {
      case 'turkish': return t('admin.db.langTurkish')
      case 'english': return t('admin.db.langEnglish')
      case 'arabic':  return t('admin.db.langArabic')
      default:        return lang || '—'
    }
  }

  function tDays(days: string | null): string {
    switch ((days || '').toLowerCase()) {
      case 'no preference':        return t('admin.db.daysNoPreference')
      case 'weekday mornings':     return t('admin.db.daysWeekdayMornings')
      case 'weekday afternoons':   return t('admin.db.daysWeekdayAfternoons')
      case 'as soon as possible':  return t('admin.db.daysAsSoonAsPossible')
      default:                     return days || '—'
    }
  }

  function tGender(gender: string | null): string {
    switch ((gender || '').toLowerCase()) {
      case 'male':   return t('request.genderMale')
      case 'female': return t('request.genderFemale')
      default:       return gender || t('admin.detail.notProvided')
    }
  }

  function tTreatmentType(type: string): string {
    switch (type) {
      case 'Initial Examination / Consultation': return t('admin.db.treatmentInitialExam')
      case 'Dental Cleaning':                    return t('admin.db.treatmentCleaning')
      case 'Fillings':                           return t('admin.db.treatmentFillings')
      case 'Tooth Extraction':                   return t('admin.db.treatmentExtraction')
      case 'Root Canal Treatment':               return t('admin.db.treatmentRootCanal')
      case 'Gum Treatment':                      return t('admin.db.treatmentGum')
      case 'Prosthetics / Crowns':               return t('admin.db.treatmentProsthetics')
      case 'Orthodontics':                       return t('admin.db.treatmentOrthodontics')
      case 'Pediatric Dentistry':                return t('admin.db.treatmentPediatric')
      case 'Esthetic Dentistry':                 return t('admin.db.treatmentEsthetic')
      case "I'm not sure":                       return t('request.treatments.notSure')
      case 'Other':                              return t('admin.db.treatmentOther')
      default:                                   return type || '—'
    }
  }

  function tDuration(duration: string | null): string {
    switch ((duration || '').toLowerCase()) {
      case 'today':                           return t('request.durationToday')
      case 'a few days':                      return t('request.durationFewDays')
      case '1-2 weeks':                       return t('request.durationOneToTwoWeeks')
      case 'more than a month':               return t('request.durationMoreThanMonth')
      case 'routine / no specific start date':return t('request.durationRoutineNoSpecificStart')
      default:                                return duration || t('admin.detail.notProvided')
    }
  }

  function tMedicalCondition(condition: string | null): string {
    if (!condition) return t('admin.detail.notProvided')
    const lower = condition.toLowerCase()
    if (lower === 'none')             return t('request.medicalNone')
    if (lower === 'diabetes')         return t('request.medicalDiabetes')
    if (lower === 'pregnancy')        return t('request.medicalPregnancy')
    if (lower === 'blood thinner use')return t('request.medicalBloodThinner')
    if (lower === 'allergy')          return t('request.medicalAllergy')
    if (lower.startsWith('other:'))   return `${t('request.medicalOther')}: ${condition.slice(7).trim()}`
    if (lower === 'other')            return t('request.medicalOther')
    return condition
  }

  function tContactMethod(method: string | null): string {
    switch ((method || '').toLowerCase()) {
      case 'whatsapp':   return t('request.contactMethodWhatsapp')
      case 'phone call': return t('request.contactMethodPhone')
      case 'sms':        return t('request.contactMethodSms')
      default:           return method || t('admin.detail.notProvided')
    }
  }

  function tContactTime(time: string | null): string {
    switch ((time || '').toLowerCase()) {
      case 'morning':   return t('request.contactTimeMorning')
      case 'afternoon': return t('request.contactTimeAfternoon')
      case 'evening':   return t('request.contactTimeEvening')
      case 'anytime':   return t('request.contactTimeAnytime')
      default:          return time || t('admin.detail.notProvided')
    }
  }

  function tStudentReqStatus(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'pending':  return t('admin.db.studentReqPending')
      case 'approved': return t('admin.db.studentReqApproved')
      case 'rejected': return t('admin.db.studentReqRejected')
      case 'revoked':  return t('admin.db.studentReqRevoked')
      default:         return status
    }
  }

  return {
    tUrgency,
    tStatus,
    tDepartment,
    tStudentLevel,
    tLanguage,
    tDays,
    tGender,
    tTreatmentType,
    tDuration,
    tMedicalCondition,
    tContactMethod,
    tContactTime,
    tStudentReqStatus,
  }
}
