import { describe, expect, it, vi } from 'vitest'

import { createUploadTicket } from '@/lib/files/ticket'
import { submitPatientIntakeAtomic } from '@/lib/patient-request/intake.service'
import type { SupabaseAdminClient } from '@/lib/supabase-admin'

const context = {
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  requestId: 'req-1',
  correlationId: 'corr-1',
  sourceService: 'test',
  apiVersion: 'v1',
}

const FILE_ID = '4c3d2c9a-6a54-4f5e-9d51-3a2b1c0d9e8f'
const SUBMISSION_ID = '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

function makeSupabase(rpcResult: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult)
  return { supabase: { rpc } as unknown as SupabaseAdminClient, rpc }
}

function baseInput(overrides: Partial<Parameters<typeof submitPatientIntakeAtomic>[0]> = {}) {
  return {
    submissionId: SUBMISSION_ID,
    request: { full_name: 'Ada Lovelace' },
    consents: [{ consent_type: 'kvkk_acknowledgement' }, { consent_type: 'explicit_consent' }],
    fileId: null,
    fileTicket: null,
    context,
    ...overrides,
  }
}

describe('submitPatientIntakeAtomic — file ticket pairing', () => {
  it('rejects a fileId without a ticket before touching the database', async () => {
    const { supabase, rpc } = makeSupabase({ data: SUBMISSION_ID, error: null })

    const result = await submitPatientIntakeAtomic(
      baseInput({ fileId: FILE_ID, fileTicket: null, supabase })
    )

    expect(result).toEqual({ ok: false, reason: 'invalid_request' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects a ticket without a fileId before touching the database', async () => {
    const { supabase, rpc } = makeSupabase({ data: SUBMISSION_ID, error: null })

    const result = await submitPatientIntakeAtomic(
      baseInput({ fileId: null, fileTicket: '123.abc', supabase })
    )

    expect(result).toEqual({ ok: false, reason: 'invalid_request' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects a forged or mismatched HMAC ticket before touching the database', async () => {
    const { supabase, rpc } = makeSupabase({ data: SUBMISSION_ID, error: null })
    const ticketForOtherFile = createUploadTicket('11111111-2222-4333-8444-555555555555')

    const result = await submitPatientIntakeAtomic(
      baseInput({ fileId: FILE_ID, fileTicket: ticketForOtherFile.value, supabase })
    )

    expect(result).toEqual({ ok: false, reason: 'invalid_request' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('accepts a valid ticket bound to the same fileId and claims it in the RPC', async () => {
    const { supabase, rpc } = makeSupabase({ data: 'request-uuid-1', error: null })
    const ticket = createUploadTicket(FILE_ID)

    const result = await submitPatientIntakeAtomic(
      baseInput({ fileId: FILE_ID, fileTicket: ticket.value, supabase })
    )

    expect(result).toEqual({ ok: true, patientRequestId: 'request-uuid-1' })
    expect(rpc).toHaveBeenCalledWith(
      'submit_patient_request_atomic',
      expect.objectContaining({
        p_submission_id: SUBMISSION_ID,
        p_file_id: FILE_ID,
        p_context: expect.objectContaining({
          request_id: 'req-1',
          correlation_id: 'corr-1',
        }),
      })
    )
  })
})

describe('submitPatientIntakeAtomic — RPC error mapping', () => {
  it.each([
    ['22023', 'invalid_request'],
    ['23514', 'invalid_request'],
    ['23505', 'conflict'],
    ['40001', 'conflict'],
    ['XX000', 'server_error'],
  ])('maps Postgres error %s to %s', async (code, reason) => {
    const { supabase } = makeSupabase({ data: null, error: { code, message: 'db error' } })

    const result = await submitPatientIntakeAtomic(baseInput({ supabase }))

    expect(result).toEqual({ ok: false, reason })
  })

  it('treats a missing or non-uuid RPC result as a server error', async () => {
    const { supabase } = makeSupabase({ data: '', error: null })

    const result = await submitPatientIntakeAtomic(baseInput({ supabase }))

    expect(result).toEqual({ ok: false, reason: 'server_error' })
  })
})
