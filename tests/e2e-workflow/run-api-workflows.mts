import { statSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildPatientPayload, buildWorkflowSeed, accountLabel } from './lib/data.mts'
import { loadWorkflowEnvironment } from './lib/env.mts'
import { requestJson, uploadJpegToSignedUrl } from './lib/http.mts'
import { WorkflowReporter, type WorkflowSummary } from './lib/reporter.mts'
import { authenticateSession, type AuthenticatedSession } from './lib/session.mts'
import {
  createServiceReadClient,
  findPatientRequestBySubmission,
  loadFacultyCaseDetail,
  loadServiceConsistency,
  loadStudentActiveCases,
  loadStudentPool,
} from './lib/supabase-readers.mts'
import {
  buildRunIdLikePattern,
  buildRunIdMarker,
  facultyForCase,
  hasExactRunIdMarker,
  parseCliOptions,
  studentForCase,
  type AccountKey,
} from './lib/safety.mts'

interface PreparedUploadResponse {
  success: true
  fileId: string
  uploadUrl: string
  ticket: string
}

interface ConfirmUploadResponse {
  success: true
  fileId: string
  status: string
}

interface StudentRequestResponse {
  success: true
  data: {
    id: string
    case_id: string
    stage_id: string | null
    status: string
  }
}

interface RuntimeSessions {
  students: Record<AccountKey, AuthenticatedSession>
  faculty: Record<AccountKey, AuthenticatedSession>
}

const IMAGE_PATH = resolve(process.cwd(), 'public/isu 2026 logo.jpg')
const IMAGE_SIZE_BYTES = statSync(IMAGE_PATH).size

function assertPresent(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}

function otherKey(key: AccountKey): AccountKey {
  return key === 'A' ? 'B' : 'A'
}

async function runBounded<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<WorkflowSummary>
): Promise<WorkflowSummary[]> {
  const results: WorkflowSummary[] = []
  let cursor = 0

  async function next(): Promise<void> {
    const index = cursor
    cursor += 1
    if (index >= items.length) return
    results[index] = await worker(items[index]!)
    await next()
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()))
  return results
}

function createActorLocks() {
  const locks: Record<AccountKey, Promise<void>> = {
    A: Promise.resolve(),
    B: Promise.resolve(),
  }

  return async function withFacultyLock<T>(key: AccountKey, fn: () => Promise<T>): Promise<T> {
    const previous = locks[key]
    let release!: () => void
    locks[key] = new Promise<void>((resolveLock) => {
      release = resolveLock
    })
    await previous
    try {
      return await fn()
    } finally {
      release()
    }
  }
}

function hasCase(rows: Array<{ id?: string | null; case_id?: string | null }>, caseId: string) {
  return rows.some((row) => row.id === caseId || row.case_id === caseId)
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2), process.env)
  const env = loadWorkflowEnvironment()
  if (!env.serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or E2E_VERIFICATION_SUPABASE_SERVICE_ROLE_KEY is required for patient_files and case_decision_history verification.'
    )
  }

  if (options.allowProduction) {
    console.error('DANGEROUS PRODUCTION E2E MODE ENABLED. Synthetic data will be created and not automatically deleted.')
  }

  const reporter = new WorkflowReporter()
  const started = performance.now()

  const [studentA, studentB, facultyA, facultyB] = await Promise.all([
    authenticateSession({
      account: env.students[0],
      supabaseUrl: env.supabaseUrl,
      supabaseAnonKey: env.supabaseAnonKey,
    }),
    authenticateSession({
      account: env.students[1],
      supabaseUrl: env.supabaseUrl,
      supabaseAnonKey: env.supabaseAnonKey,
    }),
    authenticateSession({
      account: env.faculty[0],
      supabaseUrl: env.supabaseUrl,
      supabaseAnonKey: env.supabaseAnonKey,
    }),
    authenticateSession({
      account: env.faculty[1],
      supabaseUrl: env.supabaseUrl,
      supabaseAnonKey: env.supabaseAnonKey,
    }),
  ])

  const sessions: RuntimeSessions = {
    students: { A: studentA, B: studentB },
    faculty: { A: facultyA, B: facultyB },
  }

  const service = createServiceReadClient({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.serviceRoleKey,
  })
  const withFacultyLock = createActorLocks()
  const consistencyFailures: string[] = []
  const crossAccountAuthorizationFailures: string[] = []
  const runMarker = buildRunIdMarker(options.runId)

  async function runWorkflow(caseNumber: number): Promise<WorkflowSummary> {
    const seed = buildWorkflowSeed(options.runId, caseNumber)
    const studentKey = studentForCase(caseNumber)
    const wrongStudentKey = otherKey(studentKey)
    const triageFacultyKey = facultyForCase(caseNumber, 'triage')
    const approvalFacultyKey = facultyForCase(caseNumber, 'student_request_approval')
    const finalFacultyKey = facultyForCase(caseNumber, 'final_approval')
    const student = sessions.students[studentKey]
    const wrongStudent = sessions.students[wrongStudentKey]
    const triageFaculty = sessions.faculty[triageFacultyKey]
    const approvalFaculty = sessions.faculty[approvalFacultyKey]
    const finalFaculty = sessions.faculty[finalFacultyKey]

    let fileId: string | null = null
    let fileTicket: string | null = null
    let patientRequestId: string | null = null
    let studentRequestId: string | null = null
    let finalStatus: string | null = null
    let wrongStudentSawAssignedCase = false

    try {
      await reporter.step(caseNumber, 'patient_image_upload', async () => {
      const prepared = await requestJson<PreparedUploadResponse>({
        baseUrl: options.baseUrl,
        path: '/api/v1/files/prepare-upload',
        method: 'POST',
        body: {
          fileName: `dentbridge-${options.runId}-${caseNumber}.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: IMAGE_SIZE_BYTES,
          locale: 'en',
        },
        expectedStatuses: [200],
        workflow: caseNumber,
        step: 'patient_image_prepare',
        reporter,
      })
      fileId = prepared.fileId
      fileTicket = prepared.ticket
      const uploadStatus = await uploadJpegToSignedUrl(prepared.uploadUrl, IMAGE_PATH)
      reporter.observeHttp({
        workflow: caseNumber,
        step: 'patient_image_storage_upload',
        method: 'PUT',
        path: '[signed-storage-upload-url-redacted]',
        status: uploadStatus,
      })
      const confirmed = await requestJson<ConfirmUploadResponse>({
        baseUrl: options.baseUrl,
        path: `/api/v1/files/${prepared.fileId}/confirm`,
        method: 'POST',
        body: { ticket: prepared.ticket, locale: 'en' },
        expectedStatuses: [200],
        workflow: caseNumber,
        step: 'patient_image_confirm',
        reporter,
      })
      if (confirmed.fileId !== prepared.fileId) {
        throw new Error('Confirmed upload returned a different file id.')
      }
    })

      await reporter.step(caseNumber, 'patient_request_submit', async () => {
      assertPresent(fileId, 'File id is required before patient submission.')
      assertPresent(fileTicket, 'File ticket is required before patient submission.')
      await requestJson({
        baseUrl: options.baseUrl,
        path: '/api/v1/patient/requests',
        method: 'POST',
        body: {
          ...buildPatientPayload(seed),
          fileId,
          fileTicket,
          locale: 'en',
        },
        expectedStatuses: [200],
        workflow: caseNumber,
        step: 'patient_request_submit',
        reporter,
      })
    })

      await reporter.step(caseNumber, 'verify_patient_request_and_file', async () => {
      assertPresent(fileId, 'File id is required for verification.')
      const patient = await findPatientRequestBySubmission(triageFaculty, seed.submissionId)
      patientRequestId = patient.id
      if (patient.status !== 'submitted') {
        throw new Error(`Expected submitted patient request, received ${patient.status}.`)
      }
      const consistency = await loadServiceConsistency({
        service,
        caseId: patient.id,
        fileId,
      })
      if (!consistency.file) {
        throw new Error('Patient file row was not created.')
      }
      if (consistency.file.patient_request_id !== patient.id) {
        throw new Error('Patient file was not linked to the submitted request.')
      }
      if (
        consistency.file.status !== 'sanitized_unscanned' ||
        consistency.file.security_state !== 'sanitized_unscanned' ||
        consistency.file.derivative_state !== 'ready'
      ) {
        throw new Error('Patient file was not sanitized into the expected ready state.')
      }
      if (consistency.consents.length < 2) {
        throw new Error('Expected consent records were not created.')
      }
    })

      await reporter.step(caseNumber, 'faculty_open_triage_release', async () => {
      assertPresent(patientRequestId, 'Patient request id is required for faculty triage.')
      await loadFacultyCaseDetail(triageFaculty, patientRequestId)
      await withFacultyLock(triageFacultyKey, async () => {
        await requestJson({
          baseUrl: options.baseUrl,
          path: `/api/admin/cases/${patientRequestId}`,
          method: 'PATCH',
          body: {
            action: 'update_triage',
            assigned_department: seed.department,
            urgency: seed.urgency,
            target_student_level: seed.targetStudentLevel,
            clinical_notes: seed.clinicalNotes,
            reason: `${runMarker}; triage update`,
          },
          expectedStatuses: [200],
          workflow: caseNumber,
          step: 'faculty_update_triage',
          reporter,
          session: triageFaculty,
        })

        const release = await requestJson<{ success: true; data: { status?: string } }>({
          baseUrl: options.baseUrl,
          path: `/api/admin/cases/${patientRequestId}`,
          method: 'PATCH',
          body: {
            action: 'approve',
            assigned_department: seed.department,
            urgency: seed.urgency,
            target_student_level: seed.targetStudentLevel,
            clinical_notes: seed.clinicalNotes,
          },
          expectedStatuses: [200],
          workflow: caseNumber,
          step: 'faculty_release_to_pool',
          reporter,
          session: triageFaculty,
        })
        if (release.data.status !== 'matched') {
          throw new Error(`Expected release status matched, received ${release.data.status}.`)
        }
      })

      const detail = await loadFacultyCaseDetail(triageFaculty, patientRequestId)
      if (detail.case.status !== 'matched') {
        throw new Error(`Expected matched case after release, received ${detail.case.status}.`)
      }
      if (detail.case.assigned_department !== seed.department) {
        throw new Error('Released case has the wrong department.')
      }
      if (!detail.stages.some((stage) => stage.status === 'released')) {
        throw new Error('Released routing stage was not created.')
      }
    })

      await reporter.step(caseNumber, 'student_request_and_faculty_approval', async () => {
      assertPresent(patientRequestId, 'Patient request id is required for student request.')
      const pool = await loadStudentPool(student)
      if (!hasCase(pool, patientRequestId)) {
        throw new Error(`${accountLabel('Student', studentKey)} did not see the eligible pool case.`)
      }

      const request = await requestJson<StudentRequestResponse>({
        baseUrl: options.baseUrl,
        path: `/api/student/cases/${patientRequestId}/request`,
        method: 'POST',
        expectedStatuses: [201],
        workflow: caseNumber,
        step: 'student_case_request',
        reporter,
        session: student,
      })
      studentRequestId = request.data.id
      if (request.data.case_id !== patientRequestId || request.data.status !== 'pending') {
        throw new Error('Student request response did not match the expected pending request.')
      }

      await withFacultyLock(approvalFacultyKey, async () => {
        const approval = await requestJson<{ success: true; data: { status?: string } }>({
          baseUrl: options.baseUrl,
          path: `/api/admin/cases/${patientRequestId}`,
          method: 'PATCH',
          body: {
            action: 'approve_student_request',
            request_id: studentRequestId,
          },
          expectedStatuses: [200],
          workflow: caseNumber,
          step: 'faculty_approve_student_request',
          reporter,
          session: approvalFaculty,
        })
        if (approval.data.status !== 'student_approved') {
          throw new Error(`Expected student_approved status, received ${approval.data.status}.`)
        }
      })

      const detail = await loadFacultyCaseDetail(approvalFaculty, patientRequestId)
      const approvedRequest = detail.studentRequests.find((row) => row.id === studentRequestId)
      if (!approvedRequest || approvedRequest.status !== 'approved') {
        throw new Error('Student request was not approved.')
      }
      if (approvedRequest.student_id !== student.userId) {
        throw new Error('Student request was assigned to the wrong student.')
      }
      const assignedStage = detail.stages.find((stage) => stage.student_request_id === studentRequestId)
      if (!assignedStage || assignedStage.student_id !== student.userId) {
        throw new Error('Routing stage was not assigned to the expected student.')
      }
    })

      await reporter.step(caseNumber, 'cross_account_assignment_checks', async () => {
      assertPresent(patientRequestId, 'Patient request id is required for cross-account checks.')
      await requestJson({
        baseUrl: options.baseUrl,
        path: `/api/student/cases/${patientRequestId}/status`,
        method: 'PATCH',
        body: { action: 'mark_contacted' },
        expectedStatuses: [403],
        workflow: caseNumber,
        step: 'wrong_student_status_forbidden',
        reporter,
        session: wrongStudent,
      })

      const [correctActive, wrongActive] = await Promise.all([
        loadStudentActiveCases(student),
        loadStudentActiveCases(wrongStudent),
      ])
      if (!hasCase(correctActive, patientRequestId)) {
        throw new Error('Assigned student does not see the case in active cases.')
      }
      if (hasCase(wrongActive, patientRequestId)) {
        wrongStudentSawAssignedCase = true
        const message = `${accountLabel('Student', wrongStudentKey)} saw ${accountLabel('Student', studentKey)} assigned case ${patientRequestId}.`
        crossAccountAuthorizationFailures.push(message)
        throw new Error(message)
      }
    })

      await reporter.step(caseNumber, 'student_appointment_progress_lifecycle', async () => {
      assertPresent(patientRequestId, 'Patient request id is required for student lifecycle.')
      await requestJson<{ success: true; data: { status?: string } }>({
        baseUrl: options.baseUrl,
        path: `/api/student/cases/${patientRequestId}/status`,
        method: 'PATCH',
        body: { action: 'mark_contacted' },
        expectedStatuses: [200],
        workflow: caseNumber,
        step: 'student_mark_contacted',
        reporter,
        session: student,
      })

      const appointment = await requestJson<{ success: true; data: { status?: string } }>({
        baseUrl: options.baseUrl,
        path: `/api/student/cases/${patientRequestId}/status`,
        method: 'PATCH',
        body: {
          action: 'mark_appointment_scheduled',
          appointment_date: seed.appointmentDate,
          appointment_time: seed.appointmentTime,
          note: `${runMarker}; appointment scheduled.`,
        },
        expectedStatuses: [200],
        workflow: caseNumber,
        step: 'student_schedule_appointment',
        reporter,
        session: student,
      })
      if (appointment.data.status !== 'appointment_scheduled') {
        throw new Error(`Expected appointment_scheduled status, received ${appointment.data.status}.`)
      }

      const planner = await requestJson<{
        data?: { events?: Array<{ source_case_id?: string | null; patient_id?: string | null }> }
      }>({
        baseUrl: options.baseUrl,
        path: '/api/student/planner',
        method: 'GET',
        expectedStatuses: [200],
        workflow: caseNumber,
        step: 'student_planner_verify_appointment',
        reporter,
        session: student,
      })
      const plannerEvents = planner.data?.events ?? []
      if (
        !plannerEvents.some(
          (event) => event.source_case_id === patientRequestId || event.patient_id === patientRequestId
        )
      ) {
        throw new Error('Scheduled appointment was not visible in the student planner.')
      }

      const treatment = await requestJson<{ success: true; data: { status?: string } }>({
        baseUrl: options.baseUrl,
        path: `/api/student/cases/${patientRequestId}/status`,
        method: 'PATCH',
        body: {
          action: 'mark_in_treatment',
          note: `${runMarker}; treatment started.`,
          what_was_done: 'Synthetic treatment start entry.',
          next_step: 'Continue synthetic workflow verification.',
        },
        expectedStatuses: [200],
        workflow: caseNumber,
        step: 'student_start_treatment',
        reporter,
        session: student,
      })
      if (treatment.data.status !== 'in_treatment') {
        throw new Error(`Expected in_treatment status, received ${treatment.data.status}.`)
      }

      await requestJson({
        baseUrl: options.baseUrl,
        path: `/api/student/cases/${patientRequestId}/progress`,
        method: 'POST',
        body: {
          note: `${runMarker}; progress entry.`,
          what_was_done: 'Synthetic progress note for workflow verification.',
          next_step: 'Submit for faculty review.',
          next_appointment_date: seed.appointmentDate,
          next_appointment_time: '10:30',
        },
        expectedStatuses: [200],
        workflow: caseNumber,
        step: 'student_add_progress',
        reporter,
        session: student,
      })

      const review = await requestJson<{ success: true; data: { status?: string } }>({
        baseUrl: options.baseUrl,
        path: `/api/student/cases/${patientRequestId}/status`,
        method: 'PATCH',
        body: { action: 'submit_stage_for_review' },
        expectedStatuses: [200],
        workflow: caseNumber,
        step: 'student_submit_for_faculty_review',
        reporter,
        session: student,
      })
      if (review.data.status !== 'faculty_review') {
        throw new Error(`Expected faculty_review status, received ${review.data.status}.`)
      }
    })

      await reporter.step(caseNumber, 'faculty_final_approval_and_consistency', async () => {
      assertPresent(patientRequestId, 'Patient request id is required for final approval.')
      assertPresent(fileId, 'File id is required for final consistency checks.')
      await withFacultyLock(finalFacultyKey, async () => {
        const completed = await requestJson<{ success: true; data: { status?: string | null } }>({
          baseUrl: options.baseUrl,
          path: `/api/admin/cases/${patientRequestId}`,
          method: 'PATCH',
          body: {
            action: 'mark_completed',
            reason: `${runMarker}; final faculty approval.`,
          },
          expectedStatuses: [200],
          workflow: caseNumber,
          step: 'faculty_final_mark_completed',
          reporter,
          session: finalFaculty,
        })
        finalStatus = completed.data.status ?? null
      })

      const detail = await loadFacultyCaseDetail(finalFaculty, patientRequestId)
      finalStatus = detail.case.status ?? finalStatus
      if (finalStatus !== 'completed') {
        throw new Error(`Expected final status completed, received ${finalStatus}.`)
      }
      if (!detail.progressEntries.some((entry) => entry.appointment_date === seed.appointmentDate)) {
        throw new Error('Appointment progress entry was not stored.')
      }
      if (!detail.progressEntries.some((entry) => entry.note?.includes(runMarker))) {
        throw new Error('Progress entry with RUN_ID marker was not stored.')
      }
      const consistency = await loadServiceConsistency({
        service,
        caseId: patientRequestId,
        fileId,
      })
      if (!consistency.file || consistency.file.patient_request_id !== patientRequestId) {
        throw new Error('Final consistency check found missing or unlinked patient file.')
      }
      const historyActions = new Set(consistency.history.map((row) => row.action))
      for (const expected of ['update_triage', 'approve_student_request', 'mark_completed']) {
        if (!historyActions.has(expected)) {
          consistencyFailures.push(
            `Workflow ${caseNumber} missing case_decision_history action ${expected}.`
          )
        }
      }
      if (consistency.history.length === 0) {
        throw new Error('No case_decision_history rows were created.')
      }
      })
    } catch {
      finalStatus ??= 'failed'
    }

    return {
      workflow: caseNumber,
      patientRequestId,
      fileId,
      studentRequestId,
      assignedStudent: accountLabel('Student', studentKey),
      triageFaculty: accountLabel('Faculty', triageFacultyKey),
      approvalFaculty: accountLabel('Faculty', approvalFacultyKey),
      finalFaculty: accountLabel('Faculty', finalFacultyKey),
      finalStatus,
      wrongStudentSawAssignedCase,
    }
  }

  const workflows = await runBounded(
    Array.from({ length: options.workflows }, (_, index) => index + 1),
    options.concurrency,
    runWorkflow
  )

  let duplicateRecordsDetected = false
  let orphanFilesDetected = false
  try {
    const { data: runCases, error: runCasesError } = await service
      .from('patient_requests')
      .select('id, submission_id, complaint_text')
      .like('complaint_text', buildRunIdLikePattern(options.runId))
    if (runCasesError) throw runCasesError

    const exactRunCases = (runCases ?? []).filter((row) =>
      hasExactRunIdMarker(row.complaint_text, options.runId)
    )
    const submissionIds = new Set(exactRunCases.map((row) => row.submission_id).filter(Boolean))
    duplicateRecordsDetected = submissionIds.size !== exactRunCases.length

    const fileIds = workflows.map((workflow) => workflow.fileId).filter((id): id is string => Boolean(id))
    if (fileIds.length > 0) {
      const { data: fileRows, error: fileRowsError } = await service
        .from('patient_files')
        .select('id, patient_request_id')
        .in('id', fileIds)
      if (fileRowsError) throw fileRowsError
      orphanFilesDetected = (fileRows ?? []).some((row) => !row.patient_request_id)
    }
  } catch (error) {
    consistencyFailures.push(
      `Unable to complete duplicate/orphan aggregate check: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  const report = reporter.buildReport({
    runId: options.runId,
    attempted: options.workflows,
    totalDurationMs: Math.round(performance.now() - started),
    workflows,
    consistencyFailures,
    crossAccountAuthorizationFailures,
    duplicateRecordsDetected,
    orphanFilesDetected,
  })
  const reportPath = reporter.writeReport(report)
  console.log(`Workflow report written to ${reportPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
