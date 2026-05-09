import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { canAccessFacultyPortal } from '@/lib/roles'

type Action =
  | 'save_draft'
  | 'update_triage'
  | 'approve'
  | 'reject'
  | 'return_to_pool'
  | 'approve_student_request'
  | 'reject_student_request'
  | 'undo_reject_student_request'
  | 'mark_contacted'
  | 'mark_appointment_scheduled'
  | 'mark_in_treatment'
  | 'release_next_stage'
  | 'mark_completed'
  | 'mark_cancelled'

interface RequestBody {
  action: Action
  assigned_department?: string
  urgency?: string
  target_student_level?: string
  clinical_notes?: string
  reason?: string
  request_id?: string // required for approve_student_request / reject_student_request
}

type SupabaseClient = ReturnType<typeof createSupabaseServerClient>

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
  supabase: SupabaseClient
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
      error: currentCaseError?.message ?? 'Case not found',
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
    status: 'released',
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
      return { error: updateStageError.message, status: 500 }
    }

    return { error: null, status: 200 }
  }

  const { data: existingStage, error: existingStageError } = await supabase
    .from('case_routing_stages')
    .select('id')
    .eq('case_id', caseId)
    .eq('sequence', 1)
    .maybeSingle()

  if (existingStageError) {
    return { error: existingStageError.message, status: 500 }
  }

  let stageId = existingStage?.id ?? null

  if (stageId) {
    const { error: updateExistingStageError } = await supabase
      .from('case_routing_stages')
      .update(stagePayload)
      .eq('id', stageId)
      .eq('case_id', caseId)

    if (updateExistingStageError) {
      return { error: updateExistingStageError.message, status: 500 }
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
      return { error: insertStageError.message, status: 500 }
    }

    stageId = insertedStage.id
  }

  const { error: linkStageError } = await supabase
    .from('patient_requests')
    .update({ current_stage_id: stageId })
    .eq('id', caseId)

  if (linkStageError) {
    return { error: linkStageError.message, status: 500 }
  }

  return { error: null, status: 200 }
}

/**
 * PATCH /api/admin/cases/[id]
 *
 * Server-side handler for all faculty write actions on a case.
 * Security: session verified server-side; reviewed_by always set from session.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // ── 1. Verify session ────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAccessFacultyPortal(user.app_metadata?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { action, assigned_department, urgency, target_student_level, clinical_notes } = body
  const reason = (body.reason || '').trim()

  const validActions: Action[] = [
    'save_draft',
    'update_triage',
    'approve',
    'reject',
    'return_to_pool',
    'approve_student_request',
    'reject_student_request',
    'undo_reject_student_request',
    'mark_contacted',
    'mark_appointment_scheduled',
    'mark_in_treatment',
    'release_next_stage',
    'mark_completed',
    'mark_cancelled',
  ]
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (
    ['reject_student_request', 'undo_reject_student_request', 'mark_cancelled', 'return_to_pool'].includes(action) &&
    reason.length < 3
  ) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
  }

  const reviewedAt = new Date().toISOString()
  const reviewedBy = user.email ?? null

  // ── 3a. Student request approval / rejection ─────────────────────────────────
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
        .eq('case_id', id)
        .single(),
      supabase
        .from('patient_requests')
        .select('id, current_stage_id')
        .eq('id', id)
        .single(),
    ])

    if (studentRequestError || !studentRequest) {
      return NextResponse.json(
        { error: studentRequestError?.message ?? 'Student request not found' },
        { status: studentRequestError ? 500 : 404 }
      )
    }

    if (currentCaseError || !currentCase) {
      return NextResponse.json(
        { error: currentCaseError?.message ?? 'Case not found' },
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
        .eq('case_id', id)
        .maybeSingle()

      if (stageForReviewError) {
        return NextResponse.json(
          { error: 'Unable to verify routing stage. Please try again.' },
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
          .eq('id', id)
          .is('current_stage_id', null)

        if (linkStageError) {
          return NextResponse.json({ error: linkStageError.message }, { status: 500 })
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
      .eq('case_id', id) // ensures the request belongs to this case

    if (updateRequestError) {
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 })
    }

    // When approving a student, also:
    //   a) advance the case to student_approved
    //   b) mark the current routing stage as assigned when stage data exists
    //   c) reject competing pending requests for the same stage, falling back
    //      to the legacy case-wide behavior only when no stage exists
    if (action === 'approve_student_request') {
      const { error: caseStatusError } = await supabase
        .from('patient_requests')
        .update({
          status: 'student_approved',
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
        })
        .eq('id', id)

      if (caseStatusError) {
        return NextResponse.json({ error: caseStatusError.message }, { status: 500 })
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
          .eq('case_id', id)

        if (updateStageError) {
          return NextResponse.json({ error: updateStageError.message }, { status: 500 })
        }
      }

      let rejectOtherRequestsQuery = supabase
        .from('student_case_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
        })
        .eq('case_id', id)
        .neq('id', body.request_id)
        .eq('status', 'pending')

      if (stageIdForReview) {
        rejectOtherRequestsQuery = rejectOtherRequestsQuery.eq('stage_id', stageIdForReview)
      }

      await rejectOtherRequestsQuery
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
      .eq('case_id', id)

    if (updateRequestError) {
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 })
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
      .eq('id', id)
      .single()

    if (currentCaseError || !currentCase) {
      return NextResponse.json(
        { error: currentCaseError?.message ?? 'Case not found' },
        { status: currentCaseError ? 500 : 404 }
      )
    }

    const eligibleStatuses = ['student_approved', 'contacted', 'appointment_scheduled']
    if (!eligibleStatuses.includes((currentCase.status || '').toLowerCase())) {
      return NextResponse.json(
        { error: 'This case can no longer be returned to the pool from its current stage.' },
        { status: 409 }
      )
    }

    const { data: approvedRequest, error: approvedRequestError } = await supabase
      .from('student_case_requests')
      .select('id, student_email')
      .eq('case_id', id)
      .eq('status', 'approved')
      .maybeSingle()

    if (approvedRequestError) {
      return NextResponse.json({ error: approvedRequestError.message }, { status: 500 })
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
      .eq('case_id', id)

    if (revokeRequestError) {
      return NextResponse.json({ error: revokeRequestError.message }, { status: 500 })
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
      .eq('id', id)

    if (returnCaseError) {
      return NextResponse.json({ error: returnCaseError.message }, { status: 500 })
    }

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
      .eq('id', id)
      .single()

    if (currentCaseError || !currentCase) {
      return NextResponse.json(
        { error: currentCaseError?.message ?? 'Case not found' },
        { status: currentCaseError ? 500 : 404 }
      )
    }

    if ((currentCase.status || '').toLowerCase() !== 'faculty_review') {
      return NextResponse.json(
        { error: 'Next stage routing is only available while the case is awaiting faculty review.' },
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
        .eq('case_id', id)

      if (reviewStageError) {
        return NextResponse.json({ error: reviewStageError.message }, { status: 500 })
      }
    }

    const { data: latestStage, error: latestStageError } = await supabase
      .from('case_routing_stages')
      .select('sequence')
      .eq('case_id', id)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestStageError) {
      return NextResponse.json({ error: latestStageError.message }, { status: 500 })
    }

    const nextSequence = Number(latestStage?.sequence ?? 0) + 1

    const { data: nextStage, error: insertStageError } = await supabase
      .from('case_routing_stages')
      .insert({
        case_id: id,
        sequence: nextSequence,
        department,
        target_student_level: target_student_level ?? null,
        status: 'released',
        faculty_notes: clinical_notes ?? currentCase.clinical_notes ?? null,
        released_by: reviewedBy,
        released_at: reviewedAt,
        created_at: reviewedAt,
        updated_at: reviewedAt,
      })
      .select('id, sequence')
      .single()

    if (insertStageError) {
      return NextResponse.json({ error: insertStageError.message }, { status: 500 })
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
      .eq('id', id)

    if (updateCaseError) {
      return NextResponse.json({ error: updateCaseError.message }, { status: 500 })
    }

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

  // ── 3b. Lifecycle status transitions (post-approval) ─────────────────────────
  const lifecycleActions: Record<string, string> = {
    mark_contacted: 'contacted',
    mark_appointment_scheduled: 'appointment_scheduled',
    mark_in_treatment: 'in_treatment',
    mark_completed: 'completed',
    mark_cancelled: 'cancelled',
  }

  if (action in lifecycleActions) {
    const newStatus = lifecycleActions[action]
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

    const { error: updateError } = await supabase
      .from('patient_requests')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { status: newStatus, reviewed_by: reviewedBy, reviewed_at: reviewedAt },
    })
  }

  if (action === 'update_triage') {
    const { data: currentCase, error: currentCaseError } = await supabase
      .from('patient_requests')
      .select('assigned_department, treatment_type')
      .eq('id', id)
      .single()

    if (currentCaseError) {
      return NextResponse.json({ error: currentCaseError.message }, { status: 500 })
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
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { reviewed_by: reviewedBy, reviewed_at: reviewedAt },
    })
  }

  // ── 3c. Build triage update payload (save_draft / approve / reject) ──────────
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
      caseId: id,
      assignedDepartment: assigned_department,
      targetStudentLevel: target_student_level,
      clinicalNotes: clinical_notes,
      releasedBy: reviewedBy,
      releasedAt: reviewedAt,
    })

    if (stageResult.error) {
      return NextResponse.json({ error: stageResult.error }, { status: stageResult.status })
    }

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
    // reject
    updatePayload = {
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }
  }

  // ── 4. Execute triage update ─────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('patient_requests')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: { reviewed_by: reviewedBy, reviewed_at: reviewedAt },
  })
}
