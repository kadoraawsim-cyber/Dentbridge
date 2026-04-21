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

export async function GET() {
  const { supabase, user, response } = await getAuthorizedStudent()
  if (response) return response
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: plannerRows, error: plannerError } = await supabase
    .from('student_planner_events')
    .select('id, title, description, event_date, patient_id, language, created_at')
    .eq('student_id', user.id)
    .order('event_date', { ascending: true })

  if (plannerError) {
    return NextResponse.json({ error: plannerError.message }, { status: 500 })
  }

  const { data: approvedRequests, error: requestsError } = await supabase
    .from('student_case_requests')
    .select('case_id')
    .eq('student_id', user.id)
    .eq('status', 'approved')

  if (requestsError) {
    return NextResponse.json({ error: requestsError.message }, { status: 500 })
  }

  const approvedCaseIds = (approvedRequests ?? []).map((row) => row.case_id)
  let activePatients: Array<{
    id: string
    full_name: string
    treatment_type: string
    assigned_department: string | null
    status: string
  }> = []

  if (approvedCaseIds.length > 0) {
    const { data: patientRows, error: patientsError } = await supabase
      .from('patient_requests')
      .select('id, full_name, treatment_type, assigned_department, status')
      .in('id', approvedCaseIds)
      .in('status', ACTIVE_CASE_STATUSES)
      .order('created_at', { ascending: false })

    if (patientsError) {
      return NextResponse.json({ error: patientsError.message }, { status: 500 })
    }

    activePatients = patientRows ?? []
  }

  return NextResponse.json({
    data: {
      events: (plannerRows ?? []).map((row) => {
        const { description, endAt } = stripEndMarker(row.description)
        return {
          id: row.id,
          title: row.title,
          description,
          start_at: row.event_date,
          end_at: endAt,
          patient_id: row.patient_id,
          language: row.language,
          created_at: row.created_at,
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
  const startAt = body.start_at ? new Date(body.start_at) : null
  const endAt = body.end_at ? new Date(body.end_at) : null
  const patientId = body.patient_id || null
  const language = body.language === 'tr' || body.language === 'en' ? body.language : null

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

  if (patientId) {
    const { data: approvedRequest, error: requestError } = await supabase
      .from('student_case_requests')
      .select('case_id')
      .eq('student_id', user.id)
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
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from('student_planner_events')
    .insert({
      student_id: user.id,
      title,
      description: encodeDescription(description, endAt ? endAt.toISOString() : null),
      event_date: startAt.toISOString(),
      patient_id: patientId,
      language,
    })
    .select('id, title, description, event_date, patient_id, language, created_at')
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
      start_at: insertedRow.event_date,
      end_at: parsedEndAt,
      patient_id: insertedRow.patient_id,
      language: insertedRow.language,
      created_at: insertedRow.created_at,
    },
  })
}
