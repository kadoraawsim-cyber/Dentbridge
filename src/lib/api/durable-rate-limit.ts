import 'server-only'

import { createHmac } from 'node:crypto'

import { captureException } from '@/lib/observability/error-monitor'
import { getServerEnvironment } from '@/lib/env/server'
import { createSupabaseAdminClient, type SupabaseAdminClient } from '@/lib/supabase-admin'

export interface DurableRateLimitConfig {
  scope: string
  windowSeconds: number
  max: number
  failClosed?: boolean
}

export interface DurableRateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
  unavailable: boolean
}

function identifierHash(scope: string, identifier: string): string {
  const secret = getServerEnvironment().RATE_LIMIT_HMAC_SECRET
  return createHmac('sha256', secret).update(`${scope}\0${identifier}`).digest('hex')
}

export async function checkDurableRateLimit(
  identifier: string,
  config: DurableRateLimitConfig,
  supabase: SupabaseAdminClient = createSupabaseAdminClient()
): Promise<DurableRateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('consume_rate_limit', {
      p_scope: config.scope,
      p_key_hash: identifierHash(config.scope, identifier),
      p_window_seconds: config.windowSeconds,
      p_limit: config.max,
    })

    if (error || !data?.[0]) {
      throw new Error('Durable rate-limit operation failed.')
    }

    return {
      allowed: data[0].allowed,
      retryAfterSeconds: data[0].retry_after_seconds,
      unavailable: false,
    }
  } catch {
    void captureException(new Error('Durable rate limiter unavailable.'), {
      actorType: 'service',
      route: config.scope,
      metadata: { component: 'durable_rate_limit' },
    })
    return {
      allowed: config.failClosed !== false ? false : true,
      retryAfterSeconds: 60,
      unavailable: true,
    }
  }
}
