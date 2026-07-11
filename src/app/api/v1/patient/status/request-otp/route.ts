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
import {
  auditPatientStatusOtpRequested,
  createAuditRequestContext,
  getPhoneLast4,
} from '@/lib/audit/audit.service'
import { sendPatientStatusVerification } from '@/lib/otp/twilio-verify'
import { captureException } from '@/lib/observability/error-monitor'
import { logger } from '@/lib/observability/logger'
import {
  createRequestContext,
  logRequestEnd,
  logRequestStart,
  type RequestEndMetadata,
} from '@/lib/observability/request-context'
import { normalizePatientStatusPhone } from '@/lib/patient-status/phone'

// The Twilio Node SDK and the service-role client require the Node.js runtime.
export const runtime = 'nodejs'

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

// Anti-abuse limits: fast in-memory pre-check, backed by the shared durable limiter.
// Per phone: strict, to prevent SMS bombing a single number.
// Per IP: looser, to allow a household/clinic a few lookups while capping mass abuse.
const PHONE_RATE_LIMIT = { name: 'patient-status-request-otp:phone', windowMs: 15 * 60_000, max: 3 }
const IP_RATE_LIMIT = { name: 'patient-status-request-otp:ip', windowMs: 15 * 60_000, max: 10 }

const phoneRateLimiter = createRateLimiter(PHONE_RATE_LIMIT)
const ipRateLimiter = createRateLimiter(IP_RATE_LIMIT)

const GENERIC_SUCCESS_MESSAGE: Record<ApiLocale, string> = {
  en: 'If a matching request exists, we have sent a verification code to that phone number. Enter the code to view your status.',
  tr: 'Eşleşen bir talep varsa, o telefon numarasına bir doğrulama kodu gönderdik. Durumunuzu görmek için kodu girin.',
}

function getHeaderLocale(request: NextRequest): ApiLocale {
  return request.headers.get('accept-language')?.toLowerCase().includes('tr') ? 'tr' : 'en'
}

function isJsonContentType(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') || ''
  return contentType.split(';')[0]?.trim().toLowerCase() === 'application/json'
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

function successResponse(locale: ApiLocale): NextResponse {
  return NextResponse.json(
    { success: true, message: GENERIC_SUCCESS_MESSAGE[locale] },
    { status: 200, headers: SECURITY_HEADERS }
  )
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

/**
 * POST /api/v1/patient/status/request-otp
 *
 * Requests a Twilio Verify challenge for a patient status lookup.
 *
 * Privacy guarantees:
 *   - The public response is identical whether or not a request exists for the
 *     phone number. Existence is never revealed.
 *   - Twilio Verify is called ONLY when a matching request exists; otherwise no
 *     challenge is requested, but the response is the same.
 *   - DentBridge never generates, stores, logs, or handles the issued code.
 *   - Rate limited by both phone number and client IP.
 *   - Responses are `Cache-Control: no-store`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const headerLocale = getHeaderLocale(request)
  const requestContext = createRequestContext(request, {
    route: 'api.v1.patient.status.request_otp',
  })
  logRequestStart(requestContext, { actor_type: 'anonymous' })
  const finish = (
    response: NextResponse,
    metadata?: Omit<RequestEndMetadata, 'statusCode'>
  ): NextResponse => {
    logRequestEnd(requestContext, { statusCode: response.status, ...metadata })
    return response
  }

  try {
    // ── 1. Same-origin browser request guard ────────────────────────────────
    if (!isAllowedSameOriginRequest(request)) {
      return finish(errorResponse('invalid_request', headerLocale), {
        actorType: 'anonymous',
        errorCode: 'invalid_request',
      })
    }

    // ── 2. Content-Type + body parsing ───────────────────────────────────────
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

    const { phone: rawPhone, locale: rawLocale } = body as { phone?: unknown; locale?: unknown }
    const locale: ApiLocale =
      rawLocale === 'tr' ? 'tr' : rawLocale === 'en' ? 'en' : headerLocale

    // ── 3. Phone validation (format only — not existence) ────────────────────
    const phone = normalizePatientStatusPhone(rawPhone)
    if (!phone) {
      return finish(errorResponse('invalid_request', locale), {
        actorType: 'anonymous',
        errorCode: 'invalid_request',
      })
    }

    // ── 4. Rate limiting by IP then phone (identical response for all phones) ─
    const clientIp = getClientIp(request)
    const auditContext = createAuditRequestContext(request, { ipAddress: clientIp })

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

    // ── 5. Existence lookup (service role; bypasses RLS) ─────────────────────
    // A failure here is independent of whether this specific phone exists, so a
    // 500 does not leak existence.
    const admin = createSupabaseAdminClient()
    const [durableIpLimit, durablePhoneLimit] = await Promise.all([
      checkDurableRateLimit(
        clientIp,
        { scope: 'patient_status_otp_ip', windowSeconds: 15 * 60, max: 10 },
        admin
      ),
      checkDurableRateLimit(
        phone,
        { scope: 'patient_status_otp_phone', windowSeconds: 15 * 60, max: 3 },
        admin
      ),
    ])
    if (durableIpLimit.unavailable || durablePhoneLimit.unavailable) {
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
    const { data: existingRequest, error: lookupError } = await admin
      .from('patient_requests')
      .select('id')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lookupError) {
      throw lookupError
    }

    let otpIssued = false
    let smsDelivered: boolean | null = null
    const smsProvider = 'twilio_verify'

    // ── 6. Request a Twilio Verify challenge ONLY when a request exists ──────
    // Any failure inside this branch is swallowed (logged server-side) so the
    // public response stays identical and cannot be used to detect existence.
    if (existingRequest) {
      try {
        const verification = await sendPatientStatusVerification(phone, locale)
        otpIssued = verification.status === 'pending'
        smsDelivered = otpIssued

        if (!otpIssued) {
          logger.warn('patient_status.otp_delivery_failed', {
            actorType: 'anonymous',
            correlationId: requestContext.correlationId,
            requestId: requestContext.requestId,
            route: requestContext.route,
            metadata: {
              provider: smsProvider,
              provider_status: verification.status,
            },
          })
        }
      } catch (error) {
        smsDelivered = false
        const providerMetadata = getTwilioProviderMetadata(error)
        void captureException(new Error('Twilio Verify challenge request failed.'), {
          actorType: 'anonymous',
          correlationId: requestContext.correlationId,
          requestId: requestContext.requestId,
          route: requestContext.route,
          metadata: { error_code: 'otp_issue_failed', ...providerMetadata },
        })
        logger.error('patient_status.otp_issue_failed', {
          actorType: 'anonymous',
          correlationId: requestContext.correlationId,
          requestId: requestContext.requestId,
          route: requestContext.route,
          metadata: { error_code: 'otp_issue_failed', ...providerMetadata },
        })
      }
    }

    await auditPatientStatusOtpRequested({
      phoneLast4: getPhoneLast4(phone),
      locale,
      otpIssued,
      smsDelivered,
      provider: smsProvider,
      context: auditContext,
      supabase: admin,
    })

    // ── 7. Identical generic success ─────────────────────────────────────────
    return finish(successResponse(locale), { actorType: 'anonymous' })
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
