import { beforeEach, describe, expect, it, vi } from 'vitest'

import { completeProfile } from '@/lib/profiles/profile-completion.service'
import type { SupabaseAdminClient } from '@/lib/supabase-admin'

const mocks = vi.hoisted(() => ({
  auditProfileCompleted: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  auditProfileCompleted: mocks.auditProfileCompleted,
}))

const context = {
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  requestId: 'req-1',
  correlationId: 'corr-1',
  sourceService: 'test',
  apiVersion: 'v1',
}

function makeSupabase(upsertResult: { error: unknown } = { error: null }) {
  const upsert = vi.fn().mockResolvedValue(upsertResult)
  const from = vi.fn(() => ({ upsert }))
  return { supabase: { from } as unknown as SupabaseAdminClient, from, upsert }
}

beforeEach(() => {
  mocks.auditProfileCompleted.mockReset().mockResolvedValue(true)
})

describe('completeProfile', () => {
  it('rejects missing or malformed inputs before any database write', async () => {
    const { supabase, upsert } = makeSupabase()

    const cases = [
      { userId: '', userEmail: 'a@b.co', fullName: 'Student One', phone: '+905551112233' },
      { userId: 'user-1', userEmail: null, fullName: 'Student One', phone: '+905551112233' },
      { userId: 'user-1', userEmail: 'a@b.co', fullName: '   ', phone: '+905551112233' },
      { userId: 'user-1', userEmail: 'a@b.co', fullName: 'Student One', phone: '123' },
      { userId: 'user-1', userEmail: 'a@b.co', fullName: 42, phone: '+905551112233' },
    ]

    for (const item of cases) {
      const result = await completeProfile({
        role: 'student',
        userId: item.userId,
        userEmail: item.userEmail as string | null,
        fullName: item.fullName,
        phone: item.phone,
        context,
        supabase,
      })
      expect(result).toEqual({ ok: false, reason: 'invalid_request' })
    }

    expect(upsert).not.toHaveBeenCalled()
    expect(mocks.auditProfileCompleted).not.toHaveBeenCalled()
  })

  it('writes the student profile with normalized fields and audits the completion', async () => {
    const { supabase, from, upsert } = makeSupabase()

    const result = await completeProfile({
      role: 'student',
      userId: 'user-1',
      userEmail: ' student@example.edu ',
      fullName: 'Student One ',
      phone: '+90 (555) 111-22-33',
      context,
      supabase,
    })

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('student_profiles')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'student@example.edu',
        full_name: 'Student One',
        phone: '+905551112233',
      })
    )
    expect(mocks.auditProfileCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1', actorRole: 'student' })
    )
  })

  it('routes faculty completions to faculty_profiles', async () => {
    const { supabase, from } = makeSupabase()

    const result = await completeProfile({
      role: 'faculty',
      userId: 'user-2',
      userEmail: 'faculty@example.edu',
      fullName: 'Faculty One',
      phone: '+905551112233',
      context,
      supabase,
    })

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('faculty_profiles')
  })

  it('returns a generic server error and skips the audit when the upsert fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { supabase } = makeSupabase({ error: { message: 'permission denied' } })

    const result = await completeProfile({
      role: 'student',
      userId: 'user-1',
      userEmail: 'student@example.edu',
      fullName: 'Student One',
      phone: '+905551112233',
      context,
      supabase,
    })

    expect(result).toEqual({ ok: false, reason: 'server_error' })
    expect(mocks.auditProfileCompleted).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalled()
  })
})
