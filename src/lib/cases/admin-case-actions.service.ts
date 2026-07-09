import 'server-only'

import { NextResponse } from 'next/server'

import {
  auditAdminCaseStatusChanged,
  auditCaseReturnedToPool,
  auditStudentCaseApproved,
  auditStudentCaseRejected,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'
import { createSupabaseAdminClient, type SupabaseAdminClient } from '@/lib/supabase-admin'
import type { FacultyActor } from '@/lib/api/service-types'
import {
  ADMIN_LIFECYCLE_ACTION_TO_STATUS,
  canReleaseNextStage,
  canReturnCaseToPool,
  isAdminCaseAction,
  isAdminLifecycleAction,
  isFacultyActor,
  LIFECYCLE_MESSAGES,
  STAGE_STATUS,
  type AdminCaseAction,
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

type Action = AdminCaseAction

interface RequestBody {
  action: Action
  assigned_department?: string
  urgency?: string
  target_student_level?: string
  clinical_notes?: string
  reason?: string
  request_id?: string
}


export interface ExecuteAdminCaseActionInput {
  caseId: string
  body: unknown
  actor: FacultyActor
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

function keywordRoutingHint(treatmentType: string, assignedDepartment: string | null) {
  if (assignedDepartment) return assignedDepartment

  const value = (treatmentType || '').toLowerCase()

  if (value.includes('root canal')) return 'Endodontics'
  if (value.includes('extraction')) return 'Oral & Maxillofacial Surgery'
  if (value.includes('gum')) return 'Periodontology'
  if (value.includes('orthodont')) return 'Orthodontics'
  if (value.includes('prosthetic') || value.includes('crown')) return 'Prosthodontics'
  if (value.includes('pediatric')) return 'Pedodontics'
  if (value.includes('esthetic') || value.includes('filling') || value.includes('cleaning'))
    return 'Restorative Dentistry'

  return 'Oral Radiology'
}

async function ensureReleasedRoutingStage({
  supabase,
  caseId,
  assignedDepartment,
  targetStudentLevel,
  clinicalNotes,
  releasedBy,
  releasedAt,
}: {
  supabase: SupabaseAdminClient
  caseId: string
  assignedDepartment?: string
  targetStudentLevel?: string
  clinicalNotes?: string
  releasedBy: string | null
  releasedAt: string
}) {
  const { data: currentCase, error: currentCaseError } = await supabase
    .from('patient_requests')
    .select('id, current_stage_id, treatment_type, assigned_department')
    .eq('id', caseId)
    .single()

  if (currentCaseError || !currentCase) {
    return {
      error: currentCaseError ? logServerError('[admin-case-actions] currentCaseError', currentCaseError.message) : 'Case not found',
      status: currentCaseError ? 500 : 404,
    }
  }

  const department =
    assignedDepartment?.trim() ||
    currentCase.assigned_department ||
    keywordRoutingHint(currentCase.treatment_type ?? '', null) ||
    'general'

  const stagePayload = {
    department,
    target_student_level: targetStudentLevel ?? null,
    status: STAGE_STATUS.RELEASED,
    faculty_notes: clinicalNotes ?? null,
    released_by: releasedBy,
    released_at: releasedAt,
    updated_at: releasedAt,
  }

  if (currentCase.current_stage_id) {
    const { error: updateStageError } = await supabase
      .from('case_routing_stages')
      .update(stagePayload)
      .eq('id', currentCase.current_stage_id)
      .eq('case_id', caseId)

    if (updateStageError) {
      return { error: logServerError('[admin-case-actions] updateStageError', updateStageError.message), status: 500 }
    }

    return { error: null, status: 200, stageId: currentCase.current_stage_id as string }
  }

  const { data: existingStage, error: existingStageError } = await supabase
    .from('case_routing_stages')
    .select('id')
    .eq('case_id', caseId)
    .eq('sequence', 1)
    .maybeSingle()

  if (existingStageError) {
    return { error: logServerError('[admin-case-actions] existingStageError', existingStageError.message), status: 500 }
  }

  let stageId = existingStage?.id ?? null

  if (stageId) {
    const { error: updateExistingStageError } = await supabase
      .from('case_routing_stages')
      .update(stagePayload)
      .eq('id', stageId)
      .eq('case_id', caseId)

    if (updateExistingStageError) {
      return { error: logServerError('[admin-case-actions] updateExistingStageError', updateExistingStageError.message), status: 500 }
    }
  } else {
    const { data: insertedStage, error: insertStageError } = await supabase
      .from('case_routing_stages')
      .insert({
        case_id: caseId,
        sequence: 1,
        ...stagePayload,
      })
      .select('id')
      .single()

    if (insertStageError) {
      return { error: logServerError('[admin-case-actions] insertStageError', insertStageError.message), status: 500 }
    }

    stageId = insertedStage.id
  }

  const { error: linkStageError } = await supabase
    .from('patient_requests')
    .update({ current_stage_id: stageId })
    .eq('id', caseId)

  if (linkStageError) {
    return { error: logServerError('[admin-case-actions] linkStageError', linkStageError.message), status: 500 }
  }

  return { error: null, status: 200, stageId: stageId as string | null }
}

function parseBody(body: unknown): RequestBody | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }

  return body as RequestBody
}

export async function executeAdminCaseAction(
  input: ExecuteAdminCaseActionInput
): Promise<NextResponse> {
  if (!isFacultyActor(input.actor.role)) {
    return NextResponse.json({ error: LIFECYCLE_MESSAGES.FORBIDDEN }, { status: 403 })
  }

  const actorRole = input.actor.role
  const body = parseBody(input.body)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { action, assigned_department, urgency, target_student_level, clinical_notes } = body
  const reason = (body.reason || '').trim()

  if (!isAdminCaseAction(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (
    ['reject_student_request', 'undo_reject_student_request', 'mark_cancelled', 'return_to_pool'].includes(action) &&
    reason.length < 3
  ) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
  }

  const supabase = input.supabase ?? createSupabaseAdminClient()
  const reviewedAt = new Date().toISOString()
  const reviewedBy = input.actor.email
  const caseId = input.caseId

  if (action === 'approve_student_request' || action === 'reject_student_request') {
    if (!body.request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    const newStudentStatus = action === 'approve_student_request' ? 'approved' : 'rejected'

    const [
      { data: studentRequest, error: studentRequestError },
      { data: currentCase, error: currentCaseError },
    ] = await Promise.all([
      supabase
        .from('student_case_requests')
        .select('id, case_id, student_id, student_email, stage_id')
        .eq('id', body.request_id)
        .eq('case_id', caseId)
        .single(),
      supabase
        .from('patient_requests')
        .select('id, current_stage_id, status')
        .eq('id', caseId)
        .single(),
    ])

    if (studentRequestError || !studentRequest) {
      return NextResponse.json(
        { error: studentRequestError ? logServerError('[admin-case-actions] studentRequestError', studentRequestError.message) : 'Student request not found' },
        { status: studentRequestError ? 500 : 404 }
      )
    }

    if (currentCaseError || !currentCase) {
      return NextResponse.json(
        { error: currentCaseError ? logServerError('[admin-case-actions] currentCaseError', currentCaseError.message) : 'Case not found' },
        { status: currentCaseError ? 500 : 404 }
      )
    }

    const currentStageId = currentCase.current_stage_id ?? null
    const requestStageId = studentRequest.stage_id ?? null

    if (currentStageId && requestStageId && currentStageId !== requestStageId) {
      return NextResponse.json(
        { error: 'This student request belongs to a different routing stage.' },
        { status: 409 }
      )
    }

    const stageIdForReview = requestStageId ?? currentStageId

    if (stageIdForReview) {
      const { data: stageForReview, error: stageForReviewError } = await supabase
        .from('case_routing_stages')
        .select('id, case_id')
        .eq('id', stageIdForReview)
        .eq('case_id', caseId)
        .maybeSingle()

      if (stageForReviewError) {
        return NextResponse.json(
          {
            error: logServerError(
              '[admin-case-actions] stageForReviewError',
              stageForReviewError.message
            ),
          },
          { status: 500 }
        )
      }

      if (!stageForReview) {
        return NextResponse.json(
          { error: 'Routing stage not found for this case.' },
          { status: 409 }
        )
      }

      if (!currentStageId) {
        const { error: linkStageError } = await supabase
          .from('patient_requests')
          .update({ current_stage_id: stageIdForReview })
          .eq('id', caseId)
          .is('current_stage_id', null)

        if (linkStageError) {
          return NextResponse.json({ error: logServerError('[admin-case-actions] linkStageError', linkStageError.message) }, { status: 500 })
        }
      }
    }

    const requestUpdatePayload: {
      status: string
      reviewed_by: string | null
      reviewed_at: string
      stage_id?: string
    } = {
      status: newStudentStatus,
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }

    if (!requestStageId && stageIdForReview) {
      requestUpdatePayload.stage_id = stageIdForReview
    }

    const { error: updateRequestError } = await supabase
      .from('student_case_requests')
      .update(requestUpdatePayload)
      .eq('id', body.request_id)
      .eq('case_id', caseId)

    if (updateRequestError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] updateRequestError', updateRequestError.message) }, { status: 500 })
    }

    if (action === 'approve_student_request') {
      const { error: caseStatusError } = await supabase
        .from('patient_requests')
        .update({
          status: 'student_approved',
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
        })
        .eq('id', caseId)

      if (caseStatusError) {
        return NextResponse.json({ error: logServerError('[admin-case-actions] caseStatusError', caseStatusError.message) }, { status: 500 })
      }

      if (stageIdForReview) {
        const { error: updateStageError } = await supabase
          .from('case_routing_stages')
          .update({
            status: 'student_assigned',
            student_request_id: body.request_id,
            student_id: studentRequest.student_id,
            student_email: studentRequest.student_email,
            assigned_by: reviewedBy,
            assigned_at: reviewedAt,
            updated_at: reviewedAt,
          })
          .eq('id', stageIdForReview)
          .eq('case_id', caseId)

        if (updateStageError) {
          return NextResponse.json({ error: logServerError('[admin-case-actions] updateStageError', updateStageError.message) }, { status: 500 })
        }
      }

      let rejectOtherRequestsQuery = supabase
        .from('student_case_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
        })
        .eq('case_id', caseId)
        .neq('id', body.request_id)
        .eq('status', 'pending')

      if (stageIdForReview) {
        rejectOtherRequestsQuery = rejectOtherRequestsQuery.eq('stage_id', stageIdForReview)
      }

      await rejectOtherRequestsQuery

      await auditStudentCaseApproved({
        requestId: body.request_id,
        caseId,
        stageId: stageIdForReview,
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        actorRole,
        context: input.context,
        supabase,
      })

      await auditAdminCaseStatusChanged({
        caseId,
        stageId: stageIdForReview,
        action,
        fromStatus: currentCase.status,
        toStatus: 'student_approved',
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        actorRole,
        context: input.context,
        supabase,
      })
    } else {
      await auditStudentCaseRejected({
        requestId: body.request_id,
        caseId,
        stageId: stageIdForReview,
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        actorRole,
        context: input.context,
        supabase,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: newStudentStatus,
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
      },
    })
  }

  if (action === 'undo_reject_student_request') {
    if (!body.request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    const { error: updateRequestError } = await supabase
      .from('student_case_requests')
      .update({
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq('id', body.request_id)
      .eq('case_id', caseId)

    if (updateRequestError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] updateRequestError', updateRequestError.message) }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
      },
    })
  }

  if (action === 'return_to_pool') {
    const { data: currentCase, error: currentCaseError } = await supabase
      .from('patient_requests')
      .select(
        'status, assigned_department, urgency, target_student_level, clinical_notes'
      )
      .eq('id', caseId)
      .single()

    if (currentCaseError || !currentCase) {
      return NextResponse.json(
        { error: currentCaseError ? logServerError('[admin-case-actions] currentCaseError', currentCaseError.message) : 'Case not found' },
        { status: currentCaseError ? 500 : 404 }
      )
    }

    if (!canReturnCaseToPool(currentCase.status)) {
      return NextResponse.json(
        { error: LIFECYCLE_MESSAGES.RETURN_TO_POOL_INELIGIBLE },
        { status: 409 }
      )
    }

    const { data: approvedRequest, error: approvedRequestError } = await supabase
      .from('student_case_requests')
      .select('id, student_email')
      .eq('case_id', caseId)
      .eq('status', 'approved')
      .maybeSingle()

    if (approvedRequestError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] approvedRequestError', approvedRequestError.message) }, { status: 500 })
    }

    if (!approvedRequest) {
      return NextResponse.json(
        { error: 'No approved student assignment was found for this case.' },
        { status: 409 }
      )
    }

    const { error: revokeRequestError } = await supabase
      .from('student_case_requests')
      .update({
        status: 'revoked',
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
      })
      .eq('id', approvedRequest.id)
      .eq('case_id', caseId)

    if (revokeRequestError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] revokeRequestError', revokeRequestError.message) }, { status: 500 })
    }

    const { error: returnCaseError } = await supabase
      .from('patient_requests')
      .update({
        assigned_department: assigned_department ?? currentCase.assigned_department,
        urgency: urgency ?? currentCase.urgency,
        target_student_level: target_student_level ?? currentCase.target_student_level,
        clinical_notes: clinical_notes ?? currentCase.clinical_notes,
        status: 'matched',
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
      })
      .eq('id', caseId)

    if (returnCaseError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] returnCaseError', returnCaseError.message) }, { status: 500 })
    }

    await auditCaseReturnedToPool({
      caseId,
      requestId: approvedRequest.id,
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      actorRole,
      context: input.context,
      supabase,
    })

    await auditAdminCaseStatusChanged({
      caseId,
      action,
      fromStatus: currentCase.status,
      toStatus: 'matched',
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      actorRole,
      context: input.context,
      supabase,
    })

    return NextResponse.json({
      success: true,
      data: {
        status: 'matched',
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
        request_id: approvedRequest.id,
        student_email: approvedRequest.student_email,
      },
    })
  }

  if (action === 'release_next_stage') {
    const department = assigned_department?.trim()
    if (!department) {
      return NextResponse.json({ error: 'assigned_department is required' }, { status: 400 })
    }

    const { data: currentCase, error: currentCaseError } = await supabase
      .from('patient_requests')
      .select('status, current_stage_id, urgency, clinical_notes')
      .eq('id', caseId)
      .single()

    if (currentCaseError || !currentCase) {
      return NextResponse.json(
        { error: currentCaseError ? logServerError('[admin-case-actions] currentCaseError', currentCaseError.message) : 'Case not found' },
        { status: currentCaseError ? 500 : 404 }
      )
    }

    if (!canReleaseNextStage(currentCase.status)) {
      return NextResponse.json(
        { error: LIFECYCLE_MESSAGES.RELEASE_ONLY_FACULTY_REVIEW },
        { status: 409 }
      )
    }

    if (currentCase.current_stage_id) {
      const { error: reviewStageError } = await supabase
        .from('case_routing_stages')
        .update({
          stage_reviewed_by: reviewedBy,
          stage_reviewed_at: reviewedAt,
          updated_at: reviewedAt,
        })
        .eq('id', currentCase.current_stage_id)
        .eq('case_id', caseId)

      if (reviewStageError) {
        return NextResponse.json({ error: logServerError('[admin-case-actions] reviewStageError', reviewStageError.message) }, { status: 500 })
      }
    }

    const { data: latestStage, error: latestStageError } = await supabase
      .from('case_routing_stages')
      .select('sequence')
      .eq('case_id', caseId)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestStageError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] latestStageError', latestStageError.message) }, { status: 500 })
    }

    const nextSequence = Number(latestStage?.sequence ?? 0) + 1

    const { data: nextStage, error: insertStageError } = await supabase
      .from('case_routing_stages')
      .insert({
        case_id: caseId,
        sequence: nextSequence,
        department,
        target_student_level: target_student_level ?? null,
        status: STAGE_STATUS.RELEASED,
        faculty_notes: clinical_notes ?? currentCase.clinical_notes ?? null,
        released_by: reviewedBy,
        released_at: reviewedAt,
        created_at: reviewedAt,
        updated_at: reviewedAt,
      })
      .select('id, sequence')
      .single()

    if (insertStageError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] insertStageError', insertStageError.message) }, { status: 500 })
    }

    const { error: updateCaseError } = await supabase
      .from('patient_requests')
      .update({
        current_stage_id: nextStage.id,
        assigned_department: department,
        target_student_level: target_student_level ?? null,
        clinical_notes: clinical_notes ?? currentCase.clinical_notes ?? null,
        urgency: urgency ?? currentCase.urgency,
        status: 'matched',
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
      })
      .eq('id', caseId)

    if (updateCaseError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] updateCaseError', updateCaseError.message) }, { status: 500 })
    }

    await auditAdminCaseStatusChanged({
      caseId,
      stageId: nextStage.id,
      action,
      fromStatus: currentCase.status,
      toStatus: 'matched',
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      actorRole,
      context: input.context,
      supabase,
    })

    return NextResponse.json({
      success: true,
      data: {
        status: 'matched',
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
        stage_id: nextStage.id,
        sequence: nextStage.sequence,
      },
    })
  }

  if (isAdminLifecycleAction(action)) {
    const newStatus = ADMIN_LIFECYCLE_ACTION_TO_STATUS[action]
    const updatePayload: {
      status: string
      reviewed_by: string | null
      reviewed_at: string
      routing_completed_at?: string
    } = {
      status: newStatus,
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }

    if (action === 'mark_completed') {
      updatePayload.routing_completed_at = reviewedAt
    }

    const { data: currentCase } = await supabase
      .from('patient_requests')
      .select('status, current_stage_id')
      .eq('id', caseId)
      .maybeSingle()

    const { error: updateError } = await supabase
      .from('patient_requests')
      .update(updatePayload)
      .eq('id', caseId)

    if (updateError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] updateError', updateError.message) }, { status: 500 })
    }

    await auditAdminCaseStatusChanged({
      caseId,
      stageId: currentCase?.current_stage_id ?? null,
      action,
      fromStatus: currentCase?.status ?? null,
      toStatus: newStatus,
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      actorRole,
      context: input.context,
      supabase,
    })

    return NextResponse.json({
      success: true,
      data: { status: newStatus, reviewed_by: reviewedBy, reviewed_at: reviewedAt },
    })
  }

  if (action === 'update_triage') {
    const { data: currentCase, error: currentCaseError } = await supabase
      .from('patient_requests')
      .select('assigned_department, treatment_type')
      .eq('id', caseId)
      .single()

    if (currentCaseError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] currentCaseError', currentCaseError.message) }, { status: 500 })
    }

    const currentDepartment =
      keywordRoutingHint(currentCase?.treatment_type ?? '', currentCase?.assigned_department ?? null)
    const departmentChanged =
      (assigned_department ?? null) !== currentDepartment

    if (departmentChanged && reason.length < 3) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('patient_requests')
      .update({
        assigned_department,
        urgency,
        target_student_level,
        clinical_notes: clinical_notes ?? null,
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
      })
      .eq('id', caseId)

    if (updateError) {
      return NextResponse.json({ error: logServerError('[admin-case-actions] updateError', updateError.message) }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { reviewed_by: reviewedBy, reviewed_at: reviewedAt },
    })
  }

  type UpdatePayload = {
    status: string
    reviewed_by: string | null
    reviewed_at: string
    assigned_department?: string
    urgency?: string
    target_student_level?: string
    clinical_notes?: string | null
  }

  let updatePayload: UpdatePayload
  let stageId: string | null = null

  if (action === 'save_draft') {
    updatePayload = {
      assigned_department,
      urgency,
      target_student_level,
      clinical_notes: clinical_notes ?? null,
      status: 'under_review',
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }
  } else if (action === 'approve') {
    const stageResult = await ensureReleasedRoutingStage({
      supabase,
      caseId,
      assignedDepartment: assigned_department,
      targetStudentLevel: target_student_level,
      clinicalNotes: clinical_notes,
      releasedBy: reviewedBy,
      releasedAt: reviewedAt,
    })

    if (stageResult.error) {
      return NextResponse.json({ error: stageResult.error }, { status: stageResult.status })
    }

    stageId = stageResult.stageId ?? null
    updatePayload = {
      assigned_department,
      urgency,
      target_student_level,
      clinical_notes: clinical_notes ?? null,
      status: 'matched',
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }
  } else {
    updatePayload = {
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }
  }

  const { data: currentCase } = await supabase
    .from('patient_requests')
    .select('status, current_stage_id')
    .eq('id', caseId)
    .maybeSingle()

  const { error: updateError } = await supabase
    .from('patient_requests')
    .update(updatePayload)
    .eq('id', caseId)

  if (updateError) {
    return NextResponse.json({ error: logServerError('[admin-case-actions] updateError', updateError.message) }, { status: 500 })
  }

  await auditAdminCaseStatusChanged({
    caseId,
    stageId: stageId ?? currentCase?.current_stage_id ?? null,
    action,
    fromStatus: currentCase?.status ?? null,
    toStatus: updatePayload.status,
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
    actorRole,
    context: input.context,
    supabase,
  })

  return NextResponse.json({
    success: true,
    data: { reviewed_by: reviewedBy, reviewed_at: reviewedAt },
  })
}
