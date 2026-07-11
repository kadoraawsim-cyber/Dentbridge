import { describe, expect, it, vi } from 'vitest'

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

import {
  checkPatientStatusVerification,
  sendPatientStatusVerification,
} from '@/lib/otp/twilio-verify'

describe('Twilio Verify patient-status adapter', () => {
  it('uses API-key authentication and the configured Verify service', async () => {
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
