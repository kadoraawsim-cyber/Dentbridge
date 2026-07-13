import { describe, expect, it, vi } from 'vitest'

import {
  createRequestContext,
  logRequestEnd,
  logRequestStart,
} from '@/lib/observability/request-context'
import { logger } from '@/lib/observability/logger'

describe('request context observability helpers', () => {
  it('reuses request and correlation headers and buckets IP addresses', () => {
    const request = new Request('https://dentbridge.example/api/v1/patient/status', {
      headers: {
        'user-agent': 'vitest-agent',
        'x-correlation-id': 'correlation-123',
        'x-forwarded-for': '203.0.113.77',
        'x-request-id': 'request-123',
      },
      method: 'POST',
    })

    const context = createRequestContext(request, { route: 'api.v1.patient.status.verify' })

    expect(context.requestId).toBe('request-123')
    expect(context.correlationId).toBe('correlation-123')
    expect(context.method).toBe('POST')
    expect(context.path).toBe('/api/v1/patient/status')
    expect(context.route).toBe('api.v1.patient.status.verify')
    expect(context.userAgent).toBe('vitest-agent')
    expect(context.ipBucket).toBe('203.0.113.0/24')
    expect(context.durationMs()).toBeGreaterThanOrEqual(0)
  })

  it('logs request start and end with stable event names', () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined)
    const context = createRequestContext(
      new Request('https://dentbridge.example/api/health', { method: 'GET' }),
      { route: 'api.health' }
    )

    logRequestStart(context)
    logRequestEnd(context, { statusCode: 200 })

    expect(info.mock.calls[0]?.[0]).toBe('api.request.start')
    expect(info.mock.calls[1]?.[0]).toBe('api.request.end')
    expect(info.mock.calls[1]?.[1]).toMatchObject({
      method: 'GET',
      path: '/api/health',
      route: 'api.health',
      statusCode: 200,
    })
  })
})
