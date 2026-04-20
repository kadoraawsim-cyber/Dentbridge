'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, CheckCircle2, Info, UploadCloud } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

// ── Option arrays — values are the English strings stored to the database.
// Display labels are resolved through t() at render time.
const TREATMENT_OPTIONS = [
  { value: 'Initial Examination / Consultation', tKey: 'request.treatments.initialExam' },
  { value: 'Dental Cleaning',                    tKey: 'request.treatments.cleaning' },
  { value: 'Fillings',                           tKey: 'request.treatments.fillings' },
  { value: 'Tooth Extraction',                   tKey: 'request.treatments.extraction' },
  { value: 'Root Canal Treatment',               tKey: 'request.treatments.rootCanal' },
  { value: 'Gum Treatment',                      tKey: 'request.treatments.gum' },
  { value: 'Prosthetics / Crowns',               tKey: 'request.treatments.prosthetics' },
  { value: 'Orthodontics',                       tKey: 'request.treatments.orthodontics' },
  { value: 'Pediatric Dentistry',                tKey: 'request.treatments.pediatric' },
  { value: 'Esthetic Dentistry',                 tKey: 'request.treatments.esthetic' },
  { value: "I'm not sure",                       tKey: 'request.treatments.notSure' },
  { value: 'Other',                              tKey: 'request.treatments.other' },
] as const

const GENDER_OPTIONS = [
  { value: 'Male', tKey: 'request.genderMale' },
  { value: 'Female', tKey: 'request.genderFemale' },
] as const

const LANGUAGE_OPTIONS = [
  { value: 'Turkish', tKey: 'request.langTurkish' },
  { value: 'English', tKey: 'request.langEnglish' },
  { value: 'Arabic',  tKey: 'request.langArabic' },
] as const

const PREFERRED_UNIVERSITY_OPTIONS = [
  {
    value: 'İstinye Dental Hospital',
    tKey: 'request.preferredUniversityIstinyeDentalHospital',
  },
] as const

const PHONE_COUNTRY_CODE_OPTIONS = [
  '+90',
  '+1',
  '+20',
  '+31',
  '+33',
  '+44',
  '+49',
  '+91',
  '+92',
  '+93',
  '+94',
  '+98',
  '+212',
  '+213',
  '+216',
  '+218',
  '+374',
  '+961',
  '+962',
  '+963',
  '+964',
  '+965',
  '+966',
  '+967',
  '+968',
  '+970',
  '+971',
  '+972',
  '+973',
  '+974',
  '+994',
  '+995',
] as const

const DAY_OPTIONS = [
  { value: 'No Preference',       tKey: 'request.dayNoPreference' },
  { value: 'Weekday Mornings',    tKey: 'request.dayWeekdayMornings' },
  { value: 'Weekday Afternoons',  tKey: 'request.dayWeekdayAfternoons' },
  { value: 'As Soon As Possible', tKey: 'request.dayAsSoonAsPossible' },
] as const


const DURATION_OPTIONS = [
  { value: 'Today', tKey: 'request.durationToday' },
  { value: 'A few days', tKey: 'request.durationFewDays' },
  { value: '1-2 weeks', tKey: 'request.durationOneToTwoWeeks' },
  { value: 'More than a month', tKey: 'request.durationMoreThanMonth' },
  { value: 'Routine / No specific start date', tKey: 'request.durationRoutineNoSpecificStart' },
] as const

function getUrgencyFromPainScore(painScore: string) {
  const score = Number(painScore)

  if (score >= 7) {
    return 'High'
  }

  if (score >= 4) {
    return 'Medium'
  }

  return 'Low'
}

const CONTACT_METHOD_OPTIONS = [
  { value: 'WhatsApp', tKey: 'request.contactMethodWhatsapp' },
  { value: 'Phone Call', tKey: 'request.contactMethodPhone' },
  { value: 'SMS', tKey: 'request.contactMethodSms' },
] as const

const CONTACT_TIME_OPTIONS = [
  { value: 'Morning', tKey: 'request.contactTimeMorning' },
  { value: 'Afternoon', tKey: 'request.contactTimeAfternoon' },
  { value: 'Evening', tKey: 'request.contactTimeEvening' },
  { value: 'Anytime', tKey: 'request.contactTimeAnytime' },
] as const

const MEDICAL_CONDITION_OPTIONS = [
  { value: 'None', tKey: 'request.medicalNone' },
  { value: 'Diabetes', tKey: 'request.medicalDiabetes' },
  { value: 'Pregnancy', tKey: 'request.medicalPregnancy' },
  { value: 'Blood thinner use', tKey: 'request.medicalBloodThinner' },
  { value: 'Allergy', tKey: 'request.medicalAllergy' },
  { value: 'Other', tKey: 'request.medicalOther' },
] as const

const CONSENT_VERSION = '2026-04-18-v1'
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
  consent: boolean
}

function parsePatientRequestDraft(value: string | null): PatientRequestDraft | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<PatientRequestDraft> | null

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
      consent: typeof parsed.consent === 'boolean' ? parsed.consent : false,
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
        }
      : {
          fullNameRequired: 'Please enter your full name.',
          fullNameInvalid: 'Please enter a valid full name with at least two words.',
          ageRequired: 'Please enter your age.',
          ageInvalid: 'Please enter a valid age between 1 and 120.',
          phoneRequired: 'Please enter your phone number.',
          phoneInvalid: 'Please enter a valid phone number.',
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
  const [consent, setConsent] = useState(false)
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
        completed: consent,
      },
    ],
    [
      age,
      complaintText,
      consent,
      fullName,
      gender,
      medicalCondition,
      medicalConditionDetails,
      painScore,
      phone,
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
      consent,
    ],
    [
      age,
      complaintText,
      consent,
      fullName,
      gender,
      hasTouchedMedicalCondition,
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

    const savedDraft = parsePatientRequestDraft(
      window.sessionStorage.getItem(PATIENT_REQUEST_DRAFT_KEY)
    )

    if (savedDraft) {
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
      setConsent(savedDraft.consent)
    } else if (window.sessionStorage.getItem(PATIENT_REQUEST_DRAFT_KEY)) {
      window.sessionStorage.removeItem(PATIENT_REQUEST_DRAFT_KEY)
    }

    const savedStepIndex = parseSavedStepIndex(
      window.sessionStorage.getItem(PATIENT_REQUEST_STEP_KEY)
    )

    if (savedDraft && savedStepIndex !== null) {
      setRestoredStepIndex(savedStepIndex)
    } else if (window.sessionStorage.getItem(PATIENT_REQUEST_STEP_KEY)) {
      window.sessionStorage.removeItem(PATIENT_REQUEST_STEP_KEY)
    }

    setHasRestoredDraft(true)
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
      consent,
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
    consent,
    contactMethod,
    fullName,
    gender,
    hasRestoredDraft,
    hasTouchedMedicalCondition,
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
      setRestoredStepIndex(null)
      return
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
    setConsent(false)
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
    const combinedPhone = `${phoneCountryCode}${normalizedPhone}`
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

    if (!consent) {
      setErrorMessage(t('request.errorConsent'))
      return
    }

    if (attachment && attachment.size > 10 * 1024 * 1024) {
      setErrorMessage(t('request.errorFileSize'))
      return
    }

    setIsSubmitting(true)
    const urgency = getUrgencyFromPainScore(painScore)
    const medicalConditionValue =
      medicalCondition === 'Other'
        ? `Other: ${medicalConditionDetails.trim()}`
        : medicalCondition

    let attachmentPath: string | null = null

    if (attachment) {
      const fileExt = attachment.name.split('.').pop()
      const safeName = fullName.trim().toLowerCase().replace(/\s+/g, '-')
      const fileName = `${safeName}-${Date.now()}.${fileExt}`
      const filePath = fileName
      const { error: uploadError } = await supabase.storage
        .from('patient-uploads')
        .upload(filePath, attachment)

      if (uploadError) {
        setIsSubmitting(false)
        setErrorMessage(uploadError.message)
        return
      }

      attachmentPath = filePath
    }

    const { error } = await supabase
      .from('patient_requests')
      .insert([
        {
          full_name: fullName,
          age: Number.isFinite(parsedAge) && parsedAge >= 0 ? parsedAge : null,
          gender,
          phone: combinedPhone,
          preferred_language: preferredLanguage || null,
          preferred_university: preferredUniversity || null,
          treatment_type: treatmentType,
          complaint_text: complaintText,
          urgency,
          preferred_days: preferredDays || null,
          pain_score: painScore ? Number(painScore) : null,
          symptom_duration: symptomDuration,
          contact_method: contactMethod || null,
          best_contact_time: bestContactTime || null,
          medical_condition: medicalConditionValue,
          consent,
          consent_accepted_at: new Date().toISOString(),
          consent_version: CONSENT_VERSION,
          attachment_path: attachmentPath,
          attachment_name: attachment ? attachment.name : null,
          status: 'submitted',
        }
      ])

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    clearPersistedDraft()
    setSubmittedId('submitted')
    resetPatientRequestForm()
    setSubmittedId('submitted')
  }

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/dentbridge-icon.png"
              alt="DentBridge icon"
              className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-base sm:text-lg font-bold leading-none text-slate-900">DentBridge</p>
              <p className="hidden sm:block truncate text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-500">
                {t('patientNav.tagline')}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/patient/status" className="hover:text-slate-900">
              {t('patientNav.myPortal')}
            </Link>
            <Link
              href="/patient/request"
              onClick={(e) => {
                e.preventDefault()
                resetPatientRequestForm()
              }}
              className="text-slate-900"
            >
              {t('patientNav.newRequest')}
            </Link>
          </nav>

          <div className="flex shrink-0">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href="/"
          className="mb-4 sm:mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('patientNav.backToHome')}
        </Link>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            {t('request.pageTitle')}
          </h1>
          <p className="mt-2 sm:mt-3 max-w-3xl text-sm sm:text-base text-slate-600">
            {t('request.pageDescription')}
          </p>
        </div>

        {submittedId && (
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-200 bg-white shadow-sm">
            <div className="px-5 py-8 sm:px-10 sm:py-12 text-center">
              <div className="mx-auto mb-4 sm:mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('request.success.title')}</h2>
              <p className="mx-auto mt-2 sm:mt-3 max-w-sm text-sm sm:text-base text-slate-600">
                {t('request.success.description')}
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/patient/status"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  {t('request.success.checkStatus')}
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmittedId(null)}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t('request.success.submitAnother')}
                </button>
              </div>
            </div>
          </div>
        )}

        {!submittedId && (
          <form
            onSubmit={handleSubmit}
            className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="pointer-events-none absolute inset-y-0 left-2 z-10 w-12 sm:left-3 sm:w-14">
              <div
                className="absolute left-1/2 top-4 min-w-[3rem] -translate-x-1/2 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-center text-[11px] font-semibold text-emerald-700 shadow-sm ring-4 ring-white sm:min-w-[3.25rem] sm:text-xs"
              >
                {progressPercent}%
              </div>
              <div className="absolute bottom-6 left-1/2 top-10 w-px -translate-x-1/2 rounded-full bg-slate-200" />
              <div
                className="absolute left-1/2 top-10 w-px -translate-x-1/2 rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ height: `calc((100% - 4rem) * ${progressPercent / 100})` }}
              />
              <div
                className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.15)] transition-all duration-500 ease-out"
                style={{ top: `calc(2.5rem + (100% - 4rem - 0.875rem) * ${progressPercent / 100})` }}
              />
            </div>

            <div className="space-y-6 py-4 pl-12 pr-4 sm:space-y-8 sm:px-8 sm:py-8 sm:pl-16">
              {/* Patient Information Section */}
              <section ref={(node) => { stepSectionRefs.current[0] = node }}>
                <div className="mb-4 sm:mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                  <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">
                    {t('request.sectionPatient')}
                  </h2>
                </div>

                <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.fullName')} *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('request.fullNamePlaceholder')}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <div className="grid gap-3 grid-cols-[7rem_minmax(0,1fr)]">
                      <div>
                        <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                          {t('request.phoneCountryCode')} *
                        </label>
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                        >
                          {PHONE_COUNTRY_CODE_OPTIONS.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                          {t('request.phone')} *
                        </label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t('request.phoneNumberPlaceholder')}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.preferredUniversity')} *
                    </label>
                    <select
                      value={preferredUniversity}
                      onChange={(e) => setPreferredUniversity(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    >
                      <option value="">{t('request.selectPlaceholder')}</option>
                      {PREFERRED_UNIVERSITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.age')} *
                    </label>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder={t('request.agePlaceholder')}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.gender')} *
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    >
                      <option value="">{t('request.selectPlaceholder')}</option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Clinical Details Section */}
              <section ref={(node) => { stepSectionRefs.current[1] = node }}>
                <div className="mb-4 sm:mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                  <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">
                    {t('request.sectionClinical')}
                  </h2>
                </div>

                <div className="mb-5 sm:mb-6">
                  <label className="mb-2 sm:mb-3 block text-sm font-medium text-slate-700">
                    {t('request.treatmentCategory')} *
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
                    {TREATMENT_OPTIONS.map((opt) => {
                      const isSelected = treatmentType === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTreatmentType(opt.value)}
                          className={`rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium transition ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50 text-teal-900'
                              : 'border-slate-300 text-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {t(opt.tKey)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mb-5 sm:mb-6">
                  <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                    {t('request.mainComplaint')} *
                  </label>
                  <textarea
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    placeholder={t('request.mainComplaintPlaceholder')}
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {locale === 'tr' ? 'Belirti / Klinik' : 'Symptom / Clinical'}
                    </p>
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                          {t('request.painScoreLabel')} *
                        </label>
                        <select
                          value={painScore}
                          onChange={(e) => setPainScore(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900 sm:px-4 sm:py-3"
                        >
                          <option value="">{t('request.painScorePlaceholder')}</option>
                          {Array.from({ length: 11 }, (_, i) => (
                            <option key={i} value={String(i)}>
                              {i}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                          {t('request.durationLabel')} *
                        </label>
                        <select
                          value={symptomDuration}
                          onChange={(e) => setSymptomDuration(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900 sm:px-4 sm:py-3"
                        >
                          <option value="">{t('request.durationPlaceholder')}</option>
                          {DURATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {t(opt.tKey)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                          {t('request.medicalConditionLabel')} *
                        </label>
                        <select
                          value={medicalCondition}
                          onChange={(e) => {
                            const value = e.target.value
                            setHasTouchedMedicalCondition(true)
                            setMedicalCondition(value)

                            if (value !== 'Other') {
                              setMedicalConditionDetails('')
                            }
                          }}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900 sm:px-4 sm:py-3"
                        >
                          <option value="">{t('request.selectPlaceholder')}</option>
                          {MEDICAL_CONDITION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {t(opt.tKey)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {medicalCondition === 'Other' && (
                      <div className="mt-4">
                        <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                          {t('request.medicalConditionDetailsLabel')} *
                        </label>
                        <input
                          type="text"
                          value={medicalConditionDetails}
                          onChange={(e) => setMedicalConditionDetails(e.target.value)}
                          placeholder={t('request.medicalConditionDetailsPlaceholder')}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Optional Support Section */}
              <section ref={(node) => { stepSectionRefs.current[2] = node }}>
                <div className="mb-4 sm:mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                  <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">
                    {t('request.sectionSupport')}
                  </h2>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t('request.supportingImages')}{' '}
                    <span className="font-normal text-slate-400">{t('request.optional')}</span>
                  </label>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
                  <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2.5 text-sm font-medium leading-relaxed text-teal-900 sm:px-4">
                    {t('request.uploadHelpText')}
                  </div>

                  <label className="block cursor-pointer">
                    <div className="text-center">
                      <UploadCloud className="mx-auto mb-2 sm:mb-3 h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                      <p className="text-sm sm:text-base font-medium text-slate-700">{t('request.uploadTitle')}</p>
                      <p className="mt-1 text-xs sm:text-sm text-slate-500">{t('request.uploadSubtitle')}</p>
                    </div>

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setAttachment(file)
                      }}
                    />
                  </label>

                  {attachment && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-slate-700">
                      {t('request.uploadSelectedLabel')}{' '}
                      <span className="font-medium truncate block sm:inline mt-1 sm:mt-0">{attachment.name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.contactMethodLabel')}{' '}
                      <span className="font-normal text-slate-400">{t('request.optional')}</span>
                    </label>
                    <select
                      value={contactMethod}
                      onChange={(e) => setContactMethod(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900 sm:px-4 sm:py-3"
                    >
                      <option value="">{t('request.selectPlaceholder')}</option>
                      {CONTACT_METHOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.preferredLanguage')}{' '}
                      <span className="font-normal text-slate-400">{t('request.optional')}</span>
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    >
                      <option value="">{t('request.selectPlaceholder')}</option>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.bestContactTimeLabel')}{' '}
                      <span className="font-normal text-slate-400">{t('request.optional')}</span>
                    </label>
                    <select
                      value={bestContactTime}
                      onChange={(e) => setBestContactTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900 sm:px-4 sm:py-3"
                    >
                      <option value="">{t('request.selectPlaceholder')}</option>
                      {CONTACT_TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.availability')}{' '}
                      <span className="font-normal text-slate-400">{t('request.optional')}</span>
                    </label>
                    <select
                      value={preferredDays}
                      onChange={(e) => setPreferredDays(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900 sm:px-4 sm:py-3"
                    >
                      <option value="">{t('request.selectPlaceholder')}</option>
                      {DAY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Consent Section */}
              <section ref={(node) => { stepSectionRefs.current[3] = node }}>
                <div className="mb-4 sm:mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                  <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">
                    {t('request.sectionConsent')}
                  </h2>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3 sm:px-4 sm:py-4 text-xs sm:text-sm text-blue-900">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <Info className="mt-0.5 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <p>{t('request.consentInfo')}</p>
                  </div>
                </div>

                <label className="mt-4 flex items-start gap-2.5 sm:gap-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 sm:mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {t('request.consentLabel')} *
                  </span>
                </label>

                <p className="mt-3 text-[11px] sm:text-xs text-slate-500">
                  {locale === 'tr' ? 'Detaylar için ' : 'Read our '}
                  <Link href="/privacy" className="font-semibold text-teal-700 underline-offset-2 hover:underline">
                    {locale === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
                  </Link>
                  {locale === 'tr' ? ' inceleyin.' : ' for details.'}
                </p>
              </section>

              {errorMessage && (
                <div className="rounded-xl sm:rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 border-t border-slate-200 bg-slate-50 py-4 pl-12 pr-4 sm:gap-3 sm:flex-row sm:justify-end sm:px-8 sm:py-5 sm:pl-16">
              <Link
                href="/"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 sm:py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                {t('request.cancel')}
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-teal-600 px-5 py-3 sm:py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? t('request.submitting') : t('request.submit')}
              </button>
            </div>
          </form>
        )}
      </section>

      <footer className="bg-slate-950 py-8 sm:py-14 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-6 sm:gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/dentbridge-icon.png"
                alt="DentBridge icon"
                className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 object-contain"
              />
              <div>
                <p className="font-bold text-white text-sm sm:text-base">DentBridge</p>
                <p className="text-[10px] sm:text-xs text-slate-400">{t('footer.tagline')}</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-white">{t('footer.patientServices')}</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li>
                <Link
                  href="/patient/request"
                  onClick={(e) => {
                    e.preventDefault()
                    resetPatientRequestForm()
                  }}
                  className="hover:text-white"
                >
                  {t('footer.requestTreatment')}
                </Link>
              </li>
              <li>
                <Link href="/patient/status" className="hover:text-white">
                  {t('footer.checkStatus')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white">
                  {t('footer.faq')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-white">{t('footer.contact')}</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li>
                Istanbul, Türkiye
              </li>
              <li>
                <a href="mailto:Dentbridge.tr@gmail.com" className="hover:text-white">
                  {t('footer.email')}
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/dentbridge.tr"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  {t('footer.instagram')}
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/905411072665"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  {t('footer.whatsappSupport')}
                </a>
              </li>
            </ul>
          </div>
        </div>

<div className="mx-auto mt-6 max-w-7xl border-t border-slate-800 px-4 pt-4 text-[10px] text-slate-500 sm:mt-10 sm:px-6 sm:pt-6 sm:text-xs lg:px-8">
  {t('footer.copyright')}
</div>
      </footer>
    </main>
  )
}
