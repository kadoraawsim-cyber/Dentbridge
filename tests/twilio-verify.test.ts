import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const verificationChecksCreate = vi.fn()
  const verificationsCreate = vi.fn()
  const services = vi.fn(() => ({
    verificationChecks: { create: verificationChecksCreate },
    verifications: { create: verificationsCreate },
  }))
  const twilio = vi.fn(() => ({ verify: { v2: { services } } }))

  return { services, twilio, verificationChecksCreate, verificationsCreate }
})

vi.mock('twilio', () => ({ default: mocks.twilio }))

const TWILIO_TEST_ENV = {
  TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
  TWILIO_API_KEY_SID: 'SK00000000000000000000000000000000',
  TWILIO_API_KEY_SECRET: 'test-twilio-api-key-secret',
  TWILIO_VERIFY_SERVICE_SID: 'VA00000000000000000000000000000000',
} as const

const originalTwilioEnv = Object.fromEntries(
  Object.keys(TWILIO_TEST_ENV).map((key) => [key, process.env[key]])
) as Record<keyof typeof TWILIO_TEST_ENV, string | undefined>

describe('Twilio Verify patient-status adapter', () => {
  beforeEach(() => {
    vi.resetModules()

    for (const [key, value] of Object.entries(TWILIO_TEST_ENV)) {
      process.env[key] = value
    }
  })

  afterEach(() => {
    for (const key of Object.keys(TWILIO_TEST_ENV) as Array<keyof typeof TWILIO_TEST_ENV>) {
      const original = originalTwilioEnv[key]
      if (original === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = original
      }
    }
  })

  it('uses API-key authentication and the configured Verify service', async () => {
    const {
      checkPatientStatusVerification,
      sendPatientStatusVerification,
    } = await import('@/lib/otp/twilio-verify')

    mocks.verificationsCreate.mockResolvedValue({ status: 'pending' })
    mocks.verificationChecksCreate.mockResolvedValue({ status: 'approved' })

    await expect(sendPatientStatusVerification('+905551234567', 'tr')).resolves.toMatchObject({
      status: 'pending',
    })
    await expect(checkPatientStatusVerification('+905551234567', '123456')).resolves.toMatchObject({
      status: 'approved',
    })

    expect(mocks.twilio).toHaveBeenCalledTimes(1)
    expect(mocks.twilio).toHaveBeenCalledWith(
      'SK00000000000000000000000000000000',
      'test-twilio-api-key-secret',
      { accountSid: 'AC00000000000000000000000000000000' }
    )
    expect(mocks.services).toHaveBeenCalledWith('VA00000000000000000000000000000000')
    expect(mocks.verificationsCreate).toHaveBeenCalledWith({
      channel: 'sms',
      locale: 'tr',
      to: '+905551234567',
    })
    expect(mocks.verificationChecksCreate).toHaveBeenCalledWith({
      code: '123456',
      to: '+905551234567',
    })
  })
})
