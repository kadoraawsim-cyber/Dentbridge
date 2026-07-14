import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { RequestsClient } from './requests-client'
import { canAccessFacultyPortal } from '@/lib/roles'
import { assertQuerySucceeded } from '@/lib/data/data-load'
import { groupPendingRequests } from '@/lib/cases/pending-requests'
import { resolveWorkflowTab } from './workflow-tabs'

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const initialTab = resolveWorkflowTab(tab)

  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !canAccessFacultyPortal(user.app_metadata?.role)) {
    redirect('/admin/login')
  }

  // Both reads use the caller's session client (faculty/admin RLS). Pending
  // student-request rows are grouped server-side; the client receives only
  // per-case counts and oldest-pending timestamps, never student identities.
  const [requestsResult, pendingResult] = await Promise.all([
    supabase
      .from('patient_requests')
      .select(
        'id, full_name, age, phone, preferred_language, treatment_type, complaint_text, urgency, status, assigned_department, target_student_level, created_at'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('student_case_requests')
      .select('case_id, status, created_at')
      .eq('status', 'pending'),
  ])
  assertQuerySucceeded(requestsResult.error, 'admin.requests.list')
  assertQuerySucceeded(pendingResult.error, 'admin.requests.pendingStudentRequests')

  const pendingAggregate = groupPendingRequests(pendingResult.data ?? [])

  return (
    <RequestsClient
      initialRequests={requestsResult.data ?? []}
      adminEmail={user.email ?? ''}
      pendingByCase={pendingAggregate.byCase}
      initialTab={initialTab}
    />
  )
}
