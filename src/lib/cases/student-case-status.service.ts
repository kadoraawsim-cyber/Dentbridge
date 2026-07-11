import 'server-only'

import {
  auditStudentCaseStatusChanged,
  auditStudentProgressAdded,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'
import { createSupabaseAdminClient, type SupabaseAdminClient } from '@/lib/supabase-admin'
import type { ServiceResponse, StudentActor } from '@/lib/api/service-types'
import { getAuthorizedStageContext } from './case-stage-context'
import {
  canRescheduleFromStatus,
  canSubmitStageForReview,
  CASE_STATUS,
  isStudentActor,
  isStudentCaseAction,
  LIFECYCLE_MESSAGES,
  PLANNER_LIFECYCLE_STATE,
  resolveStudentLifecycleTransition,
  STAGE_STATUS,
  SUBMIT_FOR_REVIEW_REQUIRED_STATUS,
  type StudentCaseAction,
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


const CASE_APPOINTMENT_SOURCE_KIND = 'case_appointment'
const DEFAULT_APPOINTMENT_TIME = '09:00:00'
const CLINIC_TIMEZONE_OFFSET = '+03:00'

export interface UpdateStudentCaseStatusInput {
  caseId: string
  actor: StudentActor
  body: unknown
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
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

export async function updateStudentCaseStatus(
  input: UpdateStudentCaseStatusInput
): Promise<ServiceResponse> {
  if (!isStudentActor(input.actor.role)) {
    return { status: 403, body: { error: LIFECYCLE_MESSAGES.FORBIDDEN } }
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

  if (!body.action || !isStudentCaseAction(body.action)) {
    return { status: 400, body: { error: 'Invalid action' } }
  }

  const action = body.action as StudentCaseAction
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
    if (!canRescheduleFromStatus(context.currentCase.status)) {
      return {
        status: 409,
        body: { error: LIFECYCLE_MESSAGES.RESCHEDULE_ONLY_SCHEDULED_OR_ACTIVE },
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
        lifecycle_state: PLANNER_LIFECYCLE_STATE.ACTIVE,
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
    if (!canSubmitStageForReview(context.currentCase.status)) {
      return {
        status: 409,
        body: { error: LIFECYCLE_MESSAGES.SUBMIT_ONLY_IN_TREATMENT },
      }
    }

    if (!context.stageId) {
      return {
        status: 409,
        body: { error: LIFECYCLE_MESSAGES.STAGE_REQUIRED_FOR_REVIEW },
      }
    }

    const submittedAt = new Date().toISOString()

    // Optimistic-concurrency guard: the case transition is conditional on the
    // observed from-status, so a concurrent admin action (return-to-pool,
    // cancel, …) yields a 409 instead of being silently overwritten.
    const { data: caseUpdated, error: caseUpdateError } = await supabase
      .from('patient_requests')
      .update({
        status: CASE_STATUS.FACULTY_REVIEW,
        reviewed_by: input.actor.email,
        reviewed_at: submittedAt,
      })
      .eq('id', input.caseId)
      .eq('status', SUBMIT_FOR_REVIEW_REQUIRED_STATUS)
      .select('id')

    if (caseUpdateError) {
      return { status: 500, body: { error: logServerError('[student-case-status] caseUpdateError', caseUpdateError.message) } }
    }
    if (!caseUpdated || caseUpdated.length === 0) {
      return { status: 409, body: { error: LIFECYCLE_MESSAGES.CONFLICT_RETRY } }
    }

    const { error: stageUpdateError } = await supabase
      .from('case_routing_stages')
      .update({
        status: STAGE_STATUS.FACULTY_REVIEW,
        stage_submitted_by: input.actor.userId,
        stage_submitted_at: submittedAt,
        updated_at: submittedAt,
      })
      .eq('id', context.stageId)
      .eq('case_id', input.caseId)

    if (stageUpdateError) {
      // Compensate the already-applied case transition so case and stage do
      // not disagree about who owns the review.
      await supabase
        .from('patient_requests')
        .update({
          status: SUBMIT_FOR_REVIEW_REQUIRED_STATUS,
          reviewed_by: input.actor.email,
          reviewed_at: submittedAt,
        })
        .eq('id', input.caseId)
        .eq('status', CASE_STATUS.FACULTY_REVIEW)
      return { status: 500, body: { error: logServerError('[student-case-status] stageUpdateError', stageUpdateError.message) } }
    }

    await auditStudentCaseStatusChanged({
      caseId: input.caseId,
      stageId: context.stageId,
      action,
      fromStatus: context.currentCase.status,
      toStatus: CASE_STATUS.FACULTY_REVIEW,
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      context: input.context,
      supabase,
    })

    return { status: 200, body: { success: true, data: { status: CASE_STATUS.FACULTY_REVIEW } } }
  }

  const transition = resolveStudentLifecycleTransition(action, context.currentCase.status)
  if (!transition.ok) {
    return {
      status: 409,
      body: { error: transition.error },
    }
  }

  const newStatus = transition.toStatus
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
          lifecycle_state: PLANNER_LIFECYCLE_STATE.ACTIVE,
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

  // Undo the side-effect writes above when the final case transition cannot be
  // applied, so a failed/raced action leaves no progress, planner, or stage
  // residue behind.
  const compensateSideEffects = async () => {
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
    if (context.stageId && context.stageStatus) {
      await supabase
        .from('case_routing_stages')
        .update({
          status: context.stageStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', context.stageId)
        .eq('case_id', input.caseId)
        .eq('status', newStatus)
    }
  }

  // Optimistic-concurrency guard: conditional on the observed from-status so a
  // concurrent admin action (return-to-pool, cancel, …) yields a 409 instead of
  // being silently overwritten.
  const { data: caseUpdated, error: updateError } = await supabase
    .from('patient_requests')
    .update({
      status: newStatus,
      reviewed_by: input.actor.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.caseId)
    .eq('status', context.currentCase.status ?? '')
    .select('id')

  if (updateError) {
    await compensateSideEffects()
    return { status: 500, body: { error: logServerError('[student-case-status] updateError', updateError.message) } }
  }

  if (!caseUpdated || caseUpdated.length === 0) {
    await compensateSideEffects()
    return { status: 409, body: { error: LIFECYCLE_MESSAGES.CONFLICT_RETRY } }
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
