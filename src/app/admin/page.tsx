import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { DashboardClient } from './dashboard-client'

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  const { data } = await supabase
    .from('patient_requests')
    .select('id, full_name, treatment_type, urgency, status, assigned_department, created_at')
    .order('created_at', { ascending: false })

  return (
    <DashboardClient
      initialRequests={data ?? []}
      adminEmail={user.email ?? ''}
    />
  )
}
