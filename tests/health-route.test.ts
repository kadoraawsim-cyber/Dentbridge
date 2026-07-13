import { describe, expect, it } from 'vitest'

import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns basic app readiness without secrets or internals', async () => {
    const response = await GET()
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toMatchObject({
      environment: expect.any(String),
      readiness: { app: 'ok' },
      status: 'ok',
      timestamp: expect.any(String),
      version: { commit: null },
    })
    expect(JSON.stringify(body)).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(JSON.stringify(body)).not.toContain('OPENAI_API_KEY')
  })
})
