export const CONSENT_TYPES = {
  KVKK_ACKNOWLEDGEMENT: 'kvkk_acknowledgement',
  EXPLICIT_CONSENT: 'explicit_consent',
} as const

export const CONSENT_STATUS = {
  ACCEPTED: 'accepted',
} as const

export const PATIENT_REQUEST_CONSENT = {
  version: '2026-04-18-v1',
  policyVersion: 'kvkk-2026-04-18',
  source: 'patient_request',
  jurisdiction: 'TR',
  countryCode: 'TR',
  universityKey: 'istinye-dental-hospital',
  documentTitle: 'DentBridge Patient Request KVKK and Explicit Consent',
  documentFingerprint: null,
} as const
