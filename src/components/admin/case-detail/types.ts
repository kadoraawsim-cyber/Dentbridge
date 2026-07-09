/**
 * View-model types for the admin case detail screen (Phase 8 extraction).
 *
 * These mirror the row shapes the server component selects and are shared by
 * the case detail container and its presentational section components. They
 * are UI types only — API contracts and database schema are unchanged.
 */

export type StudentCaseRequest = {
  id: string
  student_email: string
  status: string
  stage_id?: string | null
  clinical_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export type PatientRequest = {
  id: string
  full_name: string
  age: number | null
  gender: string | null
  phone: string
  preferred_language: string | null
  treatment_type: string
  complaint_text: string
  urgency: string
  preferred_days: string | null
  pain_score: number | null
  symptom_duration: string | null
  contact_method: string | null
  best_contact_time: string | null
  medical_condition: string | null
  consent: boolean
  status: string
  attachment_path: string | null
  attachment_name: string | null
  attachment_file_id: string | null
  assigned_department: string | null
  target_student_level: string | null
  clinical_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  routing_completed_at?: string | null
  created_at: string | null
}

export type CaseProgressEntry = {
  id: string
  case_id: string
  stage_id?: string | null
  department_at_time?: string | null
  student_id: string
  student_name: string | null
  status_at_time: string
  appointment_date: string | null
  appointment_time: string | null
  note: string | null
  what_was_done: string | null
  next_step: string | null
  next_appointment_date: string | null
  next_appointment_time: string | null
  needs_faculty_attention: boolean
  created_at: string
}

export type CaseRoutingStage = {
  id: string
  case_id: string
  sequence: number
  department: string
  target_student_level: string | null
  status: string
  faculty_notes: string | null
  student_request_id: string | null
  student_id: string | null
  student_email: string | null
  released_by: string | null
  released_at: string | null
  assigned_by: string | null
  assigned_at: string | null
  stage_submitted_by: string | null
  stage_submitted_at: string | null
  stage_reviewed_by: string | null
  stage_reviewed_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export type ActivityLogType =
  | 'case_released'
  | 'student_request_submitted'
  | 'student_request_approved'
  | 'student_request_rejected'
  | 'student_request_revoked'
  | 'rejection_undone'
  | 'department_changed'
  | 'clinical_notes_updated'
  | 'case_returned_to_pool'
  | 'case_cancelled'

export type ActivityLogEntry = {
  id: string
  type: ActivityLogType
  timestamp: string
  detail?: string | null
}
