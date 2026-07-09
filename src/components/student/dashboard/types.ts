import type { StudentCaseAction } from '@/lib/cases/case-lifecycle'

export type PoolCase = {
  id: string
  treatment_type: string
  urgency: string
  assigned_department: string | null
  target_student_level: string | null
  created_at: string | null
}

export type MyRequest = {
  id: string
  case_id: string
  stage_id?: string | null
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  created_at: string
}

export type ProgressEntry = {
  id: string
  case_id: string
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

export type ActiveCase = {
  caseId: string
  treatment_type: string
  assigned_department: string | null
  status: string | null
  full_name: string
  phone: string
  progressEntries: ProgressEntry[]
}

export type LiveActiveCase = ActiveCase & {
  liveStatus: string
  progressEntries: ProgressEntry[]
}

export type ProgressComposerMode = 'appointment' | 'treatment_start' | 'progress_note' | 'reschedule'

export type ProgressFormValues = {
  appointmentDate: string
  appointmentTime: string
  note: string
  whatWasDone: string
  nextStep: string
  nextAppointmentDate: string
  nextAppointmentTime: string
}

/**
 * Student dashboard actions: every student case action except rescheduling,
 * which has its own dedicated composer flow. Derived from the Phase 7 state
 * machine so new actions cannot silently diverge from the source of truth.
 */
export type LifecycleAction = Exclude<StudentCaseAction, 'reschedule_appointment'>

export type DashboardUiText = {
  heroHeading: string
  nextAction: string
  nothingUrgent: string
  contactPatient: string
  confirmAppointment: string
  startTreatment: string
  studentProfile: string
  phoneOnFile: string
  notAdded: string
  callNow: string
  copyNumber: string
  copied: string
  activePatients: string
  activePatientsDesc: string
  completedCases: string
  completedCasesDesc: string
  viewCompleted: string
  noCompletedCases: string
  caseReference: string
  completedStatus: string
  completedDate: string
  notRecorded: string
  departmentFallback: string
  noImmediateAction: string
  continueWork: string
  manageAssignedCases: string
  pendingSummary: string
  pendingSummaryDesc: string
  initialRequest: string
  changePhoto: string
  removePhoto: string
  photoSaving: string
}

export type DashboardStats = {
  available: number
  urgent: number
  pending: number
  completed: number
}

export type DashboardStep = {
  label: string
  step: number
}

export type CompletedCasesByDepartment = {
  department: string
  cases: LiveActiveCase[]
}
