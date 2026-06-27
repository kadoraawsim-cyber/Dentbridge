export const PATIENT_CHAT_INTENTS = [
  'emergency',
  'medical_advice_or_diagnosis',
  'request_status',
  'request_submission',
  'treatment_guarantee_or_acceptance',
  'student_supervision',
  'privacy_or_data_access',
  'kvkk_or_legal_compliance',
  'cost_or_fees',
  'uploads_or_documents',
  'consent_checkboxes',
  'student_workspace',
  'out_of_scope',
  'general_dentbridge_faq',
] as const

export type PatientChatIntent = (typeof PATIENT_CHAT_INTENTS)[number]

type Locale = 'en' | 'tr'

const EMERGENCY_RESPONSES: Record<Locale, string> = {
  en: 'DentiBridge is not for urgent or emergency dental/medical situations. If you have severe pain, swelling, bleeding, trauma, difficulty breathing, difficulty swallowing, or signs of spreading infection, please seek urgent medical/dental care or contact emergency services immediately.',
  tr: 'DentiBridge acil dental veya tıbbi durumlar için kullanılmamalıdır. Şiddetli ağrı, şişlik, kanama, travma, nefes alma veya yutkunma zorluğu ya da yayılan enfeksiyon belirtileri varsa lütfen derhal acil tıbbi/dental yardım alın veya acil servislerle iletişime geçin.',
}

const INTENT_GUIDANCE: Record<PatientChatIntent, string[]> = {
  emergency: [
    'This intent is normally handled before generation with a hardcoded response.',
    'If this guidance is ever reached, do not provide diagnosis, medicine, procedures, or request-form routing as the main answer.',
    'Tell the user DentiBridge is not for urgent dental or medical situations and they should seek urgent dental or medical care or emergency services immediately.',
  ],
  medical_advice_or_diagnosis: [
    'The user is asking for diagnosis, treatment advice, medication advice, urgency advice, or clinical decision-making.',
    'Refuse briefly and safely. Do not diagnose, recommend treatment, suggest medicine, decide whether they can wait, or make clinical judgments.',
    'You may say DentiBridge can help with request submission and academic review guidance, but clinical questions should be reviewed by qualified dental or medical professionals.',
  ],
  request_status: [
    'The user is asking about a submitted request or application status.',
    'Say Bridgey cannot check live request status inside chat and cannot access patient records.',
    'Direct the user to /patient/status and explain that status lookup is done there. Do not ask for their phone number inside chat for live lookup.',
  ],
  request_submission: [
    'The user is asking how to apply, submit a form, start a request, or request treatment.',
    'Explain simply that they can submit a request through /patient/request.',
    'Mention that submitting a request does not guarantee treatment, an appointment, diagnosis, acceptance, or assignment to a student.',
  ],
  treatment_guarantee_or_acceptance: [
    'The user is asking whether treatment, appointment, acceptance, matching, or student assignment is guaranteed.',
    'Clearly say there is no guarantee.',
    'Explain that requests may be reviewed for suitability, availability, clinical capacity, academic requirements, and faculty workflow.',
  ],
  student_supervision: [
    'The user is asking about students, supervision, safety, faculty, senior dental students, or who may treat them.',
    'Explain that suitable cases may be coordinated with senior dental students under faculty supervision.',
    'Say students do not work independently and clinical decisions remain under qualified faculty or clinical supervision.',
  ],
  privacy_or_data_access: [
    'The user is asking about privacy, data access, photos, x-rays, correction, deletion, or who sees information.',
    'Say information is not open to all students and is used for request review and case coordination by authorized users in the approved workflow.',
    'The answer must include both literal route strings /privacy and /personal-data-protection-law for details. Do not give legal advice or claim compliance.',
  ],
  kvkk_or_legal_compliance: [
    'The user is asking about KVKK, GDPR, HIPAA, certification, official approval, legal validity, or compliance.',
    'Do not claim KVKK, GDPR, or HIPAA compliance, certification, official approval, or legal advice.',
    'Say DentiBridge provides public Privacy Policy and KVKK / Personal Data Protection Clarification Text pages explaining how information may be handled. Suggest /privacy and /personal-data-protection-law.',
  ],
  cost_or_fees: [
    'The user is asking about cost, fees, affordability, payment, or treatment price.',
    'Distinguish platform fee from treatment costs.',
    'Say submitting a request through DentiBridge does not require a platform fee from the patient, and treatment costs, if applicable, depend on clinic, treatment type, materials, and institutional rules. DentiBridge does not independently set treatment fees.',
  ],
  uploads_or_documents: [
    'The user is asking about photos, x-rays, radiographs, files, PDFs, documents, or uploads.',
    'Say uploads are optional and should only include files relevant to the dental request.',
    'Do not pressure users to upload sensitive documents.',
  ],
  consent_checkboxes: [
    'The user is asking about checkboxes, consent, the KVKK checkbox, why there are two checkboxes, or what they are agreeing to.',
    'Explain briefly that there are two required checkboxes.',
    'One confirms the user has read and understood the KVKK / Personal Data Protection Clarification Text. The other gives explicit consent to processing submitted dental and health-related information for academic clinical review and, if suitable, supervised coordination with senior dental students under faculty supervision.',
  ],
  student_workspace: [
    'The user is asking about student-facing features, dashboard, Clinical Compass, AI assistant, planner, case exchange, requirements, notes, images, radiographs, or protocols.',
    'Answer only at a high public level and suggest /students when useful.',
    'Do not imply private dashboard access, hidden internal functionality, or that every listed feature is fully available beyond the current public copy.',
  ],
  out_of_scope: [
    'The user is asking about something outside public DentiBridge information.',
    'Politely say Bridgey can help with public DentiBridge information, patient requests, request status guidance, FAQ, privacy pages, and supervised academic dental workflow basics.',
    'Keep the answer short and do not answer the unrelated topic.',
  ],
  general_dentbridge_faq: [
    'The user is asking a general public DentiBridge question or the message did not match a more specific intent.',
    'Answer from the curated public DentBridge context only.',
    'If the topic is unrelated to DentiBridge, politely explain the public DentiBridge topics Bridgey can help with.',
  ],
}

const TURKISH_CHARACTER_PATTERN = /[çğıöşüİ]/i
const TURKISH_WORD_PATTERN =
  /\b(dentbridge nedir|talep|tedavi|ücret|ucret|öğrenci|ogrenci|kvkk|acil|ağrı|agri|şiş|sis|rıza|riza|bilgiler|başvuru|basvuru|musunuz|müsünüz|miyim|mıyım|eder misin|görebilir mi|gorebilir mi)\b/i
const ENGLISH_WORD_PATTERN =
  /\b(the|what|how|can|does|is|will|my|i|you|request|treatment|student|cost|diagnose|emergency|status|clinic|privacy)\b/i

function normalizePatientChatText(message: string) {
  return message.normalize('NFKC').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim()
}

function hasAny(text: string, patterns: Array<string | RegExp>) {
  return patterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return text.includes(pattern)
    }

    return pattern.test(text)
  })
}

function hasEnglishWord(text: string, word: string) {
  return new RegExp(`\\b${word}\\b`, 'i').test(text)
}

function isGeneralEmergencyQuestion(text: string) {
  return hasAny(text, [
    /\bdoes denti?bridge handle emergencies\b/i,
    /\bis denti?bridge (for|used for) emergencies\b/i,
    /\bcan i use denti?bridge (for|in) (an )?emergency\b/i,
    /\bwhat (if|about) (an )?emergency\b/i,
    'dentbridge acil durumlar için kullanılır mı',
    'dentbridge acil durumlarda kullanılır mı',
    'acil durumlar için kullanılır mı',
    'acil durumlarda kullanılır mı',
  ])
}

function hasObviousEmergencyNegation(text: string) {
  return hasAny(text, [
    /\bi do not have (an )?emergency\b/i,
    /\bi don't have (an )?emergency\b/i,
    /\bno emergency\b/i,
    /\bnot (an )?emergency\b/i,
    /\bnot urgent\b/i,
    'acil değil',
    'acil degil',
    'acil durumum yok',
    'acil bir durumum yok',
  ])
}

function isEmergencyIntent(text: string) {
  if (isGeneralEmergencyQuestion(text)) {
    return false
  }

  const hasEmergencyNegation = hasObviousEmergencyNegation(text)

  const severeSymptomPatterns: Array<string | RegExp> = [
    'severe pain',
    'unbearable pain',
    'severe swelling',
    'facial swelling',
    'difficulty breathing',
    'trouble breathing',
    'difficulty swallowing',
    'trouble swallowing',
    'spreading infection',
    'pus with fever',
    'heavy bleeding',
    'şiddetli ağrı',
    'siddetli agri',
    'dayanılmaz ağrı',
    'dayanilmaz agri',
    'yüz şişmesi',
    'yuz sismesi',
    'nefes alma zorluğu',
    'nefes alma zorlugu',
    'nefes almakta zorlanma',
    'yutkunma zorluğu',
    'yutkunma zorlugu',
    'yayılan enfeksiyon',
    'yayilan enfeksiyon',
    'ateş ve irin',
    'ates ve irin',
  ]

  if (hasAny(text, severeSymptomPatterns)) {
    return true
  }

  if (hasEmergencyNegation) {
    return false
  }

  const activeUrgencyPatterns: Array<string | RegExp> = [
    /\bi (have|am having|feel|need).{0,80}\b(swelling|bleeding|trauma|accident|emergency|urgent)\b/i,
    /\bmy .{0,60}\b(is swollen|is bleeding|swelling|bleeding)\b/i,
    /\b(swelling|bleeding|trauma|accident)\b/i,
    'şişlik',
    'sislik',
    'kanama',
    'travma',
    'kaza',
    'acil',
  ]

  return hasAny(text, activeUrgencyPatterns)
}

export function detectPatientChatResponseLocale(message: string, pageLocale: Locale): Locale {
  if (TURKISH_CHARACTER_PATTERN.test(message) || TURKISH_WORD_PATTERN.test(message)) {
    return 'tr'
  }

  if (ENGLISH_WORD_PATTERN.test(message)) {
    return 'en'
  }

  return pageLocale
}

export function getPatientChatEmergencyResponse(locale: Locale) {
  return EMERGENCY_RESPONSES[locale]
}

export function getPatientChatIntentGuidance(intent: PatientChatIntent) {
  return INTENT_GUIDANCE[intent].join(' ')
}

// Safety/router layer only. This is not a medical classifier and must not trigger tools or data access.
export function classifyPatientChatIntent(message: string): PatientChatIntent {
  const text = normalizePatientChatText(message)

  if (isEmergencyIntent(text)) {
    return 'emergency'
  }

  if (
    hasAny(text, [
      'what do i have',
      'is this infection',
      'do i need root canal',
      'should i take antibiotics',
      'what medicine',
      'what medication',
      'can you diagnose',
      'diagnose my',
      'diagnosis',
      'what treatment do i need',
      'can i wait',
      'is this dangerous',
      'bende ne var',
      'enfeksiyon mu',
      'kanal tedavisi gerekir mi',
      'antibiyotik almalı mıyım',
      'antibiyotik almali miyim',
      'hangi ilacı almalıyım',
      'hangi ilaci almaliyim',
      'ağrımı teşhis eder misin',
      'agrimi teshis eder misin',
      'hangi tedaviye ihtiyacım var',
      'hangi tedaviye ihtiyacim var',
      'bekleyebilir miyim',
      'tehlikeli mi',
      /\b(root canal|antibiotics?|medicine|medication|diagnose|diagnosis|infection|dangerous)\b/i,
    ])
  ) {
    return 'medical_advice_or_diagnosis'
  }

  if (
    hasAny(text, [
      'kvkk compliant',
      'gdpr compliant',
      'hipaa compliant',
      'legally approved',
      'certified',
      'what is kvkk',
      'legally valid',
      'kvkk uyumlu',
      'gdpr uyumlu',
      'hipaa uyumlu',
      'yasal mı',
      'yasal mi',
      'onaylı mı',
      'onayli mi',
      'sertifikalı mı',
      'sertifikali mi',
      'kvkk nedir',
      'rızam geçerli mi',
      'rizam gecerli mi',
      /\b(kvkk|gdpr|hipaa|certification|compliance|compliant|legal advice)\b/i,
    ])
  ) {
    return 'kvkk_or_legal_compliance'
  }

  if (
    hasAny(text, [
      'check my request',
      'where is my request',
      'request status',
      'did you receive my request',
      'what happened to my form',
      'check my application',
      'talebimin durumu',
      'başvurum nerede',
      'basvurum nerede',
      'talebimi kontrol et',
      'formum ulaştı mı',
      'formum ulasti mi',
      'başvurumu kontrol eder misin',
      'basvurumu kontrol eder misin',
      /\b(status|track|tracking|application status)\b/i,
    ])
  ) {
    return 'request_status'
  }

  if (
    hasAny(text, [
      'guaranteed treatment',
      'treatment guaranteed',
      'definitely get an appointment',
      'will you accept me',
      'can i choose a student',
      'will i be matched',
      'guarantee',
      'tedavi kesin mi',
      'randevu garanti mi',
      'kabul edilecek miyim',
      'öğrenci seçebilir miyim',
      'ogrenci secebilir miyim',
      'eşleştirme kesin mi',
      'eslestirme kesin mi',
      /\b(guaranteed?|accepted?|acceptance|matched|matching)\b/i,
    ])
  ) {
    return 'treatment_guarantee_or_acceptance'
  }

  if (
    hasAny(text, [
      'who sees my information',
      'all students see my data',
      'my information private',
      'what happens to my photos',
      'what happens to my x-rays',
      'delete my information',
      'edit my data',
      'bilgilerimi kim görür',
      'bilgilerimi kim gorur',
      'tüm öğrenciler görür mü',
      'tum ogrenciler gorur mu',
      /\b(tüm|tum).{0,30}(öğrenciler|ogrenciler).{0,60}(bilgiler|veriler|data|görebilir|gorebilir)\b/i,
      /\b(bilgiler|veriler|data).{0,60}(tüm|tum).{0,30}(öğrenciler|ogrenciler)\b/i,
      'bilgilerim gizli mi',
      'fotoğraflarım ne olur',
      'fotograflarim ne olur',
      'bilgilerimi silebilir miyim',
      'bilgilerimi düzeltebilir miyim',
      'bilgilerimi duzeltebilir miyim',
      /\b(privacy|private|data access|delete my data|edit my data|my data|my information)\b/i,
    ])
  ) {
    return 'privacy_or_data_access'
  }

  if (
    hasAny(text, [
      'cost money',
      'platform free',
      'how much is treatment',
      'do i pay dentbridge',
      'is it affordable',
      'dentbridge ücretli mi',
      'dentbridge ucretli mi',
      'platform ücretsiz mi',
      'platform ucretsiz mi',
      'tedavi ücreti ne kadar',
      'tedavi ucreti ne kadar',
      'dentbridge’e ödeme yapıyor muyum',
      "dentbridge'e odeme yapiyor muyum",
      'uygun fiyatlı mı',
      'uygun fiyatli mi',
      /\b(cost|fee|fees|free|price|payment|pay|affordable)\b/i,
      /\b(ücret|ucret|ödeme|odeme|fiyat)\b/i,
    ])
  ) {
    return 'cost_or_fees'
  }

  if (
    hasAny(text, [
      'checkbox',
      'consent',
      'kvkk checkbox',
      'two checkboxes',
      'what am i agreeing to',
      'onay kutusu',
      'rıza',
      'riza',
      'kvkk kutusu',
      'neden iki kutu var',
      'neden iki onay kutusu var',
      'neye onay veriyorum',
    ])
  ) {
    return 'consent_checkboxes'
  }

  if (
    hasAny(text, [
      'photo',
      'x-ray',
      'xray',
      'radiograph',
      'pdf',
      'file',
      'document',
      'upload',
      'fotoğraf',
      'fotograf',
      'röntgen',
      'rontgen',
      'radyografi',
      'dosya',
      'belge',
      'yükle',
      'yukle',
    ])
  ) {
    return 'uploads_or_documents'
  }

  if (
    hasAny(text, [
      'student treat',
      'student alone',
      'who treats',
      'senior dental student',
      'faculty supervision',
      'supervised',
      'safe',
      'öğrenci',
      'ogrenci',
      'tek başına',
      'tek basina',
      'öğretim üyesi',
      'ogretim uyesi',
      'denetim',
      'gözetim',
      'gozetim',
      /\b(student|students|supervision|supervised|faculty|safety)\b/i,
    ])
  ) {
    return 'student_supervision'
  }

  if (
    hasAny(text, [
      'apply',
      'submit a form',
      'start a request',
      'request treatment',
      'choose a clinic',
      'how to request',
      'başvur',
      'basvur',
      'talep gönder',
      'talep gonder',
      'form gönder',
      'form gonder',
      'tedavi talebi',
      'klinik seç',
      'klinik sec',
    ])
  ) {
    return 'request_submission'
  }

  if (
    hasAny(text, [
      'student dashboard',
      'clinical compass',
      'ai assistant',
      'planner',
      'case exchange',
      'requirements',
      'clinical notes',
      'protocols',
      'öğrenci paneli',
      'ogrenci paneli',
      'klinik pusula',
      'yapay zeka asistanı',
      'yapay zeka asistani',
      'planlayıcı',
      'planlayici',
      'vaka değişimi',
      'vaka degisimi',
      'gereklilikler',
      'protokoller',
    ])
  ) {
    return 'student_workspace'
  }

  if (
    hasAny(text, [
      'weather',
      'recipe',
      'politics',
      'homework',
      'write code',
      'flight',
      'hotel',
      'bitcoin',
      'movie',
      'hava durumu',
      'yemek tarifi',
      'siyaset',
      'ödev',
      'odev',
      'kod yaz',
      'uçuş',
      'ucus',
      'otel',
      'film',
    ]) &&
    !hasAny(text, ['dentbridge', 'dentibridge'])
  ) {
    return 'out_of_scope'
  }

  if (hasEnglishWord(text, 'emergency') || text.includes('acil')) {
    return 'general_dentbridge_faq'
  }

  return 'general_dentbridge_faq'
}
