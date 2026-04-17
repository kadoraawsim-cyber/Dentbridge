'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, CheckCircle2, ChevronDown, Info, Search, UploadCloud } from 'lucide-react'
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
  { value: 'Other',                              tKey: 'request.treatments.other' },
] as const

const LANGUAGE_OPTIONS = [
  { value: 'Turkish', tKey: 'request.langTurkish' },
  { value: 'English', tKey: 'request.langEnglish' },
  { value: 'Arabic',  tKey: 'request.langArabic' },
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

function calculateAgeFromDateOfBirth(dateOfBirth: string) {
  const dob = new Date(`${dateOfBirth}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }

  return age
}

function getTodayDateInputValue() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${today.getFullYear()}-${month}-${day}`
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

const PRIOR_TREATMENT_OPTIONS = [
  { value: 'yes', tKey: 'request.yes' },
  { value: 'no', tKey: 'request.no' },
] as const

const MEDICAL_CONDITION_OPTIONS = [
  { value: 'None', tKey: 'request.medicalNone' },
  { value: 'Diabetes', tKey: 'request.medicalDiabetes' },
  { value: 'Pregnancy', tKey: 'request.medicalPregnancy' },
  { value: 'Blood thinner use', tKey: 'request.medicalBloodThinner' },
  { value: 'Allergy', tKey: 'request.medicalAllergy' },
  { value: 'Other', tKey: 'request.medicalOther' },
] as const

const COUNTRY_CODES = [
  'TR',
  'AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ',
  'BS','BH','BD','BB','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','BN','BG','BF','BI',
  'CV','KH','CM','CA','CF','TD','CL','CN','CO','KM','CG','CD','CR','CI','HR','CU','CY','CZ',
  'DK','DJ','DM','DO',
  'EC','EG','SV','GQ','ER','EE','SZ','ET',
  'FJ','FI','FR',
  'GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY',
  'HT','HN','HU',
'IL','IS','IN','ID','IR','IQ','IE','IT',
  'JM','JP','JO',
  'KZ','KE','KI','KP','KR','KW','KG',
  'LA','LV','LB','LS','LR','LY','LI','LT','LU',
  'MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN','ME','MA','MZ','MM',
  'NA','NR','NP','NL','NZ','NI','NE','NG','MK','NO',
  'OM',
  'PK','PW','PS','PA','PG','PY','PE','PH','PL','PT',
  'QA',
  'RO','RU','RW',
  'KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI','SB','SO','ZA','SS','ES','LK','SD','SR','SE','CH','SY',
  'TJ','TZ','TH','TL','TG','TO','TT','TN','TM','TV',
  'UG','UA','AE','GB','US','UY','UZ',
  'VU','VA','VE','VN',
  'YE',
  'ZM','ZW',
] as const

function countryFlag(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

const UNIVERSITY_OPTIONS = [
  'İstinye Dental Hospital',
] as const

export default function PatientRequestPage() {
  const { t, locale } = useI18n()

  const [fullName, setFullName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('English')
  const [city, setCity] = useState('Istanbul')
  const [preferredUniversity, setPreferredUniversity] = useState('İstinye Dental Hospital')
  const [countryCode, setCountryCode] = useState('TR')
  const [hasSgk, setHasSgk] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const countryDropdownRef = useRef<HTMLDivElement | null>(null)

  const [treatmentType, setTreatmentType] = useState('')
  const [complaintText, setComplaintText] = useState('')
  const [preferredDays, setPreferredDays] = useState('No Preference')
  const [painScore, setPainScore] = useState('')
  const [symptomDuration, setSymptomDuration] = useState('')
  const [contactMethod, setContactMethod] = useState('WhatsApp')
  const [bestContactTime, setBestContactTime] = useState('Anytime')
  const [priorTreatment, setPriorTreatment] = useState('')
  const [medicalCondition, setMedicalCondition] = useState('None')
  const [consent, setConsent] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const countryOptions = useMemo(() => {
    const displayNames = new Intl.DisplayNames([locale === 'tr' ? 'tr' : 'en'], {
      type: 'region',
    })

    return COUNTRY_CODES
      .map((code) => ({
        code,
        label: displayNames.of(code) ?? code,
        flag: countryFlag(code),
      }))
      .sort((a, b) => {
        if (a.code === 'TR') return -1
        if (b.code === 'TR') return 1
        return a.label.localeCompare(b.label)
      })
  }, [locale])

  const filteredCountryOptions = useMemo(() => {
    const query = countrySearch.trim().toLowerCase()

    if (!query) return countryOptions

    return countryOptions.filter((country) =>
      country.label.toLowerCase().includes(query)
    )
  }, [countryOptions, countrySearch])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setCountryOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const sgkText =
    locale === 'tr'
        ? {
            label: 'SGK güvenceniz var mı?',
            helper: 'SGK, Türkiye’nin kamu sağlık sigortası sistemidir.',
            yes: 'Evet, SGK güvencem var',
            no: 'Hayır, SGK güvencem yok',
            placeholder: 'Seçiniz',
            countryLabel: 'Uyruğunuz / Geldiğiniz ülke',
          }
        : {
            label: 'Do you have SGK?',
            helper: 'SGK is Türkiye’s public health insurance system.',
            yes: 'Yes, I have SGK',
            no: 'No, I do not have SGK',
            placeholder: 'Select an option',
            countryLabel: 'Nationality / Country of Origin',
          }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmittedId(null)
    setErrorMessage('')

    if (
      !fullName ||
      !dateOfBirth ||
      !phone ||
      !preferredUniversity ||
      !countryCode ||
      hasSgk === '' ||
      !treatmentType ||
      !complaintText ||
      !painScore ||
      !symptomDuration ||
      !priorTreatment
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
    const age = calculateAgeFromDateOfBirth(dateOfBirth)

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
          age: Number.isFinite(age) && age >= 0 ? age : null,
          phone,
          city,
          country: countryOptions.find((c) => c.code === countryCode)?.label ?? countryCode,
          country_code: countryCode,
          has_sgk: hasSgk === 'yes',
          preferred_university: preferredUniversity,
          preferred_language: preferredLanguage,
          treatment_type: treatmentType,
          complaint_text: complaintText,
          urgency,
          preferred_days: preferredDays,
          pain_score: painScore ? Number(painScore) : null,
          symptom_duration: symptomDuration,
          contact_method: contactMethod,
          best_contact_time: bestContactTime,
          prior_treatment: priorTreatment === 'yes',
          medical_condition: medicalCondition,
          consent,
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

    setSubmittedId('submitted')
    setFullName('')
    setDateOfBirth('')
    setPhone('')
    setPreferredLanguage('English')
    setCity('Istanbul')
    setPreferredUniversity('İstinye Dental Hospital')
    setCountryCode('TR')
    setHasSgk('')
    setPainScore('')
    setSymptomDuration('')
    setContactMethod('WhatsApp')
    setBestContactTime('Anytime')
    setPriorTreatment('')
    setMedicalCondition('None')
    setCountrySearch('')
    setCountryOpen(false)
    setTreatmentType('')
    setComplaintText('')
    setPreferredDays('No Preference')
    setConsent(false)
    setAttachment(null)
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
            <Link href="/patient/request" className="text-slate-900">
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
            className="w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="space-y-6 sm:space-y-8 p-4 sm:p-8">
              {/* Patient Information Section */}
              <section>
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
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.dateOfBirth')} *
                    </label>
                   <input
  type="date"
  value={dateOfBirth}
  onChange={(e) => setDateOfBirth(e.target.value)}
  max={getTodayDateInputValue()}
  placeholder={t('request.dateOfBirthPlaceholder')}
  className="w-full appearance-none bg-white rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
/>

                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.phone')} *
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('request.phonePlaceholder')}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    />
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
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.city')}{' '}
                      <span className="font-normal text-slate-400">{t('request.optional')}</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t('request.cityPlaceholder')}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    />
                  </div>

                  <div className="relative" ref={countryDropdownRef}>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {sgkText.countryLabel} *
                    </label>

                    <button
                      type="button"
                      onClick={() => setCountryOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-left outline-none transition hover:border-slate-400 focus:border-slate-900"
                    >
                      <span className="truncate text-slate-900">
                        {(() => {
                          const selected = countryOptions.find((country) => country.code === countryCode)
                          if (!selected) return sgkText.countryLabel
                          return selected.code === 'SY'
                            ? selected.label
                            : `${selected.flag} ${selected.label}`
                        })()}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>

                    {countryOpen && (
                      <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-100 p-2 sm:p-3">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              placeholder={locale === 'tr' ? 'Ülke ara...' : 'Search country...'}
                              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-900"
                            />
                          </div>
                        </div>

                        <div className="max-h-60 sm:max-h-72 overflow-y-auto p-1 sm:p-2">
                          {filteredCountryOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-500">
                              {locale === 'tr' ? 'Sonuç bulunamadı' : 'No results found'}
                            </div>
                          ) : (
                            filteredCountryOptions.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setCountryCode(country.code)
                                  setCountrySearch('')
                                  setCountryOpen(false)
                                }}
                                className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                                  country.code === countryCode
                                    ? 'bg-slate-100 text-slate-900'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className="truncate">
                                  {country.code === 'SY'
                                    ? country.label
                                    : `${country.flag} ${country.label}`}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {sgkText.label} *
                    </label>
                    <p className="mb-1.5 sm:mb-2 flex items-start gap-1 text-xs text-slate-500">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{sgkText.helper}</span>
                    </p>
                    <select
                      value={hasSgk}
                      onChange={(e) => setHasSgk(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    >
                      <option value="">{sgkText.placeholder}</option>
                      <option value="yes">{sgkText.yes}</option>
                      <option value="no">{sgkText.no}</option>
                    </select>
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
                      {UNIVERSITY_OPTIONS.map((university) => (
                        <option key={university} value={university}>
                          {university}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Clinical Details Section */}
              <section>
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

                <div className="mb-5 sm:mb-6 grid gap-4 sm:gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.painScoreLabel')} *
                    </label>
                    <select
                      value={painScore}
                      onChange={(e) => setPainScore(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
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
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
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

                <div className="mb-5 sm:mb-6 grid gap-4 sm:gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.priorTreatmentLabel')} *
                    </label>
                    <select
                      value={priorTreatment}
                      onChange={(e) => setPriorTreatment(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    >
                      <option value="">{t('request.priorTreatmentPlaceholder')}</option>
                      {PRIOR_TREATMENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.medicalConditionLabel')}
                    </label>
                    <select
                      value={medicalCondition}
                      onChange={(e) => setMedicalCondition(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    >
                      {MEDICAL_CONDITION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-5 sm:mb-6 grid gap-4 sm:gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.contactMethodLabel')}
                    </label>
                    <select
                      value={contactMethod}
                      onChange={(e) => setContactMethod(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    >
                      {CONTACT_METHOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.bestContactTimeLabel')}
                    </label>
                    <select
                      value={bestContactTime}
                      onChange={(e) => setBestContactTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    >
                      {CONTACT_TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-slate-700">
                      {t('request.availability')}{' '}
                      <span className="font-normal text-slate-400">{t('request.optional')}</span>
                    </label>
                    <select
                      value={preferredDays}
                      onChange={(e) => setPreferredDays(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
                    >
                      {DAY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Images Section */}
              <section>
                <div className="mb-4 sm:mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                  <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">
                    {t('request.sectionImages')}{' '}
                    <span className="text-sm sm:text-base font-normal text-slate-400">
                      {t('request.sectionImagesNote')}
                    </span>
                  </h2>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
                  <label className="block cursor-pointer">
                    <div className="text-center">
                      <UploadCloud className="mx-auto mb-2 sm:mb-3 h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                      <p className="text-sm sm:text-base font-medium text-slate-700">{t('request.uploadTitle')}</p>
                      <p className="mt-1 text-xs sm:text-sm text-slate-500">{t('request.uploadSubtitle')}</p>
                      <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-slate-500">
                        {t('request.uploadHelpText')}
                      </p>
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
              </section>

              {/* Consent Section */}
              <section>
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
              </section>

              {errorMessage && (
                <div className="rounded-xl sm:rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 sm:gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:justify-end sm:px-8 sm:py-5">
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
        <div className="mx-auto grid max-w-7xl gap-6 sm:gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
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
                <Link href="/patient/request" className="hover:text-white">
                  {t('footer.requestTreatment')}
                </Link>
              </li>
              <li>
                <Link href="/patient/status" className="hover:text-white">
                  {t('footer.checkStatus')}
                </Link>
              </li>
              <li>
                <span className="cursor-default text-slate-600">{t('footer.affordableCareInfo')}</span>
              </li>
              <li>
                <span className="cursor-default text-slate-600">{t('footer.faq')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-white">{t('footer.clinicalPortals')}</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li>
                <Link href="/student/login" className="hover:text-white">
                  {t('footer.studentPortal')}
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white">
                  {t('footer.facultyPortal')}
                </Link>
              </li>
              <li>
                <Link href="/student/cases" className="hover:text-white">
                  {t('footer.casePool')}
                </Link>
              </li>
              <li>
                <span className="cursor-default text-slate-600">{t('footer.clinicalRequirements')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-white">{t('footer.contact')}</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li>Istanbul, Türkiye</li>
              <li>{t('footer.universityPilot')}</li>
              <li>{t('footer.whatsappSupport')}</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-6 sm:mt-10 max-w-7xl border-t border-slate-800 px-4 pt-4 sm:pt-6 text-[10px] sm:text-xs text-slate-500 sm:px-6 lg:px-8">
          {t('footer.copyright').replace('{year}', String(new Date().getFullYear()))}
        </div>
      </footer>
    </main>
  )
}
