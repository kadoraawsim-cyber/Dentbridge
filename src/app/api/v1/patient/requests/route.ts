import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  getPublicApiError,
  toPublicErrorBody,
  type ApiLocale,
  type PublicErrorCode,
} from '@/lib/api/errors'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { checkDurableRateLimit } from '@/lib/api/durable-rate-limit'
import { isAllowedSameOriginRequest } from '@/lib/api/same-origin'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import {
  getPatientRequestConsentEvidence,
  PATIENT_REQUEST_CONSENT,
} from '@/lib/consent/consent.constants'
import { captureException } from '@/lib/observability/error-monitor'
import {
  createRequestContext,
  logRequestEnd,
  logRequestStart,
  type RequestEndMetadata,
} from '@/lib/observability/request-context'
import { submitPatientIntakeAtomic } from '@/lib/patient-request/intake.service'

export const runtime = 'nodejs'

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
const LANGUAGE_VALUES = new Set(['Turkish', 'English', 'Arabic', 'Persian'])
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
  fileId?: unknown
  fileTicket?: unknown
  submissionId?: unknown
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
  fileId: string | null
  fileTicket: string | null
  submissionId: string
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

type PayloadValidationResult =
  | { ok: true; data: ValidatedPatientRequest }
  | { ok: false; field?: 'complaintText' }

function validatePayload(payload: PatientRequestPayload): PayloadValidationResult {
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
  const fileId = getOptionalString(payload.fileId)
  const fileTicket = getOptionalString(payload.fileTicket)
  const submissionId = getString(payload.submissionId)

  if (!isValidFullName(fullName)) {
    return { ok: false }
  }
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return { ok: false }
  }
  if (!phone) {
    return { ok: false }
  }
  if (!GENDER_VALUES.has(gender)) {
    return { ok: false }
  }
  if (!UNIVERSITY_VALUES.has(preferredUniversity)) {
    return { ok: false }
  }
  if (!isValidOptionalValue(preferredLanguage, LANGUAGE_VALUES)) {
    return { ok: false }
  }
  if (!TREATMENT_VALUES.has(treatmentType)) {
    return { ok: false }
  }
  if (complaintText.length < 5 || complaintText.length > 5000) {
    return { ok: false, field: 'complaintText' }
  }
  if (!Number.isInteger(painScore) || painScore < 0 || painScore > 10) {
    return { ok: false }
  }
  if (!DURATION_VALUES.has(symptomDuration)) {
    return { ok: false }
  }
  if (!MEDICAL_CONDITION_VALUES.has(medicalCondition)) {
    return { ok: false }
  }
  if (medicalCondition === 'Other' && medicalConditionDetails.length < 2) {
    return { ok: false }
  }
  if (!isValidOptionalValue(preferredDays, DAY_VALUES)) {
    return { ok: false }
  }
  if (!isValidOptionalValue(contactMethod, CONTACT_METHOD_VALUES)) {
    return { ok: false }
  }
  if (!isValidOptionalValue(bestContactTime, CONTACT_TIME_VALUES)) {
    return { ok: false }
  }
  if (payload.kvkkAcknowledgement !== true || payload.explicitConsent !== true) {
    return { ok: false }
  }
  if ((fileId && !fileTicket) || (!fileId && fileTicket)) {
    return { ok: false }
  }
  if (fileId && (!isUuid(fileId) || !fileTicket || fileTicket.length > 256)) {
    return { ok: false }
  }
  if (!isUuid(submissionId)) {
    return { ok: false }
  }

  return {
    ok: true,
    data: {
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
      fileId,
      fileTicket,
      submissionId,
    },
  }
}

function errorResponse(
  code: PublicErrorCode,
  locale: ApiLocale,
  options?: { status?: number; retryAfterSeconds?: number; field?: string }
): NextResponse {
  const headers: Record<string, string> = { ...SECURITY_HEADERS }
  if (options?.retryAfterSeconds != null) {
    headers['Retry-After'] = String(Math.max(1, options.retryAfterSeconds))
  }
  const body: ReturnType<typeof toPublicErrorBody> & { field?: string } = toPublicErrorBody(
    code,
    locale
  )
  if (options?.field) {
    body.field = options.field
  }
  return NextResponse.json(body, {
    status: options?.status ?? getPublicApiError(code, locale).status,
    headers,
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const headerLocale = getHeaderLocale(request)
  const requestContext = createRequestContext(request, { route: 'api.v1.patient.requests' })
  logRequestStart(requestContext, { actor_type: 'anonymous' })
  const finish = (
    response: NextResponse,
    metadata?: Omit<RequestEndMetadata, 'statusCode'>
  ): NextResponse => {
    logRequestEnd(requestContext, { statusCode: response.status, ...metadata })
    return response
  }

  try {
    if (!isAllowedSameOriginRequest(request)) {
      return finish(errorResponse('invalid_request', headerLocale), {
        actorType: 'anonymous',
        errorCode: 'invalid_request',
      })
    }

    if (!isJsonContentType(request)) {
      return finish(errorResponse('invalid_request', headerLocale, { status: 415 }), {
        actorType: 'anonymous',
        errorCode: 'invalid_request',
      })
    }

    const clientIp = getClientIp(request)
    const auditContext = createAuditRequestContext(request, { ipAddress: clientIp })
    const ipLimit = ipRateLimiter.check(clientIp)
    if (!ipLimit.allowed) {
      return finish(
        errorResponse('rate_limited', headerLocale, {
          retryAfterSeconds: ipLimit.retryAfterSeconds,
        }),
        { actorType: 'anonymous', errorCode: 'rate_limited' }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return finish(errorResponse('invalid_request', headerLocale), {
        actorType: 'anonymous',
        errorCode: 'invalid_request',
      })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return finish(errorResponse('invalid_request', headerLocale), {
        actorType: 'anonymous',
        errorCode: 'invalid_request',
      })
    }

    const payload = body as PatientRequestPayload
    const locale = resolveLocale(payload.locale, headerLocale)
    const validated = validatePayload(payload)
    if (!validated.ok) {
      return finish(
        errorResponse(
          'invalid_request',
          locale,
          validated.field ? { field: validated.field } : undefined
        ),
        { actorType: 'anonymous', errorCode: 'invalid_request' }
      )
    }
    const data = validated.data

    const phoneLimit = phoneRateLimiter.check(data.phone)
    if (!phoneLimit.allowed) {
      return finish(
        errorResponse('rate_limited', locale, {
          retryAfterSeconds: phoneLimit.retryAfterSeconds,
        }),
        { actorType: 'anonymous', errorCode: 'rate_limited' }
      )
    }

    const admin = createSupabaseAdminClient()
    const [durableIpLimit, durablePhoneLimit] = await Promise.all([
      checkDurableRateLimit(
        clientIp,
        { scope: 'patient_request_ip', windowSeconds: 15 * 60, max: 20 },
        admin
      ),
      checkDurableRateLimit(
        data.phone,
        { scope: 'patient_request_phone', windowSeconds: 60 * 60, max: 5 },
        admin
      ),
    ])
    const unavailable = durableIpLimit.unavailable || durablePhoneLimit.unavailable
    if (unavailable) {
      return finish(errorResponse('service_unavailable', locale), {
        actorType: 'anonymous',
        errorCode: 'service_unavailable',
      })
    }
    if (!durableIpLimit.allowed || !durablePhoneLimit.allowed) {
      return finish(
        errorResponse('rate_limited', locale, {
          retryAfterSeconds: Math.max(
            durableIpLimit.retryAfterSeconds,
            durablePhoneLimit.retryAfterSeconds
          ),
        }),
        { actorType: 'anonymous', errorCode: 'rate_limited' }
      )
    }

    const result = await submitPatientIntakeAtomic({
      submissionId: data.submissionId,
      request: {
        full_name: data.fullName,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        preferred_language: data.preferredLanguage,
        preferred_university: data.preferredUniversity,
        treatment_type: data.treatmentType,
        complaint_text: data.complaintText,
        urgency: data.urgency,
        preferred_days: data.preferredDays,
        pain_score: data.painScore,
        symptom_duration: data.symptomDuration,
        contact_method: data.contactMethod,
        best_contact_time: data.bestContactTime,
        medical_condition: data.medicalCondition,
        consent_version: PATIENT_REQUEST_CONSENT.version,
        locale,
      },
      consents: getPatientRequestConsentEvidence(locale),
      fileId: data.fileId,
      fileTicket: data.fileTicket,
      context: auditContext,
      supabase: admin,
    })

    if (!result.ok) {
      const code = result.reason === 'conflict' ? 'conflict' : result.reason
      return finish(errorResponse(code, locale), {
        actorType: 'anonymous',
        errorCode: code,
      })
    }

    return finish(
      NextResponse.json({ success: true }, { status: 200, headers: SECURITY_HEADERS }),
      { actorType: 'anonymous' }
    )
  } catch (error) {
    void captureException(error, {
      actorType: 'anonymous',
      correlationId: requestContext.correlationId,
      requestId: requestContext.requestId,
      route: requestContext.route,
      metadata: { error_code: 'server_error' },
    })
    return finish(errorResponse('server_error', headerLocale), {
      actorType: 'anonymous',
      errorCode: 'server_error',
    })
  }
}
