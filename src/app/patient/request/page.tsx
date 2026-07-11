'use client'

import React, { useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import {
  ALLOWED_EXTENSIONS,
  HARD_MAX_UPLOAD_BYTES,
  PATIENT_UPLOADS_BUCKET,
} from '@/lib/files/file.constants'
import { runPatientSubmission } from '@/lib/patient-request/submission-flow'
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

function normalizePhoneNumber(value: string) {
  return value.replace(/[\s().-]/g, '')
}

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(ALLOWED_EXTENSIONS)

function getAllowedAttachmentExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''

  return ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) ? extension : null
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
  const stepSectionRefs = useRef<Array<HTMLElement | null>>([])
  const submissionGuard = useRef(false)
  const submissionId = useRef('')

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
  function resetPatientRequestForm() {
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
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submissionGuard.current) {
      return
    }
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

    if (attachment) {
      const fileExt = getAllowedAttachmentExtension(attachment.name)

      if (!fileExt) {
        setErrorMessage(validationText.fileTypeInvalid)
        return
      }
    }

    if (!submissionId.current) {
      submissionId.current = window.crypto.randomUUID()
    }

    await runPatientSubmission({
      attachment,
      dependencies: {
        fetcher: (input, init) => fetch(input, init),
        upload: async ({ attachment: file, objectPath, token }) => {
          const { error } = await supabase.storage
            .from(PATIENT_UPLOADS_BUCKET)
            .uploadToSignedUrl(objectPath, token, file)
          return { error }
        },
      },
      guard: submissionGuard,
      locale,
      onFailure: () => {
        setErrorMessage(t('request.errorGeneric'))
      },
      onSubmitting: setIsSubmitting,
      onSuccess: () => {
        resetPatientRequestForm()
        submissionId.current = ''
        setSubmittedId('submitted')
      },
      requestPayload: {
        submissionId: submissionId.current,
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
      },
    })
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
