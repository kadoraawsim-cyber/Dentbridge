export type PlannerView = 'month' | 'week' | 'day'

export type PlannerEvent = {
  /** `student_planner_events.id` is a bigint, so rows carry numeric ids at runtime. */
  id: number
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  patient_id: string | null
  language: string | null
  created_at: string | null
  source_kind: string | null
  source_case_id: string | null
  linked_appointment_date: string | null
  linked_appointment_time: string | null
}

export type ActivePatient = {
  id: string
  full_name: string
  treatment_type: string
  assigned_department: string | null
  status: string | null
}

export type PlannerFormState = {
  title: string
  description: string
  startAt: string
  endAt: string
  patientId: string
}
