import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  getServerEnvironment: vi.fn(),
}))

vi.mock('@/lib/env/server', () => ({ getServerEnvironment: mocks.getServerEnvironment }))
vi.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}))

import { GET } from '@/app/api/readiness/route'

function admin(error: unknown = null) {
  const builder = { limit: vi.fn().mockResolvedValue({ data: [], error }) }
  return { from: vi.fn(() => ({ select: vi.fn(() => builder) })) }
}

beforeEach(() => {
  mocks.getServerEnvironment.mockReset().mockReturnValue({})
  mocks.createSupabaseAdminClient.mockReset().mockReturnValue(admin())
})

describe('GET /api/readiness', () => {
  it('reports ready after configuration and database checks', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'ready' })
  })

  it('fails closed without exposing dependency details', async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(admin({ message: 'secret database detail' }))
    const response = await GET()
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body).toMatchObject({ status: 'not_ready' })
    expect(JSON.stringify(body)).not.toContain('secret database detail')
  })
})
