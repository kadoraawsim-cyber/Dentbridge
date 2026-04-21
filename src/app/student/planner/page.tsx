import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { PlannerClient } from './planner-client'

export default async function StudentPlannerPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'student') {
    redirect('/student/login')
  }

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <PlannerClient
      studentEmail={user.email ?? ''}
      studentFullName={studentProfile?.full_name ?? ''}
    />
  )
}
