import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type SupabaseClient = ReturnType<typeof createSupabaseServerClient>

async function resolveReleasedCurrentStage({
  supabase,
  caseId,
  currentStageId,
}: {
  supabase: SupabaseClient
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
      return { stageId: null, error: 'Unable to verify case stage. Please try again.', status: 500 }
    }

    // When the stage row is readable, enforce the released check.
    if (currentStage && (currentStage.status || '').toLowerCase() !== 'released') {
      return {
        stageId: null,
        error: 'This case stage is not currently available for requests',
        status: 409,
      }
    }

    // FK on patient_requests.current_stage_id guarantees the stage exists.
    // Case is already verified 'matched' — use currentStageId directly.
    return { stageId: currentStageId, error: null, status: 200 }
  }

  const { data: fallbackStage, error: fallbackStageError } = await supabase
    .from('case_routing_stages')
    .select('id, status')
    .eq('case_id', caseId)
    .eq('sequence', 1)
    .maybeSingle()

  if (fallbackStageError) {
    return { stageId: null, error: fallbackStageError.message, status: 500 }
  }

  if (!fallbackStage) {
    return { stageId: null, error: null, status: 200 }
  }

  if ((fallbackStage.status || '').toLowerCase() !== 'released') {
    return {
      stageId: null,
      error: 'This case stage is not currently available for requests',
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
    return { stageId: null, error: linkStageError.message, status: 500 }
  }

  return { stageId, error: null, status: 200 }
}

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
    .select('id, status, current_stage_id')
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

  const stageResult = await resolveReleasedCurrentStage({
    supabase,
    caseId,
    currentStageId: caseRow.current_stage_id ?? null,
  })

  if (stageResult.error) {
    return NextResponse.json({ error: stageResult.error }, { status: stageResult.status })
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
      stage_id: stageResult.stageId,
    })
    .select('id, case_id, stage_id, status, created_at')
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
