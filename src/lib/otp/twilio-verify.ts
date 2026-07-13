import 'server-only'

import twilio from 'twilio'

type VerifyLocale = 'en' | 'tr'

let client: ReturnType<typeof twilio> | null = null

function requireServerEnvironmentVariable(name: string, value: string | undefined): string {
  const normalized = value?.trim()
  if (!normalized) {
    throw new Error(`${name} is not configured.`)
  }
  return normalized
}

function getVerifyClient() {
  if (!client) {
    const accountSid = requireServerEnvironmentVariable(
      'TWILIO_ACCOUNT_SID',
      process.env.TWILIO_ACCOUNT_SID
    )
    const apiKeySid = requireServerEnvironmentVariable(
      'TWILIO_API_KEY_SID',
      process.env.TWILIO_API_KEY_SID
    )
    const apiKeySecret = requireServerEnvironmentVariable(
      'TWILIO_API_KEY_SECRET',
      process.env.TWILIO_API_KEY_SECRET
    )

    client = twilio(apiKeySid, apiKeySecret, { accountSid })
  }

  return client
}

function getVerifyServiceSid(): string {
  return requireServerEnvironmentVariable(
    'TWILIO_VERIFY_SERVICE_SID',
    process.env.TWILIO_VERIFY_SERVICE_SID
  )
}

export async function sendPatientStatusVerification(phone: string, locale: VerifyLocale) {
  return getVerifyClient()
    .verify.v2.services(getVerifyServiceSid())
    .verifications.create({
      to: phone,
      channel: 'sms',
      locale,
    })
}

export async function checkPatientStatusVerification(phone: string, code: string) {
  return getVerifyClient()
    .verify.v2.services(getVerifyServiceSid())
    .verificationChecks.create({
      to: phone,
      code,
    })
}
