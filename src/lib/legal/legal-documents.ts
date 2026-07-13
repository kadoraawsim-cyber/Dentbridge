export type LegalLocale = 'en' | 'tr'
export type LegalDocumentType = 'privacy_policy' | 'kvkk_clarification'

export interface LegalDocumentRevision {
  type: LegalDocumentType
  title: string
  version: string
  locale: LegalLocale
  fingerprint: `sha256:${string}`
  effectiveDate: string
  canonicalRoute: '/privacy' | '/personal-data-protection-law'
}

export const LEGAL_DOCUMENTS: Record<
  LegalLocale,
  Record<LegalDocumentType, LegalDocumentRevision>
> = {
  en: {
    privacy_policy: {
      type: 'privacy_policy',
      title: 'DentBridge Privacy Policy',
      version: '2026-06-26-v1',
      locale: 'en',
      fingerprint: 'sha256:b5af972ac90b825b08ed7e423a215b1465709fbf712fa4a87386f93184559406',
      effectiveDate: '2026-06-26',
      canonicalRoute: '/privacy',
    },
    kvkk_clarification: {
      type: 'kvkk_clarification',
      title: 'DentBridge KVKK Personal Data Processing Clarification Text',
      version: '2026-06-27-v1',
      locale: 'en',
      fingerprint: 'sha256:0860ab071def11e9563974681238e11bfdefb59e8692d4e916cddf52f45e4975',
      effectiveDate: '2026-06-27',
      canonicalRoute: '/personal-data-protection-law',
    },
  },
  tr: {
    privacy_policy: {
      type: 'privacy_policy',
      title: 'DentBridge Gizlilik Politikası',
      version: '2026-06-26-v1',
      locale: 'tr',
      fingerprint: 'sha256:bca6c2b6fa3a7eb0799997827c264bbf13a0ed616f144de69c2ae3327c6b8cac',
      effectiveDate: '2026-06-26',
      canonicalRoute: '/privacy',
    },
    kvkk_clarification: {
      type: 'kvkk_clarification',
      title: 'DentBridge KVKK Kişisel Veri İşleme Aydınlatma Metni',
      version: '2026-06-27-v1',
      locale: 'tr',
      fingerprint: 'sha256:b145912fa6050f15d18647dec30bd5e58b847d3f662401741936355a16096120',
      effectiveDate: '2026-06-27',
      canonicalRoute: '/personal-data-protection-law',
    },
  },
} as const

export function getLegalDocument(
  type: LegalDocumentType,
  locale: LegalLocale
): LegalDocumentRevision {
  return LEGAL_DOCUMENTS[locale][type]
}
