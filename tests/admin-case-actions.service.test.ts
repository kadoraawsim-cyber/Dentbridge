import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeAdminCaseAction } from '@/lib/cases/admin-case-actions.service'
import { LIFECYCLE_MESSAGES } from '@/lib/cases/case-lifecycle'
import type { SupabaseAdminClient } from '@/lib/supabase-admin'

const mocks = vi.hoisted(() => ({
  auditAdminCaseStatusChanged: vi.fn(),
  auditCaseReturnedToPool: vi.fn(),
  auditStudentCaseApproved: vi.fn(),
  auditStudentCaseRejected: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  auditAdminCaseStatusChanged: mocks.auditAdminCaseStatusChanged,
  auditCaseReturnedToPool: mocks.auditCaseReturnedToPool,
  auditStudentCaseApproved: mocks.auditStudentCaseApproved,
  auditStudentCaseRejected: mocks.auditStudentCaseRejected,
  createAuditRequestContext: vi.fn(),
}))

const actor = { userId: 'faculty-1', email: 'faculty@example.edu', role: 'faculty' as const }
const auditContext = {
  apiVersion: 'test',
  correlationId: 'c',
  ipAddress: '127.0.0.1',
  requestId: 'r',
  sourceService: 'test',
  userAgent: 'vitest',
}

/** Minimal service-role client stub; audit is mocked so it is never dereferenced. */
const noopAdminClient = {} as unknown as SupabaseAdminClient

/** Chainable builder that resolves `.maybeSingle()`/`.single()` and awaited chains. */
function tableBuilder({
  single,
  list,
}: {
  single?: { data: unknown; error: unknown }
  list?: { data: unknown; error: unknown }
}) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  for (const method of ['select', 'update', 'insert', 'delete', 'eq', 'in', 'is', 'order', 'limit']) {
    builder[method] = chain
  }
  builder.maybeSingle = () => Promise.resolve(single ?? { data: null, error: null })
  builder.single = () => Promise.resolve(single ?? { data: null, error: null })
  builder.then = (onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(list ?? { data: [], error: null }).then(onFulfilled)
  return builder
}

function makeSupabase(
  tableResults: Record<string, { single?: { data: unknown; error: unknown }; list?: { data: unknown; error: unknown } }>
): SupabaseAdminClient {
  return {
    from(table: string) {
      return tableBuilder(tableResults[table] ?? {})
    },
  } as unknown as SupabaseAdminClient
}

function makeRpcClient(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result)
  return { client: { rpc } as never, rpc }
}

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset())
})

describe('executeAdminCaseAction — authorization', () => {
  it('rejects non-faculty/admin actors', async () => {
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'approve_student_request', request_id: 'req-1' },
      actor: { ...actor, role: 'student' },
      context: auditContext,
      supabase: noopAdminClient,
    })
    expect(res.status).toBe(403)
  })

  it('returns 500 when an RPC-backed action is invoked without an authenticated client', async () => {
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'approve_student_request', request_id: 'req-1' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      // rpcClient intentionally omitted
    })
    expect(res.status).toBe(500)
  })
})

describe('executeAdminCaseAction — approval concurrency & atomicity', () => {
  it('approves via the atomic RPC and passes only server-derived identifiers', async () => {
    const { client, rpc } = makeRpcClient({
      data: {
        ok: true,
        code: 'approved',
        from_status: 'matched',
        case_status: 'student_approved',
        stage_id: 'stage-1',
        reviewed_by: 'faculty@example.edu',
        reviewed_at: '2026-07-10T00:00:00.000Z',
      },
      error: null,
    })

    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'approve_student_request', request_id: 'req-1', student_id: 'ATTACKER' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })

    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('admin_approve_student_request', {
      p_case_id: 'case-1',
      p_request_id: 'req-1',
    })
    // The client-supplied student_id must never be forwarded to the RPC.
    const [, args] = rpc.mock.calls[0]
    expect(JSON.stringify(args)).not.toContain('ATTACKER')
    expect(mocks.auditStudentCaseApproved).toHaveBeenCalledTimes(1)
  })

  it('yields exactly one winner: the losing concurrent approval gets a 409 conflict', async () => {
    // First approval wins.
    const winner = makeRpcClient({ data: { ok: true, code: 'approved', case_status: 'student_approved' }, error: null })
    const first = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'approve_student_request', request_id: 'req-1' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: winner.client,
    })
    expect(first.status).toBe(200)

    // Second approval observes a non-pending request → conflict.
    const loser = makeRpcClient({ data: { ok: false, code: 'conflict' }, error: null })
    const second = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'approve_student_request', request_id: 'req-2' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: loser.client,
    })
    expect(second.status).toBe(409)
    await expect(second.json()).resolves.toEqual({ error: LIFECYCLE_MESSAGES.CONFLICT_RETRY })
  })

  it('surfaces an RPC failure as 500 and does not write a partial audit trail', async () => {
    const { client } = makeRpcClient({ data: null, error: { message: 'deadlock detected' } })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'approve_student_request', request_id: 'req-1' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(500)
    expect(mocks.auditStudentCaseApproved).not.toHaveBeenCalled()
    expect(mocks.auditAdminCaseStatusChanged).not.toHaveBeenCalled()
  })

  it('maps an invalid-state RPC result to a 409 (illegal transition)', async () => {
    const { client } = makeRpcClient({ data: { ok: false, code: 'invalid_state' }, error: null })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'approve_student_request', request_id: 'req-1' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(409)
  })
})

describe('executeAdminCaseAction — terminal transitions', () => {
  it('completes a case via the atomic terminal RPC', async () => {
    const { client, rpc } = makeRpcClient({
      data: { ok: true, code: 'completed', from_status: 'in_treatment', case_status: 'completed' },
      error: null,
    })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'mark_completed' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('admin_set_case_terminal_state_with_decision', {
      p_case_id: 'case-1',
      p_action: 'complete',
      p_reason: null,
    })
    expect(mocks.auditAdminCaseStatusChanged).toHaveBeenCalledTimes(1)
  })

  it('refuses to reopen an already-terminal case (RPC invalid_state → 409)', async () => {
    const { client } = makeRpcClient({ data: { ok: false, code: 'invalid_state' }, error: null })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'mark_completed' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: LIFECYCLE_MESSAGES.INVALID_TRANSITION })
  })

  it('requires a reason before cancelling', async () => {
    const { client, rpc } = makeRpcClient({ data: { ok: true, code: 'cancelled' }, error: null })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'mark_cancelled', reason: '' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('executeAdminCaseAction — return to pool', () => {
  it('returns a case to the pool atomically and audits the change', async () => {
    const { client, rpc } = makeRpcClient({
      data: {
        ok: true,
        code: 'matched',
        from_status: 'student_approved',
        case_status: 'matched',
        request_id: 'req-1',
        student_email: 's@x.edu',
      },
      error: null,
    })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'return_to_pool', reason: 'reassign please' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'admin_return_case_to_pool_with_decision',
      expect.objectContaining({ p_case_id: 'case-1', p_reason: 'reassign please' })
    )
    expect(mocks.auditCaseReturnedToPool).toHaveBeenCalledTimes(1)
  })
})

describe('executeAdminCaseAction — decision-backed routing', () => {
  it('requires and forwards a routing rationale to the atomic next-stage RPC', async () => {
    const { client, rpc } = makeRpcClient({
      data: {
        ok: true,
        code: 'matched',
        from_status: 'faculty_review',
        case_status: 'matched',
        stage_id: 'stage-2',
      },
      error: null,
    })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: {
        action: 'release_next_stage',
        assigned_department: 'Endodontics',
        reason: 'Specialist endodontic treatment is required',
      },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'admin_release_next_stage_with_decision',
      expect.objectContaining({
        p_case_id: 'case-1',
        p_department: 'Endodontics',
        p_reason: 'Specialist endodontic treatment is required',
      })
    )
  })

  it('rejects next-stage release without a rationale before calling the database', async () => {
    const { client, rpc } = makeRpcClient({ data: { ok: true }, error: null })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'release_next_stage', assigned_department: 'Endodontics' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('executeAdminCaseAction — guarded non-RPC transitions', () => {
  it('rejects an illegal reject_student_request on a non-matched case', async () => {
    const { client, rpc } = makeRpcClient({
      data: { ok: false, code: 'invalid_state' },
      error: null,
    })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'reject_student_request', request_id: 'req-1', reason: 'not suitable' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(409)
    expect(rpc).toHaveBeenCalledWith('admin_set_student_request_decision', {
      p_action: 'reject',
      p_case_id: 'case-1',
      p_reason: 'not suitable',
      p_request_id: 'req-1',
    })
  })

  it('blocks reject_student_request once the case is terminal', async () => {
    const { client } = makeRpcClient({ data: { ok: false, code: 'invalid_state' }, error: null })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'reject_student_request', request_id: 'req-1', reason: 'too late' },
      actor,
      context: auditContext,
      supabase: noopAdminClient,
      rpcClient: client,
    })
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: LIFECYCLE_MESSAGES.INVALID_TRANSITION })
  })

  it('returns 409 when a guarded status update loses an optimistic-concurrency race', async () => {
    // loadCaseStatus sees submitted; the conditional update then affects 0 rows.
    const supabase = makeSupabase({
      patient_requests: {
        single: { data: { status: 'submitted', current_stage_id: null }, error: null },
        list: { data: [], error: null },
      },
    })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'save_draft' },
      actor,
      context: auditContext,
      supabase,
    })
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: LIFECYCLE_MESSAGES.CONFLICT_RETRY })
  })

  it('applies a valid guarded transition and audits it', async () => {
    const supabase = makeSupabase({
      patient_requests: {
        single: { data: { status: 'student_approved', current_stage_id: 's1' }, error: null },
        list: { data: [{ id: 'case-1' }], error: null },
      },
    })
    const res = await executeAdminCaseAction({
      caseId: 'case-1',
      body: { action: 'mark_contacted' },
      actor,
      context: auditContext,
      supabase,
    })
    expect(res.status).toBe(200)
    expect(mocks.auditAdminCaseStatusChanged).toHaveBeenCalledTimes(1)
  })
})
