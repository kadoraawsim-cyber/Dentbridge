import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type StudentAction =
  | 'mark_contacted'
  | 'mark_appointment_scheduled'
  | 'mark_in_treatment'

const VALID_ACTIONS: StudentAction[] = [
  'mark_contacted',
  'mark_appointment_scheduled',
  'mark_in_treatment',
]

const ACTION_TO_STATUS: Record<StudentAction, string> = {
  mark_contacted: 'contacted',
  mark_appointment_scheduled: 'appointment_scheduled',
  mark_in_treatment: 'in_treatment',
}

/**
 * PATCH /api/student/cases/[id]/status
 *
 * Allows an approved student to advance their case through post-approval
 * lifecycle steps: contacted → appointment_scheduled → in_treatment.
 *
 * Security guarantees:
 *   1. Session verified server-side via getUser().
 *   2. Only users with app_metadata.role = 'student' can proceed.
 *   3. Student must have an 'approved' student_case_requests row for this case.
 *   4. Only the three student-owned transitions are accepted; faculty-only
 *      actions (completed, cancelled) are rejected here.
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

  if (user.app_metadata?.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 2. Parse action ──────────────────────────────────────────────────────────
  let action: StudentAction
  try {
    const body = (await request.json()) as { action?: string }
    if (!body.action || !VALID_ACTIONS.includes(body.action as StudentAction)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    action = body.action as StudentAction
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── 3. Verify the student has an approved request for this case ──────────────
  const { data: approvedRequest, error: requestError } = await supabase
    .from('student_case_requests')
    .select('id')
    .eq('case_id', id)
    .eq('student_id', user.id)
    .eq('status', 'approved')
    .maybeSingle()

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 })
  }

  if (!approvedRequest) {
    return NextResponse.json(
      { error: 'No approved request found for this case.' },
      { status: 403 }
    )
  }

  // ── 4. Advance the case status ───────────────────────────────────────────────
  const newStatus = ACTION_TO_STATUS[action]

  const { error: updateError } = await supabase
    .from('patient_requests')
    .update({
      status: newStatus,
      reviewed_by: user.email ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { status: newStatus } })
}
