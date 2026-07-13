import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { fetchStudentRequestedCases } from '@/lib/cases/student-case-access'
import { RequestsClient } from './requests-client'

export type RequestRow = {
  id: string
  case_id: string
  stage_id: string | null
  stage_dept: string | null
  status: string
  created_at: string
}

export type CaseInfo = {
  treatment_type: string
  assigned_department: string | null
  urgency: string
  caseStatus: string | null
  current_stage_id: string | null
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

  // The overview RPC returns the caller's own requests joined to non-identifying
  // case fields and the request's stage department. It also downgrades the
  // effective status to 'revoked' when the request's stage is no longer the
  // case's current stage, so a handed-off student cannot appear to retain access.
  const overview = await fetchStudentRequestedCases(supabase)

  const myRequests: RequestRow[] = overview.map((row) => ({
    id: row.request_id,
    case_id: row.case_id,
    stage_id: row.stage_id,
    stage_dept: row.stage_department,
    status: row.effective_status,
    created_at: row.created_at,
  }))

  const caseMap: Record<string, CaseInfo> = {}
  for (const row of overview) {
    caseMap[row.case_id] = {
      treatment_type: row.treatment_type,
      assigned_department: row.assigned_department,
      urgency: row.urgency,
      caseStatus: row.case_status,
      current_stage_id: row.current_stage_id,
    }
  }

  return <RequestsClient myRequests={myRequests} caseMap={caseMap} />
}
