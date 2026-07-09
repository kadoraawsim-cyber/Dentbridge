/** View-model types for the admin dashboard (Phase 8 extraction). */

export type PatientRequest = {
  id: string
  full_name: string
  treatment_type: string
  urgency: string
  status: string | null
  assigned_department: string | null
  created_at: string | null
  reviewed_at: string | null
}

export type DepartmentCaseItem = {
  name: string
  count: number
  barWidth: number
}

export type DashboardStats = {
  newToday: number
  pendingReview: number
  activeTreatments: number
  total: number
  completed: number
  cancelled: number
  inTreatment: number
}
