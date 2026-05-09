import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
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

  const { data: myRequests } = await supabase
    .from('student_case_requests')
    .select('id, case_id, stage_id, status, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  const caseIds = (myRequests ?? []).map((r) => r.case_id)
  const stageIds = (myRequests ?? [])
    .map((r) => r.stage_id)
    .filter((id): id is string => Boolean(id))

  let caseMap: Record<string, CaseInfo> = {}
  let stageDeptMap: Record<string, string> = {}

  const [caseResult, stageResult] = await Promise.all([
    caseIds.length > 0
      ? supabase
          .from('patient_requests')
          .select('id, treatment_type, assigned_department, urgency, status, current_stage_id')
          .in('id', caseIds)
      : Promise.resolve(null),
    stageIds.length > 0
      ? supabase.from('case_routing_stages').select('id, department').in('id', stageIds)
      : Promise.resolve(null),
  ])

  caseMap = Object.fromEntries(
    (caseResult?.data ?? []).map((c) => [
      c.id,
      {
        treatment_type: c.treatment_type,
        assigned_department: c.assigned_department,
        urgency: c.urgency,
        caseStatus: c.status,
        current_stage_id: c.current_stage_id,
      },
    ])
  )

  stageDeptMap = Object.fromEntries(
    (stageResult?.data ?? []).map((s) => [s.id, s.department as string])
  )

  const stageAwareRequests = (myRequests ?? []).map((request) => {
    const currentStageId = caseMap[request.case_id]?.current_stage_id
    const isHistoricalStage =
      request.status === 'approved' &&
      Boolean(request.stage_id) &&
      Boolean(currentStageId) &&
      request.stage_id !== currentStageId
    const stage_dept = request.stage_id ? (stageDeptMap[request.stage_id] ?? null) : null

    return isHistoricalStage
      ? { ...request, status: 'revoked', stage_dept }
      : { ...request, stage_dept }
  })

  return (
    <RequestsClient
      myRequests={stageAwareRequests}
      caseMap={caseMap}
    />
  )
}
