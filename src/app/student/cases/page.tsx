import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  fetchStudentActiveCases,
  fetchStudentPoolCases,
} from '@/lib/cases/student-case-access'
import { CasesClient } from './cases-client'

export type PoolCase = {
  id: string
  age: number | null
  treatment_type: string
  complaint_text: string | null
  urgency: string
  assigned_department: string | null
  target_student_level: string | null
  pain_score: number | null
  preferred_days: string | null
  symptom_duration: string | null
  medical_condition: string | null
  clinical_notes: string | null
  created_at: string | null
  // Raw storage path is never sent to the browser; only presence is exposed.
  has_attachment: boolean
}

export type RequestInfo = {
  requestId: string
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
}

export type ContactInfo = {
  full_name: string
  phone: string
}

export default async function StudentCasesPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'student') {
    redirect('/student/login')
  }

  // Pool cases come from an allowlisted RPC that projects only non-identifying
  // fields (no full_name/phone/attachment path). Contact/clinical detail for the
  // student's own current-stage cases comes from a separate current-stage-gated
  // RPC. My-requests are the caller's own rows (own-row RLS still applies).
  const [poolCases, activeCases, myRequestsResult] = await Promise.all([
    fetchStudentPoolCases(supabase),
    fetchStudentActiveCases(supabase),
    supabase
      .from('student_case_requests')
      .select('id, case_id, status, created_at')
      .eq('student_id', user.id),
  ])

  const { data: myRequestsData } = myRequestsResult

  // Build a map of case_id → { requestId, status } for O(1) lookups in the client.
  const requestsByCaseId: Record<string, RequestInfo> = {}
  for (const req of myRequestsData ?? []) {
    requestsByCaseId[req.case_id] = {
      requestId: req.id,
      status: req.status as RequestInfo['status'],
    }
  }

  // Contact details are limited to the student's current-stage active cases.
  // A student who has been handed off (previous stage) receives no row here.
  const contactDetails: Record<string, ContactInfo> = {}
  for (const activeCase of activeCases) {
    contactDetails[activeCase.id] = {
      full_name: activeCase.full_name,
      phone: activeCase.phone,
    }
  }

  return (
    <CasesClient
      initialCases={poolCases as PoolCase[]}
      requestsByCaseId={requestsByCaseId}
      contactDetails={contactDetails}
    />
  )
}
