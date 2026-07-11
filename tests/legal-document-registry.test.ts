import { describe, expect, it } from 'vitest'

import { getPatientRequestConsentEvidence } from '@/lib/consent/consent.constants'
import { LEGAL_DOCUMENTS } from '@/lib/legal/legal-documents'

describe('immutable legal-document evidence', () => {
  it.each(['en', 'tr'] as const)('matches consent evidence to rendered registry in %s', (locale) => {
    const evidence = getPatientRequestConsentEvidence(locale)
    const kvkk = LEGAL_DOCUMENTS[locale].kvkk_clarification
    const privacy = LEGAL_DOCUMENTS[locale].privacy_policy

    expect(evidence).toHaveLength(2)
    expect(evidence[0]).toMatchObject({
      document_fingerprint: kvkk.fingerprint,
      document_title: kvkk.title,
      canonical_route: kvkk.canonicalRoute,
      consent_version: kvkk.version,
      language: locale,
    })
    expect(evidence[1]).toMatchObject({
      document_fingerprint: privacy.fingerprint,
      document_title: privacy.title,
      canonical_route: privacy.canonicalRoute,
      consent_version: privacy.version,
      language: locale,
    })
    expect(evidence[0].document_title).not.toBe(evidence[1].document_title)
    expect(evidence.every((item) => item.document_fingerprint.startsWith('sha256:'))).toBe(true)
  })
})
