import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { POST as preparePost } from '@/app/api/v1/files/prepare-upload/route'
import { POST as confirmPost } from '@/app/api/v1/files/[id]/confirm/route'
import { getServerEnvironment } from '@/lib/env/server'

const mocks = vi.hoisted(() => ({
  prepareUpload: vi.fn(),
  confirmUpload: vi.fn(),
  checkDurableRateLimit: vi.fn(),
  createAuditRequestContext: vi.fn(() => ({
    apiVersion: 'test',
    correlationId: 'test-correlation-id',
    ipAddress: null,
    requestId: 'test-request-id',
    sourceService: 'test',
    userAgent: null,
  })),
}))

vi.mock('@/lib/files/files.service', () => ({
  prepareUpload: mocks.prepareUpload,
  confirmUpload: mocks.confirmUpload,
}))

vi.mock('@/lib/api/durable-rate-limit', () => ({
  checkDurableRateLimit: mocks.checkDurableRateLimit,
}))

vi.mock('@/lib/audit/audit.service', () => ({
  createAuditRequestContext: mocks.createAuditRequestContext,
}))

function prepareRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/files/prepare-upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'xray.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      locale: 'en',
    }),
  })
}

function confirmRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/files/file-1/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticket: '123.abc', locale: 'en' }),
  })
}

const confirmParams = { params: Promise.resolve({ id: 'file-1' }) }

describe('PATIENT_UPLOADS_ENABLED launch gate', () => {
  const originalFlag = process.env.PATIENT_UPLOADS_ENABLED

  beforeEach(() => {
    mocks.checkDurableRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      unavailable: false,
    })
  })

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.PATIENT_UPLOADS_ENABLED
    } else {
      process.env.PATIENT_UPLOADS_ENABLED = originalFlag
    }
  })

  it('defaults to disabled when the flag is unset', () => {
    delete process.env.PATIENT_UPLOADS_ENABLED
    expect(getServerEnvironment().PATIENT_UPLOADS_ENABLED).toBe(false)
  })

  it('rejects any value other than true/false at validation time', () => {
    process.env.PATIENT_UPLOADS_ENABLED = 'yes'
    expect(() => getServerEnvironment()).toThrow(
      "PATIENT_UPLOADS_ENABLED must be 'true' or 'false' when set."
    )
  })

  it('fails prepare-upload closed with a generic 503 while disabled', async () => {
    process.env.PATIENT_UPLOADS_ENABLED = 'false'

    const response = await preparePost(prepareRequest())

    expect(response.status).toBe(503)
    const body = (await response.json()) as { code?: string }
    expect(body.code).toBe('service_unavailable')
    expect(mocks.prepareUpload).not.toHaveBeenCalled()
  })

  it('fails confirm closed with a generic 503 while disabled', async () => {
    process.env.PATIENT_UPLOADS_ENABLED = 'false'

    const response = await confirmPost(confirmRequest(), confirmParams)

    expect(response.status).toBe(503)
    const body = (await response.json()) as { code?: string }
    expect(body.code).toBe('service_unavailable')
    expect(mocks.confirmUpload).not.toHaveBeenCalled()
  })

  it('lets prepare-upload reach the service when enabled', async () => {
    process.env.PATIENT_UPLOADS_ENABLED = 'true'
    mocks.prepareUpload.mockResolvedValue({
      ok: true,
      data: {
        fileId: 'file-1',
        objectPath: 'patient-requests/session/file-1.png',
        uploadUrl: 'https://storage.example/upload',
        token: 'signed-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        ticket: '123.abc',
      },
    })

    const response = await preparePost(prepareRequest())

    expect(response.status).toBe(200)
    expect(mocks.prepareUpload).toHaveBeenCalledTimes(1)
  })

  it('lets confirm reach the service when enabled', async () => {
    process.env.PATIENT_UPLOADS_ENABLED = 'true'
    mocks.confirmUpload.mockResolvedValue({
      ok: true,
      data: { fileId: 'file-1', status: 'quarantined' },
    })

    const response = await confirmPost(confirmRequest(), confirmParams)

    expect(response.status).toBe(200)
    expect(mocks.confirmUpload).toHaveBeenCalledTimes(1)
  })

  it('keeps patient request submission independent of the upload flag', async () => {
    // The requests route module must not import the upload gate; disabling
    // uploads must never disable patient intake.
    const { readFileSync } = await import('node:fs')
    const source = readFileSync('src/app/api/v1/patient/requests/route.ts', 'utf8')
    expect(source).not.toContain('PATIENT_UPLOADS_ENABLED')
  })
})
