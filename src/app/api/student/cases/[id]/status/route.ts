import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type LifecycleAction = 'mark_contacted' | 'mark_appointment_scheduled' | 'mark_in_treatment'
type StudentAction = LifecycleAction | 'reschedule_appointment' | 'submit_stage_for_review'

const VALID_ACTIONS: StudentAction[] = [
  'mark_contacted',
  'mark_appointment_scheduled',
  'mark_in_treatment',
  'reschedule_appointment',
  'submit_stage_for_review',
]

const ACTION_TO_STATUS: Record<LifecycleAction, string> = {
  mark_contacted: 'contacted',
  mark_appointment_scheduled: 'appointment_scheduled',
  mark_in_treatment: 'in_treatment',
}

const CASE_APPOINTMENT_SOURCE_KIND = 'case_appointment'
const DEFAULT_APPOINTMENT_TIME = '09:00:00'
const CLINIC_TIMEZONE_OFFSET = '+03:00'

const EXPECTED_CURRENT_STATUS: Record<LifecycleAction, string> = {
  mark_contacted: 'student_approved',
  mark_appointment_scheduled: 'contacted',
  mark_in_treatment: 'appointment_scheduled',
}

type SupabaseClient = ReturnType<typeof createSupabaseServerClient>

function isValidDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function isValidTime(value: string | undefined) {
  return Boolean(value && /^\d{2}:\d{2}(:\d{2})?$/.test(value))
}

function normalizeAppointmentTime(value: string | undefined) {
  if (!value) {
    return DEFAULT_APPOINTMENT_TIME
  }

  return value.length === 5 ? `${value}:00` : value
}

function buildPlannerEventDate(appointmentDate: string, appointmentTime: string | undefined) {
  // Case appointments are scheduled in the clinic's local timezone.
  return new Date(
    `${appointmentDate}T${normalizeAppointmentTime(appointmentTime)}${CLINIC_TIMEZONE_OFFSET}`
  ).toISOString()
}

function buildPlannerEventTitle(patientName: string | null) {
  const cleanPatientName = patientName?.trim()
  return cleanPatientName
    ? `Scheduled appointment - ${cleanPatientName}`
    : 'Scheduled appointment'
}

async function getAuthorizedStageContext({
  supabase,
  caseId,
  studentId,
}: {
  supabase: SupabaseClient
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
    return { context: null, response: NextResponse.json({ error: requestError.message }, { status: 500 }) }
  }

  if (!approvedRequest) {
    return {
      context: null,
      response: NextResponse.json({ error: 'No approved request found for this case.' }, { status: 403 }),
    }
  }

  if (currentCaseError) {
    return { context: null, response: NextResponse.json({ error: currentCaseError.message }, { status: 500 }) }
  }

  if (!currentCase) {
    return { context: null, response: NextResponse.json({ error: 'Case not found.' }, { status: 404 }) }
  }

  const currentStageId = currentCase.current_stage_id ?? null
  const requestStageId = approvedRequest.stage_id ?? null

  if (currentStageId && requestStageId && currentStageId !== requestStageId) {
    return {
      context: null,
      response: NextResponse.json(
        { error: 'This assignment belongs to a different routing stage.' },
        { status: 409 }
      ),
    }
  }

  const stageId = currentStageId ?? requestStageId
  let stageDepartment = currentCase.assigned_department ?? null

  if (stageId) {
    const { data: currentStage, error: currentStageError } = await supabase
      .from('case_routing_stages')
      .select('id, department')
      .eq('id', stageId)
      .eq('case_id', caseId)
      .maybeSingle()

    if (currentStageError) {
      return {
        context: null,
        response: NextResponse.json({ error: currentStageError.message }, { status: 500 }),
      }
    }

    if (!currentStage) {
      return {
        context: null,
        response: NextResponse.json({ error: 'Routing stage not found.' }, { status: 409 }),
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
          response: NextResponse.json({ error: linkCaseStageError.message }, { status: 500 }),
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
          response: NextResponse.json({ error: linkRequestStageError.message }, { status: 500 }),
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
  let appointmentDate: string | undefined
  let appointmentTime: string | undefined
  let note: string | undefined
  let whatWasDone: string | undefined
  let nextStep: string | undefined
  let nextAppointmentDate: string | undefined
  let nextAppointmentTime: string | undefined
  try {
    const body = (await request.json()) as {
      action?: string
      appointment_date?: string
      appointment_time?: string
      note?: string
      what_was_done?: string
      next_step?: string
      next_appointment_date?: string
      next_appointment_time?: string
    }
    if (!body.action || !VALID_ACTIONS.includes(body.action as StudentAction)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    action = body.action as StudentAction
    appointmentDate = typeof body.appointment_date === 'string' ? body.appointment_date : undefined
    appointmentTime = typeof body.appointment_time === 'string' ? body.appointment_time : undefined
    note = typeof body.note === 'string' ? body.note.trim() : undefined
    whatWasDone = typeof body.what_was_done === 'string' ? body.what_was_done.trim() : undefined
    nextStep = typeof body.next_step === 'string' ? body.next_step.trim() : undefined
    nextAppointmentDate =
      typeof body.next_appointment_date === 'string' ? body.next_appointment_date : undefined
    nextAppointmentTime =
      typeof body.next_appointment_time === 'string' ? body.next_appointment_time : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (action === 'mark_appointment_scheduled' || action === 'reschedule_appointment') {
    if (!isValidDate(appointmentDate)) {
      return NextResponse.json({ error: 'Appointment date is required.' }, { status: 400 })
    }

    if (appointmentTime && !isValidTime(appointmentTime)) {
      return NextResponse.json({ error: 'Appointment time is invalid.' }, { status: 400 })
    }
  }

  if (action === 'mark_in_treatment') {
    if (!note) {
      return NextResponse.json({ error: 'Progress note is required.' }, { status: 400 })
    }

    if (nextAppointmentDate && !isValidDate(nextAppointmentDate)) {
      return NextResponse.json({ error: 'Next appointment date is invalid.' }, { status: 400 })
    }

    if (nextAppointmentTime && !isValidTime(nextAppointmentTime)) {
      return NextResponse.json({ error: 'Next appointment time is invalid.' }, { status: 400 })
    }
  }

  // ── 3. Verify the student has an approved request for this case ──────────────
  const { context, response } = await getAuthorizedStageContext({
    supabase,
    caseId: id,
    studentId: user.id,
  })

  if (response) return response
  if (!context) {
    return NextResponse.json({ error: 'Unable to load case context.' }, { status: 500 })
  }

  // ── 4a. Reschedule appointment (does not advance case status) ────────────────
  if (action === 'reschedule_appointment') {
    if (!['appointment_scheduled', 'in_treatment'].includes(context.currentCase.status)) {
      return NextResponse.json(
        { error: 'Rescheduling is only available for scheduled or active cases.' },
        { status: 409 }
      )
    }

    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const { data: rescheduleEntry, error: rescheduleInsertError } = await supabase
      .from('case_progress_entries')
      .insert({
        case_id: id,
        student_id: user.id,
        student_name: studentProfile?.full_name?.trim() || null,
        stage_id: context.stageId,
        department_at_time: context.stageDepartment,
        status_at_time: 'rescheduled',
        appointment_date: appointmentDate ?? null,
        appointment_time: appointmentTime ?? null,
        note: note || null,
        what_was_done: null,
        next_step: null,
        next_appointment_date: null,
        next_appointment_time: null,
      })
      .select(
        'id, case_id, student_id, student_name, status_at_time, appointment_date, appointment_time, note, what_was_done, next_step, next_appointment_date, next_appointment_time, needs_faculty_attention, created_at'
      )
      .single()

    if (rescheduleInsertError) {
      return NextResponse.json({ error: rescheduleInsertError.message }, { status: 500 })
    }

    const { error: plannerUpdateError } = await supabase
      .from('student_planner_events')
      .update({
        event_date: buildPlannerEventDate(appointmentDate!, appointmentTime),
        stage_id: context.stageId,
        lifecycle_state: 'active',
      })
      .eq('student_id', user.id)
      .eq('source_kind', CASE_APPOINTMENT_SOURCE_KIND)
      .eq('source_case_id', id)

    if (plannerUpdateError) {
      await supabase.from('case_progress_entries').delete().eq('id', rescheduleEntry.id)
      return NextResponse.json({ error: plannerUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { progressEntry: rescheduleEntry } })
  }

  if (action === 'submit_stage_for_review') {
    if (context.currentCase.status !== 'in_treatment') {
      return NextResponse.json(
        { error: 'Only cases in treatment can be submitted for faculty review.' },
        { status: 409 }
      )
    }

    if (!context.stageId) {
      return NextResponse.json(
        { error: 'A routing stage is required before submitting for faculty review.' },
        { status: 409 }
      )
    }

    const submittedAt = new Date().toISOString()

    const { error: stageUpdateError } = await supabase
      .from('case_routing_stages')
      .update({
        status: 'faculty_review',
        stage_submitted_by: user.id,
        stage_submitted_at: submittedAt,
        updated_at: submittedAt,
      })
      .eq('id', context.stageId)
      .eq('case_id', id)

    if (stageUpdateError) {
      return NextResponse.json({ error: stageUpdateError.message }, { status: 500 })
    }

    const { error: caseUpdateError } = await supabase
      .from('patient_requests')
      .update({
        status: 'faculty_review',
        reviewed_by: user.email ?? null,
        reviewed_at: submittedAt,
      })
      .eq('id', id)

    if (caseUpdateError) {
      return NextResponse.json({ error: caseUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { status: 'faculty_review' } })
  }

  // ── 4b. Advance the case status ───────────────────────────────────────────────
  // TypeScript narrows `action` to LifecycleAction after the reschedule early-return above.
  if (context.currentCase.status !== EXPECTED_CURRENT_STATUS[action]) {
    return NextResponse.json(
      { error: 'This case is no longer in the expected stage for this action.' },
      { status: 409 }
    )
  }

  const newStatus = ACTION_TO_STATUS[action]
  let progressEntry:
    | {
        id: string
        case_id: string
        student_id: string
        student_name: string | null
        status_at_time: string
        appointment_date: string | null
        appointment_time: string | null
        note: string | null
        what_was_done: string | null
        next_step: string | null
        next_appointment_date: string | null
        next_appointment_time: string | null
        needs_faculty_attention: boolean
        created_at: string
      }
    | null = null
  let plannerEventUpserted = false

  if (action === 'mark_appointment_scheduled' || action === 'mark_in_treatment') {
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const { data: insertedEntry, error: progressInsertError } = await supabase
      .from('case_progress_entries')
      .insert({
        case_id: id,
        student_id: user.id,
        student_name: studentProfile?.full_name?.trim() || null,
        stage_id: context.stageId,
        department_at_time: context.stageDepartment,
        status_at_time: newStatus,
        appointment_date: action === 'mark_appointment_scheduled' ? appointmentDate ?? null : null,
        appointment_time: action === 'mark_appointment_scheduled' ? appointmentTime ?? null : null,
        note: note || null,
        what_was_done: action === 'mark_in_treatment' ? whatWasDone || null : null,
        next_step: action === 'mark_in_treatment' ? nextStep || null : null,
        next_appointment_date: action === 'mark_in_treatment' ? nextAppointmentDate ?? null : null,
        next_appointment_time: action === 'mark_in_treatment' ? nextAppointmentTime ?? null : null,
      })
      .select(
        'id, case_id, student_id, student_name, status_at_time, appointment_date, appointment_time, note, what_was_done, next_step, next_appointment_date, next_appointment_time, needs_faculty_attention, created_at'
      )
      .single()

    if (progressInsertError) {
      return NextResponse.json({ error: progressInsertError.message }, { status: 500 })
    }

    progressEntry = insertedEntry
  }

  if (action === 'mark_appointment_scheduled' && appointmentDate) {
    const { error: plannerUpsertError } = await supabase
      .from('student_planner_events')
      .upsert(
        {
          student_id: user.id,
          title: buildPlannerEventTitle(context.currentCase.full_name ?? null),
          description: null,
          event_date: buildPlannerEventDate(appointmentDate, appointmentTime),
          patient_id: id,
          language: null,
          source_kind: CASE_APPOINTMENT_SOURCE_KIND,
          source_case_id: id,
          stage_id: context.stageId,
          lifecycle_state: 'active',
        },
        {
          onConflict: 'student_id,source_kind,source_case_id',
        }
      )

    if (plannerUpsertError) {
      if (progressEntry) {
        await supabase.from('case_progress_entries').delete().eq('id', progressEntry.id)
      }
      return NextResponse.json({ error: plannerUpsertError.message }, { status: 500 })
    }

    plannerEventUpserted = true
  }

  if (context.stageId) {
    const { error: stageUpdateError } = await supabase
      .from('case_routing_stages')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.stageId)
      .eq('case_id', id)

    if (stageUpdateError) {
      if (progressEntry) {
        await supabase.from('case_progress_entries').delete().eq('id', progressEntry.id)
      }
      if (plannerEventUpserted) {
        await supabase
          .from('student_planner_events')
          .delete()
          .eq('student_id', user.id)
          .eq('source_kind', CASE_APPOINTMENT_SOURCE_KIND)
          .eq('source_case_id', id)
      }
      return NextResponse.json({ error: stageUpdateError.message }, { status: 500 })
    }
  }

  const { error: updateError } = await supabase
    .from('patient_requests')
    .update({
      status: newStatus,
      reviewed_by: user.email ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    if (progressEntry) {
      await supabase.from('case_progress_entries').delete().eq('id', progressEntry.id)
    }
    if (plannerEventUpserted) {
      await supabase
        .from('student_planner_events')
        .delete()
        .eq('student_id', user.id)
        .eq('source_kind', CASE_APPOINTMENT_SOURCE_KIND)
        .eq('source_case_id', id)
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { status: newStatus, progressEntry } })
}
