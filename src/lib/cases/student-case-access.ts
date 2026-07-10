import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

/**
 * Student case read-access wrappers (release fix lane).
 *
 * Students no longer read `patient_requests` (or its routing stages) directly.
 * All student-facing case reads go through allowlisted SECURITY DEFINER RPCs
 * that (a) project only non-identifying pool fields, and (b) gate contact /
 * clinical / progress detail on CURRENT-stage assignment. These wrappers are the
 * single client-side entry point to those RPCs so the projection shape stays in
 * one place and is unit-testable.
 *
 * The RPCs authorize the caller from `auth.uid()` / the JWT role claim on the
 * database side; these wrappers pass no identity of their own.
 */

type StudentSupabaseClient = SupabaseClient<Database>

export interface StudentPoolCase {
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
  has_attachment: boolean
}

export interface StudentActiveCase {
  id: string
  treatment_type: string
  assigned_department: string | null
  status: string | null
  full_name: string
  phone: string
  current_stage_id: string | null
}

export interface StudentRequestedCase {
  request_id: string
  case_id: string
  stage_id: string | null
  request_status: string
  effective_status: string
  created_at: string
  treatment_type: string
  assigned_department: string | null
  urgency: string
  case_status: string | null
  current_stage_id: string | null
  stage_department: string | null
}

export async function fetchStudentPoolCases(
  supabase: StudentSupabaseClient
): Promise<StudentPoolCase[]> {
  const { data, error } = await supabase.rpc('student_pool_cases')
  if (error) {
    console.error('[student-case-access] student_pool_cases failed', { error: error.message })
    return []
  }
  return (data ?? []) as StudentPoolCase[]
}

export async function fetchStudentActiveCases(
  supabase: StudentSupabaseClient
): Promise<StudentActiveCase[]> {
  const { data, error } = await supabase.rpc('student_active_cases')
  if (error) {
    console.error('[student-case-access] student_active_cases failed', { error: error.message })
    return []
  }
  return (data ?? []) as StudentActiveCase[]
}

export async function fetchStudentRequestedCases(
  supabase: StudentSupabaseClient
): Promise<StudentRequestedCase[]> {
  const { data, error } = await supabase.rpc('student_requested_case_overview')
  if (error) {
    console.error('[student-case-access] student_requested_case_overview failed', {
      error: error.message,
    })
    return []
  }
  return (data ?? []) as StudentRequestedCase[]
}
