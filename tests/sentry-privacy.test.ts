import { describe, expect, it } from 'vitest'

import { scrubSentryEvent } from '@/lib/observability/sentry-privacy'

describe('Sentry privacy boundary', () => {
  it('removes request, user, breadcrumb, context, and extra payloads', () => {
    const event = scrubSentryEvent({
      message: 'Failure for +90 555 123 4567',
      request: { data: { complaint: 'sensitive' }, headers: { authorization: 'Bearer token' } },
      user: { email: 'patient@example.com' },
      breadcrumbs: [{ message: 'patient input' }],
      contexts: { form: { name: 'Patient Name' } },
      extra: { filePath: 'signed-url' },
      tags: { objectPath: 'private/patient-file.pdf' },
      fingerprint: ['patient@example.com'],
      exception: { values: [{ value: 'Phone +90 555 123 4567 failed' }] },
    })

    expect(event).not.toHaveProperty('request')
    expect(event).not.toHaveProperty('user')
    expect(event).not.toHaveProperty('breadcrumbs')
    expect(event).not.toHaveProperty('contexts')
    expect(event).not.toHaveProperty('extra')
    expect(event).not.toHaveProperty('tags')
    expect(event).not.toHaveProperty('fingerprint')
    expect(JSON.stringify(event)).not.toContain('555 123 4567')
    expect(JSON.stringify(event)).not.toContain('sensitive')
    expect(JSON.stringify(event)).not.toContain('patient-file.pdf')
    expect(event.message).toBe('DentBridge application error')
    expect(event.exception.values[0].value).toBe('DentBridge application error')
  })
})
