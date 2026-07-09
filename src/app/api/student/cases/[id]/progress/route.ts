import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getClientIp } from '@/lib/api/rate-limit'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import { addStudentProgress } from '@/lib/cases/student-progress.service'
import { captureException } from '@/lib/observability/error-monitor'
import {
  createRequestContext,
  logRequestEnd,
  logRequestStart,
  type RequestEndMetadata,
} from '@/lib/observability/request-context'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestContext = createRequestContext(request, { route: 'api.student.cases.progress' })
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
    if (actorRole !== 'student') {
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
    const result = await addStudentProgress({
      caseId: id,
      actor: {
        userId: user.id,
        email: user.email ?? null,
        role: actorRole,
      },
      body,
      context,
    })

    return finish(NextResponse.json(result.body, { status: result.status }), {
      actorRole,
      errorCode: result.status >= 400 ? 'student_progress_failed' : null,
    })
  } catch (error) {
    void captureException(error, {
      correlationId: requestContext.correlationId,
      requestId: requestContext.requestId,
      route: requestContext.route,
      actorType: 'student',
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
