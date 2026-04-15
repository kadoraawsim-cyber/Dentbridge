/**
 * TranslationShape defines the structure every locale must satisfy.
 * All leaf values are `string` so translated files aren't constrained
 * to the exact English string literals.
 * Add new namespaces here as the site grows.
 */
export type TranslationShape = {
  nav: {
    requestTreatment: string
    checkStatus: string
    studentPortal: string
    facultyLogin: string
    facultyAdminLogin: string
  }
  cta: {
    submitRequest: string
    checkStatus: string
  }
  hero: {
    badge: string
    title: string
    description: string
  }
  benefits: {
    affordableCare: string
    facultySupervision: string
    structuredReview: string
    easyCoordination: string
    modernWorkflow: string
  }
  callout: {
    heading: string
    description: string
  }
  footer: {
    tagline: string
    description: string
    patientServices: string
    clinicalPortals: string
    contact: string
    requestTreatment: string
    checkStatus: string
    studentPortal: string
    facultyPortal: string
    casePool: string
    /** Use {year} placeholder — replaced at render time */
    copyright: string
  }
}

export const en: TranslationShape = {
  // ── Navigation (header desktop + mobile menu) ──────────────────────────────
  nav: {
    requestTreatment: 'Request Treatment',
    checkStatus: 'Check Treatment Status',
    studentPortal: 'Student Portal',
    facultyLogin: 'Faculty Login',
    facultyAdminLogin: 'Faculty / Admin Login',
  },

  // ── Shared CTA buttons (reused across header, hero, callout strip) ──────────
  cta: {
    submitRequest: 'Submit Treatment Request',
    checkStatus: 'Check Treatment Status',
  },

  // ── Landing page – hero section ─────────────────────────────────────────────
  hero: {
    badge: 'University-Supervised Clinical Access',
    title: 'Affordable University-Supervised Dental Care',
    description:
      'DentBridge connects patients with affordable treatment through senior dental students working under strict faculty supervision — a structured, digital workflow.',
  },

  // ── Landing page – benefits bar ─────────────────────────────────────────────
  benefits: {
    affordableCare: 'Affordable university care',
    facultySupervision: 'Faculty supervision',
    structuredReview: 'Structured case review',
    easyCoordination: 'Easy coordination',
    modernWorkflow: 'Modern digital workflow',
  },

  // ── Landing page – bottom callout strip ────────────────────────────────────
  callout: {
    heading: 'Need a clinical evaluation?',
    description:
      'Start your treatment request today and let the university team review your case.',
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    tagline: 'Faculty-Supported Clinical Platform',
    description:
      'Connecting patients with affordable, supervised dental care through structured academic workflows.',
    patientServices: 'Patient Services',
    clinicalPortals: 'Clinical Portals',
    contact: 'Contact',
    requestTreatment: 'Request Treatment',
    checkStatus: 'Check Status',
    studentPortal: 'Student Portal',
    facultyPortal: 'Faculty Portal',
    casePool: 'Case Pool',
    copyright:
      '© {year} DentBridge. All treatments are provided under academic supervision.',
  },
}
