import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { POST as requestVerification } from '@/app/api/v1/patient/status/request-otp/route'
import { POST as verifyPatientStatus } from '@/app/api/v1/patient/status/route'

const mocks = vi.hoisted(() => ({
  auditPatientStatusLookup: vi.fn(),
  auditPatientStatusOtpRequested: vi.fn(),
  checkPatientStatusVerification: vi.fn(),
  createAuditRequestContext: vi.fn(
    (request: Request, options?: { ipAddress?: string | null }) => ({
      apiVersion: 'test',
      correlationId: 'test-correlation-id',
      ipAddress: options?.ipAddress ?? null,
      requestId: 'test-request-id',
      sourceService: 'test',
      userAgent: request.headers.get('user-agent'),
    })
  ),
  createSupabaseAdminClient: vi.fn(),
  getPhoneLast4: vi.fn((phone: string) => phone.slice(-4)),
  sendPatientStatusVerification: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  auditPatientStatusLookup: mocks.auditPatientStatusLookup,
  auditPatientStatusOtpRequested: mocks.auditPatientStatusOtpRequested,
  createAuditRequestContext: mocks.createAuditRequestContext,
  getPhoneLast4: mocks.getPhoneLast4,
}))

vi.mock('@/lib/otp/twilio-verify', () => ({
  checkPatientStatusVerification: mocks.checkPatientStatusVerification,
  sendPatientStatusVerification: mocks.sendPatientStatusVerification,
}))

vi.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}))

interface PatientRequestBuilder {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

function createAdminMock(data: unknown, error: unknown = null) {
  const builder = {} as PatientRequestBuilder
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(async () => ({ data, error }))

  const admin = {
    from: vi.fn((table: string) => {
      if (table !== 'patient_requests') {
        throw new Error(`Unexpected table: ${table}`)
      }
      return builder
    }),
  }

  return { admin, builder }
}

let requestCounter = 0

function nextPhone(): string {
  requestCounter += 1
  return `+9055500${String(requestCounter).padStart(6, '0')}`
}

function makeJsonRequest(
  path: string,
  body: Record<string, unknown>,
  ip = `192.0.2.${requestCounter + 1}`
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      'user-agent': 'vitest',
      'x-forwarded-for': ip,
    },
    method: 'POST',
  })
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

beforeEach(() => {
  mocks.auditPatientStatusLookup.mockReset().mockResolvedValue(true)
  mocks.auditPatientStatusOtpRequested.mockReset().mockResolvedValue(true)
  mocks.checkPatientStatusVerification.mockReset()
  mocks.createSupabaseAdminClient.mockReset()
  mocks.sendPatientStatusVerification.mockReset()
})

describe('POST /api/v1/patient/status/request-otp', () => {
  it('requests an SMS verification for an existing patient request', async () => {
    const phone = nextPhone()
    const { admin } = createAdminMock({ id: 'patient-request-1' })
    mocks.createSupabaseAdminClient.mockReturnValue(admin)
    mocks.sendPatientStatusVerification.mockResolvedValue({ status: 'pending' })

    const response = await requestVerification(
      makeJsonRequest('/api/v1/patient/status/request-otp', { phone, locale: 'tr' })
    )

    expect(response.status).toBe(200)
    expect(mocks.sendPatientStatusVerification).toHaveBeenCalledWith(phone, 'tr')
    expect(mocks.auditPatientStatusOtpRequested).toHaveBeenCalledWith(
      expect.objectContaining({
        otpIssued: true,
        provider: 'twilio_verify',
        smsDelivered: true,
      })
    )
    expect(admin.from).toHaveBeenCalledWith('patient_requests')
  })

  it('returns the same generic response when no patient request exists', async () => {
    const matchingPhone = nextPhone()
    const missingPhone = nextPhone()
    const matchingAdmin = createAdminMock({ id: 'patient-request-2' }).admin
    const missingAdmin = createAdminMock(null).admin
    mocks.createSupabaseAdminClient
      .mockReturnValueOnce(matchingAdmin)
      .mockReturnValueOnce(missingAdmin)
    mocks.sendPatientStatusVerification.mockResolvedValue({ status: 'pending' })

    const matchingResponse = await requestVerification(
      makeJsonRequest('/api/v1/patient/status/request-otp', {
        phone: matchingPhone,
        locale: 'en',
      })
    )
    const missingResponse = await requestVerification(
      makeJsonRequest('/api/v1/patient/status/request-otp', {
        phone: missingPhone,
        locale: 'en',
      })
    )

    expect(matchingResponse.status).toBe(200)
    expect(missingResponse.status).toBe(200)
    expect(await readJson(missingResponse)).toEqual(await readJson(matchingResponse))
    expect(mocks.sendPatientStatusVerification).toHaveBeenCalledTimes(1)
    expect(mocks.sendPatientStatusVerification).toHaveBeenCalledWith(matchingPhone, 'en')
  })

  it('swallows Twilio send failures without exposing patient existence', async () => {
    const matchingPhone = nextPhone()
    const missingPhone = nextPhone()
    const matchingAdmin = createAdminMock({ id: 'patient-request-3' }).admin
    const missingAdmin = createAdminMock(null).admin
    mocks.createSupabaseAdminClient
      .mockReturnValueOnce(matchingAdmin)
      .mockReturnValueOnce(missingAdmin)
    mocks.sendPatientStatusVerification.mockRejectedValue(
      new Error('provider detail that must never be public')
    )

    const failedSendResponse = await requestVerification(
      makeJsonRequest('/api/v1/patient/status/request-otp', {
        phone: matchingPhone,
        locale: 'en',
      })
    )
    const missingResponse = await requestVerification(
      makeJsonRequest('/api/v1/patient/status/request-otp', {
        phone: missingPhone,
        locale: 'en',
      })
    )
    const failedSendBody = await readJson(failedSendResponse)
    const missingBody = await readJson(missingResponse)

    expect(failedSendResponse.status).toBe(200)
    expect(missingResponse.status).toBe(200)
    expect(failedSendBody).toEqual(missingBody)
    expect(failedSendBody).toMatchObject({ success: true })
    expect(JSON.stringify(failedSendBody)).not.toContain('provider detail')
    expect(mocks.auditPatientStatusOtpRequested).toHaveBeenCalledWith(
      expect.objectContaining({
        otpIssued: false,
        provider: 'twilio_verify',
        smsDelivered: false,
      })
    )
  })

  it('preserves the per-phone request rate limit', async () => {
    const phone = nextPhone()
    const ip = `198.51.100.${requestCounter}`
    const { admin } = createAdminMock(null)
    mocks.createSupabaseAdminClient.mockReturnValue(admin)

    const responses = []
    for (let attempt = 0; attempt < 4; attempt += 1) {
      responses.push(
        await requestVerification(
          makeJsonRequest(
            '/api/v1/patient/status/request-otp',
            { phone, locale: 'en' },
            ip
          )
        )
      )
    }

    expect(responses.slice(0, 3).map((response) => response.status)).toEqual([200, 200, 200])
    expect(responses[3]?.status).toBe(429)
    expect(responses[3]?.headers.get('retry-after')).toMatch(/^\d+$/)
    expect(mocks.sendPatientStatusVerification).not.toHaveBeenCalled()
  })
})

describe('POST /api/v1/patient/status', () => {
  const patientStatus = {
    assigned_department: 'Restorative Dentistry',
    created_at: '2026-07-01T10:00:00.000Z',
    preferred_days: 'Weekday mornings',
    status: 'matched',
    treatment_type: 'Dental Cleaning',
  }

  it('returns the existing patient-status response shape after approval', async () => {
    const phone = nextPhone()
    const { admin } = createAdminMock(patientStatus)
    mocks.createSupabaseAdminClient.mockReturnValue(admin)
    mocks.checkPatientStatusVerification.mockResolvedValue({ status: 'approved' })

    const response = await verifyPatientStatus(
      makeJsonRequest('/api/v1/patient/status', { phone, otp: '123456', locale: 'en' })
    )

    expect(response.status).toBe(200)
    expect(await readJson(response)).toEqual({ success: true, request: patientStatus })
    expect(mocks.checkPatientStatusVerification).toHaveBeenCalledWith(phone, '123456')
    expect(admin.from).toHaveBeenCalledTimes(1)
    expect(admin.from).toHaveBeenCalledWith('patient_requests')
    expect(mocks.auditPatientStatusLookup).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'verified', success: true })
    )
  })

  it.each(['pending', 'failed', 'canceled', 'expired'])(
    'maps a non-approved Twilio status (%s) to verification_failed',
    async (status) => {
      const phone = nextPhone()
      const { admin } = createAdminMock(patientStatus)
      mocks.createSupabaseAdminClient.mockReturnValue(admin)
      mocks.checkPatientStatusVerification.mockResolvedValue({ status })

      const response = await verifyPatientStatus(
        makeJsonRequest('/api/v1/patient/status', { phone, otp: '654321', locale: 'en' })
      )

      expect(response.status).toBe(400)
      expect(await readJson(response)).toMatchObject({ code: 'verification_failed' })
      expect(admin.from).not.toHaveBeenCalled()
    }
  )

  it.each([
    { code: 20404, label: 'missing or expired challenge', status: 404 },
    { code: 60202, label: 'maximum wrong-code attempts', status: 429 },
  ])('maps $label to verification_failed', async ({ code, status }) => {
    const phone = nextPhone()
    const { admin } = createAdminMock(patientStatus)
    mocks.createSupabaseAdminClient.mockReturnValue(admin)
    mocks.checkPatientStatusVerification.mockRejectedValue(
      Object.assign(new Error('Twilio provider detail'), { code, status })
    )

    const response = await verifyPatientStatus(
      makeJsonRequest('/api/v1/patient/status', { phone, otp: '000000', locale: 'tr' })
    )
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({ code: 'verification_failed' })
    expect(JSON.stringify(body)).not.toContain('Twilio')
    expect(admin.from).not.toHaveBeenCalled()
  })

  it('maps an unexpected Twilio outage to the existing generic server error', async () => {
    const phone = nextPhone()
    const { admin } = createAdminMock(patientStatus)
    mocks.createSupabaseAdminClient.mockReturnValue(admin)
    mocks.checkPatientStatusVerification.mockRejectedValue(
      Object.assign(new Error('upstream outage detail'), { code: 20500, status: 503 })
    )

    const response = await verifyPatientStatus(
      makeJsonRequest('/api/v1/patient/status', { phone, otp: '000000', locale: 'en' })
    )
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body).toMatchObject({ code: 'server_error' })
    expect(JSON.stringify(body)).not.toContain('outage')
    expect(admin.from).not.toHaveBeenCalled()
  })

  it('rejects malformed codes before calling Twilio', async () => {
    const phone = nextPhone()
    const { admin } = createAdminMock(patientStatus)
    mocks.createSupabaseAdminClient.mockReturnValue(admin)

    const response = await verifyPatientStatus(
      makeJsonRequest('/api/v1/patient/status', { phone, otp: '12345', locale: 'en' })
    )

    expect(response.status).toBe(400)
    expect(await readJson(response)).toMatchObject({ code: 'verification_failed' })
    expect(mocks.checkPatientStatusVerification).not.toHaveBeenCalled()
    expect(admin.from).not.toHaveBeenCalled()
  })

  it('preserves the per-phone verification rate limit', async () => {
    const phone = nextPhone()
    const ip = `203.0.113.${requestCounter}`
    const { admin } = createAdminMock(patientStatus)
    mocks.createSupabaseAdminClient.mockReturnValue(admin)
    mocks.checkPatientStatusVerification.mockResolvedValue({ status: 'pending' })

    const responses = []
    for (let attempt = 0; attempt < 9; attempt += 1) {
      responses.push(
        await verifyPatientStatus(
          makeJsonRequest(
            '/api/v1/patient/status',
            { phone, otp: '111111', locale: 'en' },
            ip
          )
        )
      )
    }

    expect(responses.slice(0, 8).map((response) => response.status)).toEqual(
      Array.from({ length: 8 }, () => 400)
    )
    expect(responses[8]?.status).toBe(429)
    expect(responses[8]?.headers.get('retry-after')).toMatch(/^\d+$/)
    expect(mocks.checkPatientStatusVerification).toHaveBeenCalledTimes(8)
  })
})
