import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import { auditFileSignedUrlCreated } from '@/lib/audit/audit.service'

const decisionSql = [
  'supabase/migrations/20260711030000_release_atomic_case_decisions.sql',
  'supabase/migrations/20260711031000_release_atomic_routing_decision.sql',
  'supabase/migrations/20260711032000_release_atomic_terminal_decision.sql',
  'supabase/migrations/20260711033000_release_atomic_student_request_decision.sql',
  'supabase/migrations/20260711034000_release_atomic_triage_decision.sql',
  'supabase/migrations/20260711035000_release_function_permissions.sql',
].map((path) => readFileSync(path, 'utf8')).join('\n')

const context = {
  apiVersion: 'v1', correlationId: 'correlation', ipAddress: null,
  requestId: 'request', sourceService: 'test', userAgent: null,
}

function insertAdmin(error: unknown = null) {
  const insert = vi.fn().mockResolvedValue({ error })
  return { admin: { from: vi.fn(() => ({ insert })) }, insert }
}

describe('audit and decision accountability', () => {
  it.each(['student', 'faculty', 'admin'] as const)(
    'attributes file access to the authenticated %s',
    async (role) => {
      const { admin, insert } = insertAdmin()
      await auditFileSignedUrlCreated({
        fileId: '11111111-1111-4111-8111-111111111111',
        patientRequestId: '22222222-2222-4222-8222-222222222222',
        purpose: 'preview', expirySeconds: 120,
        actorUserId: '33333333-3333-4333-8333-333333333333',
        actorRole: role, context, supabase: admin as never,
      })
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ actor_type: role }))
    }
  )

  it('persists required decisions in the same transaction as each mutation', () => {
    expect(decisionSql).toContain('admin_return_case_to_pool_with_decision')
    expect(decisionSql).toContain('admin_release_next_stage_with_decision')
    expect(decisionSql).toContain('admin_set_case_terminal_state_with_decision')
    expect(decisionSql).toContain('admin_set_student_request_decision')
    expect(decisionSql).toContain('admin_update_case_triage_with_decision')
    expect(decisionSql).toContain('INSERT INTO public.case_decision_history')
    expect(decisionSql).toContain('v_actor uuid := auth.uid()')
    expect(decisionSql).toContain('SET search_path = public, pg_temp')
    expect(decisionSql).toContain(
      'REVOKE EXECUTE ON FUNCTION public.admin_return_case_to_pool'
    )
  })
})
