'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import {
  ALLOWED_EXTENSIONS,
  HARD_MAX_UPLOAD_BYTES,
  PATIENT_UPLOADS_BUCKET,
} from '@/lib/files/file.constants'
import {
  PatientRequestFooter,
  PatientRequestHeader,
  PatientRequestHero,
  PatientRequestSuccess,
} from '@/components/patient/request/PatientRequestLayout'
import {
  ClinicalDetailsSection,
  ConsentSection,
  PatientInfoSection,
  PatientRequestError,
  PatientRequestFormActions,
  PatientRequestProgressRail,
  SupportSection,
} from '@/components/patient/request/PatientRequestFormSections'

const PATIENT_REQUEST_DRAFT_KEY = 'patient_request_draft'
const PATIENT_REQUEST_STEP_KEY = 'patient_request_step'

type PatientRequestDraft = {
  fullName: string
  phoneCountryCode: string
  phone: string
  age: string
  gender: string
  preferredLanguage: string
  preferredUniversity: string
  treatmentType: string
  complaintText: string
  preferredDays: string
  painScore: string
  symptomDuration: string
  contactMethod: string
  bestContactTime: string
  medicalCondition: string
  medicalConditionDetails: string
  hasTouchedMedicalCondition: boolean
  kvkkAcknowledgement: boolean
  explicitConsent: boolean
}

function parsePatientRequestDraft(value: string | null): PatientRequestDraft | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as (Partial<PatientRequestDraft> & { consent?: unknown }) | null

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    return {
      fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
      phoneCountryCode:
        typeof parsed.phoneCountryCode === 'string' ? parsed.phoneCountryCode : '+90',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      age: typeof parsed.age === 'string' ? parsed.age : '',
      gender: typeof parsed.gender === 'string' ? parsed.gender : '',
      preferredLanguage: typeof parsed.preferredLanguage === 'string' ? parsed.preferredLanguage : '',
      preferredUniversity:
        typeof parsed.preferredUniversity === 'string' ? parsed.preferredUniversity : '',
      treatmentType: typeof parsed.treatmentType === 'string' ? parsed.treatmentType : '',
      complaintText: typeof parsed.complaintText === 'string' ? parsed.complaintText : '',
      preferredDays: typeof parsed.preferredDays === 'string' ? parsed.preferredDays : '',
      painScore: typeof parsed.painScore === 'string' ? parsed.painScore : '',
      symptomDuration: typeof parsed.symptomDuration === 'string' ? parsed.symptomDuration : '',
      contactMethod: typeof parsed.contactMethod === 'string' ? parsed.contactMethod : '',
      bestContactTime: typeof parsed.bestContactTime === 'string' ? parsed.bestContactTime : '',
      medicalCondition: typeof parsed.medicalCondition === 'string' ? parsed.medicalCondition : '',
      medicalConditionDetails:
        typeof parsed.medicalConditionDetails === 'string' ? parsed.medicalConditionDetails : '',
      hasTouchedMedicalCondition:
        typeof parsed.hasTouchedMedicalCondition === 'boolean'
          ? parsed.hasTouchedMedicalCondition
          : typeof parsed.medicalCondition === 'string' && parsed.medicalCondition !== 'None',
      kvkkAcknowledgement:
        typeof parsed.kvkkAcknowledgement === 'boolean' ? parsed.kvkkAcknowledgement : false,
      explicitConsent:
        typeof parsed.explicitConsent === 'boolean'
          ? parsed.explicitConsent
          : typeof parsed.consent === 'boolean'
            ? parsed.consent
            : false,
    }
  } catch {
    return null
  }
}

function parseSavedStepIndex(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function normalizePhoneNumber(value: string) {
  return value.replace(/[\s().-]/g, '')
}

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(ALLOWED_EXTENSIONS)

function getAllowedAttachmentExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''

  return ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) ? extension : null
}

type PreparedUpload = {
  success: true
  fileId: string
  objectPath: string
  token: string
  ticket: string
}

export default function PatientRequestPage() {
  const { t, locale } = useI18n()
  const validationText =
    locale === 'tr'
      ? {
          fullNameRequired: 'Lutfen ad ve soyadinizi girin.',
          fullNameInvalid: 'Lutfen en az iki kelimeden olusan gecerli bir ad soyad girin.',
          ageRequired: 'Lutfen yasinizi girin.',
          ageInvalid: 'Lutfen 1 ile 120 arasinda gecerli bir yas girin.',
          phoneRequired: 'Lutfen telefon numaranizi girin.',
          phoneInvalid: 'Lutfen gecerli bir telefon numarasi girin.',
          fileTypeInvalid: 'Lutfen JPG, PNG veya PDF dosyasi yukleyin.',
        }
      : {
          fullNameRequired: 'Please enter your full name.',
          fullNameInvalid: 'Please enter a valid full name with at least two words.',
          ageRequired: 'Please enter your age.',
          ageInvalid: 'Please enter a valid age between 1 and 120.',
          phoneRequired: 'Please enter your phone number.',
          phoneInvalid: 'Please enter a valid phone number.',
          fileTypeInvalid: 'Please upload a JPG, PNG, or PDF file.',
        }

  const [fullName, setFullName] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+90')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('')
  const [preferredUniversity, setPreferredUniversity] = useState('')

  const [treatmentType, setTreatmentType] = useState('')
  const [complaintText, setComplaintText] = useState('')
  const [preferredDays, setPreferredDays] = useState('')
  const [painScore, setPainScore] = useState('')
  const [symptomDuration, setSymptomDuration] = useState('')
  const [contactMethod, setContactMethod] = useState('')
  const [bestContactTime, setBestContactTime] = useState('')
  const [medicalCondition, setMedicalCondition] = useState('')
  const [medicalConditionDetails, setMedicalConditionDetails] = useState('')
  const [hasTouchedMedicalCondition, setHasTouchedMedicalCondition] = useState(false)
  const [kvkkAcknowledgement, setKvkkAcknowledgement] = useState(false)
  const [explicitConsent, setExplicitConsent] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)
  const [restoredStepIndex, setRestoredStepIndex] = useState<number | null>(null)
  const stepSectionRefs = useRef<Array<HTMLElement | null>>([])

  const formProgressSteps = useMemo(
    () => [
      {
        key: 'patient',
        label: t('request.sectionPatient'),
        completed:
          Boolean(fullName.trim()) &&
          Boolean(phone.trim()) &&
          Boolean(preferredUniversity) &&
          Boolean(age) &&
          Boolean(gender),
      },
      {
        key: 'clinical',
        label: t('request.sectionClinical'),
        completed:
          Boolean(treatmentType) &&
          Boolean(complaintText.trim()) &&
          Boolean(painScore) &&
          Boolean(symptomDuration) &&
          Boolean(medicalCondition) &&
          (medicalCondition !== 'Other' || Boolean(medicalConditionDetails.trim())),
      },
      {
        key: 'support',
        label: t('request.sectionSupport'),
        completed: true,
      },
      {
        key: 'consent',
        label: t('request.sectionConsent'),
        completed: kvkkAcknowledgement && explicitConsent,
      },
    ],
    [
      age,
      complaintText,
      explicitConsent,
      fullName,
      gender,
      kvkkAcknowledgement,
      medicalCondition,
      medicalConditionDetails,
      painScore,
      phone,
      preferredUniversity,
      symptomDuration,
      t,
      treatmentType,
    ]
  )

  const requiredFieldChecks = useMemo(
    () => [
      Boolean(fullName.trim()),
      Boolean(phone.trim()),
      Boolean(preferredUniversity),
      Boolean(age),
      Boolean(gender),
      Boolean(treatmentType),
      Boolean(complaintText.trim()),
      Boolean(painScore),
      Boolean(symptomDuration),
      hasTouchedMedicalCondition && Boolean(medicalCondition),
      medicalCondition !== '' && (medicalCondition !== 'Other' || Boolean(medicalConditionDetails.trim())),
      kvkkAcknowledgement,
      explicitConsent,
    ],
    [
      age,
      complaintText,
      explicitConsent,
      fullName,
      gender,
      hasTouchedMedicalCondition,
      kvkkAcknowledgement,
      medicalCondition,
      medicalConditionDetails,
      painScore,
      phone,
      preferredUniversity,
      symptomDuration,
      treatmentType,
    ]
  )
  const completedRequiredFields = requiredFieldChecks.filter(Boolean).length
  const progressPercent = Math.round(
    (completedRequiredFields / requiredFieldChecks.length) * 100
  )
  const currentStepIndex = useMemo(() => {
    const firstIncomplete = formProgressSteps.findIndex((step) => !step.completed)
    return firstIncomplete === -1 ? formProgressSteps.length - 1 : firstIncomplete
  }, [formProgressSteps])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    let restoreFrameId: number | null = null
    const savedDraft = parsePatientRequestDraft(
      window.sessionStorage.getItem(PATIENT_REQUEST_DRAFT_KEY)
    )
    const savedStepIndex = parseSavedStepIndex(
      window.sessionStorage.getItem(PATIENT_REQUEST_STEP_KEY)
    )

    if (savedDraft) {
      restoreFrameId = window.requestAnimationFrame(() => {
        setFullName(savedDraft.fullName)
        setPhoneCountryCode(savedDraft.phoneCountryCode)
        setPhone(savedDraft.phone)
        setAge(savedDraft.age)
        setGender(savedDraft.gender)
        setPreferredLanguage(savedDraft.preferredLanguage)
        setPreferredUniversity(savedDraft.preferredUniversity)
        setTreatmentType(savedDraft.treatmentType)
        setComplaintText(savedDraft.complaintText)
        setPreferredDays(savedDraft.preferredDays)
        setPainScore(savedDraft.painScore)
        setSymptomDuration(savedDraft.symptomDuration)
        setContactMethod(savedDraft.contactMethod)
        setBestContactTime(savedDraft.bestContactTime)
        setMedicalCondition(savedDraft.medicalCondition)
        setMedicalConditionDetails(savedDraft.medicalConditionDetails)
        setHasTouchedMedicalCondition(savedDraft.hasTouchedMedicalCondition)
        setKvkkAcknowledgement(savedDraft.kvkkAcknowledgement)
        setExplicitConsent(savedDraft.explicitConsent)

        if (savedStepIndex !== null) {
          setRestoredStepIndex(savedStepIndex)
        }

        setHasRestoredDraft(true)
      })
    } else if (window.sessionStorage.getItem(PATIENT_REQUEST_DRAFT_KEY)) {
      window.sessionStorage.removeItem(PATIENT_REQUEST_DRAFT_KEY)
    }

    if ((!savedDraft || savedStepIndex === null) && window.sessionStorage.getItem(PATIENT_REQUEST_STEP_KEY)) {
      window.sessionStorage.removeItem(PATIENT_REQUEST_STEP_KEY)
    }

    if (!savedDraft) {
      restoreFrameId = window.requestAnimationFrame(() => {
        setHasRestoredDraft(true)
      })
    }

    return () => {
      if (restoreFrameId !== null) {
        window.cancelAnimationFrame(restoreFrameId)
      }
    }
  }, [])

  useEffect(() => {
    if (!hasRestoredDraft || submittedId || typeof window === 'undefined') {
      return
    }

    const draft: PatientRequestDraft = {
      fullName,
      phoneCountryCode,
      phone,
      age,
      gender,
      preferredLanguage,
      preferredUniversity,
      treatmentType,
      complaintText,
      preferredDays,
      painScore,
      symptomDuration,
      contactMethod,
      bestContactTime,
      medicalCondition,
      medicalConditionDetails,
      hasTouchedMedicalCondition,
      kvkkAcknowledgement,
      explicitConsent,
    }

    try {
      window.sessionStorage.setItem(PATIENT_REQUEST_DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Ignore storage quota or browser storage errors and keep the live form usable.
    }
  }, [
    age,
    bestContactTime,
    complaintText,
    explicitConsent,
    contactMethod,
    fullName,
    gender,
    hasRestoredDraft,
    hasTouchedMedicalCondition,
    kvkkAcknowledgement,
    medicalCondition,
    medicalConditionDetails,
    painScore,
    phoneCountryCode,
    phone,
    preferredDays,
    preferredLanguage,
    preferredUniversity,
    submittedId,
    symptomDuration,
    treatmentType,
  ])

  useEffect(() => {
    if (!hasRestoredDraft || submittedId || typeof window === 'undefined') {
      return
    }

    try {
      window.sessionStorage.setItem(PATIENT_REQUEST_STEP_KEY, String(currentStepIndex))
    } catch {
      // Ignore storage errors and keep progress derived from live form state.
    }
  }, [currentStepIndex, hasRestoredDraft, submittedId])

  useEffect(() => {
    if (restoredStepIndex === null || typeof window === 'undefined') {
      return
    }

    const targetIndex = Math.max(0, Math.min(restoredStepIndex, stepSectionRefs.current.length - 1))
    const targetSection = stepSectionRefs.current[targetIndex]

    if (!targetSection) {
      const resetFrameId = window.requestAnimationFrame(() => {
        setRestoredStepIndex(null)
      })
      return () => {
        window.cancelAnimationFrame(resetFrameId)
      }
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      targetSection.scrollIntoView({ block: 'start' })
      setRestoredStepIndex(null)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [restoredStepIndex])

  function clearPersistedDraft() {
    if (typeof window === 'undefined') {
      return
    }

    window.sessionStorage.removeItem(PATIENT_REQUEST_DRAFT_KEY)
    window.sessionStorage.removeItem(PATIENT_REQUEST_STEP_KEY)
  }

  function resetPatientRequestForm() {
    clearPersistedDraft()
    setSubmittedId(null)
    setErrorMessage('')
    setFullName('')
    setPhoneCountryCode('+90')
    setPhone('')
    setAge('')
    setGender('')
    setPreferredLanguage('')
    setPreferredUniversity('')
    setPainScore('')
    setSymptomDuration('')
    setContactMethod('')
    setBestContactTime('')
    setMedicalCondition('')
    setMedicalConditionDetails('')
    setHasTouchedMedicalCondition(false)
    setTreatmentType('')
    setComplaintText('')
    setPreferredDays('')
    setKvkkAcknowledgement(false)
    setExplicitConsent(false)
    setAttachment(null)
    setRestoredStepIndex(null)
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmittedId(null)
    setErrorMessage('')

    const trimmedFullName = fullName.trim()
    const fullNameWords = trimmedFullName.split(/\s+/).filter(Boolean)
    const hasLettersInEveryWord = fullNameWords.every((word) => /[\p{L}]/u.test(word))
    const hasOnlyAllowedNameCharacters =
      trimmedFullName.replace(/[\p{L}\s'.-]/gu, '') === ''
    const normalizedPhone = normalizePhoneNumber(phone.trim()).replace(/^\+/, '')
    const parsedAge = Number(age)

    if (!trimmedFullName) {
      setErrorMessage(validationText.fullNameRequired)
      return
    }

    if (
      fullNameWords.length < 2 ||
      !hasLettersInEveryWord ||
      !hasOnlyAllowedNameCharacters
    ) {
      setErrorMessage(validationText.fullNameInvalid)
      return
    }

    if (!age.trim()) {
      setErrorMessage(validationText.ageRequired)
      return
    }

    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setErrorMessage(validationText.ageInvalid)
      return
    }

    if (!phone.trim()) {
      setErrorMessage(validationText.phoneRequired)
      return
    }

    if (!preferredUniversity) {
      setErrorMessage(t('request.preferredUniversityRequired'))
      return
    }

    if (
      !/^\+\d+$/.test(phoneCountryCode) ||
      !/^\d+$/.test(normalizedPhone) ||
      normalizedPhone.length < 6 ||
      normalizedPhone.length > 15
    ) {
      setErrorMessage(validationText.phoneInvalid)
      return
    }

    if (
      !fullName ||
      !phone ||
      !preferredUniversity ||
      !age ||
      !gender ||
      !treatmentType ||
      !complaintText ||
      !painScore ||
      !symptomDuration ||
      !medicalCondition ||
      (medicalCondition === 'Other' && !medicalConditionDetails.trim())
    ) {
      setErrorMessage(t('request.errorRequiredFields'))
      return
    }

    if (!kvkkAcknowledgement || !explicitConsent) {
      setErrorMessage(t('request.errorConsent'))
      return
    }

    if (attachment && attachment.size > HARD_MAX_UPLOAD_BYTES) {
      setErrorMessage(t('request.errorFileSize'))
      return
    }

    setIsSubmitting(true)

    let fileId: string | null = null
    let fileTicket: string | null = null

    if (attachment) {
      const fileExt = getAllowedAttachmentExtension(attachment.name)

      if (!fileExt) {
        setIsSubmitting(false)
        setErrorMessage(validationText.fileTypeInvalid)
        return
      }

      const prepareResponse = await fetch('/api/v1/files/prepare-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: attachment.name,
          mimeType: attachment.type,
          sizeBytes: attachment.size,
          locale,
        }),
      })

      if (!prepareResponse.ok) {
        setIsSubmitting(false)
        setErrorMessage(t('request.errorGeneric'))
        return
      }

      let prepared: PreparedUpload
      try {
        prepared = (await prepareResponse.json()) as PreparedUpload
      } catch {
        setIsSubmitting(false)
        setErrorMessage(t('request.errorGeneric'))
        return
      }

      if (!prepared.fileId || !prepared.objectPath || !prepared.token || !prepared.ticket) {
        setIsSubmitting(false)
        setErrorMessage(t('request.errorGeneric'))
        return
      }

      const { error: uploadError } = await supabase.storage
        .from(PATIENT_UPLOADS_BUCKET)
        .uploadToSignedUrl(prepared.objectPath, prepared.token, attachment)

      if (uploadError) {
        setIsSubmitting(false)
        setErrorMessage(t('request.errorGeneric'))
        return
      }

      const confirmResponse = await fetch(`/api/v1/files/${prepared.fileId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: prepared.ticket,
          locale,
        }),
      })

      if (!confirmResponse.ok) {
        setIsSubmitting(false)
        setErrorMessage(t('request.errorGeneric'))
        return
      }

      fileId = prepared.fileId
      fileTicket = prepared.ticket
    }

    try {
      const response = await fetch('/api/v1/patient/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: trimmedFullName,
          age,
          gender,
          phoneCountryCode,
          phone,
          preferredLanguage,
          preferredUniversity,
          treatmentType,
          complaintText,
          preferredDays,
          painScore,
          symptomDuration,
          contactMethod,
          bestContactTime,
          medicalCondition,
          medicalConditionDetails,
          kvkkAcknowledgement,
          explicitConsent,
          fileId,
          fileTicket,
          locale,
        }),
      })

      if (!response.ok) {
        setErrorMessage(t('request.errorGeneric'))
        return
      }
    } catch {
      setErrorMessage(t('request.errorGeneric'))
      return
    } finally {
      setIsSubmitting(false)
    }

    clearPersistedDraft()
    setSubmittedId('submitted')
    resetPatientRequestForm()
    setSubmittedId('submitted')
  }

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900">
      <PatientRequestHeader onNewRequest={resetPatientRequestForm} />

      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <PatientRequestHero />

        {submittedId && (
          <PatientRequestSuccess onSubmitAnother={() => setSubmittedId(null)} />
        )}

        {!submittedId && (
          <form
            onSubmit={handleSubmit}
            className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <PatientRequestProgressRail progressPercent={progressPercent} />

            <div className="space-y-6 py-4 pl-12 pr-4 sm:space-y-8 sm:px-8 sm:py-8 sm:pl-16">
              <PatientInfoSection
                sectionRef={(node) => {
                  stepSectionRefs.current[0] = node
                }}
                fullName={fullName}
                phoneCountryCode={phoneCountryCode}
                phone={phone}
                preferredUniversity={preferredUniversity}
                age={age}
                gender={gender}
                onFullNameChange={setFullName}
                onPhoneCountryCodeChange={setPhoneCountryCode}
                onPhoneChange={setPhone}
                onPreferredUniversityChange={setPreferredUniversity}
                onAgeChange={setAge}
                onGenderChange={setGender}
              />

              <ClinicalDetailsSection
                sectionRef={(node) => {
                  stepSectionRefs.current[1] = node
                }}
                treatmentType={treatmentType}
                complaintText={complaintText}
                painScore={painScore}
                symptomDuration={symptomDuration}
                medicalCondition={medicalCondition}
                medicalConditionDetails={medicalConditionDetails}
                onTreatmentTypeChange={setTreatmentType}
                onComplaintTextChange={setComplaintText}
                onPainScoreChange={setPainScore}
                onSymptomDurationChange={setSymptomDuration}
                onMedicalConditionChange={(value) => {
                  setHasTouchedMedicalCondition(true)
                  setMedicalCondition(value)

                  if (value !== 'Other') {
                    setMedicalConditionDetails('')
                  }
                }}
                onMedicalConditionDetailsChange={setMedicalConditionDetails}
              />

              <SupportSection
                sectionRef={(node) => {
                  stepSectionRefs.current[2] = node
                }}
                attachment={attachment}
                contactMethod={contactMethod}
                preferredLanguage={preferredLanguage}
                bestContactTime={bestContactTime}
                preferredDays={preferredDays}
                onAttachmentChange={setAttachment}
                onContactMethodChange={setContactMethod}
                onPreferredLanguageChange={setPreferredLanguage}
                onBestContactTimeChange={setBestContactTime}
                onPreferredDaysChange={setPreferredDays}
              />

              <ConsentSection
                sectionRef={(node) => {
                  stepSectionRefs.current[3] = node
                }}
                kvkkAcknowledgement={kvkkAcknowledgement}
                explicitConsent={explicitConsent}
                onKvkkAcknowledgementChange={setKvkkAcknowledgement}
                onExplicitConsentChange={setExplicitConsent}
              />

              <PatientRequestError message={errorMessage} />
            </div>

            <PatientRequestFormActions isSubmitting={isSubmitting} />
          </form>
        )}
      </section>

      <PatientRequestFooter onNewRequest={resetPatientRequestForm} />
    </main>
  )
}
