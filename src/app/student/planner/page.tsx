import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { PlannerClient } from './planner-client'

const ACTIVE_CASE_STATUSES = [
  'student_approved',
  'contacted',
  'appointment_scheduled',
  'in_treatment',
]

const END_MARKER_REGEX = /\n?\[\[planner_end:([^\]]+)\]\]\s*$/
const CASE_APPOINTMENT_SOURCE_KIND = 'case_appointment'

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

function isCurrentStageRequest(
  requestStageId: string | null | undefined,
  currentStageId: string | null | undefined
) {
  return !requestStageId || !currentStageId || requestStageId === currentStageId
}

export default async function StudentPlannerPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'student') {
    redirect('/student/login')
  }

  const [profileResult, plannerResult, requestsResult] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle(),
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

  const plannerRows = plannerResult.data ?? []
  const approvedRequests = requestsResult.data ?? []

  const approvedCaseIds = approvedRequests.map((row) => row.case_id)
  const approvedStageByCase = new Map(
    approvedRequests.map((row) => [row.case_id, row.stage_id as string | null])
  )
  const linkedCaseIds = Array.from(
    new Set(
      plannerRows
        .filter((row) => row.source_kind === CASE_APPOINTMENT_SOURCE_KIND && row.source_case_id)
        .map((row) => row.source_case_id as string)
    )
  )

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

  const activePatients = (patientsResult?.data ?? []).filter((patient) =>
    isCurrentStageRequest(approvedStageByCase.get(patient.id), patient.current_stage_id)
  )

  const latestLinkedAppointmentsByCase = new Map<
    string,
    { appointment_date: string | null; appointment_time: string | null }
  >()
  const latestLinkedAppointmentsByStage = new Map<
    string,
    { appointment_date: string | null; appointment_time: string | null }
  >()

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

  const initialEvents = plannerRows.map((row) => {
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
      linked_appointment_date: linkedAppointment?.appointment_date ?? null,
      linked_appointment_time: linkedAppointment?.appointment_time ?? null,
    }
  })

  return (
    <PlannerClient
      studentEmail={user.email ?? ''}
      studentFullName={profileResult.data?.full_name ?? ''}
      initialEvents={initialEvents}
      initialActivePatients={activePatients}
    />
  )
}
