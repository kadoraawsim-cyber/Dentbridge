import 'server-only'

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

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

interface StudentActor {
  userId: string
  role: unknown
}

export interface PlannerServiceInput {
  actor: StudentActor
  supabase?: SupabaseAdminClient
}

export interface PlannerMutationInput extends PlannerServiceInput {
  body: unknown
}

export interface PlannerEventMutationInput extends PlannerMutationInput {
  eventId: string
}

export interface PlannerDeleteInput extends PlannerServiceInput {
  eventId: string
}

export interface ServiceResponse {
  status: number
  body: Record<string, unknown>
}

const ACTIVE_CASE_STATUSES = [
  'student_approved',
  'contacted',
  'appointment_scheduled',
  'in_treatment',
]

const END_MARKER_REGEX = /\n?\[\[planner_end:([^\]]+)\]\]\s*$/
const CASE_APPOINTMENT_SOURCE_KIND = 'case_appointment'
const LOCAL_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

function stripEndMarker(value: string | null) {
  if (!value) {
    return { description: null as string | null, endAt: null as string | null }
  }

  const match = value.match(END_MARKER_REGEX)
  const cleanDescription = value.replace(END_MARKER_REGEX, '').trim()

  return {
    description: cleanDescription || null,
    endAt: match?.[1] ?? null,
  }
}

function encodeDescription(description: string | null, endAt: string | null) {
  const cleanDescription = (description || '').replace(END_MARKER_REGEX, '').trim()

  if (!endAt) {
    return cleanDescription || null
  }

  if (!cleanDescription) {
    return `[[planner_end:${endAt}]]`
  }

  return `${cleanDescription}\n\n[[planner_end:${endAt}]]`
}

function normalizeLocalDateTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const cleanValue = value.trim()
  if (!LOCAL_DATE_TIME_REGEX.test(cleanValue)) {
    return null
  }

  return cleanValue.length === 16 ? `${cleanValue}:00` : cleanValue
}

function parseLocalDateTime(value: string) {
  return new Date(value)
}

function isCurrentStageRequest(
  requestStageId: string | null | undefined,
  currentStageId: string | null | undefined
) {
  return !requestStageId || !currentStageId || requestStageId === currentStageId
}

function ensureStudent(actor: StudentActor): ServiceResponse | null {
  if (actor.role !== 'student') {
    return { status: 403, body: { error: 'Forbidden' } }
  }
  return null
}

async function validatePatientLink(
  supabase: SupabaseAdminClient,
  studentId: string,
  patientId: string | null
) {
  if (!patientId) {
    return { stageId: null as string | null }
  }

  const { data: approvedRequest, error: requestError } = await supabase
    .from('student_case_requests')
    .select('case_id, stage_id')
    .eq('student_id', studentId)
    .eq('status', 'approved')
    .eq('case_id', patientId)
    .maybeSingle()

  if (requestError) {
    return {
      response: { status: 500, body: { error: logServerError('[student-planner] requestError', requestError.message) } },
      stageId: null as string | null,
    }
  }

  if (!approvedRequest) {
    return {
      response: { status: 403, body: { error: 'Selected patient is not available to link.' } },
      stageId: null as string | null,
    }
  }

  const { data: activePatient, error: patientError } = await supabase
    .from('patient_requests')
    .select('id, current_stage_id')
    .eq('id', patientId)
    .in('status', ACTIVE_CASE_STATUSES)
    .maybeSingle()

  if (patientError) {
    return {
      response: { status: 500, body: { error: logServerError('[student-planner] patientError', patientError.message) } },
      stageId: null as string | null,
    }
  }

  if (!activePatient) {
    return {
      response: { status: 409, body: { error: 'Selected patient is no longer active.' } },
      stageId: null as string | null,
    }
  }

  if (!isCurrentStageRequest(approvedRequest.stage_id, activePatient.current_stage_id)) {
    return {
      response: {
        status: 409,
        body: { error: 'Selected patient is no longer active for your stage.' },
      },
      stageId: null as string | null,
    }
  }

  return { stageId: activePatient.current_stage_id ?? approvedRequest.stage_id ?? null }
}

export async function getStudentPlannerData(input: PlannerServiceInput): Promise<ServiceResponse> {
  const forbidden = ensureStudent(input.actor)
  if (forbidden) return forbidden

  const supabase = input.supabase ?? createSupabaseAdminClient()

  const [plannerResult, requestsResult] = await Promise.all([
    supabase
      .from('student_planner_events')
      .select(
        'id, title, description, event_date, patient_id, language, created_at, source_kind, source_case_id, stage_id, lifecycle_state'
      )
      .eq('student_id', input.actor.userId)
      .order('event_date', { ascending: true }),

    supabase
      .from('student_case_requests')
      .select('case_id, stage_id')
      .eq('student_id', input.actor.userId)
      .eq('status', 'approved'),
  ])

  const { data: plannerRows, error: plannerError } = plannerResult
  const { data: approvedRequests, error: requestsError } = requestsResult

  if (plannerError) {
    return { status: 500, body: { error: logServerError('[student-planner] plannerError', plannerError.message) } }
  }

  if (requestsError) {
    return { status: 500, body: { error: logServerError('[student-planner] requestsError', requestsError.message) } }
  }

  const approvedCaseIds = (approvedRequests ?? []).map((row) => row.case_id)
  const approvedStageByCase = new Map(
    (approvedRequests ?? []).map((row) => [row.case_id, row.stage_id as string | null])
  )
  const linkedCaseIds = Array.from(
    new Set(
      (plannerRows ?? [])
        .filter((row) => row.source_kind === CASE_APPOINTMENT_SOURCE_KIND && row.source_case_id)
        .map((row) => row.source_case_id as string)
    )
  )

  let activePatients: Array<{
    id: string
    full_name: string
    treatment_type: string
    assigned_department: string | null
    status: string
    current_stage_id?: string | null
  }> = []

  const latestLinkedAppointmentsByCase = new Map<
    string,
    {
      appointment_date: string | null
      appointment_time: string | null
    }
  >()
  const latestLinkedAppointmentsByStage = new Map<
    string,
    {
      appointment_date: string | null
      appointment_time: string | null
    }
  >()

  const [patientsResult, linkedAppointmentsResult] = await Promise.all([
    approvedCaseIds.length > 0
      ? supabase
          .from('patient_requests')
          .select('id, full_name, treatment_type, assigned_department, status, current_stage_id')
          .in('id', approvedCaseIds)
          .in('status', ACTIVE_CASE_STATUSES)
          .order('created_at', { ascending: false })
      : Promise.resolve(null),

    linkedCaseIds.length > 0
      ? supabase
          .from('case_progress_entries')
          .select('case_id, stage_id, appointment_date, appointment_time, created_at')
          .in('case_id', linkedCaseIds)
          .not('appointment_date', 'is', null)
          .order('created_at', { ascending: false })
      : Promise.resolve(null),
  ])

  if (patientsResult?.error) {
    return { status: 500, body: { error: logServerError('[student-planner] patientsResult.error', patientsResult.error.message) } }
  }

  activePatients = (patientsResult?.data ?? []).filter((patient) =>
    isCurrentStageRequest(approvedStageByCase.get(patient.id), patient.current_stage_id)
  )

  if (linkedAppointmentsResult?.error) {
    return { status: 500, body: { error: logServerError('[student-planner] linkedAppointmentsResult.error', linkedAppointmentsResult.error.message) } }
  }

  for (const row of linkedAppointmentsResult?.data ?? []) {
    if (row.stage_id && !latestLinkedAppointmentsByStage.has(row.stage_id)) {
      latestLinkedAppointmentsByStage.set(row.stage_id, {
        appointment_date: row.appointment_date,
        appointment_time: row.appointment_time,
      })
    }

    if (!latestLinkedAppointmentsByCase.has(row.case_id)) {
      latestLinkedAppointmentsByCase.set(row.case_id, {
        appointment_date: row.appointment_date,
        appointment_time: row.appointment_time,
      })
    }
  }

  return {
    status: 200,
    body: {
      data: {
        events: (plannerRows ?? []).map((row) => {
          const { description, endAt } = stripEndMarker(row.description)
          const linkedAppointment =
            row.source_kind === CASE_APPOINTMENT_SOURCE_KIND && row.source_case_id
              ? row.stage_id
                ? latestLinkedAppointmentsByStage.get(row.stage_id)
                : latestLinkedAppointmentsByCase.get(row.source_case_id)
              : undefined

          return {
            id: row.id,
            title: row.title,
            description,
            start_at: row.event_date,
            end_at: endAt,
            patient_id: row.patient_id,
            language: row.language,
            created_at: row.created_at,
            source_kind: row.source_kind,
            source_case_id: row.source_case_id,
            stage_id: row.stage_id,
            lifecycle_state: row.lifecycle_state,
            linked_appointment_date: linkedAppointment?.appointment_date ?? null,
            linked_appointment_time: linkedAppointment?.appointment_time ?? null,
          }
        }),
        activePatients,
      },
    },
  }
}

export async function createStudentPlannerEvent(
  input: PlannerMutationInput
): Promise<ServiceResponse> {
  const forbidden = ensureStudent(input.actor)
  if (forbidden) return forbidden

  if (!input.body || typeof input.body !== 'object' || Array.isArray(input.body)) {
    return { status: 400, body: { error: 'Invalid request body' } }
  }

  const body = input.body as {
    title?: string
    description?: string
    start_at?: string
    end_at?: string | null
    patient_id?: string | null
    language?: string | null
  }

  const title = (body.title || '').trim()
  const description = (body.description || '').trim() || null
  const startAtValue = normalizeLocalDateTime(body.start_at)
  const endAtValue = normalizeLocalDateTime(body.end_at)
  const startAt = startAtValue ? parseLocalDateTime(startAtValue) : null
  const endAt = endAtValue ? parseLocalDateTime(endAtValue) : null
  const patientId = body.patient_id || null
  const language = body.language === 'tr' || body.language === 'en' ? body.language : null

  if (!title) {
    return { status: 400, body: { error: 'Event title is required.' } }
  }

  if (!startAtValue || !startAt || Number.isNaN(startAt.getTime())) {
    return { status: 400, body: { error: 'A valid start date is required.' } }
  }

  if (body.end_at && (!endAtValue || !endAt || Number.isNaN(endAt.getTime()))) {
    return { status: 400, body: { error: 'A valid end date is required.' } }
  }

  if (endAt && endAt <= startAt) {
    return { status: 400, body: { error: 'End time must be after start time.' } }
  }

  const supabase = input.supabase ?? createSupabaseAdminClient()
  const patientValidation = await validatePatientLink(supabase, input.actor.userId, patientId)
  if (patientValidation.response) return patientValidation.response

  const { data: insertedRow, error: insertError } = await supabase
    .from('student_planner_events')
    .insert({
      student_id: input.actor.userId,
      title,
      description: encodeDescription(description, endAtValue),
      event_date: startAtValue,
      patient_id: patientId,
      language,
      stage_id: patientValidation.stageId,
      lifecycle_state: patientId ? 'active' : null,
    })
    .select(
      'id, title, description, event_date, patient_id, language, created_at, source_kind, source_case_id, stage_id, lifecycle_state'
    )
    .single()

  if (insertError) {
    return { status: 500, body: { error: logServerError('[student-planner] insertError', insertError.message) } }
  }

  const { description: cleanDescription, endAt: parsedEndAt } = stripEndMarker(insertedRow.description)

  return {
    status: 200,
    body: {
      data: {
        id: insertedRow.id,
        title: insertedRow.title,
        description: cleanDescription,
        start_at: startAtValue,
        end_at: parsedEndAt ?? endAtValue,
        patient_id: insertedRow.patient_id,
        language: insertedRow.language,
        created_at: insertedRow.created_at,
        source_kind: insertedRow.source_kind,
        source_case_id: insertedRow.source_case_id,
        stage_id: insertedRow.stage_id,
        lifecycle_state: insertedRow.lifecycle_state,
        linked_appointment_date: null,
        linked_appointment_time: null,
      },
    },
  }
}

export async function updateStudentPlannerEvent(
  input: PlannerEventMutationInput
): Promise<ServiceResponse> {
  const forbidden = ensureStudent(input.actor)
  if (forbidden) return forbidden

  if (!input.body || typeof input.body !== 'object' || Array.isArray(input.body)) {
    return { status: 400, body: { error: 'Invalid request body' } }
  }

  const body = input.body as {
    title?: string
    description?: string
    start_at?: string
    end_at?: string | null
    patient_id?: string | null
  }

  const title = (body.title || '').trim()
  const description = (body.description || '').trim() || null
  const startAtValue = normalizeLocalDateTime(body.start_at)
  const endAtValue = normalizeLocalDateTime(body.end_at)
  const startAt = startAtValue ? parseLocalDateTime(startAtValue) : null
  const endAt = endAtValue ? parseLocalDateTime(endAtValue) : null
  const patientId = body.patient_id || null

  if (!title) {
    return { status: 400, body: { error: 'Event title is required.' } }
  }

  if (!startAtValue || !startAt || Number.isNaN(startAt.getTime())) {
    return { status: 400, body: { error: 'A valid start date is required.' } }
  }

  if (body.end_at && (!endAtValue || !endAt || Number.isNaN(endAt.getTime()))) {
    return { status: 400, body: { error: 'A valid end date is required.' } }
  }

  if (endAt && endAt <= startAt) {
    return { status: 400, body: { error: 'End time must be after start time.' } }
  }

  const supabase = input.supabase ?? createSupabaseAdminClient()
  const patientValidation = await validatePatientLink(supabase, input.actor.userId, patientId)
  if (patientValidation.response) return patientValidation.response

  const { data: existingEvent, error: existingEventError } = await supabase
    .from('student_planner_events')
    .select('id, source_kind')
    .eq('id', input.eventId)
    .eq('student_id', input.actor.userId)
    .maybeSingle()

  if (existingEventError) {
    return { status: 500, body: { error: logServerError('[student-planner] existingEventError', existingEventError.message) } }
  }

  if (!existingEvent) {
    return { status: 404, body: { error: 'Planner event not found.' } }
  }

  if (existingEvent.source_kind === CASE_APPOINTMENT_SOURCE_KIND) {
    return { status: 409, body: { error: 'Linked case appointments are managed from the case card.' } }
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from('student_planner_events')
    .update({
      title,
      description: encodeDescription(description, endAtValue),
      event_date: startAtValue,
      patient_id: patientId,
      stage_id: patientValidation.stageId,
      lifecycle_state: patientId ? 'active' : null,
    })
    .eq('id', input.eventId)
    .eq('student_id', input.actor.userId)
    .select(
      'id, title, description, event_date, patient_id, language, created_at, source_kind, source_case_id, stage_id, lifecycle_state'
    )
    .maybeSingle()

  if (updateError) {
    return { status: 500, body: { error: logServerError('[student-planner] updateError', updateError.message) } }
  }

  if (!updatedRow) {
    return { status: 404, body: { error: 'Planner event not found.' } }
  }

  const match = updatedRow.description?.match(END_MARKER_REGEX)
  const cleanDescription = updatedRow.description?.replace(END_MARKER_REGEX, '').trim() || null

  return {
    status: 200,
    body: {
      data: {
        id: updatedRow.id,
        title: updatedRow.title,
        description: cleanDescription,
        start_at: startAtValue,
        end_at: match?.[1] ?? endAtValue,
        patient_id: updatedRow.patient_id,
        language: updatedRow.language,
        created_at: updatedRow.created_at,
        source_kind: updatedRow.source_kind,
        source_case_id: updatedRow.source_case_id,
        stage_id: updatedRow.stage_id,
        lifecycle_state: updatedRow.lifecycle_state,
        linked_appointment_date: null,
        linked_appointment_time: null,
      },
    },
  }
}

export async function deleteStudentPlannerEvent(
  input: PlannerDeleteInput
): Promise<ServiceResponse> {
  const forbidden = ensureStudent(input.actor)
  if (forbidden) return forbidden

  const supabase = input.supabase ?? createSupabaseAdminClient()
  const { data: existingEvent, error: existingEventError } = await supabase
    .from('student_planner_events')
    .select('id, source_kind')
    .eq('id', input.eventId)
    .eq('student_id', input.actor.userId)
    .maybeSingle()

  if (existingEventError) {
    return { status: 500, body: { error: logServerError('[student-planner] existingEventError', existingEventError.message) } }
  }

  if (!existingEvent) {
    return { status: 404, body: { error: 'Planner event not found.' } }
  }

  if (existingEvent.source_kind === CASE_APPOINTMENT_SOURCE_KIND) {
    return { status: 409, body: { error: 'Linked case appointments are managed from the case card.' } }
  }

  const { data: deletedRow, error: deleteError } = await supabase
    .from('student_planner_events')
    .delete()
    .eq('id', input.eventId)
    .eq('student_id', input.actor.userId)
    .select('id')
    .maybeSingle()

  if (deleteError) {
    return { status: 500, body: { error: logServerError('[student-planner] deleteError', deleteError.message) } }
  }

  if (!deletedRow) {
    return { status: 404, body: { error: 'Planner event not found.' } }
  }

  return { status: 200, body: { success: true, data: { id: deletedRow.id } } }
}
