import { beforeEach, describe, expect, it, vi } from 'vitest'

import { updateStudentCaseStatus } from '@/lib/cases/student-case-status.service'
import { LIFECYCLE_MESSAGES } from '@/lib/cases/case-lifecycle'
import type { SupabaseAdminClient } from '@/lib/supabase-admin'

const mocks = vi.hoisted(() => ({
  auditStudentCaseStatusChanged: vi.fn(),
  auditStudentProgressAdded: vi.fn(),
  getAuthorizedStageContext: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  auditStudentCaseStatusChanged: mocks.auditStudentCaseStatusChanged,
  auditStudentProgressAdded: mocks.auditStudentProgressAdded,
}))

vi.mock('@/lib/cases/case-stage-context', () => ({
  getAuthorizedStageContext: mocks.getAuthorizedStageContext,
}))

const actor = {
  email: 'student@example.edu',
  role: 'student',
  userId: 'student-1',
}

const auditContext = {
  apiVersion: 'test',
  correlationId: 'test-correlation-id',
  ipAddress: '127.0.0.1',
  requestId: 'test-request-id',
  sourceService: 'test',
  userAgent: 'vitest',
}

interface RecordedOperation {
  table: string
  method: string
  payload?: unknown
}

/**
 * Chainable Supabase stub: every builder method records itself and returns the
 * chain; awaiting the chain (or calling single/maybeSingle) pops the next
 * queued result for that table.
 */
function createRecordingSupabase(queues: Record<string, Array<{ data?: unknown; error?: unknown }>>) {
  const operations: RecordedOperation[] = []

  function nextResult(table: string) {
    const queue = queues[table] ?? []
    return queue.shift() ?? { data: null, error: null }
  }

  function builderFor(table: string) {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'is', 'in', 'order', 'limit']) {
      builder[method] = () => builder
    }
    for (const method of ['insert', 'update', 'upsert', 'delete']) {
      builder[method] = (payload?: unknown) => {
        operations.push({ table, method, payload })
        return builder
      }
    }
    builder.single = () => Promise.resolve(nextResult(table))
    builder.maybeSingle = () => Promise.resolve(nextResult(table))
    builder.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(nextResult(table)).then(onFulfilled, onRejected)
    return builder
  }

  const supabase = {
    from(table: string) {
      return builderFor(table)
    },
  } as unknown as SupabaseAdminClient

  return { supabase, operations }
}

function stageContext(overrides: Partial<{ caseStatus: string; stageStatus: string }> = {}) {
  return {
    context: {
      approvedRequestId: 'request-1',
      currentCase: {
        assigned_department: 'Endodontics',
        current_stage_id: 'stage-1',
        full_name: 'Patient One',
        status: overrides.caseStatus ?? 'student_approved',
      },
      stageDepartment: 'Endodontics',
      stageId: 'stage-1',
      stageStatus: overrides.stageStatus ?? 'student_assigned',
    },
    response: null,
  }
}

beforeEach(() => {
  mocks.auditStudentCaseStatusChanged.mockReset()
  mocks.auditStudentProgressAdded.mockReset()
  mocks.getAuthorizedStageContext.mockReset()
})

describe('student lifecycle optimistic-concurrency guards', () => {
  it('returns 409 and reverts the stage when the case moved under a lifecycle action', async () => {
    mocks.getAuthorizedStageContext.mockResolvedValue(stageContext())
    const { supabase, operations } = createRecordingSupabase({
      // Stage update succeeds, guarded case update matches zero rows (the case
      // was concurrently returned to the pool), stage revert succeeds.
      case_routing_stages: [{ error: null }, { error: null }],
      patient_requests: [{ data: [], error: null }],
    })

    const result = await updateStudentCaseStatus({
      actor,
      body: { action: 'mark_contacted' },
      caseId: 'case-1',
      context: auditContext,
      supabase,
    })

    expect(result).toEqual({
      body: { error: LIFECYCLE_MESSAGES.CONFLICT_RETRY },
      status: 409,
    })

    const stageUpdates = operations.filter(
      (op) => op.table === 'case_routing_stages' && op.method === 'update'
    )
    expect(stageUpdates).toHaveLength(2)
    expect((stageUpdates[1]!.payload as { status: string }).status).toBe('student_assigned')
    expect(mocks.auditStudentCaseStatusChanged).not.toHaveBeenCalled()
  })

  it('deletes the progress entry and planner event when a scheduled action loses the race', async () => {
    mocks.getAuthorizedStageContext.mockResolvedValue(
      stageContext({ caseStatus: 'contacted', stageStatus: 'contacted' })
    )
    const { supabase, operations } = createRecordingSupabase({
      student_profiles: [{ data: { full_name: 'Student One' }, error: null }],
      case_progress_entries: [
        { data: { id: 'entry-1' }, error: null },
        { error: null },
      ],
      student_planner_events: [{ error: null }, { error: null }],
      case_routing_stages: [{ error: null }, { error: null }],
      patient_requests: [{ data: [], error: null }],
    })

    const result = await updateStudentCaseStatus({
      actor,
      body: { action: 'mark_appointment_scheduled', appointment_date: '2026-07-20' },
      caseId: 'case-1',
      context: auditContext,
      supabase,
    })

    expect(result.status).toBe(409)
    expect(
      operations.some((op) => op.table === 'case_progress_entries' && op.method === 'delete')
    ).toBe(true)
    expect(
      operations.some((op) => op.table === 'student_planner_events' && op.method === 'delete')
    ).toBe(true)
    expect(mocks.auditStudentProgressAdded).not.toHaveBeenCalled()
  })

  it('returns 409 without touching the stage when submit-for-review loses the race', async () => {
    mocks.getAuthorizedStageContext.mockResolvedValue(
      stageContext({ caseStatus: 'in_treatment', stageStatus: 'in_treatment' })
    )
    const { supabase, operations } = createRecordingSupabase({
      patient_requests: [{ data: [], error: null }],
    })

    const result = await updateStudentCaseStatus({
      actor,
      body: { action: 'submit_stage_for_review' },
      caseId: 'case-1',
      context: auditContext,
      supabase,
    })

    expect(result).toEqual({
      body: { error: LIFECYCLE_MESSAGES.CONFLICT_RETRY },
      status: 409,
    })
    expect(operations.filter((op) => op.table === 'case_routing_stages')).toHaveLength(0)
  })

  it('applies the transition when the guarded update matches the observed status', async () => {
    mocks.getAuthorizedStageContext.mockResolvedValue(stageContext())
    const { supabase } = createRecordingSupabase({
      case_routing_stages: [{ error: null }],
      patient_requests: [{ data: [{ id: 'case-1' }], error: null }],
    })

    const result = await updateStudentCaseStatus({
      actor,
      body: { action: 'mark_contacted' },
      caseId: 'case-1',
      context: auditContext,
      supabase,
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ success: true })
    expect(mocks.auditStudentCaseStatusChanged).toHaveBeenCalledTimes(1)
  })
})
