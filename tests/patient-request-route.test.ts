import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { POST } from '@/app/api/v1/patient/requests/route'

const mocks = vi.hoisted(() => ({
  auditPatientRequestCreated: vi.fn(),
  attachConfirmedFileToPatientRequest: vi.fn(),
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
  deletePreparedFileObject: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  auditPatientRequestCreated: mocks.auditPatientRequestCreated,
  createAuditRequestContext: mocks.createAuditRequestContext,
}))

vi.mock('@/lib/files/files.service', () => ({
  attachConfirmedFileToPatientRequest: mocks.attachConfirmedFileToPatientRequest,
  deletePreparedFileObject: mocks.deletePreparedFileObject,
}))

vi.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
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
  mocks.auditPatientRequestCreated.mockReset()
  mocks.attachConfirmedFileToPatientRequest.mockReset()
  mocks.deletePreparedFileObject.mockReset()
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
    const { admin, inserts } = createAdminMock()
    mocks.createSupabaseAdminClient.mockReturnValue(admin)

    const response = await POST(makeJsonRequest(validPayload))

    expect(response.status).toBe(200)
    expect(await readJson(response)).toEqual({ success: true })
    expect(mocks.auditPatientRequestCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        consentRecordCount: 2,
        hasAttachment: false,
        patientRequestId: 'patient-request-1',
      })
    )

    const patientRequestInsert = inserts.find((entry) => entry.table === 'patient_requests')
    expect(patientRequestInsert?.payload).toMatchObject({
      attachment_name: null,
      attachment_path: null,
      consent: true,
      full_name: 'Ada Lovelace',
      phone: '+905551234567',
      status: 'submitted',
      urgency: 'Low',
    })

    const consentInsert = inserts.find((entry) => entry.table === 'consent_records')
    expect(consentInsert?.payload).toMatchObject([
      { consent_status: 'accepted', consent_type: 'kvkk_acknowledgement' },
      { consent_status: 'accepted', consent_type: 'explicit_consent' },
    ])
  })
})
