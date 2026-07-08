import 'server-only'

import {
  auditStudentCaseRequested,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  isCaseAvailableForRequests,
  isStageAvailableForRequests,
  isStudentActor,
  LIFECYCLE_MESSAGES,
  STUDENT_REQUEST_STATUS,
} from './case-lifecycle'

/**
 * Log the underlying failure server-side and return a stable, generic error
 * token for the client. Raw database/Supabase error messages must never be
 * returned to authenticated users.
 */
function logServerError(context: string, detail: string): string {
  console.error(context, { error: detail })
  return 'server_error'
}

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

interface StudentActor {
  userId: string
  email: string | null
  role: unknown
}

export interface CreateStudentCaseRequestInput {
  caseId: string
  actor: StudentActor
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

export interface ServiceResponse {
  status: number
  body: Record<string, unknown>
}

async function resolveReleasedCurrentStage({
  supabase,
  caseId,
  currentStageId,
}: {
  supabase: SupabaseAdminClient
  caseId: string
  currentStageId: string | null
}) {
  if (currentStageId) {
    const { data: currentStage, error: currentStageError } = await supabase
      .from('case_routing_stages')
      .select('id, status')
      .eq('id', currentStageId)
      .eq('case_id', caseId)
      .maybeSingle()

    if (currentStageError) {
      return {
        stageId: null,
        error: logServerError(
          '[student-case-request] currentStageError',
          currentStageError.message
        ),
        status: 500,
      }
    }

    if (currentStage && !isStageAvailableForRequests(currentStage.status)) {
      return {
        stageId: null,
        error: LIFECYCLE_MESSAGES.STAGE_NOT_AVAILABLE_FOR_REQUESTS,
        status: 409,
      }
    }

    return { stageId: currentStageId, error: null, status: 200 }
  }

  const { data: fallbackStage, error: fallbackStageError } = await supabase
    .from('case_routing_stages')
    .select('id, status')
    .eq('case_id', caseId)
    .eq('sequence', 1)
    .maybeSingle()

  if (fallbackStageError) {
    return { stageId: null, error: logServerError('[student-case-request] fallbackStageError', fallbackStageError.message), status: 500 }
  }

  if (!fallbackStage) {
    return { stageId: null, error: null, status: 200 }
  }

  if (!isStageAvailableForRequests(fallbackStage.status)) {
    return {
      stageId: null,
      error: LIFECYCLE_MESSAGES.STAGE_NOT_AVAILABLE_FOR_REQUESTS,
      status: 409,
    }
  }

  const stageId = fallbackStage.id as string

  const { error: linkStageError } = await supabase
    .from('patient_requests')
    .update({ current_stage_id: stageId })
    .eq('id', caseId)
    .is('current_stage_id', null)

  if (linkStageError) {
    return { stageId: null, error: logServerError('[student-case-request] linkStageError', linkStageError.message), status: 500 }
  }

  return { stageId, error: null, status: 200 }
}

export async function createStudentCaseRequest(
  input: CreateStudentCaseRequestInput
): Promise<ServiceResponse> {
  if (!isStudentActor(input.actor.role)) {
    return { status: 403, body: { error: LIFECYCLE_MESSAGES.FORBIDDEN } }
  }

  const supabase = input.supabase ?? createSupabaseAdminClient()

  const { data: caseRow, error: caseError } = await supabase
    .from('patient_requests')
    .select('id, status, current_stage_id')
    .eq('id', input.caseId)
    .single()

  if (caseError || !caseRow) {
    return { status: 404, body: { error: 'Case not found' } }
  }

  if (!isCaseAvailableForRequests(caseRow.status)) {
    return {
      status: 409,
      body: { error: LIFECYCLE_MESSAGES.CASE_NOT_AVAILABLE_FOR_REQUESTS },
    }
  }

  const stageResult = await resolveReleasedCurrentStage({
    supabase,
    caseId: input.caseId,
    currentStageId: caseRow.current_stage_id ?? null,
  })

  if (stageResult.error) {
    return { status: stageResult.status, body: { error: stageResult.error } }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('student_case_requests')
    .insert({
      case_id: input.caseId,
      student_id: input.actor.userId,
      student_email: input.actor.email ?? '',
      status: STUDENT_REQUEST_STATUS.PENDING,
      stage_id: stageResult.stageId,
    })
    .select('id, case_id, stage_id, status, created_at')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        status: 409,
        body: { error: LIFECYCLE_MESSAGES.DUPLICATE_CASE_REQUEST },
      }
    }
    return { status: 500, body: { error: logServerError('[student-case-request] insertError', insertError.message) } }
  }

  await auditStudentCaseRequested({
    requestId: inserted.id,
    caseId: input.caseId,
    stageId: inserted.stage_id,
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
    context: input.context,
    supabase,
  })

  return { status: 201, body: { success: true, data: inserted } }
}
