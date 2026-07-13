import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPatientFileSignedUrl } from '@/lib/files/files.service'
import type { SupabaseAdminClient } from '@/lib/supabase-admin'

const mocks = vi.hoisted(() => ({
  auditFileSignedUrlCreated: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  auditFileUploadPrepared: vi.fn(),
  auditFileConfirmed: vi.fn(),
  auditFileRejected: vi.fn(),
  auditFileSignedUrlCreated: mocks.auditFileSignedUrlCreated,
}))

const context = {
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  requestId: 'req-1',
  correlationId: 'corr-1',
  sourceService: 'test',
  apiVersion: 'v1',
}

interface FileRowOverrides {
  status?: string
  scan_state?: string | null
  patient_request_id?: string | null
  derivative_object_path?: string | null
  derivative_state?: string | null
  security_state?: string | null
}

function fileRow(overrides: FileRowOverrides = {}) {
  return {
    id: 'file-1',
    object_path: 'patient-requests/session/original/file-1.png',
    original_object_path: null,
    derivative_object_path:
      overrides.derivative_object_path === undefined
        ? 'patient-requests/session/sanitized/file-1.jpg'
        : overrides.derivative_object_path,
    original_filename: 'xray.png',
    declared_mime: 'image/png',
    detected_mime: 'image/png',
    extension: 'png',
    status: overrides.status ?? 'sanitized_unscanned',
    scan_state: overrides.scan_state === undefined ? 'pending' : overrides.scan_state,
    source_state: 'deleted',
    derivative_state: overrides.derivative_state === undefined ? 'ready' : overrides.derivative_state,
    security_state:
      overrides.security_state === undefined ? 'sanitized_unscanned' : overrides.security_state,
    patient_request_id:
      overrides.patient_request_id === undefined ? 'case-1' : overrides.patient_request_id,
    upload_session_id: 'session',
  }
}

/**
 * Supabase stub: per-table FIFO queues answer maybeSingle(); storage signed-URL
 * creation is recorded so tests can assert it is never reached on the
 * fail-closed paths.
 */
function makeSupabase(queues: Record<string, Array<{ data?: unknown; error?: unknown }>>) {
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://storage.example/signed' },
    error: null,
  })

  function builderFor(table: string) {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'is', 'in', 'order', 'limit', 'insert', 'update']) {
      builder[method] = () => builder
    }
    builder.maybeSingle = () => {
      const queue = queues[table] ?? []
      return Promise.resolve(queue.shift() ?? { data: null, error: null })
    }
    builder.single = builder.maybeSingle
    builder.then = (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    return builder
  }

  const supabase = {
    from(table: string) {
      return builderFor(table)
    },
    storage: {
      from() {
        return { createSignedUrl }
      },
    },
  } as unknown as SupabaseAdminClient

  return { supabase, createSignedUrl }
}

beforeEach(() => {
  mocks.auditFileSignedUrlCreated.mockReset().mockResolvedValue(true)
})

describe('createPatientFileSignedUrl — fail-closed quarantine gate', () => {
  it('never mints a URL for a quarantined file awaiting malware scan', async () => {
    const { supabase, createSignedUrl } = makeSupabase({
      patient_files: [{ data: fileRow({ status: 'quarantined', scan_state: 'pending' }), error: null }],
    })

    const result = await createPatientFileSignedUrl({
      fileId: 'file-1',
      purpose: 'preview',
      actorUserId: 'admin-1',
      actorRole: 'admin',
      context,
      supabase,
    })

    expect(result).toEqual({ ok: false, reason: 'not_found' })
    expect(createSignedUrl).not.toHaveBeenCalled()
    expect(mocks.auditFileSignedUrlCreated).not.toHaveBeenCalled()
  })

  it('never mints a URL when status is clean but scan_state is not clean', async () => {
    const { supabase, createSignedUrl } = makeSupabase({
      patient_files: [{ data: fileRow({ status: 'clean', scan_state: 'pending' }), error: null }],
    })

    const result = await createPatientFileSignedUrl({
      fileId: 'file-1',
      purpose: 'download',
      actorUserId: 'admin-1',
      actorRole: 'admin',
      context,
      supabase,
    })

    expect(result).toEqual({ ok: false, reason: 'not_found' })
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('never mints a URL for an unlinked file even when derivative-ready', async () => {
    const { supabase, createSignedUrl } = makeSupabase({
      patient_files: [{ data: fileRow({ patient_request_id: null }), error: null }],
    })

    const result = await createPatientFileSignedUrl({
      fileId: 'file-1',
      purpose: 'preview',
      actorUserId: 'admin-1',
      actorRole: 'admin',
      context,
      supabase,
    })

    expect(result).toEqual({ ok: false, reason: 'not_found' })
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('denies a student with no approved request for the case', async () => {
    const { supabase, createSignedUrl } = makeSupabase({
      patient_files: [{ data: fileRow(), error: null }],
      student_case_requests: [{ data: null, error: null }],
    })

    const result = await createPatientFileSignedUrl({
      fileId: 'file-1',
      purpose: 'preview',
      actorUserId: 'student-1',
      actorRole: 'student',
      context,
      supabase,
    })

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(createSignedUrl).not.toHaveBeenCalled()
    expect(mocks.auditFileSignedUrlCreated).not.toHaveBeenCalled()
  })

  it('mints and audits a URL for faculty on a sanitized, unscanned derivative', async () => {
    const { supabase, createSignedUrl } = makeSupabase({
      patient_files: [{ data: fileRow(), error: null }],
    })

    const result = await createPatientFileSignedUrl({
      fileId: 'file-1',
      purpose: 'download',
      actorUserId: 'faculty-1',
      actorEmail: 'faculty@example.edu',
      actorRole: 'faculty',
      context,
      supabase,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.signedUrl).toBe('https://storage.example/signed')
      expect(result.data.fileName).toBe('patient-image.jpg')
    }
    expect(createSignedUrl).toHaveBeenCalledTimes(1)
    expect(mocks.auditFileSignedUrlCreated).toHaveBeenCalledTimes(1)
  })
})
