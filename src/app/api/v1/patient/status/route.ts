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
import { OTP_CODE_LENGTH, verifyOtpCode } from '@/lib/otp/otp.service'
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

interface OtpCodeRow {
  id: string
  code_hash: string
  attempts: number
  max_attempts: number
  expires_at: string
  consumed_at: string | null
}

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
  return typeof raw === 'string' && new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(raw)
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

async function incrementFailedAttempt(admin: ReturnType<typeof createSupabaseAdminClient>, row: OtpCodeRow) {
  if (row.consumed_at || row.attempts >= row.max_attempts) {
    return
  }

  const { error } = await admin
    .from('otp_codes')
    .update({ attempts: row.attempts + 1 })
    .eq('id', row.id)
    .eq('attempts', row.attempts)
    .is('consumed_at', null)

  if (error) {
    throw error
  }
}

function isOtpUsable(row: OtpCodeRow, now: Date): boolean {
  return row.consumed_at == null && row.attempts < row.max_attempts && new Date(row.expires_at) > now
}

/**
 * POST /api/v1/patient/status
 *
 * Verifies a patient status OTP and returns only non-sensitive status fields.
 * Invalid phone, missing/expired/consumed/exhausted OTP, wrong code, and absent
 * patient request all map to generic public errors.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const headerLocale = getHeaderLocale(request)

  try {
    if (!isAllowedSameOriginRequest(request)) {
      return errorResponse('invalid_request', headerLocale)
    }

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

    const { phone: rawPhone, otp: rawOtp, locale: rawLocale } = body as {
      phone?: unknown
      otp?: unknown
      locale?: unknown
    }
    const locale = resolveLocale(rawLocale, headerLocale)
    const phone = normalizePatientStatusPhone(rawPhone)

    if (!phone) {
      return errorResponse('invalid_request', locale)
    }

    const clientIp = getClientIp(request)
    const auditContext = createAuditRequestContext(request, { ipAddress: clientIp })
    const phoneLast4 = getPhoneLast4(phone)
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

    const admin = createSupabaseAdminClient()
    const { data: latestOtp, error: otpLookupError } = await admin
      .from('otp_codes')
      .select('id, code_hash, attempts, max_attempts, expires_at, consumed_at')
      .eq('phone', phone)
      .eq('purpose', 'patient_status_lookup')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<OtpCodeRow>()

    if (otpLookupError) {
      throw otpLookupError
    }

    const now = new Date()

    if (!latestOtp || !isOtpUsable(latestOtp, now) || !isOtpFormatValid(rawOtp)) {
      if (latestOtp) {
        await incrementFailedAttempt(admin, latestOtp)
      }
      await auditPatientStatusLookup({
        phoneLast4,
        locale,
        success: false,
        result: 'verification_failed',
        context: auditContext,
        supabase: admin,
      })
      return errorResponse('verification_failed', locale)
    }

    const verified = verifyOtpCode(rawOtp, latestOtp.code_hash)
    if (!verified) {
      await incrementFailedAttempt(admin, latestOtp)
      await auditPatientStatusLookup({
        phoneLast4,
        locale,
        success: false,
        result: 'verification_failed',
        context: auditContext,
        supabase: admin,
      })
      return errorResponse('verification_failed', locale)
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
      return errorResponse('verification_failed', locale)
    }

    const consumedAt = new Date().toISOString()
    const { error: consumeError } = await admin
      .from('otp_codes')
      .update({ consumed_at: consumedAt })
      .eq('id', latestOtp.id)
      .is('consumed_at', null)

    if (consumeError) {
      throw consumeError
    }

    await auditPatientStatusLookup({
      phoneLast4,
      locale,
      success: true,
      result: 'verified',
      context: auditContext,
      supabase: admin,
    })

    return successResponse(statusRow)
  } catch (error) {
    console.error('[patient-status] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return errorResponse('server_error', headerLocale)
  }
}
