import 'server-only'

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  auditAdminCaseStatusChanged,
  auditCaseReturnedToPool,
  auditStudentCaseApproved,
  auditStudentCaseRejected,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'
import { createSupabaseAdminClient, type SupabaseAdminClient } from '@/lib/supabase-admin'
import type { FacultyActor } from '@/lib/api/service-types'
import type { Database } from '@/lib/database.types'
import {
  isAdminCaseAction,
  isFacultyActor,
  isTerminalCaseStatus,
  LIFECYCLE_MESSAGES,
  resolveAdminCaseTransition,
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

/** Authenticated (user-JWT) client used to invoke SECURITY DEFINER lifecycle RPCs. */
type LifecycleRpcClient = SupabaseClient<Database>

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
  /** Service-role client — used for audit writes and non-RPC guarded updates. */
  supabase?: SupabaseAdminClient
  /**
   * Authenticated (user-session) client used to call the atomic lifecycle RPCs.
   * The RPCs derive actor identity from auth.uid()/auth.jwt(), so they must be
   * invoked with the caller's session, not the service role.
   */
  rpcClient?: LifecycleRpcClient
}

interface RpcOutcome {
  ok: boolean
  code: string
  data: Record<string, unknown>
}

/** Actions whose integrity requires the atomic, row-locked lifecycle RPCs. */
const RPC_BACKED_ACTIONS = new Set<Action>([
  'approve_student_request',
  'return_to_pool',
  'release_next_stage',
  'mark_completed',
  'mark_cancelled',
  'reject_student_request',
  'undo_reject_student_request',
  'update_triage',
])

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

function parseBody(body: unknown): RequestBody | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }
  return body as RequestBody
}

function normalizeRpcOutcome(
  data: unknown,
  error: { message: string } | null,
  fn: string
): RpcOutcome {
  if (error) {
    logServerError(`[admin-case-actions] rpc ${fn}`, error.message)
    return { ok: false, code: 'server_error', data: {} }
  }
  const result = (data ?? {}) as Record<string, unknown>
  return {
    ok: result.ok === true,
    code: typeof result.code === 'string' ? result.code : 'server_error',
    data: result,
  }
}

/** Map a failed RPC outcome to a stable, generic HTTP response. */
function rpcErrorResponse(code: string): NextResponse {
  switch (code) {
    case 'forbidden':
      return NextResponse.json({ error: LIFECYCLE_MESSAGES.FORBIDDEN }, { status: 403 })
    case 'not_found':
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    case 'invalid_request':
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    case 'invalid_state':
      return NextResponse.json({ error: LIFECYCLE_MESSAGES.INVALID_TRANSITION }, { status: 409 })
    case 'conflict':
      return NextResponse.json({ error: LIFECYCLE_MESSAGES.CONFLICT_RETRY }, { status: 409 })
    default:
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

interface CaseStatusRow {
  status: string | null
  current_stage_id: string | null
}

async function loadCaseStatus(
  supabase: SupabaseAdminClient,
  caseId: string
): Promise<{ row: CaseStatusRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('patient_requests')
    .select('status, current_stage_id')
    .eq('id', caseId)
    .maybeSingle<CaseStatusRow>()

  if (error) {
    return { row: null, error: logServerError('[admin-case-actions] loadCaseStatus', error.message) }
  }
  return { row: data, error: null }
}

/**
 * Perform a single-table case status transition with an optimistic-concurrency
 * guard. The update is conditional on the observed from-status, so a concurrent
 * change (or an illegal transition) affects zero rows and yields a 409 rather
 * than silently overwriting state.
 */
async function applyGuardedStatusUpdate(params: {
  supabase: SupabaseAdminClient
  caseId: string
  fromStatus: string
  toStatus: string
  reviewedBy: string | null
  reviewedAt: string
  extraFields?: Record<string, unknown>
}): Promise<{ ok: boolean; response?: NextResponse }> {
  const { supabase, caseId, fromStatus, toStatus, reviewedBy, reviewedAt, extraFields } = params

  const { data, error } = await supabase
    .from('patient_requests')
    .update({
      ...(extraFields ?? {}),
      status: toStatus,
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    })
    .eq('id', caseId)
    .eq('status', fromStatus)
    .select('id')

  if (error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: logServerError('[admin-case-actions] applyGuardedStatusUpdate', error.message) },
        { status: 500 }
      ),
    }
  }

  if (!data || data.length === 0) {
    // The row moved out from under us (concurrent change) or never matched.
    return {
      ok: false,
      response: NextResponse.json({ error: LIFECYCLE_MESSAGES.CONFLICT_RETRY }, { status: 409 }),
    }
  }

  return { ok: true }
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
    [
      'reject_student_request',
      'undo_reject_student_request',
      'mark_cancelled',
      'return_to_pool',
      'release_next_stage',
    ].includes(action) &&
    reason.length < 3
  ) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
  }

  const supabase = input.supabase ?? createSupabaseAdminClient()
  const reviewedAt = new Date().toISOString()
  const reviewedBy = input.actor.email
  const caseId = input.caseId

  // Actions whose integrity depends on locking + a single transaction are
  // delegated to the atomic SECURITY DEFINER RPCs, invoked with the caller's
  // authenticated session so the DB derives the actor from auth.uid()/auth.jwt().
  if (RPC_BACKED_ACTIONS.has(action)) {
    if (!input.rpcClient) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
    const rpcClient = input.rpcClient

    if (action === 'approve_student_request') {
      if (!body.request_id) {
        return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
      }
      const { data: approveData, error: approveError } = await rpcClient.rpc(
        'admin_approve_student_request',
        { p_case_id: caseId, p_request_id: body.request_id }
      )
      const outcome = normalizeRpcOutcome(approveData, approveError, 'admin_approve_student_request')
      if (!outcome.ok) {
        return rpcErrorResponse(outcome.code)
      }

      const stageId = (outcome.data.stage_id as string | null) ?? null
      await auditStudentCaseApproved({
        requestId: body.request_id,
        caseId,
        stageId,
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        actorRole,
        context: input.context,
        supabase,
      })
      await auditAdminCaseStatusChanged({
        caseId,
        stageId,
        action,
        fromStatus: (outcome.data.from_status as string | null) ?? null,
        toStatus: (outcome.data.case_status as string | null) ?? 'student_approved',
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        actorRole,
        context: input.context,
        supabase,
      })
      return NextResponse.json({
        success: true,
        data: {
          status: outcome.data.case_status ?? 'student_approved',
          reviewed_by: outcome.data.reviewed_by ?? reviewedBy,
          reviewed_at: outcome.data.reviewed_at ?? reviewedAt,
        },
      })
    }

    if (action === 'return_to_pool') {
      const { data: returnData, error: returnError } = await rpcClient.rpc(
        'admin_return_case_to_pool_with_decision',
        {
          p_case_id: caseId,
          p_assigned_department: assigned_department ?? null,
          p_urgency: urgency ?? null,
          p_target_student_level: target_student_level ?? null,
          p_clinical_notes: clinical_notes ?? null,
          p_reason: reason,
        }
      )
      const outcome = normalizeRpcOutcome(
        returnData,
        returnError,
        'admin_return_case_to_pool_with_decision'
      )
      if (!outcome.ok) {
        return rpcErrorResponse(outcome.code)
      }

      await auditCaseReturnedToPool({
        caseId,
        requestId: (outcome.data.request_id as string | null) ?? null,
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        actorRole,
        context: input.context,
        supabase,
      })
      await auditAdminCaseStatusChanged({
        caseId,
        action,
        fromStatus: (outcome.data.from_status as string | null) ?? null,
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
          reviewed_by: outcome.data.reviewed_by ?? reviewedBy,
          reviewed_at: outcome.data.reviewed_at ?? reviewedAt,
          request_id: outcome.data.request_id ?? null,
          student_email: outcome.data.student_email ?? null,
        },
      })
    }

    if (action === 'release_next_stage') {
      const department = assigned_department?.trim()
      if (!department) {
        return NextResponse.json({ error: 'assigned_department is required' }, { status: 400 })
      }
      const { data: releaseData, error: releaseError } = await rpcClient.rpc(
        'admin_release_next_stage_with_decision',
        {
          p_case_id: caseId,
          p_department: department,
          p_target_student_level: target_student_level ?? null,
          p_urgency: urgency ?? null,
          p_clinical_notes: clinical_notes ?? null,
          p_reason: reason,
        }
      )
      const outcome = normalizeRpcOutcome(
        releaseData,
        releaseError,
        'admin_release_next_stage_with_decision'
      )
      if (!outcome.ok) {
        return rpcErrorResponse(outcome.code)
      }

      await auditAdminCaseStatusChanged({
        caseId,
        stageId: (outcome.data.stage_id as string | null) ?? null,
        action,
        fromStatus: (outcome.data.from_status as string | null) ?? 'faculty_review',
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
          reviewed_by: outcome.data.reviewed_by ?? reviewedBy,
          reviewed_at: outcome.data.reviewed_at ?? reviewedAt,
          stage_id: outcome.data.stage_id ?? null,
          sequence: outcome.data.sequence ?? null,
        },
      })
    }

    if (action === 'reject_student_request' || action === 'undo_reject_student_request') {
      if (!body.request_id) {
        return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
      }
      const { data: requestData, error: requestError } = await rpcClient.rpc(
        'admin_set_student_request_decision',
        {
          p_case_id: caseId,
          p_request_id: body.request_id,
          p_action: action === 'reject_student_request' ? 'reject' : 'undo_reject',
          p_reason: reason,
        }
      )
      const outcome = normalizeRpcOutcome(
        requestData,
        requestError,
        'admin_set_student_request_decision'
      )
      if (!outcome.ok) return rpcErrorResponse(outcome.code)

      if (action === 'reject_student_request') {
        await auditStudentCaseRejected({
          requestId: body.request_id,
          caseId,
          stageId: (outcome.data.stage_id as string | null) ?? null,
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
          status: outcome.data.request_status,
          reviewed_by: outcome.data.reviewed_by ?? null,
          reviewed_at: outcome.data.reviewed_at ?? null,
        },
      })
    }

    if (action === 'update_triage') {
      const { data: triageData, error: triageError } = await rpcClient.rpc(
        'admin_update_case_triage_with_decision',
        {
          p_case_id: caseId,
          p_assigned_department: assigned_department ?? '',
          p_urgency: urgency ?? '',
          p_target_student_level: target_student_level ?? '',
          p_clinical_notes: clinical_notes ?? '',
          p_reason: reason || null,
        }
      )
      const outcome = normalizeRpcOutcome(
        triageData,
        triageError,
        'admin_update_case_triage_with_decision'
      )
      if (!outcome.ok) return rpcErrorResponse(outcome.code)

      await auditAdminCaseStatusChanged({
        caseId,
        action,
        fromStatus: (outcome.data.case_status as string | null) ?? null,
        toStatus: (outcome.data.case_status as string | null) ?? null,
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        actorRole,
        context: input.context,
        supabase,
      })
      return NextResponse.json({
        success: true,
        data: {
          reviewed_by: outcome.data.reviewed_by ?? reviewedBy,
          reviewed_at: outcome.data.reviewed_at ?? reviewedAt,
        },
      })
    }

    // mark_completed | mark_cancelled → terminal transition plus mandatory evidence.
    const terminalAction = action === 'mark_completed' ? 'complete' : 'cancel'
    const { data: terminalData, error: terminalError } = await rpcClient.rpc(
      'admin_set_case_terminal_state_with_decision',
      { p_case_id: caseId, p_action: terminalAction, p_reason: reason || null }
    )
    const outcome = normalizeRpcOutcome(
      terminalData,
      terminalError,
      'admin_set_case_terminal_state_with_decision'
    )
    if (!outcome.ok) {
      return rpcErrorResponse(outcome.code)
    }

    const newStatus = (outcome.data.case_status as string | null) ?? null
    await auditAdminCaseStatusChanged({
      caseId,
      action,
      fromStatus: (outcome.data.from_status as string | null) ?? null,
      toStatus: newStatus,
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      actorRole,
      context: input.context,
      supabase,
    })
    return NextResponse.json({
      success: true,
      data: {
        status: newStatus,
        reviewed_by: outcome.data.reviewed_by ?? reviewedBy,
        reviewed_at: outcome.data.reviewed_at ?? reviewedAt,
      },
    })
  }

  // ── Non-RPC actions ────────────────────────────────────────────────────────
  // These are single-table (or request-only) writes. They are guarded by the
  // shared transition rules + a conditional predicate so illegal transitions,
  // terminal reopening, and concurrent clobbering are all rejected.

  if (action === 'reject_student_request') {
    if (!body.request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    const { row, error: loadError } = await loadCaseStatus(supabase, caseId)
    if (loadError) {
      return NextResponse.json({ error: loadError }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }
    if (isTerminalCaseStatus(row.status)) {
      return NextResponse.json({ error: LIFECYCLE_MESSAGES.TERMINAL_CASE_LOCKED }, { status: 409 })
    }
    if (row.status !== 'matched') {
      return NextResponse.json({ error: LIFECYCLE_MESSAGES.INVALID_TRANSITION }, { status: 409 })
    }

    const { data: updated, error: updateRequestError } = await supabase
      .from('student_case_requests')
      .update({ status: 'rejected', reviewed_by: reviewedBy, reviewed_at: reviewedAt })
      .eq('id', body.request_id)
      .eq('case_id', caseId)
      .eq('status', 'pending')
      .select('id')

    if (updateRequestError) {
      return NextResponse.json(
        { error: logServerError('[admin-case-actions] updateRequestError', updateRequestError.message) },
        { status: 500 }
      )
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: LIFECYCLE_MESSAGES.CONFLICT_RETRY }, { status: 409 })
    }

    await auditStudentCaseRejected({
      requestId: body.request_id,
      caseId,
      stageId: row.current_stage_id,
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      actorRole,
      context: input.context,
      supabase,
    })
    return NextResponse.json({
      success: true,
      data: { status: 'rejected', reviewed_by: reviewedBy, reviewed_at: reviewedAt },
    })
  }

  if (action === 'undo_reject_student_request') {
    if (!body.request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    const { row, error: loadError } = await loadCaseStatus(supabase, caseId)
    if (loadError) {
      return NextResponse.json({ error: loadError }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }
    if (isTerminalCaseStatus(row.status)) {
      return NextResponse.json({ error: LIFECYCLE_MESSAGES.TERMINAL_CASE_LOCKED }, { status: 409 })
    }

    const { data: updated, error: updateRequestError } = await supabase
      .from('student_case_requests')
      .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
      .eq('id', body.request_id)
      .eq('case_id', caseId)
      .eq('status', 'rejected')
      .select('id')

    if (updateRequestError) {
      return NextResponse.json(
        { error: logServerError('[admin-case-actions] updateRequestError', updateRequestError.message) },
        { status: 500 }
      )
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: LIFECYCLE_MESSAGES.CONFLICT_RETRY }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      data: { status: 'pending', reviewed_by: null, reviewed_at: null },
    })
  }

  if (action === 'update_triage') {
    const { data: currentCase, error: currentCaseError } = await supabase
      .from('patient_requests')
      .select('assigned_department, treatment_type, status')
      .eq('id', caseId)
      .single()

    if (currentCaseError) {
      return NextResponse.json(
        { error: logServerError('[admin-case-actions] currentCaseError', currentCaseError.message) },
        { status: 500 }
      )
    }

    if (isTerminalCaseStatus(currentCase?.status)) {
      return NextResponse.json({ error: LIFECYCLE_MESSAGES.TERMINAL_CASE_LOCKED }, { status: 409 })
    }

    const currentDepartment = keywordRoutingHint(
      currentCase?.treatment_type ?? '',
      currentCase?.assigned_department ?? null
    )
    const departmentChanged = (assigned_department ?? null) !== currentDepartment

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
      return NextResponse.json(
        { error: logServerError('[admin-case-actions] updateError', updateError.message) },
        { status: 500 }
      )
    }

    await auditAdminCaseStatusChanged({
      caseId,
      action,
      fromStatus: currentCase?.status ?? null,
      toStatus: currentCase?.status ?? null,
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

  // Remaining status-changing actions: save_draft, approve, reject,
  // mark_contacted, mark_appointment_scheduled, mark_in_treatment.
  const { row: currentCase, error: loadError } = await loadCaseStatus(supabase, caseId)
  if (loadError) {
    return NextResponse.json({ error: loadError }, { status: 500 })
  }
  if (!currentCase) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const transition = resolveAdminCaseTransition(action, currentCase.status)
  if (!transition.ok) {
    return NextResponse.json({ error: transition.reason }, { status: 409 })
  }
  const fromStatus = (currentCase.status ?? '') as string
  const toStatus = transition.toStatus

  // `approve` also (idempotently) ensures a released routing stage exists before
  // flipping the case to matched. The case flip itself is conditional on the
  // observed from-status for concurrency safety.
  let releasedStageId: string | null = currentCase.current_stage_id
  if (action === 'approve') {
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
    releasedStageId = stageResult.stageId ?? releasedStageId
  }

  const extraFields: Record<string, unknown> = {}
  if (action === 'save_draft' || action === 'approve') {
    extraFields.assigned_department = assigned_department
    extraFields.urgency = urgency
    extraFields.target_student_level = target_student_level
    extraFields.clinical_notes = clinical_notes ?? null
  }

  const guarded = await applyGuardedStatusUpdate({
    supabase,
    caseId,
    fromStatus,
    toStatus,
    reviewedBy,
    reviewedAt,
    extraFields,
  })
  if (!guarded.ok) {
    return guarded.response!
  }

  await auditAdminCaseStatusChanged({
    caseId,
    stageId: releasedStageId,
    action,
    fromStatus,
    toStatus,
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
    actorRole,
    context: input.context,
    supabase,
  })

  return NextResponse.json({
    success: true,
    data: { status: toStatus, reviewed_by: reviewedBy, reviewed_at: reviewedAt },
  })
}

/**
 * Ensure a released routing stage exists for a case being approved into the
 * pool. Mirrors the pre-existing behavior: update the current/first stage in
 * place when present, otherwise insert stage sequence 1 and link it.
 */
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
}): Promise<{ error: string | null; status: number; stageId?: string | null }> {
  const { data: currentCase, error: currentCaseError } = await supabase
    .from('patient_requests')
    .select('id, current_stage_id, treatment_type, assigned_department')
    .eq('id', caseId)
    .single()

  if (currentCaseError || !currentCase) {
    return {
      error: currentCaseError
        ? logServerError('[admin-case-actions] currentCaseError', currentCaseError.message)
        : 'Case not found',
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
      return {
        error: logServerError('[admin-case-actions] updateStageError', updateStageError.message),
        status: 500,
      }
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
    return {
      error: logServerError('[admin-case-actions] existingStageError', existingStageError.message),
      status: 500,
    }
  }

  let stageId = existingStage?.id ?? null

  if (stageId) {
    const { error: updateExistingStageError } = await supabase
      .from('case_routing_stages')
      .update(stagePayload)
      .eq('id', stageId)
      .eq('case_id', caseId)

    if (updateExistingStageError) {
      return {
        error: logServerError(
          '[admin-case-actions] updateExistingStageError',
          updateExistingStageError.message
        ),
        status: 500,
      }
    }
  } else {
    const { data: insertedStage, error: insertStageError } = await supabase
      .from('case_routing_stages')
      .insert({ case_id: caseId, sequence: 1, ...stagePayload })
      .select('id')
      .single()

    if (insertStageError) {
      return {
        error: logServerError('[admin-case-actions] insertStageError', insertStageError.message),
        status: 500,
      }
    }
    stageId = insertedStage.id
  }

  const { error: linkStageError } = await supabase
    .from('patient_requests')
    .update({ current_stage_id: stageId })
    .eq('id', caseId)

  if (linkStageError) {
    return {
      error: logServerError('[admin-case-actions] linkStageError', linkStageError.message),
      status: 500,
    }
  }

  return { error: null, status: 200, stageId: stageId as string | null }
}
