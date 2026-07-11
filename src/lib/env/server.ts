import 'server-only'

import { getPublicEnvironment } from './public'

export interface ServerEnvironment {
  APP_URL: string
  CRON_SECRET: string
  FILE_TICKET_SECRET: string
  INVITE_REDIRECT_URL: string
  OPENAI_API_KEY: string
  RATE_LIMIT_HMAC_SECRET: string
  SUPABASE_SERVICE_ROLE_KEY: string
  TWILIO_ACCOUNT_SID: string
  TWILIO_API_KEY_SECRET: string
  TWILIO_API_KEY_SID: string
  TWILIO_VERIFY_SERVICE_SID: string
  SENTRY_DSN?: string
  SENTRY_AUTH_TOKEN?: string
  SENTRY_ORG?: string
  SENTRY_PROJECT?: string
}

function required(name: string, value: string | undefined, minLength = 1): string {
  const normalized = value?.trim()
  if (!normalized || normalized.length < minLength) {
    throw new Error(`${name} is required and must be at least ${minLength} characters.`)
  }
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

export function getServerEnvironment(env: NodeJS.ProcessEnv = process.env): ServerEnvironment {
  getPublicEnvironment(env)
  return {
    APP_URL: validUrl('APP_URL', required('APP_URL', env.APP_URL)),
    CRON_SECRET: required('CRON_SECRET', env.CRON_SECRET, 32),
    FILE_TICKET_SECRET: required('FILE_TICKET_SECRET', env.FILE_TICKET_SECRET, 32),
    INVITE_REDIRECT_URL: validUrl(
      'INVITE_REDIRECT_URL',
      required('INVITE_REDIRECT_URL', env.INVITE_REDIRECT_URL)
    ),
    OPENAI_API_KEY: required('OPENAI_API_KEY', env.OPENAI_API_KEY),
    RATE_LIMIT_HMAC_SECRET: required('RATE_LIMIT_HMAC_SECRET', env.RATE_LIMIT_HMAC_SECRET, 32),
    SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY),
    TWILIO_ACCOUNT_SID: required('TWILIO_ACCOUNT_SID', env.TWILIO_ACCOUNT_SID),
    TWILIO_API_KEY_SECRET: required('TWILIO_API_KEY_SECRET', env.TWILIO_API_KEY_SECRET),
    TWILIO_API_KEY_SID: required('TWILIO_API_KEY_SID', env.TWILIO_API_KEY_SID),
    TWILIO_VERIFY_SERVICE_SID: required('TWILIO_VERIFY_SERVICE_SID', env.TWILIO_VERIFY_SERVICE_SID),
    SENTRY_DSN: optionalUrl('SENTRY_DSN', env.SENTRY_DSN),
    SENTRY_AUTH_TOKEN: env.SENTRY_AUTH_TOKEN?.trim() || undefined,
    SENTRY_ORG: env.SENTRY_ORG?.trim() || undefined,
    SENTRY_PROJECT: env.SENTRY_PROJECT?.trim() || undefined,
  }
}

export function validateProductionEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === 'production') getServerEnvironment(env)
}
