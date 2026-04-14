import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { CaseDetailClient } from './detail-client'

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

  if (!user || user.app_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  const { data, error } = await supabase
    .from('patient_requests')
    .select(
      'id, full_name, age, phone, city, preferred_language, treatment_type, complaint_text, urgency, preferred_days, consent, status, attachment_path, attachment_name, assigned_department, target_student_level, clinical_notes, reviewed_by, reviewed_at, created_at'
    )
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return (
    <CaseDetailClient
      initialRequest={data}
      adminEmail={user.email ?? ''}
    />
  )
}
