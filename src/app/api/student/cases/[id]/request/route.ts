import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * POST /api/student/cases/[id]/request
 *
 * Creates a student claim request for a pool case.
 *
 * Security guarantees:
 *   1. Session verified server-side via getUser() — live JWT validation.
 *   2. Only users with app_metadata.role = 'student' can proceed.
 *   3. student_id and student_email are sourced from the verified session —
 *      the client cannot supply or influence these values.
 *   4. UNIQUE (case_id, student_id) constraint in the DB prevents duplicates;
 *      error code 23505 is caught and returned as a 409.
 *   5. Case must be in 'matched' status — students cannot request unreleased cases.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params

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

  // ── 2. Verify case exists and is available ───────────────────────────────────
  const { data: caseRow, error: caseError } = await supabase
    .from('patient_requests')
    .select('id, status')
    .eq('id', caseId)
    .single()

  if (caseError || !caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  if (caseRow.status !== 'matched') {
    return NextResponse.json(
      { error: 'This case is not currently available for requests' },
      { status: 409 }
    )
  }

  // ── 3. Insert request ────────────────────────────────────────────────────────
  // UNIQUE (case_id, student_id) prevents duplicate rows at the DB level.
  const { data: inserted, error: insertError } = await supabase
    .from('student_case_requests')
    .insert({
      case_id: caseId,
      student_id: user.id,
      student_email: user.email ?? '',
      status: 'pending',
    })
    .select('id, case_id, status, created_at')
    .single()

  if (insertError) {
    // 23505 = unique_violation — student already has a request for this case
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'You have already submitted a request for this case' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: inserted }, { status: 201 })
}
