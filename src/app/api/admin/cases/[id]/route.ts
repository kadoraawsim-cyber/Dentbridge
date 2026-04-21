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

    const { error: updateRequestError } = await supabase
      .from('student_case_requests')
      .update({
        status: newStudentStatus,
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
      })
      .eq('id', body.request_id)
      .eq('case_id', id) // ensures the request belongs to this case

    if (updateRequestError) {
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 })
    }

    // When approving a student, also:
    //   a) advance the case to student_approved
    //   b) reject all other pending requests for this case (one student per case)
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

      // Reject all other pending requests for this case
      await supabase
        .from('student_case_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
        })
        .eq('case_id', id)
        .neq('id', body.request_id)
        .eq('status', 'pending')
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

    const { error: updateError } = await supabase
      .from('patient_requests')
      .update({
        status: newStatus,
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
      })
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
