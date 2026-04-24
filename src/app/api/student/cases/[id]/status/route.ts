import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type LifecycleAction = 'mark_contacted' | 'mark_appointment_scheduled' | 'mark_in_treatment'
type StudentAction = LifecycleAction | 'reschedule_appointment'

const VALID_ACTIONS: StudentAction[] = [
  'mark_contacted',
  'mark_appointment_scheduled',
  'mark_in_treatment',
  'reschedule_appointment',
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

  // ── 4a. Reschedule appointment (does not advance case status) ────────────────
  if (action === 'reschedule_appointment') {
    const { data: rescheduleCase, error: rescheduleCaseError } = await supabase
      .from('patient_requests')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (rescheduleCaseError) {
      return NextResponse.json({ error: rescheduleCaseError.message }, { status: 500 })
    }

    if (!rescheduleCase) {
      return NextResponse.json({ error: 'Case not found.' }, { status: 404 })
    }

    if (!['appointment_scheduled', 'in_treatment'].includes(rescheduleCase.status)) {
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
      .update({ event_date: buildPlannerEventDate(appointmentDate!, appointmentTime) })
      .eq('student_id', user.id)
      .eq('source_kind', CASE_APPOINTMENT_SOURCE_KIND)
      .eq('source_case_id', id)

    if (plannerUpdateError) {
      await supabase.from('case_progress_entries').delete().eq('id', rescheduleEntry.id)
      return NextResponse.json({ error: plannerUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { progressEntry: rescheduleEntry } })
  }

  // ── 4b. Advance the case status ───────────────────────────────────────────────
  // TypeScript narrows `action` to LifecycleAction after the reschedule early-return above.
  const { data: currentCase, error: currentCaseError } = await supabase
    .from('patient_requests')
    .select('status, full_name')
    .eq('id', id)
    .maybeSingle()

  if (currentCaseError) {
    return NextResponse.json({ error: currentCaseError.message }, { status: 500 })
  }

  if (!currentCase) {
    return NextResponse.json({ error: 'Case not found.' }, { status: 404 })
  }

  if (currentCase.status !== EXPECTED_CURRENT_STATUS[action]) {
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
          title: buildPlannerEventTitle(currentCase.full_name ?? null),
          description: null,
          event_date: buildPlannerEventDate(appointmentDate, appointmentTime),
          patient_id: id,
          language: null,
          source_kind: CASE_APPOINTMENT_SOURCE_KIND,
          source_case_id: id,
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
