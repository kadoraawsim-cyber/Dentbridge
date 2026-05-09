import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type SupabaseClient = ReturnType<typeof createSupabaseServerClient>

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
      .select('status, current_stage_id, assigned_department')
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
      currentCase,
      stageId: stageId as string | null,
      stageDepartment,
    },
    response: null,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  let note: string
  let whatWasDone: string | undefined
  let nextStep: string | undefined
  let nextAppointmentDate: string | undefined
  let nextAppointmentTime: string | undefined

  try {
    const body = (await request.json()) as {
      note?: string
      what_was_done?: string
      next_step?: string
      next_appointment_date?: string
      next_appointment_time?: string
    }

    note = typeof body.note === 'string' ? body.note.trim() : ''
    whatWasDone = typeof body.what_was_done === 'string' ? body.what_was_done.trim() : undefined
    nextStep = typeof body.next_step === 'string' ? body.next_step.trim() : undefined
    nextAppointmentDate =
      typeof body.next_appointment_date === 'string' ? body.next_appointment_date : undefined
    nextAppointmentTime =
      typeof body.next_appointment_time === 'string' ? body.next_appointment_time : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!note) {
    return NextResponse.json({ error: 'Progress note is required.' }, { status: 400 })
  }

  if (nextAppointmentDate && !isValidDate(nextAppointmentDate)) {
    return NextResponse.json({ error: 'Next appointment date is invalid.' }, { status: 400 })
  }

  if (nextAppointmentTime && !isValidTime(nextAppointmentTime)) {
    return NextResponse.json({ error: 'Next appointment time is invalid.' }, { status: 400 })
  }

  const { context, response } = await getAuthorizedStageContext({
    supabase,
    caseId: id,
    studentId: user.id,
  })

  if (response) return response
  if (!context) {
    return NextResponse.json({ error: 'Unable to load case context.' }, { status: 500 })
  }

  if (context.currentCase.status !== 'in_treatment') {
    return NextResponse.json(
      { error: 'Progress notes can only be added while the case is in treatment.' },
      { status: 409 }
    )
  }

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const { data: progressEntry, error: insertError } = await supabase
    .from('case_progress_entries')
    .insert({
      case_id: id,
      student_id: user.id,
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
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { progressEntry } })
}
