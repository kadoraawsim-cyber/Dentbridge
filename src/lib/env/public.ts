export interface PublicEnvironment {
  NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL: string
  NEXT_PUBLIC_SITE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SENTRY_DSN?: string
}

function required(name: string, value: string | undefined): string {
  const normalized = value?.trim()
  if (!normalized) throw new Error(`${name} is required.`)
  return normalized
}

function validUrl(name: string, value: string): string {
  try {
    const url = new URL(value)
    const isLocalHttp =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    if (url.protocol !== 'https:' && !isLocalHttp) {
      throw new Error('HTTPS is required.')
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL.`)
  }
}

function optionalUrl(name: string, value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? validUrl(name, normalized) : undefined
}

export function getPublicEnvironment(env?: NodeJS.ProcessEnv): PublicEnvironment {
  // Keep these as direct property reads. Next.js only guarantees compile-time
  // replacement of statically referenced NEXT_PUBLIC_* names in client code.
  const source = env ?? {
    NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL:
      process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  }

  return {
    NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL: validUrl(
      'NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL',
      required(
        'NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL',
        source.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL
      )
    ),
    NEXT_PUBLIC_SITE_URL: validUrl(
      'NEXT_PUBLIC_SITE_URL',
      required('NEXT_PUBLIC_SITE_URL', source.NEXT_PUBLIC_SITE_URL)
    ),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: required(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      source.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    NEXT_PUBLIC_SUPABASE_URL: validUrl(
      'NEXT_PUBLIC_SUPABASE_URL',
      required('NEXT_PUBLIC_SUPABASE_URL', source.NEXT_PUBLIC_SUPABASE_URL)
    ),
    NEXT_PUBLIC_SENTRY_DSN: optionalUrl(
      'NEXT_PUBLIC_SENTRY_DSN',
      source.NEXT_PUBLIC_SENTRY_DSN
    ),
  }
}
