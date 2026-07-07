/**
 * Same-origin guard for public POST endpoints.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin
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
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname)
  } catch {
    return false
  }
}

export function getAllowedSameOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
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
