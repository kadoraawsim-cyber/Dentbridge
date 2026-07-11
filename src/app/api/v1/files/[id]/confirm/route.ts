import { NextRequest, NextResponse } from 'next/server'
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
import { getServerEnvironment } from '@/lib/env/server'
import { confirmUpload } from '@/lib/files/files.service'
import { captureException } from '@/lib/observability/error-monitor'
import {
  createRequestContext,
  logRequestEnd,
  logRequestStart,
  type RequestEndMetadata,
} from '@/lib/observability/request-context'

// node:crypto (ticket/service) and the service-role client require Node.js.
export const runtime = 'nodejs'

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

// Anti-abuse: fast in-memory pre-check, backed by the shared durable limiter.
const IP_RATE_LIMIT = { name: 'files-confirm:ip', windowMs: 15 * 60_000, max: 60 }
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
 * POST /api/v1/files/[id]/confirm
 *
 * Confirms a previously prepared upload: verifies the HMAC ticket, inspects the
 * stored object (real size + magic bytes), then marks it clean or rejects and
 * deletes it. All failure modes map to a single generic error.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const headerLocale = getHeaderLocale(request)
  const requestContext = createRequestContext(request, { route: 'api.v1.files.confirm' })
  logRequestStart(requestContext, { actor_type: 'anonymous' })
  const finish = (
    response: NextResponse,
    metadata?: Omit<RequestEndMetadata, 'statusCode'>
  ): NextResponse => {
    logRequestEnd(requestContext, { statusCode: response.status, ...metadata })
    return response
  }

  try {
    const { id } = await params

    // Production launch gate: while no approved malware scanner is configured,
    // no new bytes may enter the quarantine pipeline. Fails closed with the
    // same response as the prepare endpoint.
    if (!getServerEnvironment().PATIENT_UPLOADS_ENABLED) {
      return finish(errorResponse('service_unavailable', headerLocale), {
        actorType: 'anonymous',
        errorCode: 'service_unavailable',
      })
    }

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

    const durableLimit = await checkDurableRateLimit(clientIp, {
      scope: 'file_confirm_ip',
      windowSeconds: 15 * 60,
      max: 60,
    })
    if (durableLimit.unavailable) {
      return finish(errorResponse('service_unavailable', headerLocale), {
        actorType: 'anonymous',
        errorCode: 'service_unavailable',
      })
    }
    if (!durableLimit.allowed) {
      return finish(
        errorResponse('rate_limited', headerLocale, {
          retryAfterSeconds: durableLimit.retryAfterSeconds,
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

    const { ticket, locale: rawLocale } = body as { ticket?: unknown; locale?: unknown }
    const locale = resolveLocale(rawLocale, headerLocale)

    if (!id) {
      return finish(errorResponse('invalid_request', locale), {
        actorType: 'anonymous',
        errorCode: 'invalid_request',
      })
    }

    const result = await confirmUpload({
      fileId: id,
      ticket,
      locale,
      context: auditContext,
    })

    if (!result.ok) {
      const errorCode = mapServiceError(result.reason)
      return finish(errorResponse(errorCode, locale), {
        actorType: 'anonymous',
        errorCode,
      })
    }

    return finish(
      NextResponse.json(
        { success: true, ...result.data },
        { status: 200, headers: SECURITY_HEADERS }
      ),
      { actorType: 'anonymous' }
    )
  } catch (error) {
    void captureException(error, {
      correlationId: requestContext.correlationId,
      requestId: requestContext.requestId,
      route: requestContext.route,
      actorType: 'anonymous',
      metadata: { error_code: 'server_error' },
    })
    return finish(errorResponse('server_error', headerLocale), {
      actorType: 'anonymous',
      errorCode: 'server_error',
    })
  }
}
