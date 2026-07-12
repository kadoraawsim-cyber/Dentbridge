import { cookies } from 'next/headers'
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
import { createPatientFileSignedUrl } from '@/lib/files/files.service'
import { captureException } from '@/lib/observability/error-monitor'
import {
  createRequestContext,
  logRequestEnd,
  logRequestStart,
  type RequestEndMetadata,
} from '@/lib/observability/request-context'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

const IP_RATE_LIMIT = { name: 'files-signed-url:ip', windowMs: 15 * 60_000, max: 120 }
const ipRateLimiter = createRateLimiter(IP_RATE_LIMIT)

function getHeaderLocale(request: NextRequest): ApiLocale {
  return request.headers.get('accept-language')?.toLowerCase().includes('tr') ? 'tr' : 'en'
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
  reason:
    | 'invalid_request'
    | 'validation_failed'
    | 'unsupported_format'
    | 'image_too_large'
    | 'image_unreadable'
    | 'image_processing_failed'
    | 'not_found'
    | 'forbidden'
    | 'server_error'
): PublicErrorCode {
  return reason === 'server_error' ? 'server_error' : 'invalid_request'
}

function parsePurpose(value: unknown): 'preview' | 'download' | null {
  return value === 'preview' || value === 'download' ? value : null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const headerLocale = getHeaderLocale(request)
  const requestContext = createRequestContext(request, { route: 'api.v1.files.signed_url' })
  logRequestStart(requestContext)
  const finish = (
    response: NextResponse,
    metadata?: Omit<RequestEndMetadata, 'statusCode'>
  ): NextResponse => {
    logRequestEnd(requestContext, { statusCode: response.status, ...metadata })
    return response
  }

  try {
    const { id } = await params

    if (!isAllowedSameOriginRequest(request)) {
      return finish(errorResponse('invalid_request', headerLocale), {
        errorCode: 'invalid_request',
      })
    }

    if (!isJsonContentType(request)) {
      return finish(errorResponse('invalid_request', headerLocale, { status: 415 }), {
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
        { errorCode: 'rate_limited' }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return finish(errorResponse('invalid_request', headerLocale), {
        errorCode: 'invalid_request',
      })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return finish(errorResponse('invalid_request', headerLocale), {
        errorCode: 'invalid_request',
      })
    }

    const purpose = parsePurpose((body as { purpose?: unknown }).purpose)
    if (!id || !purpose) {
      return finish(errorResponse('invalid_request', headerLocale), {
        errorCode: 'invalid_request',
      })
    }

    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return finish(errorResponse('invalid_request', headerLocale, { status: 401 }), {
        errorCode: 'unauthorized',
      })
    }
    const actorRole = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : null

    const result = await createPatientFileSignedUrl({
      fileId: id,
      purpose,
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole,
      context: auditContext,
    })

    if (!result.ok) {
      const errorCode = mapServiceError(result.reason)
      return finish(errorResponse(errorCode, headerLocale), {
        actorRole,
        errorCode,
      })
    }

    return finish(
      NextResponse.json(
        { success: true, ...result.data },
        { status: 200, headers: SECURITY_HEADERS }
      ),
      { actorRole }
    )
  } catch (error) {
    void captureException(error, {
      correlationId: requestContext.correlationId,
      requestId: requestContext.requestId,
      route: requestContext.route,
      metadata: { error_code: 'server_error' },
    })
    return finish(errorResponse('server_error', headerLocale), {
      errorCode: 'server_error',
    })
  }
}
