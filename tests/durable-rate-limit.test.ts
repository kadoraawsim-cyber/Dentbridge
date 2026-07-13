import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkDurableRateLimit } from '@/lib/api/durable-rate-limit'

beforeEach(() => {
  process.env.RATE_LIMIT_HMAC_SECRET = 'test-rate-limit-secret-at-least-32-characters'
})

describe('durable rate limiter', () => {
  it('sends only a keyed hash to the atomic database function', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: true, remaining: 2, retry_after_seconds: 30 }],
      error: null,
    })
    const result = await checkDurableRateLimit(
      '+905551234567',
      { scope: 'patient_status_otp_phone', windowSeconds: 900, max: 3 },
      { rpc } as never
    )

    expect(result).toEqual({ allowed: true, retryAfterSeconds: 30, unavailable: false })
    const args = rpc.mock.calls[0]?.[1]
    expect(args.p_key_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(args)).not.toContain('+905551234567')
  })

  it('fails closed when the shared store is unavailable', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: '08006' } })
    await expect(
      checkDurableRateLimit('198.51.100.1', {
        scope: 'patient_chat_ip',
        windowSeconds: 60,
        max: 8,
      }, { rpc } as never)
    ).resolves.toMatchObject({ allowed: false, unavailable: true })
  })

  it('uses one atomic upsert shared by concurrent callers', () => {
    const sql = readFileSync(
      'supabase/migrations/20260711010000_release_durable_rate_limits.sql',
      'utf8'
    )
    expect(sql).toContain('ON CONFLICT (scope, key_hash, window_start)')
    expect(sql).toContain('request_count = public.rate_limit_buckets.request_count + 1')
    expect(sql).toContain('REVOKE ALL ON TABLE public.rate_limit_buckets FROM anon, authenticated')
  })
})
