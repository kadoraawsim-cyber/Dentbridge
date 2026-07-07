import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  getPublicApiError,
  toPublicErrorBody,
  type ApiLocale,
  type PublicErrorCode,
} from '@/lib/api/errors'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { isAllowedSameOriginRequest } from '@/lib/api/same-origin'
import { AUDIT_ACTIONS, createAuditLog } from '@/lib/audit/audit.service'

export const runtime = 'nodejs'

const CONSENT_VERSION = '2026-04-18-v1'

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

const IP_RATE_LIMIT = { name: 'patient-request:ip', windowMs: 15 * 60_000, max: 20 }
const PHONE_RATE_LIMIT = { name: 'patient-request:phone', windowMs: 60 * 60_000, max: 5 }

const ipRateLimiter = createRateLimiter(IP_RATE_LIMIT)
const phoneRateLimiter = createRateLimiter(PHONE_RATE_LIMIT)

const TREATMENT_VALUES = new Set([
  'Initial Examination / Consultation',
  'Dental Cleaning',
  'Fillings',
  'Tooth Extraction',
  'Root Canal Treatment',
  'Gum Treatment',
  'Prosthetics / Crowns',
  'Orthodontics',
  'Pediatric Dentistry',
  'Esthetic Dentistry',
  "I'm not sure",
  'Other',
])

const GENDER_VALUES = new Set(['Male', 'Female'])
const LANGUAGE_VALUES = new Set(['Turkish', 'English', 'Arabic'])
const UNIVERSITY_VALUES = new Set(['İstinye Dental Hospital'])
const DAY_VALUES = new Set([
  'No Preference',
  'Weekday Mornings',
  'Weekday Afternoons',
  'As Soon As Possible',
])
const DURATION_VALUES = new Set([
  'Today',
  'A few days',
  '1-2 weeks',
  'More than a month',
  'Routine / No specific start date',
])
const CONTACT_METHOD_VALUES = new Set(['WhatsApp', 'Phone Call', 'SMS'])
const CONTACT_TIME_VALUES = new Set(['Morning', 'Afternoon', 'Evening', 'Anytime'])
const MEDICAL_CONDITION_VALUES = new Set([
  'None',
  'Diabetes',
  'Pregnancy',
  'Blood thinner use',
  'Allergy',
  'Other',
])
const ATTACHMENT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf'])

interface PatientRequestPayload {
  fullName?: unknown
  phoneCountryCode?: unknown
  phone?: unknown
  age?: unknown
  gender?: unknown
  preferredLanguage?: unknown
  preferredUniversity?: unknown
  treatmentType?: unknown
  complaintText?: unknown
  preferredDays?: unknown
  painScore?: unknown
  symptomDuration?: unknown
  contactMethod?: unknown
  bestContactTime?: unknown
  medicalCondition?: unknown
  medicalConditionDetails?: unknown
  kvkkAcknowledgement?: unknown
  explicitConsent?: unknown
  attachmentPath?: unknown
  attachmentName?: unknown
  locale?: unknown
}

interface ValidatedPatientRequest {
  fullName: string
  age: number
  gender: string
  phone: string
  preferredLanguage: string | null
  preferredUniversity: string
  treatmentType: string
  complaintText: string
  urgency: string
  preferredDays: string | null
  painScore: number
  symptomDuration: string
  contactMethod: string | null
  bestContactTime: string | null
  medicalCondition: string
  attachmentPath: string | null
  attachmentName: string | null
}

interface PatientRequestRow {
  id?: unknown
}

function getHeaderLocale(request: NextRequest): ApiLocale {
  return request.headers.get('accept-language')?.toLowerCase().includes('tr') ? 'tr' : 'en'
}

function resolveLocale(value: unknown, headerLocale: ApiLocale): ApiLocale {
  return value === 'tr' ? 'tr' : value === 'en' ? 'en' : headerLocale
}

function isJsonContentType(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') || ''
  return contentType.split(';')[0]?.trim().toLowerCase() === 'application/json'
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getOptionalString(value: unknown): string | null {
  const text = getString(value)
  return text || null
}

function getUrgencyFromPainScore(painScore: number): string {
  if (painScore >= 7) {
    return 'High'
  }
  if (painScore >= 4) {
    return 'Medium'
  }
  return 'Low'
}

function normalizePhone(countryCode: unknown, phone: unknown): string | null {
  const code = getString(countryCode)
  const national = getString(phone).replace(/\D/g, '')

  if (!/^\+\d+$/.test(code) || national.length < 6 || national.length > 15) {
    return null
  }

  const combined = `${code}${national}`
  const digits = combined.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) {
    return null
  }

  return `+${digits}`
}

function isValidFullName(value: string): boolean {
  const words = value.split(/\s+/).filter(Boolean)
  return (
    words.length >= 2 &&
    words.every((word) => /[\p{L}]/u.test(word)) &&
    value.replace(/[\p{L}\s'.-]/gu, '') === ''
  )
}

function isValidOptionalValue(value: string | null, allowed: Set<string>): boolean {
  return value == null || allowed.has(value)
}

function isValidAttachment(path: string | null, name: string | null): boolean {
  if (!path && !name) {
    return true
  }
  if (!path || !name || path.length > 300 || name.length > 255) {
    return false
  }
  if (path.includes('/') || path.includes('\\') || path.includes('..')) {
    return false
  }

  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  return ATTACHMENT_EXTENSIONS.has(extension)
}

function validatePayload(payload: PatientRequestPayload): ValidatedPatientRequest | null {
  const fullName = getString(payload.fullName)
  const age = Number(getString(payload.age))
  const gender = getString(payload.gender)
  const phone = normalizePhone(payload.phoneCountryCode, payload.phone)
  const preferredLanguage = getOptionalString(payload.preferredLanguage)
  const preferredUniversity = getString(payload.preferredUniversity)
  const treatmentType = getString(payload.treatmentType)
  const complaintText = getString(payload.complaintText)
  const preferredDays = getOptionalString(payload.preferredDays)
  const painScore = Number(getString(payload.painScore))
  const symptomDuration = getString(payload.symptomDuration)
  const contactMethod = getOptionalString(payload.contactMethod)
  const bestContactTime = getOptionalString(payload.bestContactTime)
  const medicalCondition = getString(payload.medicalCondition)
  const medicalConditionDetails = getString(payload.medicalConditionDetails)
  const attachmentPath = getOptionalString(payload.attachmentPath)
  const attachmentName = getOptionalString(payload.attachmentName)

  if (!isValidFullName(fullName)) {
    return null
  }
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return null
  }
  if (!phone) {
    return null
  }
  if (!GENDER_VALUES.has(gender)) {
    return null
  }
  if (!UNIVERSITY_VALUES.has(preferredUniversity)) {
    return null
  }
  if (!isValidOptionalValue(preferredLanguage, LANGUAGE_VALUES)) {
    return null
  }
  if (!TREATMENT_VALUES.has(treatmentType)) {
    return null
  }
  if (complaintText.length < 5 || complaintText.length > 5000) {
    return null
  }
  if (!Number.isInteger(painScore) || painScore < 0 || painScore > 10) {
    return null
  }
  if (!DURATION_VALUES.has(symptomDuration)) {
    return null
  }
  if (!MEDICAL_CONDITION_VALUES.has(medicalCondition)) {
    return null
  }
  if (medicalCondition === 'Other' && medicalConditionDetails.length < 2) {
    return null
  }
  if (!isValidOptionalValue(preferredDays, DAY_VALUES)) {
    return null
  }
  if (!isValidOptionalValue(contactMethod, CONTACT_METHOD_VALUES)) {
    return null
  }
  if (!isValidOptionalValue(bestContactTime, CONTACT_TIME_VALUES)) {
    return null
  }
  if (payload.kvkkAcknowledgement !== true || payload.explicitConsent !== true) {
    return null
  }
  if (!isValidAttachment(attachmentPath, attachmentName)) {
    return null
  }

  return {
    fullName,
    age,
    gender,
    phone,
    preferredLanguage,
    preferredUniversity,
    treatmentType,
    complaintText,
    urgency: getUrgencyFromPainScore(painScore),
    preferredDays,
    painScore,
    symptomDuration,
    contactMethod,
    bestContactTime,
    medicalCondition:
      medicalCondition === 'Other' ? `Other: ${medicalConditionDetails}` : medicalCondition,
    attachmentPath,
    attachmentName,
  }
}

function errorResponse(
  code: PublicErrorCode,
  locale: ApiLocale,
  options?: { status?: number; retryAfterSeconds?: number }
): NextResponse {
  const headers: Record<string, string> = { ...SECURITY_HEADERS }
  if (options?.retryAfterSeconds != null) {
    headers['Retry-After'] = String(Math.max(1, options.retryAfterSeconds))
  }
  return NextResponse.json(toPublicErrorBody(code, locale), {
    status: options?.status ?? getPublicApiError(code, locale).status,
    headers,
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const headerLocale = getHeaderLocale(request)

  try {
    if (!isAllowedSameOriginRequest(request)) {
      return errorResponse('invalid_request', headerLocale)
    }

    if (!isJsonContentType(request)) {
      return errorResponse('invalid_request', headerLocale, { status: 415 })
    }

    const clientIp = getClientIp(request)
    const ipLimit = ipRateLimiter.check(clientIp)
    if (!ipLimit.allowed) {
      return errorResponse('rate_limited', headerLocale, {
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse('invalid_request', headerLocale)
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return errorResponse('invalid_request', headerLocale)
    }

    const payload = body as PatientRequestPayload
    const locale = resolveLocale(payload.locale, headerLocale)
    const validated = validatePayload(payload)
    if (!validated) {
      return errorResponse('invalid_request', locale)
    }

    const phoneLimit = phoneRateLimiter.check(validated.phone)
    if (!phoneLimit.allowed) {
      return errorResponse('rate_limited', locale, {
        retryAfterSeconds: phoneLimit.retryAfterSeconds,
      })
    }

    const admin = createSupabaseAdminClient()
    const acceptedAt = new Date().toISOString()
    const userAgent = request.headers.get('user-agent')
    const { data: patientRequest, error } = await admin
      .from('patient_requests')
      .insert({
        full_name: validated.fullName,
        age: validated.age,
        gender: validated.gender,
        phone: validated.phone,
        preferred_language: validated.preferredLanguage,
        preferred_university: validated.preferredUniversity,
        treatment_type: validated.treatmentType,
        complaint_text: validated.complaintText,
        urgency: validated.urgency,
        preferred_days: validated.preferredDays,
        pain_score: validated.painScore,
        symptom_duration: validated.symptomDuration,
        contact_method: validated.contactMethod,
        best_contact_time: validated.bestContactTime,
        medical_condition: validated.medicalCondition,
        consent: true,
        consent_accepted_at: acceptedAt,
        consent_version: CONSENT_VERSION,
        attachment_path: validated.attachmentPath,
        attachment_name: validated.attachmentName,
        status: 'submitted',
      })
      .select('id')
      .single<PatientRequestRow>()

    if (error) {
      throw error
    }

    const patientRequestId =
      typeof patientRequest?.id === 'string' ? patientRequest.id : null
    if (!patientRequestId) {
      throw new Error('Patient request insert did not return an id.')
    }

    const { error: consentError } = await admin.from('consent_records').insert([
      {
        patient_request_id: patientRequestId,
        consent_type: 'kvkk_acknowledgement',
        consent_version: CONSENT_VERSION,
        language: locale,
        accepted_at: acceptedAt,
        ip_address: clientIp,
        user_agent: userAgent,
        source: 'patient_request',
      },
      {
        patient_request_id: patientRequestId,
        consent_type: 'explicit_consent',
        consent_version: CONSENT_VERSION,
        language: locale,
        accepted_at: acceptedAt,
        ip_address: clientIp,
        user_agent: userAgent,
        source: 'patient_request',
      },
    ])

    if (consentError) {
      console.error('[patient-request] Failed to create consent records', {
        patientRequestId,
        error: consentError.message,
      })

      const { error: cleanupError } = await admin
        .from('patient_requests')
        .delete()
        .eq('id', patientRequestId)

      if (cleanupError) {
        console.error('[patient-request] Failed to clean up request after consent failure', {
          patientRequestId,
          error: cleanupError.message,
        })
      }

      throw new Error('Consent record creation failed.')
    }

    await createAuditLog({
      action: AUDIT_ACTIONS.PATIENT_REQUEST_CREATED,
      entityType: 'patient_request',
      entityId: patientRequestId,
      metadata: {
        treatment_type: validated.treatmentType,
        urgency: validated.urgency,
        preferred_university: validated.preferredUniversity,
        has_attachment: Boolean(validated.attachmentPath),
        locale,
      },
      ipAddress: clientIp,
      userAgent,
    })

    return NextResponse.json({ success: true }, { status: 200, headers: SECURITY_HEADERS })
  } catch (error) {
    console.error('[patient-request] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return errorResponse('server_error', headerLocale)
  }
}
