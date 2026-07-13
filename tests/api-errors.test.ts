import { describe, expect, it } from 'vitest'

import {
  getPublicApiError,
  normalizeApiLocale,
  toPublicErrorBody,
  type PublicErrorCode,
} from '@/lib/api/errors'

describe('public API error mapper', () => {
  it.each<[PublicErrorCode, number]>([
    ['invalid_request', 400],
    ['rate_limited', 429],
    ['verification_failed', 400],
    ['service_unavailable', 503],
    ['server_error', 500],
  ])('maps %s to a stable public response', (code, status) => {
    expect(getPublicApiError(code, 'en').status).toBe(status)
    expect(toPublicErrorBody(code, 'en')).toEqual({
      code,
      error: getPublicApiError(code, 'en').message,
    })
  })

  it('keeps verification failures generic to avoid patient status enumeration', () => {
    const body = toPublicErrorBody('verification_failed', 'en')

    expect(body.code).toBe('verification_failed')
    expect(body.error.toLowerCase()).not.toContain('expired')
    expect(body.error.toLowerCase()).not.toContain('wrong code')
    expect(body.error.toLowerCase()).not.toContain('not found')
  })

  it('normalizes unsupported locales to English', () => {
    expect(normalizeApiLocale('tr')).toBe('tr')
    expect(normalizeApiLocale('en')).toBe('en')
    expect(normalizeApiLocale('fr')).toBe('en')
  })
})
