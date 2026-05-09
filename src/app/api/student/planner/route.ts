import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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

async function getAuthorizedStudent() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { supabase, user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (user.app_metadata?.role !== 'student') {
    return { supabase, user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user, response: undefined as NextResponse | undefined }
}

async function validatePatientLink(
  supabase: ReturnType<typeof createSupabaseServerClient>,
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
      response: NextResponse.json({ error: requestError.message }, { status: 500 }),
      stageId: null as string | null,
    }
  }

  if (!approvedRequest) {
    return {
      response: NextResponse.json({ error: 'Selected patient is not available to link.' }, { status: 403 }),
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
      response: NextResponse.json({ error: patientError.message }, { status: 500 }),
      stageId: null as string | null,
    }
  }

  if (!activePatient) {
    return {
      response: NextResponse.json({ error: 'Selected patient is no longer active.' }, { status: 409 }),
      stageId: null as string | null,
    }
  }

  if (!isCurrentStageRequest(approvedRequest.stage_id, activePatient.current_stage_id)) {
    return {
      response: NextResponse.json(
        { error: 'Selected patient is no longer active for your stage.' },
        { status: 409 }
      ),
      stageId: null as string | null,
    }
  }

  return { stageId: activePatient.current_stage_id ?? approvedRequest.stage_id ?? null }
}

export async function GET() {
  const { supabase, user, response } = await getAuthorizedStudent()
  if (response) return response
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [plannerResult, requestsResult] = await Promise.all([
    supabase
      .from('student_planner_events')
      .select(
        'id, title, description, event_date, patient_id, language, created_at, source_kind, source_case_id, stage_id, lifecycle_state'
      )
      .eq('student_id', user.id)
      .order('event_date', { ascending: true }),

    supabase
      .from('student_case_requests')
      .select('case_id, stage_id')
      .eq('student_id', user.id)
      .eq('status', 'approved'),
  ])

  const { data: plannerRows, error: plannerError } = plannerResult
  const { data: approvedRequests, error: requestsError } = requestsResult

  if (plannerError) {
    return NextResponse.json({ error: plannerError.message }, { status: 500 })
  }

  if (requestsError) {
    return NextResponse.json({ error: requestsError.message }, { status: 500 })
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
    return NextResponse.json({ error: patientsResult.error.message }, { status: 500 })
  }

  activePatients = (patientsResult?.data ?? []).filter((patient) =>
    isCurrentStageRequest(approvedStageByCase.get(patient.id), patient.current_stage_id)
  )

  if (linkedAppointmentsResult?.error) {
    return NextResponse.json({ error: linkedAppointmentsResult.error.message }, { status: 500 })
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

  return NextResponse.json({
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
  })
}

export async function POST(request: NextRequest) {
  const { supabase, user, response } = await getAuthorizedStudent()
  if (response) return response
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    title?: string
    description?: string
    start_at?: string
    end_at?: string | null
    patient_id?: string | null
    language?: string | null
  }

  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
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
    return NextResponse.json({ error: 'Event title is required.' }, { status: 400 })
  }

  if (!startAtValue || !startAt || Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: 'A valid start date is required.' }, { status: 400 })
  }

  if (body.end_at && (!endAtValue || !endAt || Number.isNaN(endAt.getTime()))) {
    return NextResponse.json({ error: 'A valid end date is required.' }, { status: 400 })
  }

  if (endAt && endAt <= startAt) {
    return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 })
  }

  const patientValidation = await validatePatientLink(supabase, user.id, patientId)
  if (patientValidation.response) return patientValidation.response

  const { data: insertedRow, error: insertError } = await supabase
    .from('student_planner_events')
    .insert({
      student_id: user.id,
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
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { description: cleanDescription, endAt: parsedEndAt } = stripEndMarker(insertedRow.description)

  return NextResponse.json({
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
  })
}
