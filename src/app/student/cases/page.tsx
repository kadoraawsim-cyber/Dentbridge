import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { CasesClient } from './cases-client'

export type PoolCase = {
  id: string
  age: number | null
  city: string | null
  treatment_type: string
  complaint_text: string | null
  urgency: string
  assigned_department: string | null
  target_student_level: string | null
  pain_score: number | null
  preferred_days: string | null
  symptom_duration: string | null
  medical_condition: string | null
  created_at: string | null
  attachment_path: string | null
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

  // Fetch pool cases — full_name and phone intentionally excluded.
  // Students must not see patient identity until their request is approved.
  const { data: casesData } = await supabase
    .from('patient_requests')
    .select(
      'id, age, city, treatment_type, complaint_text, urgency, assigned_department, target_student_level, pain_score, preferred_days, symptom_duration, medical_condition, created_at, attachment_path'
    )
    .eq('status', 'matched')
    .order('created_at', { ascending: false })

  // Fetch this student's own requests across all cases.
  const { data: myRequestsData } = await supabase
    .from('student_case_requests')
    .select('id, case_id, status, created_at')
    .eq('student_id', user.id)

  // Build a map of case_id → { requestId, status } for O(1) lookups in the client.
  const requestsByCaseId: Record<string, RequestInfo> = {}
  for (const req of myRequestsData ?? []) {
    requestsByCaseId[req.case_id] = {
      requestId: req.id,
      status: req.status as RequestInfo['status'],
    }
  }

  // For approved cases, fetch contact details (full_name + phone).
  // This fetch runs server-side — these values are never directly exposed to
  // the browser via the Supabase client. They are passed as pre-rendered props.
  const approvedCaseIds = Object.entries(requestsByCaseId)
    .filter(([, r]) => r.status === 'approved')
    .map(([caseId]) => caseId)

  const contactDetails: Record<string, ContactInfo> = {}
  if (approvedCaseIds.length > 0) {
    const { data: contactData } = await supabase
      .from('patient_requests')
      .select('id, full_name, phone')
      .in('id', approvedCaseIds)

    for (const c of contactData ?? []) {
      contactDetails[c.id] = {
        full_name: (c as { id: string; full_name: string; phone: string }).full_name,
        phone: (c as { id: string; full_name: string; phone: string }).phone,
      }
    }
  }

  return (
    <CasesClient
      initialCases={(casesData ?? []) as PoolCase[]}
      requestsByCaseId={requestsByCaseId}
      contactDetails={contactDetails}
    />
  )
}
