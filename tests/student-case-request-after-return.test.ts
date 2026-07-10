import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createStudentCaseRequest } from '@/lib/cases/student-case-request.service'
import { LIFECYCLE_MESSAGES } from '@/lib/cases/case-lifecycle'
import type { SupabaseAdminClient } from '@/lib/supabase-admin'

const mocks = vi.hoisted(() => ({
  auditStudentCaseRequested: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  auditStudentCaseRequested: mocks.auditStudentCaseRequested,
}))

type Result = { data: unknown; error: unknown }

function tableBuilder(single: Result) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  for (const method of ['select', 'update', 'insert', 'eq', 'in', 'is', 'order', 'limit']) {
    builder[method] = chain
  }
  builder.maybeSingle = () => Promise.resolve(single)
  builder.single = () => Promise.resolve(single)
  return builder
}

function makeSupabase(results: Record<string, Result>): SupabaseAdminClient {
  return {
    from(table: string) {
      return tableBuilder(results[table] ?? { data: null, error: null })
    },
  } as unknown as SupabaseAdminClient
}

const actor = { userId: 'student-2', email: 'student2@example.edu', role: 'student' as const }
const context = {
  apiVersion: 'test',
  correlationId: 'c',
  ipAddress: '127.0.0.1',
  requestId: 'r',
  sourceService: 'test',
  userAgent: 'vitest',
}

beforeEach(() => {
  mocks.auditStudentCaseRequested.mockReset()
})

describe('createStudentCaseRequest after return-to-pool', () => {
  it('lets a different student request a case that was returned to the pool', async () => {
    // Post return-to-pool state: case is matched again and its current stage is released.
    const supabase = makeSupabase({
      patient_requests: { data: { id: 'case-1', status: 'matched', current_stage_id: 'stage-1' }, error: null },
      case_routing_stages: { data: { id: 'stage-1', status: 'released' }, error: null },
      student_case_requests: {
        data: {
          id: 'req-new',
          case_id: 'case-1',
          stage_id: 'stage-1',
          status: 'pending',
          created_at: '2026-07-10T00:00:00Z',
        },
        error: null,
      },
    })

    const result = await createStudentCaseRequest({ caseId: 'case-1', actor, context, supabase })

    expect(result.status).toBe(201)
    expect(result.body).toMatchObject({ success: true })
    expect(mocks.auditStudentCaseRequested).toHaveBeenCalledTimes(1)
  })

  it('rejects a request when the case is not in the matched pool', async () => {
    const supabase = makeSupabase({
      patient_requests: { data: { id: 'case-1', status: 'student_approved', current_stage_id: 'stage-1' }, error: null },
    })

    const result = await createStudentCaseRequest({ caseId: 'case-1', actor, context, supabase })

    expect(result.status).toBe(409)
    expect(result.body).toEqual({ error: LIFECYCLE_MESSAGES.CASE_NOT_AVAILABLE_FOR_REQUESTS })
  })
})
