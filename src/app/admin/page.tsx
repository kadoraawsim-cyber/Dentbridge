import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { DashboardClient } from './dashboard-client'
import { canAccessFacultyPortal } from '@/lib/roles'
import { assertQuerySucceeded } from '@/lib/data/data-load'
import { groupPendingRequests } from '@/lib/cases/pending-requests'

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !canAccessFacultyPortal(user.app_metadata?.role)) {
    redirect('/admin/login')
  }

  // Both reads use the caller's session client so faculty/admin RLS applies.
  // The pending-request rows never reach the browser: only the grouped,
  // identity-free aggregate is passed to the client component.
  const [requestsResult, pendingResult] = await Promise.all([
    supabase
      .from('patient_requests')
      .select('id, full_name, treatment_type, urgency, status, assigned_department, created_at, reviewed_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('student_case_requests')
      .select('case_id, status, created_at')
      .eq('status', 'pending'),
  ])
  assertQuerySucceeded(requestsResult.error, 'admin.dashboard.requests')
  assertQuerySucceeded(pendingResult.error, 'admin.dashboard.pendingStudentRequests')

  const pendingAggregate = groupPendingRequests(pendingResult.data ?? [])
  const pendingRequestCounts = Object.fromEntries(
    Object.entries(pendingAggregate.byCase).map(([caseId, summary]) => [caseId, summary.count])
  )

  return (
    <DashboardClient
      initialRequests={requestsResult.data ?? []}
      adminEmail={user.email ?? ''}
      currentRole={user.app_metadata?.role ?? null}
      pendingRequestCounts={pendingRequestCounts}
      totalPendingRequests={pendingAggregate.totalPending}
    />
  )
}
