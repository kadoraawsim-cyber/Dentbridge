import 'server-only'

import {
  auditStudentProgressAdded,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'
import { createSupabaseAdminClient, type SupabaseAdminClient } from '@/lib/supabase-admin'
import type { ServiceResponse, StudentActor } from '@/lib/api/service-types'
import { getAuthorizedStageContext } from './case-stage-context'
import { canAddProgressFromStatus, isStudentActor, LIFECYCLE_MESSAGES } from './case-lifecycle'

/**
 * Log the underlying failure server-side and return a stable, generic error
 * token for the client. Raw database/Supabase error messages must never be
 * returned to authenticated users.
 */
function logServerError(context: string, detail: string): string {
  console.error(context, { error: detail })
  return 'server_error'
}


export interface AddStudentProgressInput {
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

export async function addStudentProgress(
  input: AddStudentProgressInput
): Promise<ServiceResponse> {
  if (!isStudentActor(input.actor.role)) {
    return { status: 403, body: { error: LIFECYCLE_MESSAGES.FORBIDDEN } }
  }

  if (!input.body || typeof input.body !== 'object' || Array.isArray(input.body)) {
    return { status: 400, body: { error: 'Invalid request body' } }
  }

  const body = input.body as {
    note?: unknown
    what_was_done?: unknown
    next_step?: unknown
    next_appointment_date?: unknown
    next_appointment_time?: unknown
  }

  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const whatWasDone =
    typeof body.what_was_done === 'string' ? body.what_was_done.trim() : undefined
  const nextStep = typeof body.next_step === 'string' ? body.next_step.trim() : undefined
  const nextAppointmentDate =
    typeof body.next_appointment_date === 'string' ? body.next_appointment_date : undefined
  const nextAppointmentTime =
    typeof body.next_appointment_time === 'string' ? body.next_appointment_time : undefined

  if (!note) {
    return { status: 400, body: { error: 'Progress note is required.' } }
  }

  if (nextAppointmentDate && !isValidDate(nextAppointmentDate)) {
    return { status: 400, body: { error: 'Next appointment date is invalid.' } }
  }

  if (nextAppointmentTime && !isValidTime(nextAppointmentTime)) {
    return { status: 400, body: { error: 'Next appointment time is invalid.' } }
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

  if (!canAddProgressFromStatus(context.currentCase.status)) {
    return {
      status: 409,
      body: { error: LIFECYCLE_MESSAGES.PROGRESS_ONLY_IN_TREATMENT },
    }
  }

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('full_name')
    .eq('id', input.actor.userId)
    .maybeSingle()

  const { data: progressEntry, error: insertError } = await supabase
    .from('case_progress_entries')
    .insert({
      case_id: input.caseId,
      student_id: input.actor.userId,
      student_name: studentProfile?.full_name?.trim() || null,
      stage_id: context.stageId,
      department_at_time: context.stageDepartment,
      status_at_time: context.currentCase.status,
      note,
      what_was_done: whatWasDone || null,
      next_step: nextStep || null,
      next_appointment_date: nextAppointmentDate ?? null,
      next_appointment_time: nextAppointmentTime ?? null,
    })
    .select(
      'id, case_id, student_id, student_name, status_at_time, appointment_date, appointment_time, note, what_was_done, next_step, next_appointment_date, next_appointment_time, needs_faculty_attention, created_at'
    )
    .single()

  if (insertError) {
    return { status: 500, body: { error: logServerError('[student-progress] insertError', insertError.message) } }
  }

  await auditStudentProgressAdded({
    progressEntryId: progressEntry.id,
    caseId: input.caseId,
    stageId: context.stageId,
    statusAtTime: context.currentCase.status,
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
    context: input.context,
    supabase,
  })

  return { status: 200, body: { success: true, data: { progressEntry } } }
}
