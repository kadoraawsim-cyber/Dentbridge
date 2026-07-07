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
  computeOtpExpiry,
  generateOtpCode,
  hashOtpCode,
  OTP_TTL_MINUTES,
} from '@/lib/otp/otp.service'
import { getSmsSender } from '@/lib/otp/sms-sender'
import { normalizePatientStatusPhone } from '@/lib/patient-status/phone'

// node:crypto (via the OTP service) and the service-role client require the
// Node.js runtime.
export const runtime = 'nodejs'

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

// Anti-abuse limits. In-memory only for now; durable rate limiting is Phase 12.
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

function buildSmsBody(code: string, locale: ApiLocale): string {
  if (locale === 'tr') {
    return `DentBridge durum doğrulama kodunuz: ${code}. ${OTP_TTL_MINUTES} dakika içinde geçerliliğini yitirir.`
  }
  return `Your DentBridge status verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`
}

function getHeaderLocale(request: NextRequest): ApiLocale {
  return request.headers.get('accept-language')?.toLowerCase().includes('tr') ? 'tr' : 'en'
}

function isJsonContentType(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') || ''
  return contentType.split(';')[0]?.trim().toLowerCase() === 'application/json'
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
 * Issues a one-time verification code for a patient status lookup.
 *
 * Privacy guarantees:
 *   - The public response is identical whether or not a request exists for the
 *     phone number. Existence is never revealed.
 *   - A code is generated, hashed, stored, and sent ONLY when a matching request
 *     exists; otherwise nothing is stored or sent, but the response is the same.
 *   - Only the HMAC hash of the code is stored (`otp_codes.code_hash`). The
 *     plaintext code is never persisted or logged by this route.
 *   - Rate limited by both phone number and client IP.
 *   - Responses are `Cache-Control: no-store`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const headerLocale = getHeaderLocale(request)

  try {
    // ── 1. Same-origin browser request guard ────────────────────────────────
    if (!isAllowedSameOriginRequest(request)) {
      return errorResponse('invalid_request', headerLocale)
    }

    // ── 2. Content-Type + body parsing ───────────────────────────────────────
    if (!isJsonContentType(request)) {
      return errorResponse('invalid_request', headerLocale, { status: 415 })
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

    const { phone: rawPhone, locale: rawLocale } = body as { phone?: unknown; locale?: unknown }
    const locale: ApiLocale =
      rawLocale === 'tr' ? 'tr' : rawLocale === 'en' ? 'en' : headerLocale

    // ── 3. Phone validation (format only — not existence) ────────────────────
    const phone = normalizePatientStatusPhone(rawPhone)
    if (!phone) {
      return errorResponse('invalid_request', locale)
    }

    // ── 4. Rate limiting by IP then phone (identical response for all phones) ─
    const clientIp = getClientIp(request)

    const ipLimit = ipRateLimiter.check(clientIp)
    if (!ipLimit.allowed) {
      return errorResponse('rate_limited', locale, { retryAfterSeconds: ipLimit.retryAfterSeconds })
    }

    const phoneLimit = phoneRateLimiter.check(phone)
    if (!phoneLimit.allowed) {
      return errorResponse('rate_limited', locale, {
        retryAfterSeconds: phoneLimit.retryAfterSeconds,
      })
    }

    // ── 5. Existence lookup (service role; bypasses RLS) ─────────────────────
    // A failure here is independent of whether this specific phone exists, so a
    // 500 does not leak existence.
    const admin = createSupabaseAdminClient()
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

    // ── 6. Issue + store + send ONLY when a request exists ───────────────────
    // Any failure inside this branch is swallowed (logged server-side) so the
    // public response stays identical and cannot be used to detect existence.
    if (existingRequest) {
      try {
        const code = generateOtpCode()

        const { error: insertError } = await admin.from('otp_codes').insert({
          phone,
          code_hash: hashOtpCode(code),
          purpose: 'patient_status_lookup',
          // attempts + max_attempts intentionally omitted: use DB defaults (0 / 5).
          expires_at: computeOtpExpiry().toISOString(),
          request_ip: clientIp,
        })

        if (insertError) {
          throw insertError
        }

        const sms = getSmsSender()
        const sendResult = await sms.send({ to: phone, body: buildSmsBody(code, locale) })

        if (!sendResult.delivered) {
          console.warn('[request-otp] OTP was not delivered by the SMS sender', {
            provider: sendResult.provider,
          })
        }
      } catch (issueError) {
        console.error('[request-otp] Failed to issue OTP for an existing request', {
          error: issueError instanceof Error ? issueError.message : 'Unknown error',
        })
      }
    }

    // ── 7. Identical generic success ─────────────────────────────────────────
    return successResponse(locale)
  } catch (error) {
    console.error('[request-otp] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return errorResponse('server_error', headerLocale)
  }
}
