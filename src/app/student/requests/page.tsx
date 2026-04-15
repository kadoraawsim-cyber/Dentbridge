import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { RequestsClient } from './requests-client'

export type RequestRow = {
  id: string
  case_id: string
  status: string
  created_at: string
}

export type CaseInfo = {
  treatment_type: string
  assigned_department: string | null
  urgency: string
  city: string | null
  caseStatus: string | null
}

export default async function StudentRequestsPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'student') {
    redirect('/student/login')
  }

  const { data: myRequests } = await supabase
    .from('student_case_requests')
    .select('id, case_id, status, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  const caseIds = (myRequests ?? []).map((r) => r.case_id)

  let caseMap: Record<string, CaseInfo> = {}

  if (caseIds.length > 0) {
    const { data: caseRows } = await supabase
      .from('patient_requests')
      .select('id, treatment_type, assigned_department, urgency, city, status')
      .in('id', caseIds)

    caseMap = Object.fromEntries(
      (caseRows ?? []).map((c) => [
        c.id,
        {
          treatment_type: c.treatment_type,
          assigned_department: c.assigned_department,
          urgency: c.urgency,
          city: c.city,
          caseStatus: c.status,
        },
      ])
    )
  }

  return (
    <RequestsClient
      myRequests={myRequests ?? []}
      caseMap={caseMap}
    />
  )
}
