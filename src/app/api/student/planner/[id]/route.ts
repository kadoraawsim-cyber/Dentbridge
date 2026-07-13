import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import {
  deleteStudentPlannerEvent,
  updateStudentPlannerEvent,
} from '@/lib/planner/student-planner.service'
import { captureException } from '@/lib/observability/error-monitor'
import {
  createRequestContext,
  logRequestEnd,
  logRequestStart,
  type RequestEndMetadata,
} from '@/lib/observability/request-context'
import { createSupabaseServerClient } from '@/lib/supabase-server'

async function getAuthorizedStudent() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (user.app_metadata?.role !== 'student') {
    return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, response: undefined as NextResponse | undefined }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestContext = createRequestContext(request, { route: 'api.student.planner.update' })
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
    const { user, response } = await getAuthorizedStudent()
    if (response) return finish(response, { errorCode: response.status >= 400 ? 'auth_failed' : null })
    if (!user) {
      return finish(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), {
        errorCode: 'unauthorized',
      })
    }

    const actorRole = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : null
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return finish(NextResponse.json({ error: 'Invalid request body' }, { status: 400 }), {
        actorRole,
        errorCode: 'invalid_request',
      })
    }

    const result = await updateStudentPlannerEvent({
      eventId: id,
      actor: {
        userId: user.id,
        role: actorRole,
      },
      body,
    })

    return finish(NextResponse.json(result.body, { status: result.status }), {
      actorRole,
      errorCode: result.status >= 400 ? 'student_planner_update_failed' : null,
    })
  } catch (error) {
    void captureException(error, {
      actorType: 'student',
      correlationId: requestContext.correlationId,
      requestId: requestContext.requestId,
      route: requestContext.route,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestContext = createRequestContext(request, { route: 'api.student.planner.delete' })
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
    const { user, response } = await getAuthorizedStudent()
    if (response) return finish(response, { errorCode: response.status >= 400 ? 'auth_failed' : null })
    if (!user) {
      return finish(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), {
        errorCode: 'unauthorized',
      })
    }

    const actorRole = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : null
    const result = await deleteStudentPlannerEvent({
      eventId: id,
      actor: {
        userId: user.id,
        role: actorRole,
      },
    })

    return finish(NextResponse.json(result.body, { status: result.status }), {
      actorRole,
      errorCode: result.status >= 400 ? 'student_planner_delete_failed' : null,
    })
  } catch (error) {
    void captureException(error, {
      actorType: 'student',
      correlationId: requestContext.correlationId,
      requestId: requestContext.requestId,
      route: requestContext.route,
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
