import { afterEach, describe, expect, it } from 'vitest'

import {
  OTP_CODE_LENGTH,
  OTP_TTL_MINUTES,
  computeOtpExpiry,
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
} from '@/lib/otp/otp.service'

const originalOtpSecret = process.env.OTP_HASH_SECRET

afterEach(() => {
  if (originalOtpSecret == null) {
    delete process.env.OTP_HASH_SECRET
  } else {
    process.env.OTP_HASH_SECRET = originalOtpSecret
  }
})

describe('OTP service primitives', () => {
  it('generates fixed-length numeric verification codes', () => {
    expect(generateOtpCode()).toMatch(new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`))
    expect(generateOtpCode(8)).toMatch(/^\d{8}$/)
    expect(() => generateOtpCode(0)).toThrow('OTP length must be a positive integer.')
  })

  it('hashes OTPs with the server secret and verifies only matching codes', () => {
    process.env.OTP_HASH_SECRET = 'phase-10-secret'

    const hash = hashOtpCode('123456')

    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toBe('123456')
    expect(hashOtpCode('123456')).toBe(hash)
    expect(verifyOtpCode('123456', hash)).toBe(true)
    expect(verifyOtpCode('000000', hash)).toBe(false)
    expect(verifyOtpCode('123456', 'malformed')).toBe(false)
  })

  it('changes hashes when the secret changes and requires the secret to exist', () => {
    process.env.OTP_HASH_SECRET = 'first-secret'
    const firstHash = hashOtpCode('654321')

    process.env.OTP_HASH_SECRET = 'second-secret'
    expect(hashOtpCode('654321')).not.toBe(firstHash)

    delete process.env.OTP_HASH_SECRET
    expect(() => hashOtpCode('654321')).toThrow('OTP_HASH_SECRET is not configured')
  })

  it('computes the configured OTP expiry window', () => {
    const issuedAt = new Date('2026-07-09T10:00:00.000Z')
    const expiresAt = computeOtpExpiry(issuedAt)

    expect(expiresAt.toISOString()).toBe('2026-07-09T10:10:00.000Z')
    expect(expiresAt.getTime() - issuedAt.getTime()).toBe(OTP_TTL_MINUTES * 60 * 1000)
  })
})
