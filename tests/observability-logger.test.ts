import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  isSensitiveLogKey,
  sanitizeLogMetadata,
  writeLog,
} from '@/lib/observability/logger'

const originalLogLevel = process.env.LOG_LEVEL

afterEach(() => {
  if (originalLogLevel == null) {
    delete process.env.LOG_LEVEL
  } else {
    process.env.LOG_LEVEL = originalLogLevel
  }
  vi.restoreAllMocks()
})

describe('observability logger', () => {
  it('redacts sensitive metadata keys and phone-like values', () => {
    const sanitized = sanitizeLogMetadata({
      authorization: 'Bearer secret-token',
      complaint_text: 'my complaint',
      fileName: 'xray.pdf',
      nested: {
        phone: '+90 555 123 4567',
      },
      route: 'api.v1.patient.requests',
      status_code: 400,
      support_message: 'call +90 555 123 4567',
    })

    expect(sanitized).toMatchObject({
      authorization: '[REDACTED]',
      complaint_text: '[REDACTED]',
      fileName: '[REDACTED]',
      nested: {
        phone: '[REDACTED]',
      },
      route: 'api.v1.patient.requests',
      status_code: 400,
      support_message: 'call [REDACTED_PHONE]',
    })
  })

  it('keeps status_code and error_code usable while blocking sensitive code fields', () => {
    expect(isSensitiveLogKey('status_code')).toBe(false)
    expect(isSensitiveLogKey('error_code')).toBe(false)
    expect(isSensitiveLogKey('code_hash')).toBe(true)
    expect(isSensitiveLogKey('otp_code')).toBe(true)
  })

  it('emits JSON-compatible structured logs', () => {
    process.env.LOG_LEVEL = 'debug'
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    writeLog('info', 'test.event', {
      correlationId: 'correlation-1',
      durationMs: 12.4,
      method: 'POST',
      path: '/api/test',
      requestId: 'request-1',
      route: 'api.test',
      statusCode: 200,
      metadata: { phone: '+90 555 123 4567', safe: true },
    })

    expect(consoleLog).toHaveBeenCalledTimes(1)
    const line = consoleLog.mock.calls[0]?.[0]
    expect(typeof line).toBe('string')
    const parsed = JSON.parse(String(line)) as Record<string, unknown>
    expect(parsed).toMatchObject({
      correlation_id: 'correlation-1',
      event: 'test.event',
      level: 'info',
      method: 'POST',
      path: '/api/test',
      request_id: 'request-1',
      route: 'api.test',
      service: 'dentbridge-web',
      status_code: 200,
    })
    expect(parsed.metadata).toMatchObject({ phone: '[REDACTED]', safe: true })
  })
})
