export const PUBLIC_PATIENT_PAGE_IDS = [
  'home',
  'patient-request',
  'patient-status',
  'faq',
  'privacy',
] as const

export type PublicPatientPageId = (typeof PUBLIC_PATIENT_PAGE_IDS)[number]

export type PatientChatPageContext = {
  page: PublicPatientPageId
  visibleActions: string[]
}

export const patientSiteContext = {
  siteName: 'DentBridge',
  assistantName: 'Bridgey',
  publicActions: {
    requestTreatment: {
      label: 'Request Treatment',
      purpose: 'starts a new treatment request',
    },
    checkTreatmentStatus: {
      label: 'Check Treatment Status',
      purpose: 'checks an existing request using phone number',
    },
  },
  publicRequestFlow: [
    'Patient clicks "Request Treatment".',
    'Patient fills the request form.',
    'Patient provides basic personal and contact information.',
    'Patient describes the dental issue.',
    'Patient may upload photos or x-rays if available.',
    'Clinic or faculty team reviews the request.',
    'Patient may be contacted within a few business days.',
  ],
  publicStatusFlow: [
    'Patient can use "Check Treatment Status".',
    'Status lookup is done by phone number.',
  ],
  publicGuidance: [
    'If the patient does not know the correct department, they can describe the issue in their own words.',
    'Photos and x-rays are optional but helpful.',
  ],
  approvedPublicFaqTopics: [
    'What DentBridge is.',
    'Who will provide treatment in the DentBridge flow.',
    'Whether treatment is supervised.',
    'How to request treatment.',
    'What happens after submission.',
    'Whether the patient needs to know the correct department.',
    'Whether photos or x-rays can be uploaded.',
    'Whether information is private.',
    'How treatment cost is described publicly.',
    'Whether request status can be checked.',
    'What kinds of cases can be submitted.',
    'Whether treatment can be done at other universities.',
  ],
  exclusivePartner: {
    current:
      'Istinye University and Istinye Dental Hospital are the current exclusive partner in the current DentBridge flow.',
    future:
      'Additional universities may join later.',
  },
  pageGuidance: {
    home: {
      priority:
        'On the home page, prioritize helping the user choose between starting a request and checking status.',
      actions: ['Request Treatment', 'Check Treatment Status'],
    },
    'patient-request': {
      priority:
        'On the request page, prioritize simple form guidance and reassure the user that they can describe the issue in their own words.',
      actions: ['Request Treatment'],
    },
    'patient-status': {
      priority:
        'On the status page, prioritize status lookup guidance and explain that the user should enter their phone number.',
      actions: ['Check Treatment Status'],
    },
    faq: {
      priority:
        'On the FAQ page, prioritize concise answers using approved public FAQ topics and direct actions when useful.',
      actions: ['Request Treatment', 'Check Treatment Status'],
    },
    privacy: {
      priority:
        'On the privacy page, keep privacy answers brief, public-facing, and aligned with the visible site flow.',
      actions: ['Request Treatment', 'Check Treatment Status'],
    },
  } satisfies Record<PublicPatientPageId, { priority: string; actions: string[] }>,
} as const

export function buildPatientSiteContextPrompt(pageContext?: PatientChatPageContext | null) {
  const pageDetails = pageContext ? patientSiteContext.pageGuidance[pageContext.page] : null
  const visibleActions =
    pageContext && pageContext.visibleActions.length > 0
      ? pageContext.visibleActions.join(', ')
      : null

  return [
    `Website context: site name is ${patientSiteContext.siteName}. Assistant name is ${patientSiteContext.assistantName}.`,
    `Public actions: "${patientSiteContext.publicActions.requestTreatment.label}" ${patientSiteContext.publicActions.requestTreatment.purpose}. "${patientSiteContext.publicActions.checkTreatmentStatus.label}" ${patientSiteContext.publicActions.checkTreatmentStatus.purpose}.`,
    `Public request flow: ${patientSiteContext.publicRequestFlow.join(' ')}`,
    `Public status flow: ${patientSiteContext.publicStatusFlow.join(' ')}`,
    `Public guidance: ${patientSiteContext.publicGuidance.join(' ')}`,
    `Approved public FAQ topics: ${patientSiteContext.approvedPublicFaqTopics.join(' ')}`,
    `Exclusive partner note: ${patientSiteContext.exclusivePartner.current} ${patientSiteContext.exclusivePartner.future}`,
    pageDetails ? `Current page context: ${pageContext?.page}. ${pageDetails.priority}` : null,
    visibleActions ? `Visible public actions on this page: ${visibleActions}.` : null,
  ]
    .filter(Boolean)
    .join(' ')
}
