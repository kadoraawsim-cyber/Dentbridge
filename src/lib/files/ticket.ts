import 'server-only'

/**
 * Upload ticket: a short-lived, HMAC-signed proof that a specific `fileId` was
 * issued by our own `prepare-upload` step (Phase 5, Branch 5B).
 *
 * The anonymous patient upload flow has no session. The ticket binds a prepared
 * file id to an expiry so that a caller cannot confirm or attach a file id they
 * did not prepare (IDOR defense), even though object paths are already opaque
 * UUIDs. Mirrors the server-only secret pattern used for OTP hashing.
 *
 * Security rules:
 *   - Signed with HMAC-SHA256 keyed by the server-only FILE_TICKET_SECRET.
 *   - Verified with a constant-time comparison.
 *   - Never logged.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

import { UPLOAD_TICKET_TTL_SECONDS } from './file.constants'

const TICKET_PURPOSE = 'patient_upload'

function getTicketSecret(): string {
  const secret = process.env.FILE_TICKET_SECRET
  if (!secret) {
    throw new Error(
      'FILE_TICKET_SECRET is not configured. It is required to sign patient upload tickets server-side.'
    )
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getTicketSecret()).update(payload).digest('hex')
}

export interface UploadTicket {
  /** Opaque token to hand to the client: `<expEpochSeconds>.<hmacHex>`. */
  value: string
  /** When the ticket (and the pending upload window) expires. */
  expiresAt: Date
}

/** Issue a ticket for a freshly prepared file id. */
export function createUploadTicket(fileId: string, from: Date = new Date()): UploadTicket {
  const exp = Math.floor(from.getTime() / 1000) + UPLOAD_TICKET_TTL_SECONDS
  const signature = sign(`${TICKET_PURPOSE}.${fileId}.${exp}`)
  return { value: `${exp}.${signature}`, expiresAt: new Date(exp * 1000) }
}

/**
 * Verify a ticket against a file id. Returns false for any malformed, expired,
 * or mismatched ticket rather than throwing.
 */
export function verifyUploadTicket(
  fileId: string,
  ticket: unknown,
  now: Date = new Date()
): boolean {
  if (typeof fileId !== 'string' || !fileId || typeof ticket !== 'string') {
    return false
  }

  const separatorIndex = ticket.indexOf('.')
  if (separatorIndex <= 0) {
    return false
  }

  const exp = Number(ticket.slice(0, separatorIndex))
  const providedSignature = ticket.slice(separatorIndex + 1)
  if (!Number.isInteger(exp) || exp <= 0 || !providedSignature) {
    return false
  }

  // Expired.
  if (exp * 1000 <= now.getTime()) {
    return false
  }

  const expectedSignature = sign(`${TICKET_PURPOSE}.${fileId}.${exp}`)
  const provided = Buffer.from(providedSignature, 'hex')
  const expected = Buffer.from(expectedSignature, 'hex')

  if (provided.length === 0 || provided.length !== expected.length) {
    return false
  }

  return timingSafeEqual(provided, expected)
}
