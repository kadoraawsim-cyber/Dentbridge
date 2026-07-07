/**
 * Basic in-memory fixed-window rate limiter for public API endpoints.
 *
 * This is per-process and best-effort only. It is useful for public abuse
 * friction, not a durable global security boundary.
 */

export interface RateLimitConfig {
  name: string
  windowMs: number
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: number
  retryAfterSeconds: number
}

export interface RateLimiter {
  check(identifier: string): RateLimitResult
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const MAX_STORE_ENTRIES_BEFORE_PRUNE = 5000

const globalForRateLimit = globalThis as typeof globalThis & {
  __dentbridgeRateLimitStores?: Map<string, Map<string, RateLimitEntry>>
}

const rateLimitStores =
  globalForRateLimit.__dentbridgeRateLimitStores ??
  new Map<string, Map<string, RateLimitEntry>>()

if (!globalForRateLimit.__dentbridgeRateLimitStores) {
  globalForRateLimit.__dentbridgeRateLimitStores = rateLimitStores
}

function getStore(name: string): Map<string, RateLimitEntry> {
  const existing = rateLimitStores.get(name)
  if (existing) {
    return existing
  }

  const store = new Map<string, RateLimitEntry>()
  rateLimitStores.set(name, store)
  return store
}

function pruneExpired(store: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

function buildResult(
  allowed: boolean,
  remaining: number,
  limit: number,
  resetAt: number,
  now: number
): RateLimitResult {
  return {
    allowed,
    remaining: Math.max(0, remaining),
    limit,
    resetAt,
    retryAfterSeconds: Math.max(0, Math.ceil((resetAt - now) / 1000)),
  }
}

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const store = getStore(config.name)

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now()

      if (store.size > MAX_STORE_ENTRIES_BEFORE_PRUNE || Math.random() < 0.01) {
        pruneExpired(store, now)
      }

      const existing = store.get(identifier)

      if (!existing || existing.resetAt <= now) {
        const entry = { count: 1, resetAt: now + config.windowMs }
        store.set(identifier, entry)
        return buildResult(true, config.max - 1, config.max, entry.resetAt, now)
      }

      if (existing.count >= config.max) {
        return buildResult(false, 0, config.max, existing.resetAt, now)
      }

      existing.count += 1
      store.set(identifier, existing)
      return buildResult(true, config.max - existing.count, config.max, existing.resetAt, now)
    },
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}
