import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getClientIp } from '@/lib/api/rate-limit'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import { executeAdminCaseAction } from '@/lib/cases/admin-case-actions.service'
import { captureException } from '@/lib/observability/error-monitor'
import {
  createRequestContext,
  logRequestEnd,
  logRequestStart,
  type RequestEndMetadata,
} from '@/lib/observability/request-context'
import { canAccessFacultyPortal } from '@/lib/roles'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * PATCH /api/admin/cases/[id]
 *
 * Server-side gateway for faculty/admin case actions. Authentication happens in
 * the route; the Phase 6 service performs explicit role/authorization checks
 * and owns the sensitive service-role mutations.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestContext = createRequestContext(request, { route: 'api.admin.cases.action' })
  logRequestStart(requestContext)
  const finish = (
    response: NextResponse,
    metadata?: Omit<RequestEndMetadata, 'statusCode'>
  ): NextResponse => {
    logRequestEnd(requestContext, { statusCode: response.status, ...metadata })
    return response
  }
  const { id } = await params
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return finish(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), {
        errorCode: 'unauthorized',
      })
    }

    const actorRole = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : null
    if (!canAccessFacultyPortal(actorRole)) {
      return finish(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), {
        actorRole,
        errorCode: 'forbidden',
      })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return finish(NextResponse.json({ error: 'Invalid request body' }, { status: 400 }), {
        actorRole,
        errorCode: 'invalid_request',
      })
    }

    const context = createAuditRequestContext(request, { ipAddress: getClientIp(request) })
    const response = await executeAdminCaseAction({
      caseId: id,
      body,
      actor: {
        userId: user.id,
        email: user.email ?? null,
        role: actorRole,
      },
      context,
    })
    return finish(response, {
      actorRole,
      errorCode: response.status >= 400 ? 'case_action_failed' : null,
    })
  } catch (error) {
    void captureException(error, {
      correlationId: requestContext.correlationId,
      requestId: requestContext.requestId,
      route: requestContext.route,
      actorType: 'faculty',
      metadata: { error_code: 'server_error' },
    })
    logRequestEnd(requestContext, {
      statusCode: 500,
      errorCode: 'server_error',
      outcome: 'failure',
    })
    throw error
  }
}
