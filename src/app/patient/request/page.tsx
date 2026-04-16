'use client'

import React, { useMemo, useState } from 'react'
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
  { value: 'Other',                              tKey: 'request.treatments.other' },
] as const

const LANGUAGE_OPTIONS = [
  { value: 'Turkish', tKey: 'request.langTurkish' },
  { value: 'English', tKey: 'request.langEnglish' },
  { value: 'Arabic',  tKey: 'request.langArabic' },
] as const

const URGENCY_OPTIONS = [
  { value: 'Low',    tKey: 'request.urgencyLow' },
  { value: 'Medium', tKey: 'request.urgencyMedium' },
  { value: 'High',   tKey: 'request.urgencyHigh' },
] as const

const DAY_OPTIONS = [
  { value: 'No Preference',       tKey: 'request.dayNoPreference' },
  { value: 'Weekday Mornings',    tKey: 'request.dayWeekdayMornings' },
  { value: 'Weekday Afternoons',  tKey: 'request.dayWeekdayAfternoons' },
  { value: 'As Soon As Possible', tKey: 'request.dayAsSoonAsPossible' },
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
  'IS','IN','ID','IR','IQ','IE','IL','IT',
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
  const [age, setAge] = useState('')
  const [phone, setPhone] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('English')
  const [city, setCity] = useState('Istanbul')
  const [preferredUniversity, setPreferredUniversity] = useState('İstinye Dental Hospital')
  const [countryCode, setCountryCode] = useState('TR')
const [hasSgk, setHasSgk] = useState('')
  const [treatmentType, setTreatmentType] = useState('')
  const [complaintText, setComplaintText] = useState('')
  const [urgency, setUrgency] = useState('')
  const [preferredDays, setPreferredDays] = useState('No Preference')
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

const sgkText =
  locale === 'tr'
    ? {
        label: 'SGK güvenceniz var mı?',
        yes: 'Evet, SGK güvencem var',
        no: 'Hayır, SGK güvencem yok',
        placeholder: 'Seçiniz',
        countryLabel: 'Country',
      }
    : {
        label: 'Do you have SGK?',
        yes: 'Yes, I have SGK',
        no: 'No, I do not have SGK',
        placeholder: 'Select an option',
        countryLabel: 'Country',
      }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmittedId(null)
    setErrorMessage('')

if (
  !fullName ||
  !age ||
  !phone ||
  !preferredUniversity ||
  !countryCode ||
  hasSgk === '' ||
  !treatmentType ||
  !complaintText ||
  !urgency
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
  age: age ? Number(age) : null,
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
    setAge('')
    setPhone('')
    setPreferredLanguage('English')
    setCity('Istanbul')
    setPreferredUniversity('İstinye Dental Hospital')
    setCountryCode('TR')
setHasSgk('')
    setTreatmentType('')
    setComplaintText('')
    setUrgency('')
    setPreferredDays('No Preference')
    setConsent(false)
    setAttachment(null)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/dentbridge-icon.png"
              alt="DentBridge icon"
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-lg font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
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

          <LanguageSwitcher />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('patientNav.backToHome')}
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {t('request.pageTitle')}
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            {t('request.pageDescription')}
          </p>
        </div>

        {submittedId && (
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
            <div className="px-6 py-12 text-center sm:px-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{t('request.success.title')}</h2>
              <p className="mx-auto mt-3 max-w-sm text-slate-600">
                {t('request.success.description')}
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/patient/status"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  {t('request.success.checkStatus')}
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmittedId(null)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="space-y-8 p-6 sm:p-8">
              <section>
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" />
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {t('request.sectionPatient')}
                  </h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t('request.fullName')} *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('request.fullNamePlaceholder')}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t('request.age')} *
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder={t('request.agePlaceholder')}
                      min="1"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t('request.phone')} *
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('request.phonePlaceholder')}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t('request.preferredLanguage')}{' '}
                      <span className="font-normal text-slate-400">{t('request.optional')}</span>
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    >
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t('request.city')}{' '}
                      <span className="font-normal text-slate-400">{t('request.optional')}</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t('request.cityPlaceholder')}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    />
                  </div>
                  <div>
  <label className="mb-2 block text-sm font-medium text-slate-700">
    {sgkText.countryLabel} *
  </label>
  <select
    value={countryCode}
    onChange={(e) => setCountryCode(e.target.value)}
    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
  >
    {countryOptions.map((country) => (
      <option key={country.code} value={country.code}>
        {country.flag} {country.label}
      </option>
    ))}
  </select>
</div>

<div>
  <label className="mb-2 block text-sm font-medium text-slate-700">
    {sgkText.label} *
  </label>
  <select
    value={hasSgk}
    onChange={(e) => setHasSgk(e.target.value)}
    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
  >
    <option value="">{sgkText.placeholder}</option>
    <option value="yes">{sgkText.yes}</option>
    <option value="no">{sgkText.no}</option>
  </select>
</div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t('request.preferredUniversity')} *
                    </label>
                    <select
                      value={preferredUniversity}
                      onChange={(e) => setPreferredUniversity(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
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

              <section>
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" />
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {t('request.sectionClinical')}
                  </h2>
                </div>

                <div className="mb-6">
                  <label className="mb-3 block text-sm font-medium text-slate-700">
                    {t('request.treatmentCategory')} *
                  </label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {TREATMENT_OPTIONS.map((opt) => {
                      const isSelected = treatmentType === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTreatmentType(opt.value)}
                          className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
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

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t('request.mainComplaint')} *
                  </label>
                  <textarea
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    placeholder={t('request.mainComplaintPlaceholder')}
                    rows={5}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t('request.urgency')} *
                    </label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    >
                      <option value="">{t('request.urgencyPlaceholder')}</option>
                      {URGENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.tKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t('request.availability')}{' '}
                      <span className="font-normal text-slate-400">{t('request.optional')}</span>
                    </label>
                    <select
                      value={preferredDays}
                      onChange={(e) => setPreferredDays(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
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

              <section>
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" />
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {t('request.sectionImages')}{' '}
                    <span className="text-base font-normal text-slate-400">
                      {t('request.sectionImagesNote')}
                    </span>
                  </h2>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8">
                  <label className="block cursor-pointer">
                    <div className="text-center">
                      <UploadCloud className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                      <p className="font-medium text-slate-700">{t('request.uploadTitle')}</p>
                      <p className="mt-1 text-sm text-slate-500">{t('request.uploadSubtitle')}</p>
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
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                      {t('request.uploadSelectedLabel')}{' '}
                      <span className="font-medium">{attachment.name}</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" />
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {t('request.sectionConsent')}
                  </h2>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{t('request.consentInfo')}</p>
                  </div>
                </div>

                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">
                    {t('request.consentLabel')} *
                  </span>
                </label>
              </section>

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                {t('request.cancel')}
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? t('request.submitting') : t('request.submit')}
              </button>
            </div>
          </form>
        )}
      </section>

      <footer className="bg-slate-950 py-14 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/dentbridge-icon.png"
                alt="DentBridge icon"
                className="h-10 w-10 object-contain"
              />
              <div>
                <p className="font-bold text-white">DentBridge</p>
                <p className="text-xs text-slate-400">{t('footer.tagline')}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">{t('footer.patientServices')}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
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
            <h3 className="mb-4 font-semibold text-white">{t('footer.clinicalPortals')}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
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
            <h3 className="mb-4 font-semibold text-white">{t('footer.contact')}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Istanbul, Türkiye</li>
              <li>{t('footer.universityPilot')}</li>
              <li>{t('footer.whatsappSupport')}</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-800 px-4 pt-6 text-xs text-slate-500 sm:px-6 lg:px-8">
          {t('footer.copyright').replace('{year}', String(new Date().getFullYear()))}
        </div>
      </footer>
    </main>
  )
}