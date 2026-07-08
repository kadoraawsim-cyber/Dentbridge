import 'server-only'

import {
  auditStudentCaseStatusChanged,
  auditStudentProgressAdded,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

/**
 * Log the underlying failure server-side and return a stable, generic error
 * token for the client. Raw database/Supabase error messages must never be
 * returned to authenticated users.
 */
function logServerError(context: string, detail: string): string {
  console.error(context, { error: detail })
  return 'server_error'
}

type LifecycleAction = 'mark_contacted' | 'mark_appointment_scheduled' | 'mark_in_treatment'
type StudentAction = LifecycleAction | 'reschedule_appointment' | 'submit_stage_for_review'
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

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

interface StudentActor {
  userId: string
  email: string | null
  role: unknown
}

export interface UpdateStudentCaseStatusInput {
  caseId: string
  actor: StudentActor
  body: unknown
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

export interface ServiceResponse {
  status: number
  body: Record<string, unknown>
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
  supabase: SupabaseAdminClient
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
    return { context: null, response: { status: 500, body: { error: logServerError('[student-case-status] requestError', requestError.message) } } }
  }

  if (!approvedRequest) {
    return {
      context: null,
      response: { status: 403, body: { error: 'No approved request found for this case.' } },
    }
  }

  if (currentCaseError) {
    return { context: null, response: { status: 500, body: { error: logServerError('[student-case-status] currentCaseError', currentCaseError.message) } } }
  }

  if (!currentCase) {
    return { context: null, response: { status: 404, body: { error: 'Case not found.' } } }
  }

  const currentStageId = currentCase.current_stage_id ?? null
  const requestStageId = approvedRequest.stage_id ?? null

  if (currentStageId && requestStageId && currentStageId !== requestStageId) {
    return {
      context: null,
      response: {
        status: 409,
        body: { error: 'This assignment belongs to a different routing stage.' },
      },
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
        response: { status: 500, body: { error: logServerError('[student-case-status] currentStageError', currentStageError.message) } },
      }
    }

    if (!currentStage) {
      return {
        context: null,
        response: { status: 409, body: { error: 'Routing stage not found.' } },
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
          response: { status: 500, body: { error: logServerError('[student-case-status] linkCaseStageError', linkCaseStageError.message) } },
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
          response: { status: 500, body: { error: logServerError('[student-case-status] linkRequestStageError', linkRequestStageError.message) } },
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

export async function updateStudentCaseStatus(
  input: UpdateStudentCaseStatusInput
): Promise<ServiceResponse> {
  if (input.actor.role !== 'student') {
    return { status: 403, body: { error: 'Forbidden' } }
  }

  if (!input.body || typeof input.body !== 'object' || Array.isArray(input.body)) {
    return { status: 400, body: { error: 'Invalid request body' } }
  }

  const body = input.body as {
    action?: unknown
    appointment_date?: unknown
    appointment_time?: unknown
    note?: unknown
    what_was_done?: unknown
    next_step?: unknown
    next_appointment_date?: unknown
    next_appointment_time?: unknown
  }

  if (!body.action || !VALID_ACTIONS.includes(body.action as StudentAction)) {
    return { status: 400, body: { error: 'Invalid action' } }
  }

  const action = body.action as StudentAction
  const appointmentDate =
    typeof body.appointment_date === 'string' ? body.appointment_date : undefined
  const appointmentTime =
    typeof body.appointment_time === 'string' ? body.appointment_time : undefined
  const note = typeof body.note === 'string' ? body.note.trim() : undefined
  const whatWasDone =
    typeof body.what_was_done === 'string' ? body.what_was_done.trim() : undefined
  const nextStep = typeof body.next_step === 'string' ? body.next_step.trim() : undefined
  const nextAppointmentDate =
    typeof body.next_appointment_date === 'string' ? body.next_appointment_date : undefined
  const nextAppointmentTime =
    typeof body.next_appointment_time === 'string' ? body.next_appointment_time : undefined

  if (action === 'mark_appointment_scheduled' || action === 'reschedule_appointment') {
    if (!isValidDate(appointmentDate)) {
      return { status: 400, body: { error: 'Appointment date is required.' } }
    }

    if (appointmentTime && !isValidTime(appointmentTime)) {
      return { status: 400, body: { error: 'Appointment time is invalid.' } }
    }
  }

  if (action === 'mark_in_treatment') {
    if (!note) {
      return { status: 400, body: { error: 'Progress note is required.' } }
    }

    if (nextAppointmentDate && !isValidDate(nextAppointmentDate)) {
      return { status: 400, body: { error: 'Next appointment date is invalid.' } }
    }

    if (nextAppointmentTime && !isValidTime(nextAppointmentTime)) {
      return { status: 400, body: { error: 'Next appointment time is invalid.' } }
    }
  }

  const supabase = input.supabase ?? createSupabaseAdminClient()
  const { context, response } = await getAuthorizedStageContext({
    supabase,
    caseId: input.caseId,
    studentId: input.actor.userId,
  })

  if (response) return response
  if (!context) {
    return { status: 500, body: { error: 'Unable to load case context.' } }
  }

  if (action === 'reschedule_appointment') {
    if (!['appointment_scheduled', 'in_treatment'].includes(context.currentCase.status)) {
      return {
        status: 409,
        body: { error: 'Rescheduling is only available for scheduled or active cases.' },
      }
    }

    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('full_name')
      .eq('id', input.actor.userId)
      .maybeSingle()

    const { data: rescheduleEntry, error: rescheduleInsertError } = await supabase
      .from('case_progress_entries')
      .insert({
        case_id: input.caseId,
        student_id: input.actor.userId,
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
      return { status: 500, body: { error: logServerError('[student-case-status] rescheduleInsertError', rescheduleInsertError.message) } }
    }

    const { error: plannerUpdateError } = await supabase
      .from('student_planner_events')
      .update({
        event_date: buildPlannerEventDate(appointmentDate!, appointmentTime),
        stage_id: context.stageId,
        lifecycle_state: 'active',
      })
      .eq('student_id', input.actor.userId)
      .eq('source_kind', CASE_APPOINTMENT_SOURCE_KIND)
      .eq('source_case_id', input.caseId)

    if (plannerUpdateError) {
      await supabase.from('case_progress_entries').delete().eq('id', rescheduleEntry.id)
      return { status: 500, body: { error: logServerError('[student-case-status] plannerUpdateError', plannerUpdateError.message) } }
    }

    await auditStudentProgressAdded({
      progressEntryId: rescheduleEntry.id,
      caseId: input.caseId,
      stageId: context.stageId,
      statusAtTime: 'rescheduled',
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      context: input.context,
      supabase,
    })

    await auditStudentCaseStatusChanged({
      caseId: input.caseId,
      stageId: context.stageId,
      action,
      fromStatus: context.currentCase.status,
      toStatus: context.currentCase.status,
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      context: input.context,
      supabase,
    })

    return { status: 200, body: { success: true, data: { progressEntry: rescheduleEntry } } }
  }

  if (action === 'submit_stage_for_review') {
    if (context.currentCase.status !== 'in_treatment') {
      return {
        status: 409,
        body: { error: 'Only cases in treatment can be submitted for faculty review.' },
      }
    }

    if (!context.stageId) {
      return {
        status: 409,
        body: { error: 'A routing stage is required before submitting for faculty review.' },
      }
    }

    const submittedAt = new Date().toISOString()

    const { error: stageUpdateError } = await supabase
      .from('case_routing_stages')
      .update({
        status: 'faculty_review',
        stage_submitted_by: input.actor.userId,
        stage_submitted_at: submittedAt,
        updated_at: submittedAt,
      })
      .eq('id', context.stageId)
      .eq('case_id', input.caseId)

    if (stageUpdateError) {
      return { status: 500, body: { error: logServerError('[student-case-status] stageUpdateError', stageUpdateError.message) } }
    }

    const { error: caseUpdateError } = await supabase
      .from('patient_requests')
      .update({
        status: 'faculty_review',
        reviewed_by: input.actor.email,
        reviewed_at: submittedAt,
      })
      .eq('id', input.caseId)

    if (caseUpdateError) {
      return { status: 500, body: { error: logServerError('[student-case-status] caseUpdateError', caseUpdateError.message) } }
    }

    await auditStudentCaseStatusChanged({
      caseId: input.caseId,
      stageId: context.stageId,
      action,
      fromStatus: context.currentCase.status,
      toStatus: 'faculty_review',
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      context: input.context,
      supabase,
    })

    return { status: 200, body: { success: true, data: { status: 'faculty_review' } } }
  }

  if (context.currentCase.status !== EXPECTED_CURRENT_STATUS[action]) {
    return {
      status: 409,
      body: { error: 'This case is no longer in the expected stage for this action.' },
    }
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
      .eq('id', input.actor.userId)
      .maybeSingle()

    const { data: insertedEntry, error: progressInsertError } = await supabase
      .from('case_progress_entries')
      .insert({
        case_id: input.caseId,
        student_id: input.actor.userId,
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
      return { status: 500, body: { error: logServerError('[student-case-status] progressInsertError', progressInsertError.message) } }
    }

    progressEntry = insertedEntry
  }

  if (action === 'mark_appointment_scheduled' && appointmentDate) {
    const { error: plannerUpsertError } = await supabase
      .from('student_planner_events')
      .upsert(
        {
          student_id: input.actor.userId,
          title: buildPlannerEventTitle(context.currentCase.full_name ?? null),
          description: null,
          event_date: buildPlannerEventDate(appointmentDate, appointmentTime),
          patient_id: input.caseId,
          language: null,
          source_kind: CASE_APPOINTMENT_SOURCE_KIND,
          source_case_id: input.caseId,
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
      return { status: 500, body: { error: logServerError('[student-case-status] plannerUpsertError', plannerUpsertError.message) } }
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
      .eq('case_id', input.caseId)

    if (stageUpdateError) {
      if (progressEntry) {
        await supabase.from('case_progress_entries').delete().eq('id', progressEntry.id)
      }
      if (plannerEventUpserted) {
        await supabase
          .from('student_planner_events')
          .delete()
          .eq('student_id', input.actor.userId)
          .eq('source_kind', CASE_APPOINTMENT_SOURCE_KIND)
          .eq('source_case_id', input.caseId)
      }
      return { status: 500, body: { error: logServerError('[student-case-status] stageUpdateError', stageUpdateError.message) } }
    }
  }

  const { error: updateError } = await supabase
    .from('patient_requests')
    .update({
      status: newStatus,
      reviewed_by: input.actor.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.caseId)

  if (updateError) {
    if (progressEntry) {
      await supabase.from('case_progress_entries').delete().eq('id', progressEntry.id)
    }
    if (plannerEventUpserted) {
      await supabase
        .from('student_planner_events')
        .delete()
        .eq('student_id', input.actor.userId)
        .eq('source_kind', CASE_APPOINTMENT_SOURCE_KIND)
        .eq('source_case_id', input.caseId)
    }
    return { status: 500, body: { error: logServerError('[student-case-status] updateError', updateError.message) } }
  }

  if (progressEntry) {
    await auditStudentProgressAdded({
      progressEntryId: progressEntry.id,
      caseId: input.caseId,
      stageId: context.stageId,
      statusAtTime: newStatus,
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      context: input.context,
      supabase,
    })
  }

  await auditStudentCaseStatusChanged({
    caseId: input.caseId,
    stageId: context.stageId,
    action,
    fromStatus: context.currentCase.status,
    toStatus: newStatus,
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
    context: input.context,
    supabase,
  })

  return { status: 200, body: { success: true, data: { status: newStatus, progressEntry } } }
}
