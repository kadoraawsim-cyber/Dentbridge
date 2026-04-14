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

  // Pool cases — full_name and phone intentionally excluded.
  const { data: poolCases } = await supabase
    .from('patient_requests')
    .select(
      'id, treatment_type, urgency, assigned_department, target_student_level, created_at'
    )
    .eq('status', 'matched')
    .order('created_at', { ascending: false })

  // All of this student's requests (for stats and pending count).
  const { data: myRequests } = await supabase
    .from('student_case_requests')
    .select('id, case_id, status, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  // Active cases: student_case_requests rows where this student was approved.
  // We join the corresponding patient_requests to get current lifecycle status
  // and — server-side only — the patient's name and phone for approved students.
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
  }[] = []

  if (approvedCaseIds.length > 0) {
    const { data: activeData } = await supabase
      .from('patient_requests')
      .select('id, treatment_type, assigned_department, status, full_name, phone')
      .in('id', approvedCaseIds)

    activeCases = (activeData ?? []).map((row) => ({
      caseId: row.id,
      treatment_type: row.treatment_type,
      assigned_department: row.assigned_department,
      status: row.status,
      full_name: row.full_name,
      phone: row.phone,
    }))
  }

  return (
    <DashboardClient
      poolCases={poolCases ?? []}
      myRequests={myRequests ?? []}
      activeCases={activeCases}
      studentEmail={user.email ?? ''}
    />
  )
}
