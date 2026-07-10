import 'server-only'

import type { SupabaseAdminClient } from '@/lib/supabase-admin'

/**
 * Shared stage-authorization + routing-stage-context resolver for student case
 * services (Phase 7 consolidation).
 *
 * This was previously duplicated verbatim inside student-case-status.service.ts
 * and student-progress.service.ts. It verifies that the student has an APPROVED
 * request for the case, resolves the current routing stage (linking the case /
 * request to a stage when needed), and returns the case row plus stage context.
 *
 * Behavior is identical to the previous per-service copies. It selects
 * `full_name` (previously only student-case-status did) so both callers share a
 * single query; the extra column is harmless for progress, which does not use it.
 *
 * Service-role authorization note: the caller has already confirmed the actor is
 * a student; this helper enforces the row-ownership check (approved request for
 * this case) that the service role would otherwise bypass.
 */


function logServerError(context: string, detail: string): string {
  console.error(context, { error: detail })
  return 'server_error'
}

export async function getAuthorizedStageContext({
  supabase,
  caseId,
  studentId,
}: {
  supabase: SupabaseAdminClient
  caseId: string
  studentId: string
}) {
  const [
    { data: approvedRequest, error: requestError },
    { data: currentCase, error: currentCaseError },
  ] = await Promise.all([
    supabase
      .from('student_case_requests')
      .select('id, stage_id')
      .eq('case_id', caseId)
      .eq('student_id', studentId)
      .eq('status', 'approved')
      .maybeSingle(),
    supabase
      .from('patient_requests')
      .select('status, full_name, current_stage_id, assigned_department')
      .eq('id', caseId)
      .maybeSingle(),
  ])

  if (requestError) {
    return {
      context: null,
      response: {
        status: 500,
        body: { error: logServerError('[case-stage-context] requestError', requestError.message) },
      },
    }
  }

  if (!approvedRequest) {
    return {
      context: null,
      response: { status: 403, body: { error: 'No approved request found for this case.' } },
    }
  }

  if (currentCaseError) {
    return {
      context: null,
      response: {
        status: 500,
        body: {
          error: logServerError('[case-stage-context] currentCaseError', currentCaseError.message),
        },
      },
    }
  }

  if (!currentCase) {
    return { context: null, response: { status: 404, body: { error: 'Case not found.' } } }
  }

  const currentStageId = currentCase.current_stage_id ?? null
  const requestStageId = approvedRequest.stage_id ?? null

  // Previous-stage lockout: once a case has advanced past the student's approved
  // stage (a later stage has become current), that student is no longer
  // authorized for any patient/progress/file action on this case — even though
  // their historical approved request row still exists.
  if (currentStageId && requestStageId && currentStageId !== requestStageId) {
    return {
      context: null,
      response: {
        status: 403,
        body: { error: 'You are no longer assigned to this case.' },
      },
    }
  }

  const stageId = currentStageId ?? requestStageId
  let stageDepartment = currentCase.assigned_department ?? null

  if (stageId) {
    const { data: currentStage, error: currentStageError } = await supabase
      .from('case_routing_stages')
      .select('id, department, student_id, status')
      .eq('id', stageId)
      .eq('case_id', caseId)
      .maybeSingle()

    if (currentStageError) {
      return {
        context: null,
        response: {
          status: 500,
          body: {
            error: logServerError(
              '[case-stage-context] currentStageError',
              currentStageError.message
            ),
          },
        },
      }
    }

    if (!currentStage) {
      return {
        context: null,
        response: { status: 409, body: { error: 'Routing stage not found.' } },
      }
    }

    // Current-stage ownership: when the stage has an assignee it must be this
    // student. A NULL assignee only occurs on the legacy link path below, where
    // the student's own approved request is what authorizes the (yet unlinked)
    // stage.
    if (currentStage.student_id && currentStage.student_id !== studentId) {
      return {
        context: null,
        response: {
          status: 403,
          body: { error: 'You are no longer assigned to this case.' },
        },
      }
    }

    stageDepartment = currentStage.department ?? stageDepartment

    if (!currentStageId) {
      const { error: linkCaseStageError } = await supabase
        .from('patient_requests')
        .update({ current_stage_id: stageId })
        .eq('id', caseId)
        .is('current_stage_id', null)

      if (linkCaseStageError) {
        return {
          context: null,
          response: {
            status: 500,
            body: {
              error: logServerError(
                '[case-stage-context] linkCaseStageError',
                linkCaseStageError.message
              ),
            },
          },
        }
      }
    }

    if (!requestStageId) {
      const { error: linkRequestStageError } = await supabase
        .from('student_case_requests')
        .update({ stage_id: stageId })
        .eq('id', approvedRequest.id)
        .is('stage_id', null)

      if (linkRequestStageError) {
        return {
          context: null,
          response: {
            status: 500,
            body: {
              error: logServerError(
                '[case-stage-context] linkRequestStageError',
                linkRequestStageError.message
              ),
            },
          },
        }
      }
    }
  }

  return {
    context: {
      approvedRequestId: approvedRequest.id as string,
      currentCase,
      stageId: stageId as string | null,
      stageDepartment,
    },
    response: null,
  }
}
