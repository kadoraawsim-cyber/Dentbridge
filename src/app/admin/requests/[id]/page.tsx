import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { CaseDetailClient } from './detail-client'
import { canAccessFacultyPortal } from '@/lib/roles'

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !canAccessFacultyPortal(user.app_metadata?.role)) {
    redirect('/admin/login')
  }

  const { data, error } = await supabase
    .from('patient_requests')
    .select(
      'id, full_name, age, phone, preferred_language, treatment_type, complaint_text, urgency, preferred_days, consent, status, attachment_path, attachment_name, assigned_department, target_student_level, clinical_notes, reviewed_by, reviewed_at, created_at'
    )
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  // Fetch all student requests for this case so faculty can review and act on them.
  const { data: studentRequests } = await supabase
    .from('student_case_requests')
    .select('id, student_email, status, clinical_notes, reviewed_by, reviewed_at, created_at')
    .eq('case_id', id)
    .order('created_at', { ascending: false })

  const { data: progressEntries } = await supabase
    .from('case_progress_entries')
    .select(
      'id, case_id, student_id, student_name, status_at_time, appointment_date, appointment_time, note, what_was_done, next_step, next_appointment_date, next_appointment_time, needs_faculty_attention, created_at'
    )
    .eq('case_id', id)
    .order('created_at', { ascending: false })

  const studentEmails = Array.from(
    new Set((studentRequests ?? []).map((request) => request.student_email).filter(Boolean))
  )

  const studentOpenCaseCounts: Record<string, number> = {}

  if (studentEmails.length > 0) {
    const activeCaseStatuses = ['student_approved', 'contacted', 'appointment_scheduled', 'in_treatment']

    const { data: approvedStudentCases } = await supabase
      .from('student_case_requests')
      .select('student_email, case_id')
      .eq('status', 'approved')
      .in('student_email', studentEmails)

    const activeCaseIds = Array.from(
      new Set((approvedStudentCases ?? []).map((request) => request.case_id))
    )

    if (activeCaseIds.length > 0) {
      const { data: activeCases } = await supabase
        .from('patient_requests')
        .select('id')
        .in('id', activeCaseIds)
        .in('status', activeCaseStatuses)

      const activeCaseIdSet = new Set((activeCases ?? []).map((request) => request.id))

      for (const request of approvedStudentCases ?? []) {
        if (activeCaseIdSet.has(request.case_id)) {
          studentOpenCaseCounts[request.student_email] =
            (studentOpenCaseCounts[request.student_email] ?? 0) + 1
        }
      }
    }
  }

  return (
    <CaseDetailClient
      initialRequest={data}
      adminEmail={user.email ?? ''}
      initialStudentRequests={studentRequests ?? []}
      initialProgressEntries={progressEntries ?? []}
      studentOpenCaseCounts={studentOpenCaseCounts}
    />
  )
}
