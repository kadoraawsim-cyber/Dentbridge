import { NextRequest, NextResponse } from 'next/server'
import {
  getPublicApiError,
  toPublicErrorBody,
  type ApiLocale,
  type PublicErrorCode,
} from '@/lib/api/errors'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { isAllowedSameOriginRequest } from '@/lib/api/same-origin'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import { prepareUpload } from '@/lib/files/files.service'

// node:crypto (ticket/service) and the service-role client require Node.js.
export const runtime = 'nodejs'

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

// Anti-abuse: in-memory only for now; durable rate limiting is Phase 12.
const IP_RATE_LIMIT = { name: 'files-prepare-upload:ip', windowMs: 15 * 60_000, max: 30 }
const ipRateLimiter = createRateLimiter(IP_RATE_LIMIT)

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

function mapServiceError(
  reason: 'invalid_request' | 'validation_failed' | 'not_found' | 'forbidden' | 'server_error'
): PublicErrorCode {
  return reason === 'server_error' ? 'server_error' : 'invalid_request'
}

/**
 * POST /api/v1/files/prepare-upload
 *
 * Validates declared file metadata and returns a short-lived signed upload URL
 * plus an HMAC ticket. No file bytes pass through this route; the client uploads
 * directly to storage and then calls the confirm endpoint. Existence of a
 * patient is never involved here, so responses do not leak anything.
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

    const clientIp = getClientIp(request)
    const auditContext = createAuditRequestContext(request, { ipAddress: clientIp })

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

    const { fileName, mimeType, sizeBytes, locale: rawLocale } = body as {
      fileName?: unknown
      mimeType?: unknown
      sizeBytes?: unknown
      locale?: unknown
    }
    const locale = resolveLocale(rawLocale, headerLocale)

    const result = await prepareUpload({
      fileName,
      mimeType,
      sizeBytes,
      locale,
      context: auditContext,
    })

    if (!result.ok) {
      return errorResponse(mapServiceError(result.reason), locale)
    }

    return NextResponse.json(
      { success: true, ...result.data },
      { status: 200, headers: SECURITY_HEADERS }
    )
  } catch (error) {
    console.error('[files:prepare-upload] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return errorResponse('server_error', headerLocale)
  }
}
