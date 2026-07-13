import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  captureException,
  captureMessage,
  setErrorMonitorProvider,
} from '@/lib/observability/error-monitor'

afterEach(() => {
  setErrorMonitorProvider(null)
})

describe('error monitor seam', () => {
  it('is a no-op without a configured provider', async () => {
    await expect(captureException(new Error('boom'))).resolves.toBeUndefined()
    await expect(captureMessage('hello')).resolves.toBeUndefined()
  })

  it('redacts context before forwarding to a provider', async () => {
    const provider = {
      captureException: vi.fn(),
      captureMessage: vi.fn(),
    }
    setErrorMonitorProvider(provider)

    await captureException(new Error('failed for +90 555 123 4567'), {
      correlationId: 'correlation-1',
      metadata: {
        full_name: 'Ada Lovelace',
        route_status: 'failed',
      },
      requestId: 'request-1',
      route: 'api.test',
    })
    await captureMessage('patient +90 555 123 4567 failed', {
      metadata: { token: 'secret-token' },
    })

    expect(provider.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        error_message: 'failed for [REDACTED_PHONE]',
        error_name: 'Error',
      }),
      expect.objectContaining({
        metadata: {
          full_name: '[REDACTED]',
          route_status: 'failed',
        },
      })
    )
    expect(provider.captureMessage).toHaveBeenCalledWith(
      'patient [REDACTED_PHONE] failed',
      expect.objectContaining({
        metadata: { token: '[REDACTED]' },
      })
    )
  })
})
