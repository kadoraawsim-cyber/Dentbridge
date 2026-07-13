import { createClient } from '@supabase/supabase-js'

import type { Database } from '../../../src/lib/database.types.ts'
import type { AuthenticatedSession } from './session.mts'

export type SupabaseServiceClient = ReturnType<typeof createClient<Database>>

export const CONSENT_RECORDS_CONSISTENCY_SELECT =
  'id, patient_request_id, consent_type, consent_version, consent_status, accepted_at, source, withdrawn_at, document_title, canonical_route'

export type ConsentConsistencyRow =
  Database['public']['Tables']['consent_records']['Row'] & {
    id: string
    patient_request_id: string
    consent_type: string
    consent_version: string
    consent_status: string
    accepted_at: string
    source: string
    withdrawn_at: string | null
    document_title: string | null
    canonical_route: string | null
  }

const REQUIRED_CONSENT_TYPES = ['kvkk_acknowledgement', 'explicit_consent'] as const

export function assertAcceptedPatientRequestConsents(
  consents: Pick<
    ConsentConsistencyRow,
    | 'consent_type'
    | 'consent_status'
    | 'accepted_at'
    | 'source'
    | 'withdrawn_at'
    | 'document_title'
    | 'canonical_route'
  >[]
): void {
  for (const consentType of REQUIRED_CONSENT_TYPES) {
    const consent = consents.find((row) => row.consent_type === consentType)
    if (!consent) {
      throw new Error(`Missing consent record for ${consentType}.`)
    }
    if (consent.consent_status !== 'accepted') {
      throw new Error(`Consent ${consentType} is not accepted.`)
    }
    if (!consent.accepted_at) {
      throw new Error(`Consent ${consentType} is missing accepted_at.`)
    }
    if (consent.source !== 'patient_request') {
      throw new Error(`Consent ${consentType} has unexpected source ${consent.source}.`)
    }
    if (consent.withdrawn_at !== null) {
      throw new Error(`Consent ${consentType} was withdrawn.`)
    }
    if (!consent.document_title || !consent.canonical_route) {
      throw new Error(`Consent ${consentType} is missing document metadata.`)
    }
  }
}

export function createServiceReadClient(input: {
  supabaseUrl: string
  serviceRoleKey: string
}): SupabaseServiceClient {
  return createClient<Database>(input.supabaseUrl, input.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function findPatientRequestBySubmission(
  faculty: AuthenticatedSession,
  submissionId: string
) {
  const { data, error } = await faculty.client
    .from('patient_requests')
    .select(
      'id, submission_id, full_name, phone, treatment_type, complaint_text, urgency, status, assigned_department, target_student_level, current_stage_id, reviewed_by, reviewed_at, created_at'
    )
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load patient request: ${error.message}`)
  if (!data) throw new Error(`No patient request found for submission ${submissionId}.`)
  return data
}

export async function loadFacultyCaseDetail(faculty: AuthenticatedSession, caseId: string) {
  const [caseResult, requestsResult, progressResult, stagesResult] = await Promise.all([
    faculty.client
      .from('patient_requests')
      .select(
        'id, status, assigned_department, target_student_level, current_stage_id, reviewed_by, reviewed_at'
      )
      .eq('id', caseId)
      .single(),
    faculty.client
      .from('student_case_requests')
      .select('id, case_id, student_id, student_email, status, stage_id, reviewed_by, reviewed_at')
      .eq('case_id', caseId),
    faculty.client
      .from('case_progress_entries')
      .select(
        'id, case_id, stage_id, student_id, status_at_time, appointment_date, appointment_time, note, what_was_done, next_step, created_at'
      )
      .eq('case_id', caseId),
    faculty.client
      .from('case_routing_stages')
      .select(
        'id, case_id, sequence, department, target_student_level, status, student_request_id, student_id, student_email, released_by, assigned_by, stage_submitted_by, stage_reviewed_by, completed_at'
      )
      .eq('case_id', caseId),
  ])

  if (caseResult.error) throw new Error(`Unable to load case: ${caseResult.error.message}`)
  if (requestsResult.error) throw new Error(`Unable to load requests: ${requestsResult.error.message}`)
  if (progressResult.error) throw new Error(`Unable to load progress: ${progressResult.error.message}`)
  if (stagesResult.error) throw new Error(`Unable to load stages: ${stagesResult.error.message}`)

  return {
    case: caseResult.data,
    studentRequests: requestsResult.data ?? [],
    progressEntries: progressResult.data ?? [],
    stages: stagesResult.data ?? [],
  }
}

export async function loadStudentPool(session: AuthenticatedSession) {
  const { data, error } = await session.client.rpc('student_pool_cases')
  if (error) throw new Error(`Unable to load student pool: ${error.message}`)
  return data ?? []
}

export async function loadStudentActiveCases(session: AuthenticatedSession) {
  const { data, error } = await session.client.rpc('student_active_cases')
  if (error) throw new Error(`Unable to load student active cases: ${error.message}`)
  return data ?? []
}

export async function loadStudentPlanner(session: AuthenticatedSession, baseUrl: string) {
  const response = await fetch(new URL('/api/student/planner', baseUrl), {
    headers: {
      Accept: 'application/json',
      Cookie: session.cookieHeader(),
      Origin: new URL(baseUrl).origin,
      Referer: new URL('/student/planner', baseUrl).toString(),
    },
  })
  session.mergeSetCookie(response.headers)
  if (response.status !== 200) {
    throw new Error(`Student planner returned ${response.status}.`)
  }
  return (await response.json()) as {
    data?: { events?: Array<{ source_case_id?: string | null; patient_id?: string | null }> }
  }
}

export async function loadServiceConsistency(input: {
  service: SupabaseServiceClient
  caseId: string
  fileId: string
}) {
  const [fileResult, consentsResult, historyResult] = await Promise.all([
    input.service
      .from('patient_files')
      .select(
        'id, patient_request_id, status, security_state, derivative_state, object_path, original_object_path, derivative_object_path'
      )
      .eq('id', input.fileId)
      .maybeSingle(),
    input.service
      .from('consent_records')
      .select(CONSENT_RECORDS_CONSISTENCY_SELECT)
      .eq('patient_request_id', input.caseId),
    input.service
      .from('case_decision_history')
      .select('id, case_id, request_id, action, from_state, to_state, actor_role, created_at')
      .eq('case_id', input.caseId),
  ])

  if (fileResult.error) throw new Error(`Unable to load patient file: ${fileResult.error.message}`)
  if (consentsResult.error) throw new Error(`Unable to load consents: ${consentsResult.error.message}`)
  if (historyResult.error) throw new Error(`Unable to load decision history: ${historyResult.error.message}`)

  return {
    file: fileResult.data,
    consents: consentsResult.data ?? [],
    history: historyResult.data ?? [],
  }
}
