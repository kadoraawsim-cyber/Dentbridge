import 'server-only'

import type { Json } from '@/lib/database.types'
import { verifyUploadTicket } from '@/lib/files/ticket'
import { createSupabaseAdminClient, type SupabaseAdminClient } from '@/lib/supabase-admin'

export type PatientIntakeFailure = 'invalid_request' | 'conflict' | 'server_error'

export type PatientIntakeResult =
  | { ok: true; patientRequestId: string }
  | { ok: false; reason: PatientIntakeFailure }

export interface SubmitPatientIntakeInput {
  submissionId: string
  request: Record<string, Json | undefined>
  consents: ReadonlyArray<Record<string, Json | undefined>>
  fileId: string | null
  fileTicket: string | null
  context: {
    ipAddress: string | null
    userAgent: string | null
    requestId: string
    correlationId: string
    sourceService: string
    apiVersion: string
  }
  supabase?: SupabaseAdminClient
}

export async function submitPatientIntakeAtomic(
  input: SubmitPatientIntakeInput
): Promise<PatientIntakeResult> {
  if (
    (input.fileId && !input.fileTicket) ||
    (!input.fileId && input.fileTicket) ||
    (input.fileId && !verifyUploadTicket(input.fileId, input.fileTicket))
  ) {
    return { ok: false, reason: 'invalid_request' }
  }

  const supabase = input.supabase ?? createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('submit_patient_request_atomic', {
    p_submission_id: input.submissionId,
    p_request: input.request as Json,
    p_consents: input.consents as Json,
    p_file_id: input.fileId,
    p_context: {
      ip_address: input.context.ipAddress,
      user_agent: input.context.userAgent,
      request_id: input.context.requestId,
      correlation_id: input.context.correlationId,
      source_service: input.context.sourceService,
      api_version: input.context.apiVersion,
    },
  })

  if (error) {
    if (error.code === '22023' || error.code === '23514') {
      return { ok: false, reason: 'invalid_request' }
    }
    if (error.code === '23505' || error.code === '40001') {
      return { ok: false, reason: 'conflict' }
    }
    return { ok: false, reason: 'server_error' }
  }

  return typeof data === 'string' && data
    ? { ok: true, patientRequestId: data }
    : { ok: false, reason: 'server_error' }
}
