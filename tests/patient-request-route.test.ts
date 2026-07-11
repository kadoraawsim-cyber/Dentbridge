import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { POST } from '@/app/api/v1/patient/requests/route'

const mocks = vi.hoisted(() => ({
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
  checkDurableRateLimit: vi.fn(),
  submitPatientIntakeAtomic: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  createAuditRequestContext: mocks.createAuditRequestContext,
}))

vi.mock('@/lib/patient-request/intake.service', () => ({
  submitPatientIntakeAtomic: mocks.submitPatientIntakeAtomic,
}))

vi.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}))

vi.mock('@/lib/api/durable-rate-limit', () => ({
  checkDurableRateLimit: mocks.checkDurableRateLimit,
}))

interface InsertCall {
  payload: unknown
  table: string
}

const validPayload = {
  age: '34',
  bestContactTime: 'Morning',
  complaintText: 'Routine cleaning and sensitivity check.',
  contactMethod: 'SMS',
  explicitConsent: true,
  fullName: 'Ada Lovelace',
  gender: 'Female',
  kvkkAcknowledgement: true,
  locale: 'en',
  medicalCondition: 'None',
  medicalConditionDetails: '',
  painScore: '2',
  phone: '555 123 4567',
  phoneCountryCode: '+90',
  preferredDays: 'Weekday Mornings',
  preferredLanguage: 'English',
  preferredUniversity: 'İstinye Dental Hospital',
  symptomDuration: 'Routine / No specific start date',
  submissionId: '11111111-1111-4111-8111-111111111111',
  treatmentType: 'Dental Cleaning',
}

let requestCounter = 0

function makeJsonRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  requestCounter += 1
  return new NextRequest('http://localhost/api/v1/patient/requests', {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      'user-agent': 'vitest',
      'x-forwarded-for': `192.0.2.${requestCounter}`,
      ...headers,
    },
    method: 'POST',
  })
}

function createAdminMock() {
  const inserts: InsertCall[] = []

  const patientRequestsBuilder = {
    insert(payload: unknown) {
      inserts.push({ payload, table: 'patient_requests' })
      return patientRequestsBuilder
    },
    select() {
      return patientRequestsBuilder
    },
    async single() {
      return { data: { id: 'patient-request-1' }, error: null }
    },
  }

  const consentRecordsBuilder = {
    async insert(payload: unknown) {
      inserts.push({ payload, table: 'consent_records' })
      return { error: null }
    },
  }

  const admin = {
    from(table: string) {
      if (table === 'patient_requests') {
        return patientRequestsBuilder
      }
      if (table === 'consent_records') {
        return consentRecordsBuilder
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  return { admin, inserts }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

beforeEach(() => {
  mocks.createSupabaseAdminClient.mockReset()
  mocks.checkDurableRateLimit.mockReset().mockResolvedValue({
    allowed: true,
    retryAfterSeconds: 0,
    unavailable: false,
  })
  mocks.submitPatientIntakeAtomic
    .mockReset()
    .mockResolvedValue({ ok: true, patientRequestId: 'patient-request-1' })
})

describe('POST /api/v1/patient/requests', () => {
  it('rejects cross-origin browser posts before touching Supabase', async () => {
    const response = await POST(
      makeJsonRequest(validPayload, { origin: 'https://attacker.example' })
    )

    expect(response.status).toBe(400)
    expect(await readJson(response)).toMatchObject({ code: 'invalid_request' })
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('requires JSON content', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/v1/patient/requests', {
        body: 'fullName=Ada',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'http://localhost:3000',
          'x-forwarded-for': '192.0.2.10',
        },
        method: 'POST',
      })
    )

    expect(response.status).toBe(415)
    expect(await readJson(response)).toMatchObject({ code: 'invalid_request' })
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('requires both KVKK acknowledgement and explicit consent', async () => {
    const response = await POST(
      makeJsonRequest({ ...validPayload, explicitConsent: false })
    )

    expect(response.status).toBe(400)
    expect(await readJson(response)).toMatchObject({ code: 'invalid_request' })
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('rejects incomplete attachment metadata before creating a patient request', async () => {
    const response = await POST(
      makeJsonRequest({
        ...validPayload,
        fileId: '99999999-9999-4999-9999-999999999999',
      })
    )

    expect(response.status).toBe(400)
    expect(await readJson(response)).toMatchObject({ code: 'invalid_request' })
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('creates submitted patient requests and consent records without exposing internals', async () => {
    const { admin } = createAdminMock()
    mocks.createSupabaseAdminClient.mockReturnValue(admin)

    const response = await POST(makeJsonRequest(validPayload))

    expect(response.status).toBe(200)
    expect(await readJson(response)).toEqual({ success: true })
    expect(mocks.submitPatientIntakeAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: null,
        submissionId: validPayload.submissionId,
      })
    )
    const call = mocks.submitPatientIntakeAtomic.mock.calls[0]?.[0]
    expect(call.request).toMatchObject({
      full_name: 'Ada Lovelace',
      phone: '+905551234567',
      urgency: 'Low',
    })
    expect(call.consents).toHaveLength(2)
    expect(call.consents[0].document_fingerprint).toMatch(/^sha256:/)
    expect(call.consents[1].document_fingerprint).toMatch(/^sha256:/)
    expect(call.consents[0].document_title).not.toBe(call.consents[1].document_title)
  })
})
