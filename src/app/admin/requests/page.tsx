import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { RequestsClient } from './requests-client'
import { canAccessFacultyPortal } from '@/lib/roles'

export default async function AdminRequestsPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !canAccessFacultyPortal(user.app_metadata?.role)) {
    redirect('/admin/login')
  }

  const { data } = await supabase
    .from('patient_requests')
    .select(
      'id, full_name, age, phone, preferred_language, treatment_type, complaint_text, urgency, status, assigned_department, target_student_level, created_at'
    )
    .order('created_at', { ascending: false })

  return (
    <RequestsClient
      initialRequests={data ?? []}
      adminEmail={user.email ?? ''}
    />
  )
}
