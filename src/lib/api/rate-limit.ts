/**
 * Basic in-memory rate-limit helper.
 *
 * This uses a fixed-window counter kept in a per-process Map. It is intended to
 * be reused by the upcoming patient OTP endpoints (e.g. one limiter keyed by
 * phone number and one keyed by client IP).
 *
 * IMPORTANT — durability limitation:
 *   This store is in-memory and per-instance only. It does not coordinate across
 *   serverless instances or restarts. It is a first, best-effort control.
 *   Durable, shared rate limiting (Redis / Upstash / Vercel KV) is Phase 12
 *   of the platform hardening roadmap and will replace this store. Do not treat
 *   this as a hard security boundary on its own.
 */

export interface RateLimitConfig {
  /** Unique name for this limiter; isolates its counter store from others. */
  name: string
  /** Sliding fixed-window size, in milliseconds. */
  windowMs: number
  /** Maximum allowed requests per identifier within one window. */
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Requests remaining in the current window after this call. */
  remaining: number
  /** The configured maximum for this limiter. */
  limit: number
  /** Epoch ms when the current window resets. */
  resetAt: number
  /** Seconds until reset; suitable for a `Retry-After` header. */
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

// Persist stores on globalThis so they survive module reloads (dev HMR) and are
// shared across limiters created for the same name within one instance.
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

/**
 * Create a named fixed-window rate limiter. Each distinct `name` gets its own
 * isolated counter store, so multiple limiters (per-phone, per-IP, ...) do not
 * interfere with each other.
 */
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
        const entry: RateLimitEntry = { count: 1, resetAt: now + config.windowMs }
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

/**
 * Best-effort client IP extraction from standard proxy headers. Returns
 * 'unknown' when no forwarding header is present. Callers should combine this
 * with another identifier (e.g. phone number) where enumeration matters.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}
