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
import {
  auditPatientStatusLookup,
  createAuditRequestContext,
  getPhoneLast4,
} from '@/lib/audit/audit.service'
import { captureException } from '@/lib/observability/error-monitor'
import { logger } from '@/lib/observability/logger'
import {
  createRequestContext,
  logRequestEnd,
  logRequestStart,
  type RequestEndMetadata,
} from '@/lib/observability/request-context'
import { checkPatientStatusVerification } from '@/lib/otp/twilio-verify'
import { normalizePatientStatusPhone } from '@/lib/patient-status/phone'

export const runtime = 'nodejs'

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

const PHONE_RATE_LIMIT = { name: 'patient-status-verify:phone', windowMs: 15 * 60_000, max: 8 }
const IP_RATE_LIMIT = { name: 'patient-status-verify:ip', windowMs: 15 * 60_000, max: 20 }

const phoneRateLimiter = createRateLimiter(PHONE_RATE_LIMIT)
const ipRateLimiter = createRateLimiter(IP_RATE_LIMIT)

interface PatientStatusRow {
  treatment_type: string
  status: string
  created_at: string
  preferred_days: string | null
  assigned_department: string | null
}

function getHeaderLocale(request: NextRequest): ApiLocale {
  return request.headers.get('accept-language')?.toLowerCase().includes('tr') ? 'tr' : 'en'
}

function isJsonContentType(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') || ''
  return contentType.split(';')[0]?.trim().toLowerCase() === 'application/json'
}

function resolveLocale(rawLocale: unknown, headerLocale: ApiLocale): ApiLocale {
  return rawLocale === 'tr' ? 'tr' : rawLocale === 'en' ? 'en' : headerLocale
}

function isOtpFormatValid(raw: unknown): raw is string {
  return typeof raw === 'string' && /^\d{6}$/.test(raw)
}

function getTwilioProviderMetadata(error: unknown): Record<string, unknown> {
  const metadata: Record<string, unknown> = { provider: 'twilio_verify' }
  if (!error || typeof error !== 'object') {
    return metadata
  }

  const candidate = error as { code?: unknown; status?: unknown }
  if (typeof candidate.code === 'number' && Number.isInteger(candidate.code)) {
    metadata.provider_code = candidate.code
  }
  if (typeof candidate.status === 'number' && Number.isInteger(candidate.status)) {
    metadata.provider_status = candidate.status
  }
  return metadata
}

function isExpectedVerificationFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as { code?: unknown; status?: unknown }
  return candidate.status === 404 || candidate.code === 60202
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

function successResponse(status: PatientStatusRow): NextResponse {
  return NextResponse.json(
    {
      success: true,
      request: {
        treatment_type: status.treatment_type,
        status: status.status,
        created_at: status.created_at,
        preferred_days: status.preferred_days,
        assigned_department: status.assigned_department,
      },
    },
    { status: 200, headers: SECURITY_HEADERS }
  )
}

/**
 * POST /api/v1/patient/status
 *
 * Verifies a patient status code through Twilio Verify and returns only
 * non-sensitive status fields. DentBridge never stores or compares OTP codes.
 * Invalid phone, missing/expired/rejected code, and absent patient request all
 * map to generic public errors.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const headerLocale = getHeaderLocale(request)
  const requestContext = createRequestContext(request, { route: 'api.v1.patient.status.verify' })
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

    const { phone: rawPhone, otp: rawOtp, locale: rawLocale } = body as {
      phone?: unknown
      otp?: unknown
      locale?: unknown
    }
    const locale = resolveLocale(rawLocale, headerLocale)
    const phone = normalizePatientStatusPhone(rawPhone)

    if (!phone) {
      return finish(errorResponse('invalid_request', locale), {
        actorType: 'anonymous',
        errorCode: 'invalid_request',
      })
    }

    const clientIp = getClientIp(request)
    const auditContext = createAuditRequestContext(request, { ipAddress: clientIp })
    const phoneLast4 = getPhoneLast4(phone)
    const ipLimit = ipRateLimiter.check(clientIp)
    if (!ipLimit.allowed) {
      return finish(
        errorResponse('rate_limited', locale, { retryAfterSeconds: ipLimit.retryAfterSeconds }),
        { actorType: 'anonymous', errorCode: 'rate_limited' }
      )
    }

    const phoneLimit = phoneRateLimiter.check(phone)
    if (!phoneLimit.allowed) {
      return finish(
        errorResponse('rate_limited', locale, {
          retryAfterSeconds: phoneLimit.retryAfterSeconds,
        }),
        { actorType: 'anonymous', errorCode: 'rate_limited' }
      )
    }

    const admin = createSupabaseAdminClient()
    const verificationFailed = async (): Promise<NextResponse> => {
      await auditPatientStatusLookup({
        phoneLast4,
        locale,
        success: false,
        result: 'verification_failed',
        context: auditContext,
        supabase: admin,
      })
      return finish(errorResponse('verification_failed', locale), {
        actorType: 'anonymous',
        errorCode: 'verification_failed',
      })
    }

    if (!isOtpFormatValid(rawOtp)) {
      return verificationFailed()
    }

    let verificationStatus: string
    try {
      const verification = await checkPatientStatusVerification(phone, rawOtp)
      verificationStatus = verification.status
    } catch (error) {
      const providerMetadata = getTwilioProviderMetadata(error)
      logger.warn('patient_status.verification_check_failed', {
        correlationId: requestContext.correlationId,
        requestId: requestContext.requestId,
        route: requestContext.route,
        actorType: 'anonymous',
        metadata: providerMetadata,
      })
      if (isExpectedVerificationFailure(error)) {
        return verificationFailed()
      }
      throw new Error('Twilio Verify verification check unavailable.')
    }

    if (verificationStatus !== 'approved') {
      return verificationFailed()
    }

    const { data: statusRow, error: statusLookupError } = await admin
      .from('patient_requests')
      .select('treatment_type, status, created_at, preferred_days, assigned_department')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<PatientStatusRow>()

    if (statusLookupError) {
      throw statusLookupError
    }

    if (!statusRow) {
      await auditPatientStatusLookup({
        phoneLast4,
        locale,
        success: false,
        result: 'status_not_found',
        context: auditContext,
        supabase: admin,
      })
      return finish(errorResponse('verification_failed', locale), {
        actorType: 'anonymous',
        errorCode: 'verification_failed',
      })
    }

    await auditPatientStatusLookup({
      phoneLast4,
      locale,
      success: true,
      result: 'verified',
      context: auditContext,
      supabase: admin,
    })

    return finish(successResponse(statusRow), { actorType: 'anonymous' })
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
