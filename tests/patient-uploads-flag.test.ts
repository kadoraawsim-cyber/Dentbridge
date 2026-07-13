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

describe('PATIENT_UPLOAD_POLICY launch gate', () => {
  const originalPolicy = process.env.PATIENT_UPLOAD_POLICY

  beforeEach(() => {
    mocks.checkDurableRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      unavailable: false,
    })
  })

  afterEach(() => {
    if (originalPolicy === undefined) {
      delete process.env.PATIENT_UPLOAD_POLICY
    } else {
      process.env.PATIENT_UPLOAD_POLICY = originalPolicy
    }
  })

  it('defaults to disabled when the policy is unset', () => {
    delete process.env.PATIENT_UPLOAD_POLICY
    expect(getServerEnvironment().PATIENT_UPLOAD_POLICY).toBe('disabled')
  })

  it('rejects unknown policy values at validation time', () => {
    process.env.PATIENT_UPLOAD_POLICY = 'yes'
    expect(() => getServerEnvironment()).toThrow(
      "PATIENT_UPLOAD_POLICY must be 'disabled', 'sanitized_images', or 'malware_scanned' when set."
    )
  })

  it('fails prepare-upload closed with a generic 503 while disabled', async () => {
    process.env.PATIENT_UPLOAD_POLICY = 'disabled'

    const response = await preparePost(prepareRequest())

    expect(response.status).toBe(503)
    const body = (await response.json()) as { code?: string }
    expect(body.code).toBe('service_unavailable')
    expect(mocks.prepareUpload).not.toHaveBeenCalled()
  })

  it('fails confirm closed with a generic 503 while disabled', async () => {
    process.env.PATIENT_UPLOAD_POLICY = 'disabled'

    const response = await confirmPost(confirmRequest(), confirmParams)

    expect(response.status).toBe(503)
    const body = (await response.json()) as { code?: string }
    expect(body.code).toBe('service_unavailable')
    expect(mocks.confirmUpload).not.toHaveBeenCalled()
  })

  it('lets prepare-upload reach the service under sanitized_images', async () => {
    process.env.PATIENT_UPLOAD_POLICY = 'sanitized_images'
    mocks.prepareUpload.mockResolvedValue({
      ok: true,
      data: {
        fileId: 'file-1',
        uploadUrl: 'https://storage.example/upload',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        ticket: '123.abc',
      },
    })

    const response = await preparePost(prepareRequest())

    expect(response.status).toBe(200)
    const body = (await response.json()) as Record<string, unknown>
    expect(body.uploadUrl).toBe('https://storage.example/upload')
    expect(body.objectPath).toBeUndefined()
    expect(body.token).toBeUndefined()
    expect(mocks.prepareUpload).toHaveBeenCalledTimes(1)
  })

  it('lets confirm reach the service under sanitized_images', async () => {
    process.env.PATIENT_UPLOAD_POLICY = 'sanitized_images'
    mocks.confirmUpload.mockResolvedValue({
      ok: true,
      data: { fileId: 'file-1', status: 'sanitized_unscanned' },
    })

    const response = await confirmPost(confirmRequest(), confirmParams)

    expect(response.status).toBe(200)
    expect(mocks.confirmUpload).toHaveBeenCalledTimes(1)
  })

  it('keeps patient request submission independent of the upload policy', async () => {
    // The requests route module must not import the upload policy; disabling
    // uploads must never disable patient intake when no image is selected.
    const { readFileSync } = await import('node:fs')
    const source = readFileSync('src/app/api/v1/patient/requests/route.ts', 'utf8')
    expect(source).not.toContain('PATIENT_UPLOAD_POLICY')
  })
})
