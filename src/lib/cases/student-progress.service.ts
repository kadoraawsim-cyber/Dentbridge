import 'server-only'

import {
  auditStudentProgressAdded,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

interface StudentActor {
  userId: string
  email: string | null
  role: unknown
}

export interface AddStudentProgressInput {
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
      .select('status, current_stage_id, assigned_department')
      .eq('id', caseId)
      .maybeSingle(),
  ])

  if (requestError) {
    return { context: null, response: { status: 500, body: { error: requestError.message } } }
  }

  if (!approvedRequest) {
    return {
      context: null,
      response: { status: 403, body: { error: 'No approved request found for this case.' } },
    }
  }

  if (currentCaseError) {
    return { context: null, response: { status: 500, body: { error: currentCaseError.message } } }
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
        response: { status: 500, body: { error: currentStageError.message } },
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
          response: { status: 500, body: { error: linkCaseStageError.message } },
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
          response: { status: 500, body: { error: linkRequestStageError.message } },
        }
      }
    }
  }

  return {
    context: {
      currentCase,
      stageId: stageId as string | null,
      stageDepartment,
    },
    response: null,
  }
}

export async function addStudentProgress(
  input: AddStudentProgressInput
): Promise<ServiceResponse> {
  if (input.actor.role !== 'student') {
    return { status: 403, body: { error: 'Forbidden' } }
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

  if (context.currentCase.status !== 'in_treatment') {
    return {
      status: 409,
      body: { error: 'Progress notes can only be added while the case is in treatment.' },
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
    return { status: 500, body: { error: insertError.message } }
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
