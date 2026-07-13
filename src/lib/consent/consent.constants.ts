export const CONSENT_TYPES = {
  KVKK_ACKNOWLEDGEMENT: 'kvkk_acknowledgement',
  EXPLICIT_CONSENT: 'explicit_consent',
} as const

export const CONSENT_STATUS = {
  ACCEPTED: 'accepted',
} as const

import { getLegalDocument, type LegalLocale } from '@/lib/legal/legal-documents'

export const PATIENT_REQUEST_CONSENT = {
  version: '2026-07-11-intake-v1',
  source: 'patient_request',
  jurisdiction: 'TR',
  countryCode: 'TR',
  universityKey: 'istinye-dental-hospital',
} as const

export function getPatientRequestConsentEvidence(locale: LegalLocale) {
  const kvkk = getLegalDocument('kvkk_clarification', locale)
  const privacy = getLegalDocument('privacy_policy', locale)

  return [
    {
      consent_type: CONSENT_TYPES.KVKK_ACKNOWLEDGEMENT,
      consent_status: CONSENT_STATUS.ACCEPTED,
      consent_version: kvkk.version,
      policy_version: kvkk.version,
      language: locale,
      document_fingerprint: kvkk.fingerprint,
      document_title: kvkk.title,
      canonical_route: kvkk.canonicalRoute,
      jurisdiction: PATIENT_REQUEST_CONSENT.jurisdiction,
      country_code: PATIENT_REQUEST_CONSENT.countryCode,
      university_key: PATIENT_REQUEST_CONSENT.universityKey,
    },
    {
      consent_type: CONSENT_TYPES.EXPLICIT_CONSENT,
      consent_status: CONSENT_STATUS.ACCEPTED,
      consent_version: privacy.version,
      policy_version: privacy.version,
      language: locale,
      document_fingerprint: privacy.fingerprint,
      document_title: privacy.title,
      canonical_route: privacy.canonicalRoute,
      jurisdiction: PATIENT_REQUEST_CONSENT.jurisdiction,
      country_code: PATIENT_REQUEST_CONSENT.countryCode,
      university_key: PATIENT_REQUEST_CONSENT.universityKey,
    },
  ] as const
}
