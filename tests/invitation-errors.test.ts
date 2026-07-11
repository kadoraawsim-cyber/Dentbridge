import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}))

import { inviteUserWithRole } from '@/lib/auth-invitations'

beforeEach(() => mocks.createSupabaseAdminClient.mockReset())

describe('invitation provider error normalization', () => {
  it('classifies provider throttling without exposing its message', async () => {
    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { inviteUserByEmail: vi.fn().mockResolvedValue({ data: {}, error: {
        status: 429,
        message: 'provider detail',
      } }) } },
    })

    await expect(inviteUserWithRole({
      email: 'student@example.com',
      role: 'student',
      invitedBy: 'admin@example.com',
      redirectTo: 'https://preview.example.com/auth/callback',
    })).rejects.toMatchObject({ reason: 'rate_limited', message: 'Invitation operation failed.' })
  })

  it('classifies existing users as a conflict', async () => {
    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { inviteUserByEmail: vi.fn().mockResolvedValue({ data: {}, error: {
        status: 409,
        code: 'user_already_exists',
        message: 'provider detail',
      } }) } },
    })

    await expect(inviteUserWithRole({
      email: 'student@example.com',
      role: 'student',
      invitedBy: 'admin@example.com',
      redirectTo: 'https://preview.example.com/auth/callback',
    })).rejects.toMatchObject({ reason: 'conflict' })
  })
})
