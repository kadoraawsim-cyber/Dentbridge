import 'server-only'

/**
 * Same-origin guard for public POST endpoints.
 *
 * Browser CSRF attempts normally include an Origin header on POST requests. If
 * Origin is unavailable, Referer gives a fallback source. Requests without both
 * headers are allowed so non-browser clients and privacy-stripped same-origin
 * requests are not broken by this guard.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

function parseOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    return url.origin
  } catch {
    return null
  }
}

function addConfiguredOrigin(origins: Set<string>, value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return
  }

  const withScheme =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`

  const origin = parseOrigin(withScheme)
  if (origin) {
    origins.add(origin)
  }
}

function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return LOCAL_HOSTNAMES.has(url.hostname)
  } catch {
    return false
  }
}

function getAllowedSameOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const origins = new Set<string>()

  addConfiguredOrigin(origins, env.APP_URL)
  addConfiguredOrigin(origins, env.NEXT_PUBLIC_SITE_URL)
  addConfiguredOrigin(origins, env.VERCEL_URL)

  return origins
}

export function isAllowedSameOriginRequest(
  request: Request,
  allowedOrigins: Set<string> = getAllowedSameOrigins()
): boolean {
  const origin = request.headers.get('origin')
  if (origin) {
    return allowedOrigins.has(origin) || isLocalDevelopmentOrigin(origin)
  }

  const referer = request.headers.get('referer')
  if (referer) {
    const refererOrigin = parseOrigin(referer)
    return (
      refererOrigin != null &&
      (allowedOrigins.has(refererOrigin) || isLocalDevelopmentOrigin(refererOrigin))
    )
  }

  return true
}
