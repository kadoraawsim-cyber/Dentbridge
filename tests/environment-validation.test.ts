import { describe, expect, it } from 'vitest'

import { getPublicEnvironment } from '@/lib/env/public'
import { getServerEnvironment } from '@/lib/env/server'

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    APP_URL: 'https://preview.example.com',
    CRON_SECRET: 'c'.repeat(32),
    FILE_TICKET_SECRET: 'f'.repeat(32),
    INVITE_REDIRECT_URL: 'https://preview.example.com/auth/callback',
    NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL: 'https://preview.example.com/auth/update-password',
    NEXT_PUBLIC_SITE_URL: 'https://preview.example.com',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    OPENAI_API_KEY: 'openai-key',
    RATE_LIMIT_HMAC_SECRET: 'r'.repeat(32),
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    TWILIO_ACCOUNT_SID: 'account-sid',
    TWILIO_API_KEY_SECRET: 'api-key-secret',
    TWILIO_API_KEY_SID: 'api-key-sid',
    TWILIO_VERIFY_SERVICE_SID: 'verify-service-sid',
  }
}

describe('central environment validation', () => {
  it('returns only browser-safe names from the public schema', () => {
    const publicConfig = getPublicEnvironment(validEnvironment())
    expect(Object.keys(publicConfig).every((name) => name.startsWith('NEXT_PUBLIC_'))).toBe(true)
    expect(JSON.stringify(publicConfig)).not.toContain('service-key')
  })

  it('rejects malformed URLs deterministically', () => {
    const env = validEnvironment()
    env.APP_URL = 'not-a-url'
    expect(() => getServerEnvironment(env)).toThrow('APP_URL must be a valid HTTP(S) URL.')

    const unsafeLocalProtocol = validEnvironment()
    unsafeLocalProtocol.NEXT_PUBLIC_SITE_URL = 'ftp://localhost/site'
    expect(() => getPublicEnvironment(unsafeLocalProtocol)).toThrow(
      'NEXT_PUBLIC_SITE_URL must be a valid HTTP(S) URL.'
    )

    const badOptionalDsn = validEnvironment()
    badOptionalDsn.SENTRY_DSN = 'not-a-dsn'
    expect(() => getServerEnvironment(badOptionalDsn)).toThrow(
      'SENTRY_DSN must be a valid HTTP(S) URL.'
    )
  })

  it('rejects missing and undersized production secrets', () => {
    const missing = validEnvironment()
    delete missing.CRON_SECRET
    expect(() => getServerEnvironment(missing)).toThrow('CRON_SECRET')

    const short = validEnvironment()
    short.RATE_LIMIT_HMAC_SECRET = 'short'
    expect(() => getServerEnvironment(short)).toThrow('RATE_LIMIT_HMAC_SECRET')
  })
})
