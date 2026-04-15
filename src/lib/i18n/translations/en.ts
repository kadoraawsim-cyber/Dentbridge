/**
 * TranslationShape defines the structure every locale must satisfy.
 * All leaf values are `string` so translated files aren't constrained
 * to the exact English string literals.
 * Add new namespaces here as the site grows.
 */
export type TranslationShape = {
  // ── Shared navigation (landing page header) ────────────────────────────────
  nav: {
    requestTreatment: string
    checkStatus: string
    studentPortal: string
    facultyLogin: string
    facultyAdminLogin: string
  }

  // ── Patient-page header navigation ─────────────────────────────────────────
  patientNav: {
    tagline: string
    myPortal: string
    newRequest: string
    backToHome: string
  }

  // ── Shared CTA buttons ──────────────────────────────────────────────────────
  cta: {
    submitRequest: string
    checkStatus: string
  }

  // ── Landing – hero ──────────────────────────────────────────────────────────
  hero: {
    badge: string
    title: string
    description: string
  }

  // ── Landing – benefits bar ──────────────────────────────────────────────────
  benefits: {
    affordableCare: string
    facultySupervision: string
    structuredReview: string
    easyCoordination: string
    modernWorkflow: string
  }

  // ── Landing – bottom callout strip ─────────────────────────────────────────
  callout: {
    heading: string
    description: string
  }

  // ── Landing – How It Works ──────────────────────────────────────────────────
  landing: {
    howItWorksTitle: string
    howItWorksDesc: string
    step1Title: string
    step1Desc: string
    step2Title: string
    step2Desc: string
    step3Title: string
    step3Desc: string
    step4Title: string
    step4Desc: string
    whyTitle: string
    whyCareTitle: string
    whyCareDesc: string
    whyOversightTitle: string
    whyOversightDesc: string
    whyMultiTitle: string
    whyMultiDesc: string
    whyDigitalTitle: string
    whyDigitalDesc: string
    deptsTitle: string
    deptsDesc: string
    deptWhatTreats: string
    deptYouMayNeed: string
    deptCommonTreatments: string
    depts: {
      surgery: { name: string; short: string; description: string; when: string; treatments: string }
      endodontics: { name: string; short: string; description: string; when: string; treatments: string }
      periodontology: { name: string; short: string; description: string; when: string; treatments: string }
      restorative: { name: string; short: string; description: string; when: string; treatments: string }
      prosthodontics: { name: string; short: string; description: string; when: string; treatments: string }
      orthodontics: { name: string; short: string; description: string; when: string; treatments: string }
      pedodontics: { name: string; short: string; description: string; when: string; treatments: string }
      radiology: { name: string; short: string; description: string; when: string; treatments: string }
    }
  }

  // ── Patient request form ────────────────────────────────────────────────────
  request: {
    pageTitle: string
    pageDescription: string
    success: {
      title: string
      description: string
      checkStatus: string
      submitAnother: string
    }
    sectionPatient: string
    sectionClinical: string
    sectionImages: string
    sectionImagesNote: string
    sectionConsent: string
    fullName: string
    age: string
    phone: string
    preferredLanguage: string
    city: string
    preferredUniversity: string
    optional: string
    fullNamePlaceholder: string
    agePlaceholder: string
    phonePlaceholder: string
    cityPlaceholder: string
    universityPlaceholder: string
    treatments: {
      initialExam: string
      cleaning: string
      fillings: string
      extraction: string
      rootCanal: string
      gum: string
      prosthetics: string
      orthodontics: string
      pediatric: string
      esthetic: string
      other: string
    }
    langTurkish: string
    langEnglish: string
    langArabic: string
    treatmentCategory: string
    mainComplaint: string
    mainComplaintPlaceholder: string
    urgency: string
    urgencyPlaceholder: string
    urgencyLow: string
    urgencyMedium: string
    urgencyHigh: string
    availability: string
    dayNoPreference: string
    dayWeekdayMornings: string
    dayWeekdayAfternoons: string
    dayAsSoonAsPossible: string
    uploadTitle: string
    uploadSubtitle: string
    uploadSelectedLabel: string
    consentInfo: string
    consentLabel: string
    errorRequiredFields: string
    errorConsent: string
    errorFileSize: string
    cancel: string
    submit: string
    submitting: string
  }

  // ── Patient status page ─────────────────────────────────────────────────────
  status: {
    pageTitle: string
    pageDescription: string
    lookupTitle: string
    phoneLabel: string
    searchButton: string
    searching: string
    notFoundTitle: string
    notFoundBefore: string
    notFoundLink: string
    step: {
      submitted: string
      under_review: string
      matched: string
      student_approved: string
      contacted: string
      appointment_scheduled: string
      in_treatment: string
      completed: string
    }
    badge: {
      submitted: string
      under_review: string
      matched: string
      student_approved: string
      contacted: string
      appointment_scheduled: string
      in_treatment: string
      completed: string
      rejected: string
      cancelled: string
    }
    closedCancelled: string
    closedRejected: string
    gridTreatment: string
    gridSubmitted: string
    gridAvailability: string
    gridDepartment: string
    pendingReview: string
    footerNote: string
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
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
    affordableCareInfo: string
    faq: string
    clinicalRequirements: string
    universityPilot: string
    whatsappSupport: string
    /** {year} is replaced at render time */
    copyright: string
  }
}

// ────────────────────────────────────────────────────────────────────────────

export const en: TranslationShape = {
  nav: {
    requestTreatment: 'Request Treatment',
    checkStatus: 'Check Treatment Status',
    studentPortal: 'Student Portal',
    facultyLogin: 'Faculty Login',
    facultyAdminLogin: 'Faculty / Admin Login',
  },

  patientNav: {
    tagline: 'Faculty-Supported Clinical Platform',
    myPortal: 'My Portal',
    newRequest: 'New Treatment Request',
    backToHome: 'Back to Home',
  },

  cta: {
    submitRequest: 'Submit Treatment Request',
    checkStatus: 'Check Treatment Status',
  },

  hero: {
    badge: 'University-Supervised Clinical Access',
    title: 'Affordable University-Supervised Dental Care',
    description:
      'DentBridge connects patients with affordable treatment through senior dental students working under strict faculty supervision — a structured, digital workflow.',
  },

  benefits: {
    affordableCare: 'Affordable university care',
    facultySupervision: 'Faculty supervision',
    structuredReview: 'Structured case review',
    easyCoordination: 'Easy coordination',
    modernWorkflow: 'Modern digital workflow',
  },

  callout: {
    heading: 'Need a clinical evaluation?',
    description:
      'Start your treatment request today and let the university team review your case.',
  },

  landing: {
    howItWorksTitle: 'How It Works',
    howItWorksDesc:
      'Our clinical case matching platform ensures every patient gets structured care while empowering the next generation of dentists.',
    step1Title: '1. Submit Request',
    step1Desc: 'Patient completes a short form explaining their dental needs.',
    step2Title: '2. Faculty Review',
    step2Desc: 'Our academic team reviews and categorizes your request.',
    step3Title: '3. Smart Match',
    step3Desc: 'Matched with the right department and clinical student.',
    step4Title: '4. Treatment',
    step4Desc: 'Care provided under direct supervision of experienced faculty.',
    whyTitle: 'Why Choose University-Supervised Care?',
    whyCareTitle: 'Affordable Care',
    whyCareDesc: 'Access high-quality treatment at lower cost than many private clinics.',
    whyOversightTitle: 'Expert Oversight',
    whyOversightDesc: 'Every step is monitored and approved by qualified faculty members.',
    whyMultiTitle: 'Multidisciplinary Approach',
    whyMultiDesc:
      'Complex cases can receive coordinated consultation across different departments.',
    whyDigitalTitle: 'Digital Dentistry',
    whyDigitalDesc:
      'Access to modern diagnostic tools, digital imaging, and contemporary treatment planning.',
    deptsTitle: 'Our Clinical Departments',
    deptsDesc:
      'DentBridge helps route each patient to the most appropriate university dental department based on symptoms, treatment needs, and faculty review.',
    deptWhatTreats: 'What this department treats',
    deptYouMayNeed: 'You may need this department if…',
    deptCommonTreatments: 'Common treatments include',
    depts: {
      surgery: {
        name: 'Oral & Maxillofacial Surgery',
        short: 'Surgical care for teeth, jaws, and oral tissues.',
        description:
          'This department deals with conditions that require surgical treatment involving the teeth, jaws, mouth, and surrounding soft tissues.',
        when:
          'a tooth that needs extraction, impacted wisdom teeth, swelling, cysts, jaw-related problems, or oral lesions that require surgical evaluation.',
        treatments:
          'tooth extractions, wisdom tooth removal, surgical removal of impacted teeth, and treatment of oral soft tissue or jaw-related surgical conditions.',
      },
      endodontics: {
        name: 'Endodontics',
        short: 'Treatment of root canals, pulp infection, and tooth pain.',
        description:
          'Endodontics focuses on problems inside the tooth, especially the dental pulp and root canals.',
        when:
          'severe tooth pain, long-lasting sensitivity to hot or cold, swelling around a tooth, infection, or a failed previous root canal treatment.',
        treatments:
          'root canal treatment, root canal retreatment, endodontic surgery in selected cases, treatment of traumatized teeth, and internal whitening after endodontic care.',
      },
      periodontology: {
        name: 'Periodontology',
        short: 'Care for gums and the tissues supporting the teeth.',
        description: 'Periodontology focuses on the gums and the tissues that support the teeth.',
        when:
          'bleeding gums, swollen gums, gum recession, bad breath related to gum disease, loose teeth, or signs of periodontal inflammation.',
        treatments:
          'gum disease evaluation, periodontal cleaning, treatment of gingivitis and periodontitis, and maintenance care to protect natural teeth.',
      },
      restorative: {
        name: 'Restorative Dentistry',
        short: 'Repair of cavities, tooth damage, and non-surgical esthetic issues.',
        description:
          'Restorative Dentistry repairs teeth damaged by decay, wear, fractures, or other non-surgical causes.',
        when:
          'cavities, chipped or broken teeth, worn tooth surfaces, or esthetic concerns that can be improved without surgery.',
        treatments:
          'fillings, repair of damaged tooth structure, direct restorations, and conservative esthetic corrections.',
      },
      prosthodontics: {
        name: 'Prosthodontics',
        short: 'Replacement of missing teeth and restoration of oral function.',
        description:
          'Prosthodontics focuses on restoring missing teeth and rebuilding oral function, comfort, and appearance.',
        when:
          'one or more missing teeth, difficulty chewing because of tooth loss, or teeth that require major restoration.',
        treatments:
          'crowns, bridges, removable dentures, and implant-supported prosthetic restorations.',
      },
      orthodontics: {
        name: 'Orthodontics',
        short: 'Alignment of teeth and correction of bite problems.',
        description:
          'Orthodontics is concerned with the alignment of teeth and jaws to improve function, bite, and appearance.',
        when:
          'crooked teeth, crowding, spacing, bite problems, jaw position issues, or if you are considering braces or clear aligners.',
        treatments:
          'metal braces, clear aligners, removable appliances, and orthodontic treatment planning for children, adolescents, and adults.',
      },
      pedodontics: {
        name: 'Pedodontics',
        short: 'Dental care for infants, children, and adolescents.',
        description:
          'Pedodontics, also called pediatric dentistry, focuses on the oral and dental health of children from infancy through adolescence.',
        when:
          'the patient is a child with tooth decay, dental pain, broken teeth, dental trauma, or preventive care needs.',
        treatments:
          'children\'s examinations, preventive care, fillings for primary teeth, and management of dental trauma in young patients.',
      },
      radiology: {
        name: 'Oral Radiology',
        short: 'Dental imaging for diagnosis and treatment planning.',
        description:
          'Oral Radiology provides the imaging needed to diagnose dental and jaw conditions accurately and to support treatment planning.',
        when:
          'diagnostic imaging before treatment, evaluation of impacted teeth, assessment of infection or bone loss, or advanced imaging for surgery or implants.',
        treatments:
          'intraoral digital radiographs, panoramic radiography, and CBCT 3D dental imaging.',
      },
    },
  },

  request: {
    pageTitle: 'New Treatment Request',
    pageDescription:
      'Provide details about your dental concern to help our faculty match you with the right department and student.',
    success: {
      title: 'Request Submitted',
      description:
        'Your treatment request has been received. Our faculty team will review it and contact you.',
      checkStatus: 'Check My Request Status',
      submitAnother: 'Submit Another Request',
    },
    sectionPatient: 'Patient Information',
    sectionClinical: 'Clinical Details',
    sectionImages: 'Supporting Images',
    sectionImagesNote: '(optional)',
    sectionConsent: 'Consent',
    fullName: 'Full Name',
    age: 'Age',
    phone: 'Phone Number',
    preferredLanguage: 'Preferred Language',
    city: 'City',
    preferredUniversity: 'Preferred University / Clinic',
    optional: '(optional)',
    fullNamePlaceholder: 'Enter your full name',
    agePlaceholder: 'Your age',
    phonePlaceholder: '+90 5XX XXX XX XX',
    cityPlaceholder: 'City',
    universityPlaceholder: 'Preferred clinic',
    treatments: {
      initialExam: 'Initial Examination / Consultation',
      cleaning: 'Dental Cleaning',
      fillings: 'Fillings',
      extraction: 'Tooth Extraction',
      rootCanal: 'Root Canal Treatment',
      gum: 'Gum Treatment',
      prosthetics: 'Prosthetics / Crowns',
      orthodontics: 'Orthodontics',
      pediatric: 'Pediatric Dentistry',
      esthetic: 'Esthetic Dentistry',
      other: 'Other',
    },
    langTurkish: 'Turkish',
    langEnglish: 'English',
    langArabic: 'Arabic',
    treatmentCategory: 'Treatment Category',
    mainComplaint: 'Main Complaint',
    mainComplaintPlaceholder:
      'Describe your symptoms, pain, or dental needs in detail…',
    urgency: 'Pain Level / Urgency',
    urgencyPlaceholder: 'Select urgency',
    urgencyLow: 'Low',
    urgencyMedium: 'Medium',
    urgencyHigh: 'High',
    availability: 'Preferred Availability',
    dayNoPreference: 'No Preference',
    dayWeekdayMornings: 'Weekday Mornings',
    dayWeekdayAfternoons: 'Weekday Afternoons',
    dayAsSoonAsPossible: 'As Soon As Possible',
    uploadTitle: 'Click to upload photos, x-rays, or PDF',
    uploadSubtitle: 'JPG, JPEG, PNG, or PDF up to 10 MB',
    uploadSelectedLabel: 'Selected file:',
    consentInfo:
      'Consent: I understand that this platform matches me with senior dental students who provide treatment under the supervision of qualified faculty members.',
    consentLabel:
      'I understand and agree to submit my treatment request for academic review.',
    errorRequiredFields: 'Please complete all required fields.',
    errorConsent: 'Please confirm consent before submitting.',
    errorFileSize: 'File size must be 10 MB or less.',
    cancel: 'Cancel',
    submit: 'Submit Treatment Request',
    submitting: 'Submitting…',
  },

  status: {
    pageTitle: 'Check Your Request Status',
    pageDescription:
      'Enter the phone number you used when submitting your treatment request to view its current status.',
    lookupTitle: 'Patient Lookup',
    phoneLabel: 'Phone Number',
    searchButton: 'Check Status',
    searching: 'Searching…',
    notFoundTitle: 'No request found',
    notFoundBefore:
      "We couldn't find a request for that number. Double-check and try again, or",
    notFoundLink: 'submit a new request',
    step: {
      submitted: 'Submitted',
      under_review: 'Under Review',
      matched: 'Assigned to Dept.',
      student_approved: 'Student Assigned',
      contacted: 'Contacted',
      appointment_scheduled: 'Appt. Scheduled',
      in_treatment: 'In Treatment',
      completed: 'Completed',
    },
    badge: {
      submitted: 'Submitted — Awaiting Review',
      under_review: 'Under Faculty Review',
      matched: 'Assigned to Department — Awaiting Student',
      student_approved: 'Student Assigned — Preparing Contact',
      contacted: 'Patient Contacted by Student',
      appointment_scheduled: 'Appointment Scheduled',
      in_treatment: 'Currently In Treatment',
      completed: 'Treatment Completed',
      rejected: 'Out of Scope',
      cancelled: 'Cancelled',
    },
    closedCancelled: 'This case has been cancelled.',
    closedRejected: 'Case marked as out of scope — no further steps required.',
    gridTreatment: 'Treatment',
    gridSubmitted: 'Submitted',
    gridAvailability: 'Availability',
    gridDepartment: 'Department',
    pendingReview: 'Pending review',
    footerNote:
      'Showing your most recent request. For questions, contact the clinic directly.',
  },

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
    affordableCareInfo: 'Affordable Care Information',
    faq: 'FAQ',
    clinicalRequirements: 'Clinical Requirements',
    universityPilot: 'University-supported pilot platform',
    whatsappSupport: 'WhatsApp support available',
    copyright:
      '© {year} DentBridge. All treatments are provided under academic supervision.',
  },
}
