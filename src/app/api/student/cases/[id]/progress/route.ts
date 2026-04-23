import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

function isValidDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function isValidTime(value: string | undefined) {
  return Boolean(value && /^\d{2}:\d{2}(:\d{2})?$/.test(value))
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

  const { data: currentCase, error: currentCaseError } = await supabase
    .from('patient_requests')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  if (currentCaseError) {
    return NextResponse.json({ error: currentCaseError.message }, { status: 500 })
  }

  if (!currentCase) {
    return NextResponse.json({ error: 'Case not found.' }, { status: 404 })
  }

  if (currentCase.status !== 'in_treatment') {
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
      status_at_time: currentCase.status,
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
