import { describe, expect, it, vi } from 'vitest'

import { runPatientSubmission } from '@/lib/patient-request/submission-flow'

const attachment = { name: 'xray.jpg', type: 'image/jpeg', size: 100 }
const prepared = {
  success: true,
  fileId: 'file-1',
  uploadUrl: 'https://storage.example/upload/sign',
  ticket: 'file-ticket',
}

function response(ok: boolean, body: unknown = {}) {
  return { ok, json: vi.fn().mockResolvedValue(body) }
}

async function runWithFailure(stage: 'prepare' | 'upload' | 'confirm' | 'submit') {
  const fetcher = vi.fn()
  const upload = vi.fn().mockResolvedValue({ error: null })
  if (stage === 'prepare') fetcher.mockRejectedValueOnce(new Error('network'))
  else fetcher.mockResolvedValueOnce(response(true, prepared))
  if (stage === 'upload') upload.mockRejectedValueOnce(new Error('network'))
  if (stage === 'confirm') fetcher.mockRejectedValueOnce(new Error('network'))
  else if (stage !== 'prepare' && stage !== 'upload') fetcher.mockResolvedValueOnce(response(true))
  if (stage === 'submit') fetcher.mockRejectedValueOnce(new Error('network'))
  else if (stage !== 'prepare' && stage !== 'upload' && stage !== 'confirm') {
    fetcher.mockResolvedValueOnce(response(true))
  }

  const guard = { current: false }
  const onFailure = vi.fn()
  const onSubmitting = vi.fn()
  const onSuccess = vi.fn()
  const result = await runPatientSubmission({
    attachment,
    dependencies: { fetcher, upload },
    guard,
    locale: 'en',
    onFailure,
    onSubmitting,
    onSuccess,
    requestPayload: { submissionId: 'submission-1' },
  })

  expect(result).toBe('failed')
  expect(onFailure).toHaveBeenCalledOnce()
  expect(onSuccess).not.toHaveBeenCalled()
  expect(onSubmitting.mock.calls).toEqual([[true], [false]])
  expect(guard.current).toBe(false)
}

describe('patient submission pipeline recovery', () => {
  it.each(['prepare', 'upload', 'confirm', 'submit'] as const)(
    'recovers from a rejected %s promise',
    async (stage) => runWithFailure(stage)
  )

  it('prevents duplicate final submissions while one run is active', async () => {
    let resolveRequest: ((value: ReturnType<typeof response>) => void) | undefined
    const fetcher = vi.fn(
      () => new Promise<ReturnType<typeof response>>((resolve) => (resolveRequest = resolve))
    )
    const guard = { current: false }
    const input = {
      attachment: null,
      dependencies: { fetcher, upload: vi.fn() },
      guard,
      locale: 'en',
      onFailure: vi.fn(),
      onSubmitting: vi.fn(),
      onSuccess: vi.fn(),
      requestPayload: { submissionId: 'submission-1' },
    }

    const first = runPatientSubmission(input)
    await expect(runPatientSubmission(input)).resolves.toBe('in_flight')
    expect(fetcher).toHaveBeenCalledOnce()
    resolveRequest?.(response(true))
    await expect(first).resolves.toBe('submitted')
  })

  it('submits a prepared sanitized image without re-uploading it', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(true))
    const upload = vi.fn()

    await expect(runPatientSubmission({
      attachment,
      dependencies: { fetcher, upload },
      guard: { current: false },
      locale: 'en',
      onFailure: vi.fn(),
      onSubmitting: vi.fn(),
      onSuccess: vi.fn(),
      preparedAttachment: { fileId: 'file-1', fileTicket: 'file-ticket' },
      requestPayload: { submissionId: 'submission-1' },
    })).resolves.toBe('submitted')

    expect(fetcher).toHaveBeenCalledOnce()
    expect(upload).not.toHaveBeenCalled()
    expect(JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      fileId: 'file-1',
      fileTicket: 'file-ticket',
    })
  })
})
