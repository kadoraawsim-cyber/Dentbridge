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
    return null
  }

  const { data: approvedRequest, error: requestError } = await supabase
    .from('student_case_requests')
    .select('case_id')
    .eq('student_id', studentId)
    .eq('status', 'approved')
    .eq('case_id', patientId)
    .maybeSingle()

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 })
  }

  if (!approvedRequest) {
    return NextResponse.json({ error: 'Selected patient is not available to link.' }, { status: 403 })
  }

  const { data: activePatient, error: patientError } = await supabase
    .from('patient_requests')
    .select('id')
    .eq('id', patientId)
    .in('status', ACTIVE_CASE_STATUSES)
    .maybeSingle()

  if (patientError) {
    return NextResponse.json({ error: patientError.message }, { status: 500 })
  }

  if (!activePatient) {
    return NextResponse.json({ error: 'Selected patient is no longer active.' }, { status: 409 })
  }

  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
  }

  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const title = (body.title || '').trim()
  const description = (body.description || '').trim() || null
  const startAt = body.start_at ? new Date(body.start_at) : null
  const endAt = body.end_at ? new Date(body.end_at) : null
  const patientId = body.patient_id || null

  if (!title) {
    return NextResponse.json({ error: 'Event title is required.' }, { status: 400 })
  }

  if (!startAt || Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: 'A valid start date is required.' }, { status: 400 })
  }

  if (endAt && Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: 'A valid end date is required.' }, { status: 400 })
  }

  if (endAt && endAt <= startAt) {
    return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 })
  }

  const patientValidationError = await validatePatientLink(supabase, user.id, patientId)
  if (patientValidationError) return patientValidationError

  const { data: existingEvent, error: existingEventError } = await supabase
    .from('student_planner_events')
    .select('id, source_kind')
    .eq('id', id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existingEventError) {
    return NextResponse.json({ error: existingEventError.message }, { status: 500 })
  }

  if (!existingEvent) {
    return NextResponse.json({ error: 'Planner event not found.' }, { status: 404 })
  }

  if (existingEvent.source_kind === CASE_APPOINTMENT_SOURCE_KIND) {
    return NextResponse.json({ error: 'Linked case appointments are managed from the case card.' }, { status: 409 })
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from('student_planner_events')
    .update({
      title,
      description: encodeDescription(description, endAt ? endAt.toISOString() : null),
      event_date: startAt.toISOString(),
      patient_id: patientId,
    })
    .eq('id', id)
    .eq('student_id', user.id)
    .select(
      'id, title, description, event_date, patient_id, language, created_at, source_kind, source_case_id'
    )
    .maybeSingle()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (!updatedRow) {
    return NextResponse.json({ error: 'Planner event not found.' }, { status: 404 })
  }

  const match = updatedRow.description?.match(END_MARKER_REGEX)
  const cleanDescription = updatedRow.description?.replace(END_MARKER_REGEX, '').trim() || null

  return NextResponse.json({
    data: {
      id: updatedRow.id,
      title: updatedRow.title,
      description: cleanDescription,
      start_at: updatedRow.event_date,
      end_at: match?.[1] ?? null,
      patient_id: updatedRow.patient_id,
      language: updatedRow.language,
      created_at: updatedRow.created_at,
      source_kind: updatedRow.source_kind,
      source_case_id: updatedRow.source_case_id,
      linked_appointment_date: null,
      linked_appointment_time: null,
    },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user, response } = await getAuthorizedStudent()
  if (response) return response
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: existingEvent, error: existingEventError } = await supabase
    .from('student_planner_events')
    .select('id, source_kind')
    .eq('id', id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existingEventError) {
    return NextResponse.json({ error: existingEventError.message }, { status: 500 })
  }

  if (!existingEvent) {
    return NextResponse.json({ error: 'Planner event not found.' }, { status: 404 })
  }

  if (existingEvent.source_kind === CASE_APPOINTMENT_SOURCE_KIND) {
    return NextResponse.json({ error: 'Linked case appointments are managed from the case card.' }, { status: 409 })
  }

  const { data: deletedRow, error: deleteError } = await supabase
    .from('student_planner_events')
    .delete()
    .eq('id', id)
    .eq('student_id', user.id)
    .select('id')
    .maybeSingle()

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (!deletedRow) {
    return NextResponse.json({ error: 'Planner event not found.' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: { id: deletedRow.id } })
}
