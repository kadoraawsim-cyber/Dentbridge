export type CaseTimelineKind = 'system' | 'appointment' | 'progress' | 'closure'

export type CaseTimelinePatientRequest = {
  id: string
  status: string
  created_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  routing_completed_at?: string | null
}

export type CaseTimelineStudentRequest = {
  id: string
  student_email: string
  status: string
  stage_id?: string | null
  reviewed_at: string | null
  created_at: string
}

export type CaseTimelineProgressEntry = {
  id: string
  stage_id?: string | null
  department_at_time?: string | null
  status_at_time: string
  appointment_date: string | null
  appointment_time: string | null
  note: string | null
  what_was_done: string | null
  next_step: string | null
  next_appointment_date: string | null
  next_appointment_time: string | null
  student_name: string | null
  created_at: string
}

export type CaseTimelineRoutingStage = {
  id: string
  sequence: number
  department: string
  target_student_level: string | null
  status: string
  student_email: string | null
  released_by: string | null
  released_at: string | null
  assigned_by: string | null
  assigned_at: string | null
  stage_submitted_at: string | null
  stage_reviewed_by: string | null
  stage_reviewed_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
}

export type CaseTimelineItem = {
  id: string
  kind: CaseTimelineKind
  titleKey: string
  occurredAt: string
  detail: string | null
  actor: string | null
  appointmentDate: string | null
  appointmentTime: string | null
}

type BuildCaseTimelineInput = {
  request: CaseTimelinePatientRequest
  studentRequests: CaseTimelineStudentRequest[]
  progressEntries: CaseTimelineProgressEntry[]
  routingStages?: CaseTimelineRoutingStage[]
}

const TERMINAL_STATUS_TITLE_KEYS: Record<string, string> = {
  completed: 'admin.detail.journeyCaseCompleted',
  cancelled: 'admin.detail.journeyCaseCancelled',
  rejected: 'admin.detail.journeyCaseRejected',
}

function parseTime(value: string | null | undefined) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function appointmentTimestamp(date: string | null, time: string | null) {
  if (!date) return null
  const cleanTime = time ? time.slice(0, 5) : '09:00'
  const parsed = new Date(`${date}T${cleanTime}:00+03:00`).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

function timestampToIso(timestamp: number, fallback: string) {
  return timestamp > 0 ? new Date(timestamp).toISOString() : fallback
}

function hasProgressDetail(entry: CaseTimelineProgressEntry) {
  return Boolean(
    entry.note?.trim() ||
      entry.what_was_done?.trim() ||
      entry.next_step?.trim()
  )
}

function progressDetail(entry: CaseTimelineProgressEntry) {
  return entry.note?.trim() || entry.what_was_done?.trim() || entry.next_step?.trim() || null
}

export function buildCaseTimeline({
  request,
  studentRequests,
  progressEntries,
  routingStages = [],
}: BuildCaseTimelineInput): CaseTimelineItem[] {
  const items: Array<CaseTimelineItem & { sortTime: number; order: number }> = []
  let order = 0

  function addItem(item: CaseTimelineItem) {
    items.push({
      ...item,
      sortTime: parseTime(item.occurredAt),
      order,
    })
    order += 1
  }

  if (request.created_at) {
    addItem({
      id: `patient-submitted-${request.id}`,
      kind: 'system',
      titleKey: 'admin.detail.journeyPatientSubmitted',
      occurredAt: request.created_at,
      detail: null,
      actor: null,
      appointmentDate: null,
      appointmentTime: null,
    })
  }

  if (request.reviewed_at) {
    addItem({
      id: `faculty-reviewed-${request.id}-${request.reviewed_at}`,
      kind: 'system',
      titleKey: 'admin.detail.journeyFacultyReviewed',
      occurredAt: request.reviewed_at,
      detail: request.status || null,
      actor: request.reviewed_by,
      appointmentDate: null,
      appointmentTime: null,
    })
  }

  for (const stage of routingStages) {
    const stageLabel = `Stage ${stage.sequence}: ${stage.department}`

    if (stage.released_at || stage.created_at) {
      addItem({
        id: `stage-released-${stage.id}`,
        kind: 'system',
        titleKey: stage.sequence > 1
          ? 'admin.detail.journeyNextStageReleased'
          : 'admin.detail.journeyStageReleased',
        occurredAt: stage.released_at ?? stage.created_at,
        detail: stageLabel,
        actor: stage.released_by,
        appointmentDate: null,
        appointmentTime: null,
      })
    }

    if (stage.assigned_at) {
      addItem({
        id: `stage-assigned-${stage.id}`,
        kind: 'system',
        titleKey: 'admin.detail.journeyStageStudentAssigned',
        occurredAt: stage.assigned_at,
        detail: stage.student_email
          ? `${stageLabel} · ${stage.student_email}`
          : stageLabel,
        actor: stage.assigned_by ?? stage.student_email,
        appointmentDate: null,
        appointmentTime: null,
      })
    }

    if (stage.stage_submitted_at) {
      addItem({
        id: `stage-submitted-${stage.id}`,
        kind: 'system',
        titleKey: 'admin.detail.journeyStageSubmittedReview',
        occurredAt: stage.stage_submitted_at,
        detail: stageLabel,
        actor: stage.student_email,
        appointmentDate: null,
        appointmentTime: null,
      })
    }

    if (stage.stage_reviewed_at) {
      addItem({
        id: `stage-reviewed-${stage.id}`,
        kind: 'system',
        titleKey: 'admin.detail.journeyStageReviewed',
        occurredAt: stage.stage_reviewed_at,
        detail: stageLabel,
        actor: stage.stage_reviewed_by,
        appointmentDate: null,
        appointmentTime: null,
      })
    }
  }

  for (const studentRequest of studentRequests) {
    if (studentRequest.created_at) {
      addItem({
        id: `student-requested-${studentRequest.id}`,
        kind: 'system',
        titleKey: 'admin.detail.journeyStudentRequested',
        occurredAt: studentRequest.created_at,
        detail: studentRequest.student_email,
        actor: studentRequest.student_email,
        appointmentDate: null,
        appointmentTime: null,
      })
    }

    if (studentRequest.reviewed_at) {
      const status = (studentRequest.status || '').toLowerCase()
      const titleKey =
        status === 'approved'
          ? 'admin.detail.journeyStudentApproved'
          : status === 'rejected'
          ? 'admin.detail.journeyStudentRejected'
          : status === 'revoked'
          ? 'admin.detail.journeyStudentRevoked'
          : null

      if (titleKey) {
        addItem({
          id: `student-reviewed-${studentRequest.id}-${studentRequest.reviewed_at}`,
          kind: 'system',
          titleKey,
          occurredAt: studentRequest.reviewed_at,
          detail: studentRequest.student_email,
          actor: studentRequest.student_email,
          appointmentDate: null,
          appointmentTime: null,
        })
      }
    }
  }

  for (const entry of progressEntries) {
    if (entry.appointment_date) {
      const appointmentTime = appointmentTimestamp(entry.appointment_date, entry.appointment_time)

      addItem({
        id: `appointment-${entry.id}`,
        kind: 'appointment',
        titleKey:
          entry.status_at_time === 'rescheduled'
            ? 'admin.detail.journeyAppointmentRescheduled'
            : 'admin.detail.journeyAppointmentScheduled',
        occurredAt: timestampToIso(appointmentTime ?? 0, entry.created_at),
        detail: entry.note?.trim() || null,
        actor: entry.student_name,
        appointmentDate: entry.appointment_date,
        appointmentTime: entry.appointment_time,
      })
    } else if (hasProgressDetail(entry)) {
      addItem({
        id: `progress-${entry.id}`,
        kind: 'progress',
        titleKey:
          entry.status_at_time === 'in_treatment'
            ? 'admin.detail.journeyTreatmentStarted'
            : 'admin.detail.journeyProgressNote',
        occurredAt: entry.created_at,
        detail: progressDetail(entry),
        actor: entry.student_name,
        appointmentDate: null,
        appointmentTime: null,
      })
    }

    if (entry.next_appointment_date) {
      const followUpTime = appointmentTimestamp(
        entry.next_appointment_date,
        entry.next_appointment_time
      )

      addItem({
        id: `follow-up-${entry.id}`,
        kind: 'appointment',
        titleKey: 'admin.detail.journeyFollowUpPlanned',
        occurredAt: timestampToIso(followUpTime ?? 0, entry.created_at),
        detail: entry.next_step?.trim() || null,
        actor: entry.student_name,
        appointmentDate: entry.next_appointment_date,
        appointmentTime: entry.next_appointment_time,
      })
    }
  }

  const terminalTitleKey = TERMINAL_STATUS_TITLE_KEYS[(request.status || '').toLowerCase()]
  const terminalAt = request.routing_completed_at ?? request.reviewed_at ?? request.created_at
  if (terminalTitleKey && terminalAt) {
    addItem({
      id: `terminal-${request.id}-${request.status}`,
      kind: 'closure',
      titleKey: terminalTitleKey,
      occurredAt: terminalAt,
      detail: request.status,
      actor: request.reviewed_by,
      appointmentDate: null,
      appointmentTime: null,
    })
  }

  return items
    .sort((left, right) => left.sortTime - right.sortTime || left.order - right.order)
    .map(({ sortTime: _sortTime, order: _order, ...item }) => item)
}
