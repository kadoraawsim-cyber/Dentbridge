import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPatientFileSignedUrl } from '@/lib/files/files.service'
import type { SupabaseAdminClient } from '@/lib/supabase-admin'

const mocks = vi.hoisted(() => ({
  auditFileSignedUrlCreated: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  auditFileSignedUrlCreated: mocks.auditFileSignedUrlCreated,
  auditFileConfirmed: vi.fn(),
  auditFileRejected: vi.fn(),
  auditFileUploadPrepared: vi.fn(),
}))

type SingleResult = { data: unknown; error: unknown }

function tableBuilder(single: SingleResult) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  for (const method of ['select', 'update', 'insert', 'eq', 'in', 'is', 'order', 'limit']) {
    builder[method] = chain
  }
  builder.maybeSingle = () => Promise.resolve(single)
  builder.single = () => Promise.resolve(single)
  return builder
}

const CLEAN_FILE_ROW = {
  id: 'file-1',
  object_path: 'patient-requests/sess/file-1.pdf',
  original_filename: 'xray.pdf',
  declared_mime: 'application/pdf',
  detected_mime: 'application/pdf',
  extension: 'pdf',
  status: 'clean',
  patient_request_id: 'case-1',
}

function makeSupabase(results: Record<string, SingleResult>, signedUrl = 'https://signed.example/x'): SupabaseAdminClient {
  return {
    from(table: string) {
      return tableBuilder(results[table] ?? { data: null, error: null })
    },
    storage: {
      from() {
        return {
          createSignedUrl: () => Promise.resolve({ data: { signedUrl }, error: null }),
        }
      },
    },
  } as unknown as SupabaseAdminClient
}

const baseInput = {
  fileId: 'file-1',
  purpose: 'preview' as const,
  actorEmail: 'x@example.edu',
  context: {
    apiVersion: 'test',
    correlationId: 'c',
    ipAddress: '127.0.0.1',
    requestId: 'r',
    sourceService: 'test',
    userAgent: 'vitest',
  },
}

beforeEach(() => {
  mocks.auditFileSignedUrlCreated.mockReset()
})

describe('createPatientFileSignedUrl — current-stage file access', () => {
  it('allows the current-stage assignee to read the file', async () => {
    const supabase = makeSupabase({
      patient_files: { data: CLEAN_FILE_ROW, error: null },
      student_case_requests: { data: { id: 'req-1', stage_id: 'stage-2' }, error: null },
      patient_requests: { data: { current_stage_id: 'stage-2' }, error: null },
      case_routing_stages: { data: { student_id: 'student-1', status: 'in_treatment' }, error: null },
    })

    const result = await createPatientFileSignedUrl({
      ...baseInput,
      actorUserId: 'student-1',
      actorRole: 'student',
      supabase,
    })

    expect(result.ok).toBe(true)
    expect(mocks.auditFileSignedUrlCreated).toHaveBeenCalledTimes(1)
  })

  it('denies a previous-stage student after handoff', async () => {
    const supabase = makeSupabase({
      patient_files: { data: CLEAN_FILE_ROW, error: null },
      // Approved on stage-1, but the case has advanced to stage-2.
      student_case_requests: { data: { id: 'req-1', stage_id: 'stage-1' }, error: null },
      patient_requests: { data: { current_stage_id: 'stage-2' }, error: null },
      case_routing_stages: { data: { student_id: 'someone-else', status: 'in_treatment' }, error: null },
    })

    const result = await createPatientFileSignedUrl({
      ...baseInput,
      actorUserId: 'student-1',
      actorRole: 'student',
      supabase,
    })

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(mocks.auditFileSignedUrlCreated).not.toHaveBeenCalled()
  })

  it('denies a student with no approved request', async () => {
    const supabase = makeSupabase({
      patient_files: { data: CLEAN_FILE_ROW, error: null },
      student_case_requests: { data: null, error: null },
    })

    const result = await createPatientFileSignedUrl({
      ...baseInput,
      actorUserId: 'student-1',
      actorRole: 'student',
      supabase,
    })

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('allows faculty/admin without a stage assignment', async () => {
    const supabase = makeSupabase({
      patient_files: { data: CLEAN_FILE_ROW, error: null },
    })

    const result = await createPatientFileSignedUrl({
      ...baseInput,
      actorUserId: 'faculty-1',
      actorRole: 'faculty',
      supabase,
    })

    expect(result.ok).toBe(true)
  })
})
