import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { DashboardClient } from './dashboard-client'

export default async function StudentDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'student') {
    redirect('/student/login')
  }

  const [studentProfileResult, poolCasesResult, urgentPoolCasesResult, myRequestsResult] =
    await Promise.all([
      supabase
        .from('student_profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle(),

      // Pool cases — full_name and phone intentionally excluded.
      // The dashboard only renders the 5 most recent pool cases; keep the
      // total count for stats without sending every matched case over the wire.
      supabase
        .from('patient_requests')
        .select(
          'id, treatment_type, urgency, assigned_department, target_student_level, created_at',
          { count: 'exact' }
        )
        .eq('status', 'matched')
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('patient_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'matched')
        .ilike('urgency', 'high'),

      // All of this student's requests (for stats and pending count).
      supabase
        .from('student_case_requests')
        .select('id, case_id, status, created_at')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false }),
    ])

  const { data: studentProfile } = studentProfileResult
  const { data: poolCases, count: poolCaseCount } = poolCasesResult
  const { count: urgentPoolCaseCount } = urgentPoolCasesResult
  const { data: myRequests } = myRequestsResult

  const approvedCaseIds = (myRequests ?? [])
    .filter((r) => r.status === 'approved')
    .map((r) => r.case_id)

  let activeCases: {
    caseId: string
    treatment_type: string
    assigned_department: string | null
    status: string
    full_name: string
    phone: string
    progressEntries: {
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
    }[]
  }[] = []

  if (approvedCaseIds.length > 0) {
    const [activeDataResult, progressDataResult] = await Promise.all([
      supabase
        .from('patient_requests')
        .select('id, treatment_type, assigned_department, status, full_name, phone')
        .in('id', approvedCaseIds),

      supabase
        .from('case_progress_entries')
        .select(
          'id, case_id, student_id, student_name, status_at_time, appointment_date, appointment_time, note, what_was_done, next_step, next_appointment_date, next_appointment_time, needs_faculty_attention, created_at'
        )
        .in('case_id', approvedCaseIds)
        .order('created_at', { ascending: false }),
    ])

    const { data: activeData } = activeDataResult
    const { data: progressData } = progressDataResult

    const progressEntriesByCase = new Map<
      string,
      {
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
      }[]
    >()

    for (const entry of progressData ?? []) {
      const existing = progressEntriesByCase.get(entry.case_id) ?? []
      existing.push(entry)
      progressEntriesByCase.set(entry.case_id, existing)
    }

    activeCases = (activeData ?? []).map((row) => ({
      caseId: row.id,
      treatment_type: row.treatment_type,
      assigned_department: row.assigned_department,
      status: row.status,
      full_name: row.full_name,
      phone: row.phone,
      progressEntries: progressEntriesByCase.get(row.id) ?? [],
    }))
  }

  return (
    <DashboardClient
      poolCases={poolCases ?? []}
      poolCaseCount={poolCaseCount ?? poolCases?.length ?? 0}
      urgentPoolCaseCount={urgentPoolCaseCount ?? 0}
      myRequests={myRequests ?? []}
      activeCases={activeCases}
      studentEmail={user.email ?? ''}
      studentFullName={studentProfile?.full_name ?? ''}
      studentPhone={studentProfile?.phone ?? ''}
    />
  )
}
