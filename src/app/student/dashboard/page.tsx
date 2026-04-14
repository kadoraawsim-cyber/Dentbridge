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

  // Fetch pool cases — full_name and phone intentionally excluded.
  // Students browsing the pool must not see patient identity before approval.
  const { data: poolCases } = await supabase
    .from('patient_requests')
    .select(
      'id, treatment_type, urgency, assigned_department, target_student_level, created_at'
    )
    .eq('status', 'matched')
    .order('created_at', { ascending: false })

  // Fetch this student's own requests so the dashboard can show real counts.
  const { data: myRequests } = await supabase
    .from('student_case_requests')
    .select('id, case_id, status, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardClient
      poolCases={poolCases ?? []}
      myRequests={myRequests ?? []}
      studentEmail={user.email ?? ''}
    />
  )
}
