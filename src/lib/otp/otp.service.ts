/**
 * OTP service primitives for secure patient status verification.
 *
 * This module is intentionally limited to pure, stateless primitives:
 * generating a numeric code, hashing it with a server-only secret, verifying a
 * code against a stored hash, and computing expiry. Persistence and attempt
 * counting live in the patient status routes and the `otp_codes` table;
 * delivery lives in the SMS sender.
 *
 * Security rules enforced here:
 *   - Codes are hashed with HMAC-SHA256 keyed by a server-only secret
 *     (OTP_HASH_SECRET). The plaintext code is never persisted.
 *   - This module never logs the plaintext code or the secret.
 *   - Verification uses a constant-time comparison to avoid timing oracles.
 */

import 'server-only'

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

/** Number of digits in a generated OTP code. */
export const OTP_CODE_LENGTH = 6

/** Code lifetime in minutes (roadmap range: 5–10 minutes). */
export const OTP_TTL_MINUTES = 10

/**
 * Generate a numeric OTP code of the given length.
 *
 * Uses crypto.randomInt per digit for unbiased, cryptographically strong
 * randomness, and preserves leading zeros.
 */
export function generateOtpCode(length: number = OTP_CODE_LENGTH): string {
  if (!Number.isInteger(length) || length < 1) {
    throw new Error('OTP length must be a positive integer.')
  }

  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += randomInt(0, 10).toString()
  }
  return code
}

function getOtpHashSecret(): string {
  const secret = process.env.OTP_HASH_SECRET
  if (!secret) {
    throw new Error(
      'OTP_HASH_SECRET is not configured. It is required to hash OTP codes server-side.'
    )
  }
  return secret
}

/**
 * Hash an OTP code with HMAC-SHA256 keyed by the server-only OTP_HASH_SECRET.
 * The returned hex digest is what gets stored in `otp_codes.code_hash`.
 */
export function hashOtpCode(code: string): string {
  return createHmac('sha256', getOtpHashSecret()).update(code).digest('hex')
}

/**
 * Verify a candidate code against a previously stored hash using a constant-time
 * comparison. Returns false for any malformed or length-mismatched hash rather
 * than throwing.
 */
export function verifyOtpCode(code: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashOtpCode(code), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')

  if (actual.length === 0 || actual.length !== expected.length) {
    return false
  }

  return timingSafeEqual(actual, expected)
}

/** Compute the expiry timestamp for a newly issued code. */
export function computeOtpExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MINUTES * 60 * 1000)
}
