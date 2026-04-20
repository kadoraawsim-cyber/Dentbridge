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
    step5Title: string
    step5Desc: string
    whyTitle: string
    whyCareTitle: string
    whyCareDesc: string
    whyOversightTitle: string
    whyOversightDesc: string
    whyMultiTitle: string
    whyMultiDesc: string
    whySupportTitle: string
    whySupportDesc: string
    whyDigitalTitle: string
    whyDigitalDesc: string
    activePartnerStripMessage: string
    activePartnerStripButton: string
    activePartnerStripLogoAlt: string
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
    sectionSupport: string
    sectionConsent: string
    fullName: string
    age: string
    gender: string
    phone: string
    phoneCountryCode: string
    preferredLanguage: string
    preferredUniversity: string
    preferredUniversityRequired: string
    preferredUniversityIstinyeDentalHospital: string
    supportingImages: string
    optional: string
    selectPlaceholder: string
    fullNamePlaceholder: string
    agePlaceholder: string
    phonePlaceholder: string
    phoneNumberPlaceholder: string
    painScoreLabel: string
    painScorePlaceholder: string
    durationLabel: string
    durationPlaceholder: string
    durationToday: string
    durationFewDays: string
    durationOneToTwoWeeks: string
    durationMoreThanMonth: string
    durationRoutineNoSpecificStart: string
    medicalConditionLabel: string
    medicalConditionDetailsLabel: string
    medicalConditionDetailsPlaceholder: string
    medicalNone: string
    medicalDiabetes: string
    medicalPregnancy: string
    medicalBloodThinner: string
    medicalAllergy: string
    medicalOther: string
    contactMethodLabel: string
    contactMethodWhatsapp: string
    contactMethodPhone: string
    contactMethodSms: string
    bestContactTimeLabel: string
    contactTimeMorning: string
    contactTimeAfternoon: string
    contactTimeEvening: string
    contactTimeAnytime: string
    uploadHelpText: string
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
      notSure: string
      other: string
    }
    langTurkish: string
    langEnglish: string
    langArabic: string
    genderMale: string
    genderFemale: string
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

  // ── Student portal ─────────────────────────────────────────────────────────
  student: {
    login: {
      checkingSession: string
      clinicalPlatform: string
      title: string
      subtitle: string
      emailLabel: string
      passwordLabel: string
      showPassword: string
      hidePassword: string
      signingIn: string
      signIn: string
      clinicalStudentsOnly: string
      facultyAdminQuestion: string
      adminPortalLink: string
      patientQuestion: string
      submitRequest: string
      checkStatus: string
      noAccountNeeded: string
      errorInvalidCredentials: string
      errorNotStudentPortal: string
      errorNoRole: string
    }
    nav: {
      clinicalPlatform: string
      dashboard: string
      casePool: string
      exchange: string
      myRequests: string
      signOut: string
      availableCases: string
    }
    dashboard: {
      welcomeBack: string
      enrolledActive: string
      browseCases: string
      caseNeedsAttention: string
      casesNeedAttention: string
      actionNeededSuffix: string
      statPendingLabel: string
      statPendingDesc: string
      statActiveLabel: string
      statActiveCases: string
      statNoActiveCases: string
      statInPoolLabel: string
      statInPoolDesc: string
      statUrgentLabel: string
      statUrgentDesc: string
      myActiveCases: string
      assigned: string
      stepContacted: string
      stepApptSet: string
      stepInTreatment: string
      statusReadyToContact: string
      statusPatientContacted: string
      statusApptConfirmed: string
      statusInTreatmentDesc: string
      statusCompleted: string
      statusCancelled: string
      patientContact: string
      actionNeededBadge: string
      btnMarkContacted: string
      btnMarkApptScheduled: string
      btnMarkInTreatment: string
      updating: string
      treatmentInProgress: string
      caseClosed: string
      caseCancelledText: string
      recentlyInPool: string
      caseAvailable: string
      casesAvailable: string
      viewAll: string
      tableCase: string
      tableTreatment: string
      tableDept: string
      tableUrgency: string
      noCasesInPool: string
      noCasesInPoolDesc: string
      view: string
      quickActions: string
      browseCasePool: string
      casesOpen: string
      findAvailableCases: string
      caseExchange: string
      tradeCases: string
      clinicalRequirements: string
      caseLogComingSoon: string
      requestPendingReview: string
      requestsPendingReview: string
      pendingRequestsDesc: string
      completedTreatments: string
      completedTreatmentsDesc: string
      treatmentCompleted: string
      treatmentsCompleted: string
    }
    cases: {
      backToDashboard: string
      pageTitle: string
      pageDesc: string
      searchPlaceholder: string
      filterAll: string
      filterMyRequests: string
      deptLabel: string
      requestPendingReview: string
      requestsPendingReview: string
      pendingNoteNotify: string
      emptyNoRequests: string
      emptyNoRequestsDesc: string
      emptyNoPool: string
      emptyNoPoolDesc: string
      emptyNoMatch: string
      emptyNoMatchDesc: string
      clearFilters: string
      requiredLevel: string
      availability: string
      ageLabel: string
      department: string
      urgency: string
      painScore: string
      duration: string
      mainComplaint: string
      medicalNote: string
      attachments: string
      noComplaint: string
      noMedicalNote: string
      noAttachments: string
      oneImageAttachment: string
      patientContact: string
      contactPatientMsg: string
      btnRequest: string
      submitting: string
      badgeApproved: string
      badgePending: string
      pendingFacultyReview: string
      approvedCheckDashboard: string
      requestDeclined: string
      unassigned: string
      imageAlt: string
      viewFullSize: string
    }
    exchange: {
      backToDashboard: string
      pageTitle: string
      pageDesc: string
      exchangesPending: string
      previewNote: string
      previewDesc: string
      myActiveCases: string
      myActiveCasesDesc: string
      realDataNote: string
      active: string
      offerForExchange: string
      exchangePosted: string
      howExchangesWorkTitle: string
      howExchangesWorkDesc: string
      exchangeBoard: string
      open: string
      exchangeBoardDesc: string
      offeredBy: string
      patient: string
      acceptedAwaitingApproval: string
      acceptExchange: string
      availableCases: string
      comingSoonTitle: string
      comingSoonDesc: string
    }
    requests: {
      pageTitle: string
      pageDesc: string
      backToDashboard: string
      noRequests: string
      noRequestsDesc: string
      browseCasePool: string
      submittedLabel: string
      cityLabel: string
      statusPending: string
      statusApproved: string
      statusRejected: string
      messagePending: string
      messageApproved: string
      messageRejected: string
      goToDashboard: string
      sectionActive: string
      sectionCompleted: string
      sectionRejected: string
      completedNote: string
    }
  }

  // ── Faculty / Admin portal ─────────────────────────────────────────────────
  admin: {
    shared: {
      clinicalPlatform: string
      navDashboard: string
      navTriageReview: string
      signOut: string
    }
    login: {
      checkingSession: string
      title: string
      subtitle: string
      emailLabel: string
      passwordLabel: string
      showPassword: string
      hidePassword: string
      signingIn: string
      signIn: string
      facultyStaffOnly: string
      studentQuestion: string
      studentPortalLink: string
      patientQuestion: string
      submitRequest: string
      checkStatus: string
      noAccountNeeded: string
      errorInvalidCredentials: string
      errorNotFacultyPortal: string
      errorNoRole: string
    }
    dashboard: {
      pageTitle: string
      systemsOnline: string
      caseAwaitingReview: string
      casesAwaitingReview: string
      openWorkQueue: string
      inviteStudentTitle: string
      inviteStudentDesc: string
      inviteStudentEmailLabel: string
      inviteStudentEmailPlaceholder: string
      inviteStudentButton: string
      inviteStudentSending: string
      inviteStudentSuccess: string
      inviteStudentInvalidEmail: string
      inviteStudentErrorGeneric: string
      statNewTodayLabel: string
      statNewTodayDesc: string
      statPendingLabel: string
      statPendingDesc: string
      statPendingReviewLink: string
      statMatchedLabel: string
      statMatchedDesc: string
      statTotalLabel: string
      statTotalDesc: string
      urgentQueueTitle: string
      viewAll: string
      reviewNow: string
      recentRequests: string
      viewAllLink: string
      tablePatient: string
      tableIssue: string
      tableUrgency: string
      tableStatus: string
      tableSubmitted: string
      noRequests: string
      casesByDept: string
      noDeptCases: string
      actionRequired: string
      queueClear: string
      urgentWaitingSingle: string
      urgentWaitingPluralSuffix: string
      noUrgentCases: string
      statCompletedLabel: string
      statCancelledLabel: string
      statInTreatmentLabel: string
    }
    requests: {
      backToDashboard: string
      pageTitle: string
      pageDesc: string
      pendingReviewSuffix: string
      urgentSuffix: string
      searchPlaceholder: string
      filterLabel: string
      sortLabel: string
      statusAll: string
      statusSubmitted: string
      statusUnderReview: string
      statusMatched: string
      statusCompleted: string
      statusRejected: string
      urgencyAll: string
      urgencyHighLabel: string
      urgencyMediumLabel: string
      urgencyLowLabel: string
      sortNewest: string
      sortOldest: string
      sortByUrgency: string
      countOf: string
      countCaseSuffix: string
      countCasesSuffix: string
      noResultsTitle: string
      noResultsFilteredDesc: string
      noResultsEmptyDesc: string
      reportedIssue: string
      assignedDept: string
      suggestedDept: string
      verify: string
      openCaseFile: string
      statusLabelSubmitted: string
      statusLabelUnderReview: string
      statusLabelMatched: string
      statusLabelContacted: string
      statusLabelCompleted: string
      statusLabelRejected: string
      urgencyLabelHigh: string
      urgencyLabelMedium: string
      urgencyLabelLow: string
      urgencyLabelUnspecified: string
    }
    detail: {
      backToReviewList: string
      caseReviewPrefix: string
      refLabel: string
      submittedToday: string
      waitingOneDay: string
      waitingDaysPrefix: string
      waitingDaysSuffix: string
      patientProfileTitle: string
      ageLabel: string
      locationLabel: string
      phoneLabel: string
      langLabel: string
      availabilityLabel: string
      complaintLabel: string
      triageTitle: string
      triageReleasedNote: string
      triageClosedNote: string
      assignDeptLabel: string
      assignDeptHint: string
      urgencyLabel: string
      urgencyHighOption: string
      urgencyMediumOption: string
      urgencyLowOption: string
      studentLevelLabel: string
      clinicalNotesLabel: string
      clinicalNotesPlaceholder: string
      editCase: string
      updateTriage: string
      reasonLabel: string
      reasonPlaceholder: string
      reasonRequired: string
      deptChangeWarningGeneral: string
      deptChangeWarningAssigned: string
      saveDraft: string
      rejectOutOfScope: string
      approveReleaseToPool: string
      cancelCaseConfirmTitle: string
      cancelCaseWarning: string
      confirmCancelCase: string
      cancelling: string
      rejectConfirmTitle: string
      rejectConfirmDesc: string
      cancel: string
      rejecting: string
      confirmReject: string
      confirmStudentReject: string
      confirmUndoRejection: string
      releaseConfirmTitle: string
      releaseDeptLabel: string
      releaseUrgencyLabel: string
      releaseStudentLevelLabel: string
      releasing: string
      confirmRelease: string
      savedDraft: string
      savedApproved: string
      savedRejected: string
      savedTriageUpdated: string
      statusUpdated: string
      historyTitle: string
      historyEmpty: string
      historyCaseReleased: string
      historyStudentSubmitted: string
      historyStudentApproved: string
      historyStudentRejected: string
      historyRejectionUndone: string
      historyDepartmentChanged: string
      historyClinicalNotesUpdated: string
      historyCaseCancelled: string
      reviewRecordTitle: string
      reviewedByLabel: string
      lastReviewedLabel: string
      noReviewYet: string
      uploadedImagesTitle: string
      noUploadedImage: string
      openingFile: string
      viewFullScreen: string
      priorRecordsTitle: string
      priorRecordsDesc: string
      priorRecordsNote: string
      lifecycleTitle: string
      stepReleasedToPool: string
      stepStudentAssigned: string
      stepPatientContacted: string
      stepApptScheduled: string
      stepInTreatment: string
      stepCompleted: string
      stepCancelled: string
      markContacted: string
      markApptScheduled: string
      markInTreatment: string
      markCompleted: string
      markCancelled: string
      closedCompleted: string
      closedCancelledMsg: string
      closedGenericMsg: string
      studentRequestsTitle: string
      studentRequestCountSuffix: string
      studentRequestsCountSuffix: string
      noStudentRequests: string
      requestedAtLabel: string
      reviewedByAtLabel: string
      studentActiveCasesLabel: string
      approveBtn: string
      rejectBtn: string
      undoRejection: string
      uploadedFileFallback: string
    }
    // ── DB-backed display values shown in the admin portal ──────────────────
    db: {
      statusSubmitted: string
      statusUnderReview: string
      statusMatched: string
      statusStudentApproved: string
      statusContacted: string
      statusApptScheduled: string
      statusInTreatment: string
      statusCompleted: string
      statusRejected: string
      statusCancelled: string
      treatmentInitialExam: string
      treatmentCleaning: string
      treatmentFillings: string
      treatmentExtraction: string
      treatmentRootCanal: string
      treatmentGum: string
      treatmentProsthetics: string
      treatmentOrthodontics: string
      treatmentPediatric: string
      treatmentEsthetic: string
      treatmentOther: string
      deptEndodontics: string
      deptSurgery: string
      deptOrthodontics: string
      deptPeriodontology: string
      deptRestorative: string
      deptProsthodontics: string
      deptPedodontics: string
      deptRadiology: string
      deptGeneralReview: string
      langTurkish: string
      langEnglish: string
      langArabic: string
      daysNoPreference: string
      daysWeekdayMornings: string
      daysWeekdayAfternoons: string
      daysAsSoonAsPossible: string
      levelYear4: string
      levelYear5: string
      levelSpecialist: string
      studentReqPending: string
      studentReqApproved: string
      studentReqRejected: string
      timeJustNow: string
      timeYesterday: string
      timeMinutesSuffix: string
      timeHoursSuffix: string
      timeDaysSuffix: string
    }
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
    privacyPolicy: string
    studentPortal: string
    facultyPortal: string
    casePool: string
    affordableCareInfo: string
    faq: string
    clinicalRequirements: string
    universityPilot: string
    email: string
    instagram: string
    whatsappSupport: string
    /** {year} is replaced at render time */
    copyright: string
  }

  faqPage: {
    eyebrow: string
    title: string
    description: string
    backToRequest: string
    items: {
      whatIsDentBridgeQuestion: string
      whatIsDentBridgeAnswer: string
      whoWillTreatMeQuestion: string
      whoWillTreatMeAnswer: string
      isTreatmentSupervisedQuestion: string
      isTreatmentSupervisedAnswer: string
      howDoIRequestTreatmentQuestion: string
      howDoIRequestTreatmentAnswer: string
      whatHappensAfterSubmitQuestion: string
      whatHappensAfterSubmitAnswer: string
      doINeedToKnowDepartmentQuestion: string
      doINeedToKnowDepartmentAnswer: string
      canIUploadPhotosQuestion: string
      canIUploadPhotosAnswer: string
      isMyInformationPrivateQuestion: string
      isMyInformationPrivateAnswer: string
      howMuchDoesTreatmentCostQuestion: string
      howMuchDoesTreatmentCostAnswer: string
      canICheckStatusQuestion: string
      canICheckStatusAnswer: string
      whatKindsOfCasesQuestion: string
      whatKindsOfCasesAnswer: string
    }
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
    myPortal: 'Check My Request Status',
    newRequest: 'New Treatment Request',
    backToHome: 'Back to Home',
  },

  cta: {
    submitRequest: 'Submit Treatment Request',
    checkStatus: 'Check Treatment Status',
  },

  hero: {
    badge: 'Faculty-Supervised Access to Care',
    title: 'Affordable Supervised Dental Care',
    description:
      'DentBridge helps patients access affordable dental care through a faculty-reviewed process that matches them with senior dental students under supervision.',
  },

  benefits: {
    affordableCare: 'Affordable university care',
    facultySupervision: 'Faculty supervision',
    structuredReview: 'Clear treatment process',
    easyCoordination: 'Easy coordination',
    modernWorkflow: 'Modern digital workflow',
  },

  callout: {
    heading: 'Ready to request treatment?',
    description:
      'Submit your request today and let our university team review your case.',
  },

  landing: {
    howItWorksTitle: 'How It Works',
    howItWorksDesc:
      'Submit your request, let our faculty review your case, and get matched to the right department and student through a structured supervised process.',
    step1Title: '1. Submit Request',
    step1Desc: 'Complete a short form describing your dental concern and basic treatment needs.',
    step2Title: '2. Faculty Review',
    step2Desc:
      'Your request is reviewed by faculty to understand your case and identify the most appropriate clinical path.',
    step3Title: '3. Smart Matching',
    step3Desc:
      'Your case is matched to the right department and the most suitable student based on your treatment needs.',
    step4Title: '4. Contact & Scheduling',
    step4Desc: 'You are contacted to arrange the next step and schedule your appointment.',
    step5Title: '5. Supervised Treatment',
    step5Desc:
      'Treatment proceeds in a structured and transparent way under qualified faculty supervision.',
    whyTitle: 'Why Choose University-Supervised Care?',
    whyCareTitle: 'Affordable Care',
    whyCareDesc:
      'Receive quality dental care in a supervised academic environment designed to make treatment more accessible.',
    whyOversightTitle: 'The Right Care Starts with the Right Match',
    whyOversightDesc:
      'Your case is carefully reviewed and assigned to the most suitable department, so you don’t waste time in the wrong place.',
    whyMultiTitle: 'Care Guided by Your Needs',
    whyMultiDesc:
      'Your request is reviewed with attention to your symptoms, treatment needs, and clinical priorities.',
    whySupportTitle: 'Support Future Dentists',
    whySupportDesc:
      'By choosing university-supervised care, you also help dental students gain valuable clinical experience and grow into confident future professionals.',
    whyDigitalTitle: 'Modern Clinical Environment',
    whyDigitalDesc:
      'Benefit from organized academic workflows, contemporary facilities, and supervised treatment planning.',
    activePartnerStripMessage:
      'Now accepting patient requests through Istinye University Faculty of Dentistry in Istanbul.',
    activePartnerStripButton: 'View Location',
    activePartnerStripLogoAlt:
      'Istinye University Faculty of Dentistry logo',
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
    sectionSupport: 'Optional Support',
    sectionConsent: 'Consent',
    fullName: 'Full Name',
    age: 'Age',
    gender: 'Gender',
    phone: 'Phone Number',
    phoneCountryCode: 'Country Code',
    preferredLanguage: 'Preferred Communication Language',
    preferredUniversity: 'Preferred University / Clinic',
    preferredUniversityRequired: 'Please select your preferred university / clinic.',
    preferredUniversityIstinyeDentalHospital: 'Istinye Dental Hospital',
    supportingImages: 'Supporting Images',
    optional: '(optional)',
    selectPlaceholder: 'Select an option',
    fullNamePlaceholder: 'Enter your full name',
    agePlaceholder: 'Your age',
    phonePlaceholder: 'Enter phone number with country code',
    phoneNumberPlaceholder: 'Enter phone number',
    painScoreLabel: 'Pain Score (0–10)',
    painScorePlaceholder: 'Select pain score',
    durationLabel: 'How long has this problem been present?',
    durationPlaceholder: 'Select duration',
    durationToday: 'Today',
    durationFewDays: 'A few days',
    durationOneToTwoWeeks: '1–2 weeks',
    durationMoreThanMonth: 'More than a month',
    durationRoutineNoSpecificStart: 'Routine / No specific start date',
    medicalConditionLabel: 'Important Medical Condition',
    medicalConditionDetailsLabel: 'Please describe your medical condition',
    medicalConditionDetailsPlaceholder: 'Describe your medical condition',
    medicalNone: 'None',
    medicalDiabetes: 'Diabetes',
    medicalPregnancy: 'Pregnancy',
    medicalBloodThinner: 'Blood thinner use',
    medicalAllergy: 'Allergy',
    medicalOther: 'Other',
    contactMethodLabel: 'Preferred Contact Method',
    contactMethodWhatsapp: 'WhatsApp',
    contactMethodPhone: 'Phone Call',
    contactMethodSms: 'SMS',
    bestContactTimeLabel: 'Best Time to Contact You',
    contactTimeMorning: 'Morning',
    contactTimeAfternoon: 'Afternoon',
    contactTimeEvening: 'Evening',
    contactTimeAnytime: 'Anytime',
    uploadHelpText:
      'Uploading a photo or x-ray helps our faculty review your case faster and more accurately.',
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
      notSure: "I'm not sure",
      other: 'Other',
    },
    langTurkish: 'Turkish',
    langEnglish: 'English',
    langArabic: 'Arabic',
    genderMale: 'Male',
    genderFemale: 'Female',
    treatmentCategory: 'Treatment Category',
    mainComplaint: 'Main Complaint',
    mainComplaintPlaceholder:
      'Describe your symptoms, pain, or dental needs in detail…',
    urgency: 'Pain Level / Urgency',
    urgencyPlaceholder: 'Select urgency',
    urgencyLow: 'Low (Routine)',
urgencyMedium: 'Medium (Discomfort)',
urgencyHigh: 'High (Urgent / Severe Pain)',
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

  student: {
    login: {
      checkingSession: 'Checking session\u2026',
      clinicalPlatform: 'Clinical Platform',
      title: 'Student Sign In',
      subtitle: 'Clinical students only. Use your university credentials to access the case dashboard.',
      emailLabel: 'Email address',
      passwordLabel: 'Password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      signingIn: 'Signing in\u2026',
      signIn: 'Sign In',
      clinicalStudentsOnly: 'Clinical students only',
      facultyAdminQuestion: 'Are you faculty or an administrator?',
      adminPortalLink: 'Admin portal login',
      patientQuestion: 'Are you a patient?',
      submitRequest: 'Submit a request',
      checkStatus: 'check your status',
      noAccountNeeded: 'No account needed.',
      errorInvalidCredentials: 'Invalid email or password. Please try again.',
      errorNotStudentPortal: 'This account is not allowed to use the student portal.',
      errorNoRole: 'Your account does not have an assigned role. Contact the platform administrator.',
    },
  nav: {
  clinicalPlatform: 'Clinical Platform',
  dashboard: 'Dashboard',
  casePool: 'Case Pool',
  myRequests: 'My Requests',
  exchange: 'Exchange',
  signOut: 'Sign Out',
  availableCases: 'Available Cases',
},
    dashboard: {
      welcomeBack: 'Good to have you back',
      enrolledActive: 'Enrolled & Active',
      browseCases: 'Browse Cases',
      caseNeedsAttention: '1 case needs your attention',
      casesNeedAttention: 'cases need your attention',
      actionNeededSuffix: '\u2014 scroll down to update the status of your active cases.',
      statPendingLabel: 'Pending',
      statPendingDesc: 'Awaiting faculty',
      statActiveLabel: 'Active',
      statActiveCases: 'Cases assigned to you',
      statNoActiveCases: 'No active cases yet',
      statInPoolLabel: 'In Pool',
      statInPoolDesc: 'Open to request',
      statUrgentLabel: 'Urgent',
      statUrgentDesc: 'High-priority cases',
      myActiveCases: 'My Active Cases',
      assigned: 'assigned',
      stepContacted: 'Contacted',
      stepApptSet: 'Appt. Set',
      stepInTreatment: 'In Treatment',
      statusReadyToContact: 'Ready to contact \u2014 reach out to schedule the appointment',
      statusPatientContacted: 'Patient contacted \u2014 confirm appointment date and time',
      statusApptConfirmed: 'Appointment confirmed \u2014 mark when treatment begins',
      statusInTreatmentDesc: 'Treatment in progress \u2014 faculty will close this case',
      statusCompleted: 'Treatment completed',
      statusCancelled: 'This case has been cancelled',
      patientContact: 'Patient Contact',
      actionNeededBadge: 'ACTION NEEDED',
      btnMarkContacted: 'Mark Patient Contacted',
      btnMarkApptScheduled: 'Mark Appointment Scheduled',
      btnMarkInTreatment: 'Mark In Treatment',
      updating: 'Updating\u2026',
      treatmentInProgress: 'Treatment in progress \u2014 faculty will close case',
      caseClosed: 'Case closed \u2014 treatment completed',
      caseCancelledText: 'Case cancelled',
      recentlyInPool: 'Recently in Pool',
      caseAvailable: 'case available',
      casesAvailable: 'cases available',
      viewAll: 'View All',
      tableCase: 'Case',
      tableTreatment: 'Treatment',
      tableDept: 'Dept.',
      tableUrgency: 'Urgency',
      noCasesInPool: 'No cases in the pool yet',
      noCasesInPoolDesc: 'Faculty releases cases after review. Check back soon.',
      view: 'View',
      quickActions: 'Quick Actions',
      browseCasePool: 'Browse Case Pool',
      casesOpen: 'cases open',
      findAvailableCases: 'Find available cases',
      caseExchange: 'Case Exchange',
      tradeCases: 'Trade cases with peers',
      clinicalRequirements: 'Clinical Requirements',
      caseLogComingSoon: 'Case log \u2014 coming soon',
      requestPendingReview: '1 request pending review',
      requestsPendingReview: 'requests pending review',
      pendingRequestsDesc: 'Faculty will review your requests and send a decision. No action needed on your end.',
      completedTreatments: 'Completed Treatments',
      completedTreatmentsDesc: 'Cases you have fully completed',
      treatmentCompleted: 'treatment completed',
      treatmentsCompleted: 'treatments completed',
    },
    cases: {
      backToDashboard: 'Back to Dashboard',
      pageTitle: 'Case Pool',
      pageDesc: 'Faculty-approved cases open for student requests. Find cases that match your department rotation and training level.',
      searchPlaceholder: 'Search treatment, city\u2026',
      filterAll: 'All Cases',
      filterMyRequests: 'My Requests',
      deptLabel: 'Dept:',
      requestPendingReview: '1 request pending faculty review.',
      requestsPendingReview: 'requests pending faculty review.',
      pendingNoteNotify: "You'll be notified once a decision is made.",
      emptyNoRequests: 'No requests yet',
      emptyNoRequestsDesc: 'Switch to \u201cAll Cases\u201d to browse the pool and request a case.',
      emptyNoPool: 'No cases in the pool yet',
      emptyNoPoolDesc: 'Faculty releases cases after triage. Check back soon.',
      emptyNoMatch: 'No cases match your filter',
      emptyNoMatchDesc: 'Try a different department filter or clear your search.',
      clearFilters: 'Clear filters',
      requiredLevel: 'Required level:',
      availability: 'Patient Availability:',
      ageLabel: 'Age',
      department: 'Dept:',
      urgency: 'Urgency',
      painScore: 'Pain score',
      duration: 'Duration',
      mainComplaint: 'Main complaint',
      medicalNote: 'Medical note',
      attachments: 'Attachments',
      noComplaint: 'No complaint provided',
      noMedicalNote: 'None',
      noAttachments: 'No attachments',
      oneImageAttachment: '1 image',
      patientContact: 'Patient Contact',
      contactPatientMsg: 'Contact the patient to schedule their appointment.',
      btnRequest: 'Request This Case',
      submitting: 'Submitting\u2026',
      badgeApproved: 'APPROVED',
      badgePending: 'PENDING',
      pendingFacultyReview: 'Pending Faculty Review',
      approvedCheckDashboard: 'Approved \u2014 check your dashboard',
      requestDeclined: 'Request Declined',
      unassigned: 'Unassigned',
      imageAlt: 'Patient clinical image',
      viewFullSize: 'View full size',
    },
    exchange: {
      backToDashboard: 'Back to Dashboard',
      pageTitle: 'Case Exchange',
      pageDesc: 'Offer your active cases for exchange or accept cases from other students. All exchanges require faculty approval before taking effect.',
      exchangesPending: 'Exchanges pending faculty approval',
      previewNote: 'Preview \u2014 this page shows example data only.',
      previewDesc: 'Case exchange is not yet connected to the database. No actions on this page will write any data. The full workflow will be enabled once the exchange table and faculty approval step are built.',
      myActiveCases: 'My Active Cases',
      myActiveCasesDesc: 'Example cases shown below.',
      realDataNote: 'Real data requires assignment tracking.',
      active: 'Active',
      offerForExchange: 'Offer for Exchange',
      exchangePosted: 'Exchange request posted',
      howExchangesWorkTitle: 'How exchanges work:',
      howExchangesWorkDesc: 'Post a case to the board, another student accepts it, and a faculty member confirms the swap before it takes effect.',
      exchangeBoard: 'Exchange Board',
      open: 'open',
      exchangeBoardDesc: 'Cases offered by other students. Accept one to initiate the swap request.',
      offeredBy: 'Offered by',
      patient: 'Patient:',
      acceptedAwaitingApproval: 'Accepted \u2014 awaiting faculty approval',
      acceptExchange: 'Accept Exchange',
      availableCases: 'Available Cases',
      comingSoonTitle: 'Coming Soon',
      comingSoonDesc: 'Patient exchange will be available soon.',
    },
    requests: {
      pageTitle: 'My Requests',
      pageDesc: 'Track all case requests you have submitted and see their current approval status.',
      backToDashboard: 'Back to Dashboard',
      noRequests: 'No requests yet',
      noRequestsDesc: 'You have not requested any cases yet. Browse the case pool to submit your first request.',
      browseCasePool: 'Browse Case Pool',
      submittedLabel: 'Submitted:',
      cityLabel: 'City:',
      statusPending: 'PENDING',
      statusApproved: 'APPROVED',
      statusRejected: 'REJECTED',
      messagePending: 'Your request is waiting for faculty review.',
      messageApproved: 'Your request was approved. Continue from the dashboard.',
      messageRejected: 'Your request was declined for this case.',
      goToDashboard: 'Go to Dashboard',
      sectionActive: 'Active & Pending',
      sectionCompleted: 'Completed Treatments',
      sectionRejected: 'Declined Requests',
      completedNote: 'These cases have been fully completed.',
    },
  },

  admin: {
    shared: {
      clinicalPlatform: 'Faculty-Supported Clinical Platform',
      navDashboard: 'Dashboard',
      navTriageReview: 'Patient Triage & Case Review',
      signOut: 'Sign Out',
    },
    login: {
      checkingSession: 'Checking session\u2026',
      title: 'Faculty Administrator Sign In',
      subtitle: 'This portal is for faculty administrators only. Use your university credentials to access the admin dashboard.',
      emailLabel: 'Email address',
      passwordLabel: 'Password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      signingIn: 'Signing in\u2026',
      signIn: 'Sign In',
      facultyStaffOnly: 'Faculty and administrative staff only',
      studentQuestion: 'Are you a clinical student?',
      studentPortalLink: 'Student portal login',
      patientQuestion: 'Are you a patient?',
      submitRequest: 'Submit a request',
      checkStatus: 'check your status',
      noAccountNeeded: 'No account needed.',
      errorInvalidCredentials: 'Invalid email or password. Please try again.',
      errorNotFacultyPortal: 'This account is not allowed to use the faculty portal.',
      errorNoRole: 'Your account does not have an assigned role. Contact the platform administrator.',
    },
    dashboard: {
      pageTitle: 'Faculty Dashboard',
      systemsOnline: 'Systems online',
      caseAwaitingReview: '1 case awaiting review',
      casesAwaitingReview: 'cases awaiting review',
      openWorkQueue: 'Open Work Queue',
      inviteStudentTitle: 'Invite Student',
      inviteStudentDesc:
        'Send a student invitation email using the correct DentBridge account setup flow.',
      inviteStudentEmailLabel: 'Student email',
      inviteStudentEmailPlaceholder: 'student@university.edu',
      inviteStudentButton: 'Send Invite',
      inviteStudentSending: 'Sending…',
      inviteStudentSuccess:
        'Invitation sent. The email link will route through the set-password flow.',
      inviteStudentInvalidEmail: 'Please enter a valid email address.',
      inviteStudentErrorGeneric: 'Unable to send the invitation right now.',
      statNewTodayLabel: 'New Today',
      statNewTodayDesc: 'Submitted today',
      statPendingLabel: 'Pending Review',
      statPendingDesc: 'Needs faculty assessment',
      statPendingReviewLink: 'Review \u2192',
      statMatchedLabel: 'Matched Cases',
      statMatchedDesc: 'Released to student pool',
      statTotalLabel: 'Total Requests',
      statTotalDesc: 'All time',
      urgentQueueTitle: 'High-Urgency Cases Awaiting Review',
      viewAll: 'View all \u2192',
      reviewNow: 'Review Now',
      recentRequests: 'Recent Requests',
      viewAllLink: 'View All',
      tablePatient: 'Patient',
      tableIssue: 'Issue',
      tableUrgency: 'Urgency',
      tableStatus: 'Status',
      tableSubmitted: 'Submitted',
      noRequests: 'No requests found.',
      casesByDept: 'Cases by Department',
      noDeptCases: 'No cases are currently assigned to departments.',
      actionRequired: 'Action Required',
      queueClear: 'Queue Clear',
      urgentWaitingSingle: '1 urgent case is waiting for faculty review. Please review to avoid delays.',
      urgentWaitingPluralSuffix: 'urgent cases are waiting for faculty review. Please review to avoid delays.',
      noUrgentCases: 'No urgent cases are currently awaiting review.',
      statCompletedLabel: 'Completed',
      statCancelledLabel: 'Cancelled',
      statInTreatmentLabel: 'In Treatment',
    },
    requests: {
      backToDashboard: 'Back to Dashboard',
      pageTitle: 'Patient Triage & Case Review',
      pageDesc: 'Review incoming cases, verify urgency, assign clinical routing, and release to the student pool.',
      pendingReviewSuffix: 'pending review',
      urgentSuffix: 'urgent',
      searchPlaceholder: 'Search by name, ID, phone, or issue\u2026',
      filterLabel: 'Filter:',
      sortLabel: 'Sort:',
      statusAll: 'All Statuses',
      statusSubmitted: 'Submitted',
      statusUnderReview: 'Under Review',
      statusMatched: 'Matched',
      statusCompleted: 'Completed',
      statusRejected: 'Rejected',
      urgencyAll: 'All Urgencies',
      urgencyHighLabel: 'High Urgency',
      urgencyMediumLabel: 'Medium',
      urgencyLowLabel: 'Low',
      sortNewest: 'Newest First',
      sortOldest: 'Oldest First',
      sortByUrgency: 'High Urgency First',
      countOf: 'of',
      countCaseSuffix: 'case',
      countCasesSuffix: 'cases',
      noResultsTitle: 'No cases found',
      noResultsFilteredDesc: 'No cases match the current filters. Adjust or clear the filters to see more.',
      noResultsEmptyDesc: 'No patient cases have been submitted yet.',
      reportedIssue: 'Reported Issue',
      assignedDept: 'Assigned dept.',
      suggestedDept: 'Suggested dept.',
      verify: '(verify)',
      openCaseFile: 'Open Case File \u2192',
      statusLabelSubmitted: 'Submitted',
      statusLabelUnderReview: 'Under Review',
      statusLabelMatched: 'Matched',
      statusLabelContacted: 'Contacted',
      statusLabelCompleted: 'Completed',
      statusLabelRejected: 'Rejected',
      urgencyLabelHigh: 'High Urgency',
      urgencyLabelMedium: 'Medium',
      urgencyLabelLow: 'Low',
      urgencyLabelUnspecified: 'Unspecified',
    },
    detail: {
      backToReviewList: 'Back to Review List',
      caseReviewPrefix: 'Case Review:',
      refLabel: 'Ref:',
      submittedToday: 'Submitted today',
      waitingOneDay: 'Waiting 1 day',
      waitingDaysPrefix: 'Waiting',
      waitingDaysSuffix: 'days',
      patientProfileTitle: 'Patient Profile & Complaint',
      ageLabel: 'Age',
      locationLabel: 'Location',
      phoneLabel: 'Phone',
      langLabel: 'Preferred Language',
      availabilityLabel: 'Preferred Availability',
      complaintLabel: 'Primary Complaint',
      triageTitle: 'Faculty Triage Decision',
      triageReleasedNote: 'This case has been released to the student pool. No further edits can be made from this view.',
      triageClosedNote: 'This case is closed. No further changes can be made.',
      assignDeptLabel: 'Assign Department',
      assignDeptHint: '(keyword pre-fill \u2014 verify)',
      urgencyLabel: 'Urgency Level',
      urgencyHighOption: 'High (Emergency / Severe Pain)',
      urgencyMediumOption: 'Medium (Discomfort)',
      urgencyLowOption: 'Low (Routine)',
      studentLevelLabel: 'Target Student Level',
      clinicalNotesLabel: 'Clinical Notes & Instructions',
      clinicalNotesPlaceholder: 'Add any specific instructions for the assigned student or coordinator\u2026',
      editCase: 'Edit Case',
      updateTriage: 'Update Triage',
      reasonLabel: 'Reason',
      reasonPlaceholder: 'Enter a short reason',
      reasonRequired: 'A short reason is required.',
      deptChangeWarningGeneral: 'Changing the department will update the case routing.',
      deptChangeWarningAssigned: 'Warning: this case already has a student assigned. Changing the department may affect the active assignment.',
      saveDraft: 'Save Draft',
      rejectOutOfScope: 'Reject / Out of Scope',
      approveReleaseToPool: 'Approve & Release to Pool',
      cancelCaseConfirmTitle: 'Cancel this case?',
      cancelCaseWarning: 'This will cancel the active case. Please add a short reason before confirming.',
      confirmCancelCase: 'Confirm Cancel',
      cancelling: 'Cancelling\u2026',
      rejectConfirmTitle: 'Reject this case?',
      rejectConfirmDesc: 'This will mark the case as out of scope. The patient will see it as rejected. This action cannot be undone from this view.',
      cancel: 'Cancel',
      rejecting: 'Rejecting\u2026',
      confirmReject: 'Confirm Reject',
      confirmStudentReject: 'Confirm Reject',
      confirmUndoRejection: 'Confirm Undo',
      releaseConfirmTitle: 'Release this case to the student pool?',
      releaseDeptLabel: 'Department:',
      releaseUrgencyLabel: 'Urgency:',
      releaseStudentLevelLabel: 'Student level:',
      releasing: 'Releasing\u2026',
      confirmRelease: 'Confirm & Release',
      savedDraft: 'Draft saved.',
      savedApproved: 'Approved and released to pool.',
      savedRejected: 'Case marked as rejected.',
      savedTriageUpdated: 'Triage updated.',
      statusUpdated: 'Status updated.',
      historyTitle: 'Case History / Activity Log',
      historyEmpty: 'No case activity recorded yet.',
      historyCaseReleased: 'Case released to pool',
      historyStudentSubmitted: 'Student request submitted',
      historyStudentApproved: 'Student request approved',
      historyStudentRejected: 'Student request rejected',
      historyRejectionUndone: 'Rejection undone',
      historyDepartmentChanged: 'Department changed',
      historyClinicalNotesUpdated: 'Clinical notes updated',
      historyCaseCancelled: 'Case cancelled',
      reviewRecordTitle: 'Faculty Review Record',
      reviewedByLabel: 'Reviewed by',
      lastReviewedLabel: 'Last reviewed',
      noReviewYet: 'No faculty action has been recorded yet.',
      uploadedImagesTitle: 'Uploaded Images',
      noUploadedImage: 'No uploaded image',
      openingFile: 'Opening\u2026',
      viewFullScreen: 'View Full Screen',
      priorRecordsTitle: 'Prior Records',
      priorRecordsDesc: 'Patient history lookup is not yet connected. Check the university system separately if prior records are needed.',
      priorRecordsNote: 'Details taken from submitted request only',
      lifecycleTitle: 'Case Lifecycle',
      stepReleasedToPool: 'Released to Pool',
      stepStudentAssigned: 'Student Assigned',
      stepPatientContacted: 'Patient Contacted',
      stepApptScheduled: 'Appt. Scheduled',
      stepInTreatment: 'In Treatment',
      stepCompleted: 'Completed',
      stepCancelled: 'Cancelled',
      markContacted: 'Mark Patient Contacted',
      markApptScheduled: 'Mark Appointment Scheduled',
      markInTreatment: 'Mark In Treatment',
      markCompleted: 'Mark Treatment Completed',
      markCancelled: 'Mark Cancelled',
      closedCompleted: 'Treatment completed. This case is closed.',
      closedCancelledMsg: 'This case has been cancelled.',
      closedGenericMsg: 'This case is closed.',
      studentRequestsTitle: 'Student Requests',
      studentRequestCountSuffix: 'request',
      studentRequestsCountSuffix: 'requests',
      noStudentRequests: 'No students have requested this case yet.',
      requestedAtLabel: 'Requested',
      reviewedByAtLabel: 'Reviewed by',
      studentActiveCasesLabel: 'Active cases:',
      approveBtn: 'Approve',
      rejectBtn: 'Reject',
      undoRejection: 'Undo Rejection',
      uploadedFileFallback: 'Uploaded file',
    },
    db: {
      statusSubmitted: 'Submitted',
      statusUnderReview: 'Under Review',
      statusMatched: 'Matched',
      statusStudentApproved: 'Student Assigned',
      statusContacted: 'Contacted',
      statusApptScheduled: 'Appt. Scheduled',
      statusInTreatment: 'In Treatment',
      statusCompleted: 'Completed',
      statusRejected: 'Rejected',
      statusCancelled: 'Cancelled',
      treatmentInitialExam: 'Initial Exam / Consultation',
      treatmentCleaning: 'Dental Cleaning',
      treatmentFillings: 'Fillings',
      treatmentExtraction: 'Tooth Extraction',
      treatmentRootCanal: 'Root Canal Treatment',
      treatmentGum: 'Gum Treatment',
      treatmentProsthetics: 'Prosthetics / Crowns',
      treatmentOrthodontics: 'Orthodontics',
      treatmentPediatric: 'Pediatric Dentistry',
      treatmentEsthetic: 'Esthetic Dentistry',
      treatmentOther: 'Other',
      deptEndodontics: 'Endodontics',
      deptSurgery: 'Oral & Maxillofacial Surgery',
      deptOrthodontics: 'Orthodontics',
      deptPeriodontology: 'Periodontology',
      deptRestorative: 'Restorative Dentistry',
      deptProsthodontics: 'Prosthodontics',
      deptPedodontics: 'Pedodontics',
      deptRadiology: 'Oral Radiology',
      deptGeneralReview: 'General Review',
      langTurkish: 'Turkish',
      langEnglish: 'English',
      langArabic: 'Arabic',
      daysNoPreference: 'No Preference',
      daysWeekdayMornings: 'Weekday Mornings',
      daysWeekdayAfternoons: 'Weekday Afternoons',
      daysAsSoonAsPossible: 'As Soon As Possible',
      levelYear4: 'Year 4 Clinical Student',
      levelYear5: 'Year 5 Clinical Student',
      levelSpecialist: 'Specialist Dentist',
      studentReqPending: 'Pending',
      studentReqApproved: 'Approved',
      studentReqRejected: 'Rejected',
      timeJustNow: 'Just now',
      timeYesterday: 'Yesterday',
      timeMinutesSuffix: 'm ago',
      timeHoursSuffix: 'h ago',
      timeDaysSuffix: 'd ago',
    },
  },

  footer: {
    tagline: 'Faculty-Supported Clinical Platform',
    description:
      'Connecting patients with affordable, supervised dental care through a structured academic workflow.',
    patientServices: 'For Patients',
    clinicalPortals: 'Clinical Portals',
    contact: 'Contact',
    requestTreatment: 'Request Treatment',
    checkStatus: 'Check Request Status',
    privacyPolicy: 'Privacy Policy',
    studentPortal: 'Student Portal',
    facultyPortal: 'Faculty Portal',
    casePool: 'Case Pool',
    affordableCareInfo: 'Affordable Care Information',
    faq: 'FAQ',
    clinicalRequirements: 'Clinical Requirements',
    universityPilot: 'University-supported pilot platform',
    email: 'Dentbridge.tr@gmail.com',
    instagram: '@Dentbridge.tr',
    whatsappSupport: 'WhatsApp support available',
    copyright:
      '© 2026 DentBridge. All treatments are provided under academic supervision.',
  },

  faqPage: {
    eyebrow: 'Frequently Asked Questions',
    title: 'Patient FAQ',
    description:
      'Here you can find clear answers to the most common questions about requesting treatment through DentBridge.',
    backToRequest: 'Back to request',
    items: {
      whatIsDentBridgeQuestion: 'What is DentBridge?',
      whatIsDentBridgeAnswer:
        'DentBridge is a faculty-supported platform that helps connect patients with appropriate dental student cases under academic supervision. The goal is to make access to care more structured, clear, and affordable.',
      whoWillTreatMeQuestion: 'Who will treat me?',
      whoWillTreatMeAnswer:
        'Treatment is provided by senior dental students, under the supervision of qualified faculty members. Cases are reviewed before matching to help place patients with the most suitable department and student level.',
      isTreatmentSupervisedQuestion: 'Is treatment supervised?',
      isTreatmentSupervisedAnswer:
        'Yes. DentBridge is designed around supervised academic care. Patients are matched through a faculty-reviewed process, and treatment is provided within an educational clinical environment.',
      howDoIRequestTreatmentQuestion: 'How do I request treatment?',
      howDoIRequestTreatmentAnswer:
        'You can submit a treatment request through the online form. You will be asked for basic personal and clinical information so the faculty team can review your case and match you appropriately.',
      whatHappensAfterSubmitQuestion: 'What happens after I submit my request?',
      whatHappensAfterSubmitAnswer:
        'After submission, your request is reviewed and directed to the appropriate department. If your case is suitable, it can be matched to a student under supervision. You may then be contacted for the next step.',
      doINeedToKnowDepartmentQuestion: 'Do I need to know which department I need?',
      doINeedToKnowDepartmentAnswer:
        'No. If you are unsure, you can select “I’m not sure” in the request form and describe your complaint in your own words. The faculty review process helps guide the case to the correct department.',
      canIUploadPhotosQuestion: 'Can I upload photos or x-rays?',
      canIUploadPhotosAnswer:
        'Yes. Uploading a photo or x-ray is optional, but it can help the faculty review your case faster and more accurately.',
      isMyInformationPrivateQuestion: 'Is my information private?',
      isMyInformationPrivateAnswer:
        'Your information is collected only to review your request and support the treatment-matching process. Please read our Privacy Policy for more details about how your information is handled.',
      howMuchDoesTreatmentCostQuestion: 'How much does treatment cost?',
      howMuchDoesTreatmentCostAnswer:
        'DentBridge is built to support affordable, supervised dental care. Exact treatment costs may depend on the type of case, clinical needs, and institutional process.',
      canICheckStatusQuestion: 'Can I check the status of my request?',
      canICheckStatusAnswer:
        'Yes. You can use the Check Request Status page to follow your request after submission.',
      whatKindsOfCasesQuestion: 'What kind of cases can I submit?',
      whatKindsOfCasesAnswer:
        'You can submit requests for common dental concerns such as consultation, cleaning, fillings, tooth extraction, root canal treatment, gum treatment, prosthetic needs, orthodontic concerns, pediatric dentistry, and esthetic dentistry.',
    },
  },
}
