import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type Action =
  | 'save_draft'
  | 'approve'
  | 'reject'
  | 'approve_student_request'
  | 'reject_student_request'
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
  request_id?: string // required for approve_student_request / reject_student_request
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

  if (user.app_metadata?.role !== 'admin') {
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

  const validActions: Action[] = [
    'save_draft',
    'approve',
    'reject',
    'approve_student_request',
    'reject_student_request',
    'mark_contacted',
    'mark_appointment_scheduled',
    'mark_in_treatment',
    'mark_completed',
    'mark_cancelled',
  ]
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
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

    return NextResponse.json({ success: true, data: { status: newStudentStatus } })
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
