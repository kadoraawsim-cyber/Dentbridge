export type PlannerView = 'month' | 'week' | 'day'

export type PlannerEvent = {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  patient_id: string | null
  language: string | null
  created_at: string
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
  status: string
}

export type PlannerFormState = {
  title: string
  description: string
  startAt: string
  endAt: string
  patientId: string
}
