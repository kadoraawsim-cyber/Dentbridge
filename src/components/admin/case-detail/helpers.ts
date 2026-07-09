/**
 * Pure presentational helpers and option constants for the admin case detail
 * screen (Phase 8 extraction). Moved verbatim from detail-client.tsx; no
 * behavior change. Lifecycle rules still live in src/lib/cases/case-lifecycle.ts —
 * these helpers only shape labels, option lists, and the local activity log.
 */

import type { ActivityLogEntry, ActivityLogType, PatientRequest, StudentCaseRequest } from './types'

// Used to determine which lifecycle steps have been reached when rendering
// the status trail in the Lifecycle section.
export const STATUS_ORDER = [
  'submitted',
  'under_review',
  'matched',
  'student_approved',
  'contacted',
  'appointment_scheduled',
  'in_treatment',
  'faculty_review',
  'completed',
]

export const departmentOptions = [
  'Endodontics',
  'Oral & Maxillofacial Surgery',
  'Orthodontics',
  'Periodontology',
  'Restorative Dentistry',
  'Prosthodontics',
  'Pedodontics',
  'Oral Radiology',
]

export const studentLevelOptions = [
  'Year 4 Clinical Student',
  'Year 5 Clinical Student',
  'Specialist Dentist',
]

export function keywordRoutingHint(treatmentType: string, assignedDepartment: string | null) {
  if (assignedDepartment) return assignedDepartment

  const value = (treatmentType || '').toLowerCase()

  if (value.includes('root canal')) return 'Endodontics'
  if (value.includes('extraction')) return 'Oral & Maxillofacial Surgery'
  if (value.includes('gum')) return 'Periodontology'
  if (value.includes('orthodont')) return 'Orthodontics'
  if (value.includes('prosthetic') || value.includes('crown')) return 'Prosthodontics'
  if (value.includes('pediatric')) return 'Pedodontics'
  if (value.includes('esthetic') || value.includes('filling') || value.includes('cleaning'))
    return 'Restorative Dentistry'

  return 'Oral Radiology'
}

export function mapUrgencyToDetail(urgency: string) {
  switch ((urgency || '').toLowerCase()) {
    case 'high':
      return 'High (Emergency / Severe Pain)'
    case 'medium':
      return 'Medium (Discomfort)'
    case 'low':
      return 'Low (Routine)'
    default:
      return 'Medium (Discomfort)'
  }
}

export function mapDetailToUrgency(detail: string) {
  const d = (detail || '').toLowerCase()
  if (d.startsWith('high')) return 'High'
  if (d.startsWith('low')) return 'Low'
  return 'Medium'
}

export function makeLogEntry(
  type: ActivityLogType,
  timestamp: string,
  detail?: string | null
): ActivityLogEntry {
  return {
    id: `${type}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp,
    detail: detail ?? null,
  }
}

export function buildInitialActivityLog(
  request: PatientRequest,
  studentRequests: StudentCaseRequest[]
): ActivityLogEntry[] {
  const entries: ActivityLogEntry[] = []
  const status = (request.status || '').toLowerCase()

  if (request.reviewed_at && ['matched', 'student_approved', 'contacted', 'appointment_scheduled', 'in_treatment', 'completed'].includes(status)) {
    entries.push(makeLogEntry('case_released', request.reviewed_at, request.assigned_department))
  }

  for (const studentRequest of studentRequests) {
    if (studentRequest.created_at) {
      entries.push(makeLogEntry('student_request_submitted', studentRequest.created_at, studentRequest.student_email))
    }

    if (studentRequest.reviewed_at) {
      if (studentRequest.status === 'approved') {
        entries.push(makeLogEntry('student_request_approved', studentRequest.reviewed_at, studentRequest.student_email))
      }

      if (studentRequest.status === 'rejected') {
        entries.push(makeLogEntry('student_request_rejected', studentRequest.reviewed_at, studentRequest.student_email))
      }

      if (studentRequest.status === 'revoked') {
        entries.push(makeLogEntry('student_request_revoked', studentRequest.reviewed_at, studentRequest.student_email))
        entries.push(makeLogEntry('case_returned_to_pool', studentRequest.reviewed_at))
      }
    }
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
