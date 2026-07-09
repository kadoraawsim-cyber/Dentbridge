/**
 * SMS sender abstraction for delivering OTP codes.
 *
 * The platform intentionally hides the concrete SMS provider behind this
 * interface so it can be swapped later (a Turkish SMS gateway, Twilio, etc.)
 * without touching callers — consistent with the database/vendor portability
 * principle in the hardening roadmap.
 *
 * Only the interface and a dev/mock sender exist today; no real provider is
 * integrated. This is intentional, documented technical debt: in production the
 * mock sender fails closed (reports `delivered: false`) instead of delivering.
 */

import 'server-only'

export interface SmsMessage {
  /** Destination phone number in combined E.164-style form (e.g. +90...). */
  to: string
  /** Message text. For OTP flows this contains the plaintext code. */
  body: string
}

export interface SmsSendResult {
  /** True when the sender actually handed the message off for delivery. */
  delivered: boolean
  /** Identifier of the sender implementation used (e.g. 'mock'). */
  provider: string
}

export interface SmsSender {
  readonly name: string
  send(message: SmsMessage): Promise<SmsSendResult>
}

/** Partially redact a phone number for safe logging (keeps only a few digits). */
function redactPhone(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.length <= 4) {
    return '***'
  }
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-2)}`
}

/**
 * Development/mock SMS sender.
 *
 * In development it prints the message (including the code) to the server
 * console so a developer can complete the OTP flow locally without a real SMS
 * provider. This dev-only output is the single intentional place the code is
 * visible locally, and it is disabled outside development. The production OTP
 * service must never log plaintext codes.
 *
 * In production this sender does NOT deliver anything and reports
 * `delivered: false`, so a misconfiguration (no real provider wired) fails
 * closed rather than silently swallowing codes.
 */
function createMockSmsSender(): SmsSender {
  return {
    name: 'mock',
    async send(message: SmsMessage): Promise<SmsSendResult> {
      const isDevelopment = process.env.NODE_ENV !== 'production'

      if (isDevelopment) {
        console.info(
          `[sms:mock][dev-only] to=${redactPhone(message.to)} body=${message.body}`
        )
        return { delivered: true, provider: 'mock' }
      }

      console.warn(
        `[sms:mock] No real SMS provider is configured; message to ${redactPhone(
          message.to
        )} was not delivered.`
      )
      return { delivered: false, provider: 'mock' }
    },
  }
}

/**
 * Resolve the SMS sender to use. Only the mock sender exists; a real provider
 * must be wired behind this same function before OTP delivery can work in
 * production.
 */
export function getSmsSender(): SmsSender {
  return createMockSmsSender()
}
