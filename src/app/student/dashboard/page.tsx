import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  fetchStudentActiveCases,
  fetchStudentPoolCases,
} from '@/lib/cases/student-case-access'
import { DashboardClient } from './dashboard-client'
import type { ActiveCase, MyRequest, PoolCase, ProgressEntry } from '@/components/student/dashboard/types'

export default async function StudentDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'student') {
    redirect('/student/login')
  }

  // Pool and active-case reads go through allowlisted, current-stage-gated RPCs
  // (no direct patient_requests access). The pool RPC returns every matched case
  // ordered newest-first; the dashboard renders the 5 most recent and derives its
  // counts from the same result.
  const [studentProfileResult, poolCasesData, activeCasesData, myRequestsResult] =
    await Promise.all([
      supabase
        .from('student_profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle(),

      fetchStudentPoolCases(supabase),

      fetchStudentActiveCases(supabase),

      // All of this student's requests (for stats and pending count).
      supabase
        .from('student_case_requests')
        .select('id, case_id, stage_id, status, created_at')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false }),
    ])

  const { data: studentProfile } = studentProfileResult
  const { data: myRequests } = myRequestsResult

  const poolCases: PoolCase[] = poolCasesData.slice(0, 5).map((row) => ({
    id: row.id,
    treatment_type: row.treatment_type,
    urgency: row.urgency,
    assigned_department: row.assigned_department,
    target_student_level: row.target_student_level,
    created_at: row.created_at,
  }))
  const poolCaseCount = poolCasesData.length
  const urgentPoolCaseCount = poolCasesData.filter(
    (row) => (row.urgency ?? '').toLowerCase() === 'high'
  ).length

  // Active cases are exactly the caller's current-stage assignments (the RPC
  // enforces this), so no historical-stage filtering is needed here.
  let activeCases: ActiveCase[] = []
  const activeCaseIds = activeCasesData.map((row) => row.id)

  if (activeCaseIds.length > 0) {
    const { data: progressData } = await supabase
      .from('case_progress_entries')
      .select(
        'id, case_id, student_id, student_name, status_at_time, appointment_date, appointment_time, note, what_was_done, next_step, next_appointment_date, next_appointment_time, needs_faculty_attention, created_at'
      )
      .in('case_id', activeCaseIds)
      .order('created_at', { ascending: false })

    const progressEntriesByCase = new Map<string, ProgressEntry[]>()
    for (const entry of progressData ?? []) {
      const existing = progressEntriesByCase.get(entry.case_id) ?? []
      existing.push(entry)
      progressEntriesByCase.set(entry.case_id, existing)
    }

    activeCases = activeCasesData.map((row) => ({
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
      poolCases={poolCases}
      poolCaseCount={poolCaseCount}
      urgentPoolCaseCount={urgentPoolCaseCount}
      // status values are constrained by student_case_requests_status_check,
      // so narrowing the generated `string` to the MyRequest union is sound.
      myRequests={(myRequests ?? []) as MyRequest[]}
      activeCases={activeCases}
      studentEmail={user.email ?? ''}
      studentFullName={studentProfile?.full_name ?? ''}
      studentPhone={studentProfile?.phone ?? ''}
    />
  )
}
