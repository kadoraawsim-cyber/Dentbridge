'use client'

import type { RefCallback } from 'react'
import Link from 'next/link'
import { Info, UploadCloud } from 'lucide-react'

import { useI18n } from '@/lib/i18n'

// Values are the English strings persisted by the existing patient request flow.
const TREATMENT_OPTIONS = [
  { value: 'Initial Examination / Consultation', tKey: 'request.treatments.initialExam' },
  { value: 'Dental Cleaning', tKey: 'request.treatments.cleaning' },
  { value: 'Fillings', tKey: 'request.treatments.fillings' },
  { value: 'Tooth Extraction', tKey: 'request.treatments.extraction' },
  { value: 'Root Canal Treatment', tKey: 'request.treatments.rootCanal' },
  { value: 'Gum Treatment', tKey: 'request.treatments.gum' },
  { value: 'Prosthetics / Crowns', tKey: 'request.treatments.prosthetics' },
  { value: 'Orthodontics', tKey: 'request.treatments.orthodontics' },
  { value: 'Pediatric Dentistry', tKey: 'request.treatments.pediatric' },
  { value: 'Esthetic Dentistry', tKey: 'request.treatments.esthetic' },
  { value: "I'm not sure", tKey: 'request.treatments.notSure' },
  { value: 'Other', tKey: 'request.treatments.other' },
] as const

const GENDER_OPTIONS = [
  { value: 'Male', tKey: 'request.genderMale' },
  { value: 'Female', tKey: 'request.genderFemale' },
] as const

const LANGUAGE_OPTIONS = [
  { value: 'Turkish', tKey: 'request.langTurkish' },
  { value: 'English', tKey: 'request.langEnglish' },
  { value: 'Arabic', tKey: 'request.langArabic' },
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
  { value: 'No Preference', tKey: 'request.dayNoPreference' },
  { value: 'Weekday Mornings', tKey: 'request.dayWeekdayMornings' },
  { value: 'Weekday Afternoons', tKey: 'request.dayWeekdayAfternoons' },
  { value: 'As Soon As Possible', tKey: 'request.dayAsSoonAsPossible' },
] as const

const DURATION_OPTIONS = [
  { value: 'Today', tKey: 'request.durationToday' },
  { value: 'A few days', tKey: 'request.durationFewDays' },
  { value: '1-2 weeks', tKey: 'request.durationOneToTwoWeeks' },
  { value: 'More than a month', tKey: 'request.durationMoreThanMonth' },
  { value: 'Routine / No specific start date', tKey: 'request.durationRoutineNoSpecificStart' },
] as const

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

interface PatientRequestProgressRailProps {
  progressPercent: number
}

export function PatientRequestProgressRail({ progressPercent }: PatientRequestProgressRailProps) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-2 z-10 w-12 sm:left-3 sm:w-14">
      <div className="absolute left-1/2 top-4 min-w-[3rem] -translate-x-1/2 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-center text-[11px] font-semibold text-emerald-700 shadow-sm ring-4 ring-white sm:min-w-[3.25rem] sm:text-xs">
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
  )
}

interface PatientInfoSectionProps {
  sectionRef: RefCallback<HTMLElement>
  fullName: string
  phoneCountryCode: string
  phone: string
  preferredUniversity: string
  age: string
  gender: string
  onFullNameChange: (value: string) => void
  onPhoneCountryCodeChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onPreferredUniversityChange: (value: string) => void
  onAgeChange: (value: string) => void
  onGenderChange: (value: string) => void
}

export function PatientInfoSection({
  sectionRef,
  fullName,
  phoneCountryCode,
  phone,
  preferredUniversity,
  age,
  gender,
  onFullNameChange,
  onPhoneCountryCodeChange,
  onPhoneChange,
  onPreferredUniversityChange,
  onAgeChange,
  onGenderChange,
}: PatientInfoSectionProps) {
  const { t } = useI18n()

  return (
    <section ref={sectionRef}>
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
            onChange={(e) => onFullNameChange(e.target.value)}
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
                onChange={(e) => onPhoneCountryCodeChange(e.target.value)}
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
                onChange={(e) => onPhoneChange(e.target.value)}
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
            onChange={(e) => onPreferredUniversityChange(e.target.value)}
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
            onChange={(e) => onAgeChange(e.target.value)}
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
            onChange={(e) => onGenderChange(e.target.value)}
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
  )
}

interface ClinicalDetailsSectionProps {
  sectionRef: RefCallback<HTMLElement>
  treatmentType: string
  complaintText: string
  painScore: string
  symptomDuration: string
  medicalCondition: string
  medicalConditionDetails: string
  onTreatmentTypeChange: (value: string) => void
  onComplaintTextChange: (value: string) => void
  onPainScoreChange: (value: string) => void
  onSymptomDurationChange: (value: string) => void
  onMedicalConditionChange: (value: string) => void
  onMedicalConditionDetailsChange: (value: string) => void
}

export function ClinicalDetailsSection({
  sectionRef,
  treatmentType,
  complaintText,
  painScore,
  symptomDuration,
  medicalCondition,
  medicalConditionDetails,
  onTreatmentTypeChange,
  onComplaintTextChange,
  onPainScoreChange,
  onSymptomDurationChange,
  onMedicalConditionChange,
  onMedicalConditionDetailsChange,
}: ClinicalDetailsSectionProps) {
  const { t, locale } = useI18n()

  return (
    <section ref={sectionRef}>
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
                onClick={() => onTreatmentTypeChange(opt.value)}
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
          onChange={(e) => onComplaintTextChange(e.target.value)}
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
                onChange={(e) => onPainScoreChange(e.target.value)}
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
                onChange={(e) => onSymptomDurationChange(e.target.value)}
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
                onChange={(e) => onMedicalConditionChange(e.target.value)}
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
                onChange={(e) => onMedicalConditionDetailsChange(e.target.value)}
                placeholder={t('request.medicalConditionDetailsPlaceholder')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:px-4 sm:py-3 outline-none transition focus:border-slate-900"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

interface SupportSectionProps {
  sectionRef: RefCallback<HTMLElement>
  attachment: File | null
  contactMethod: string
  preferredLanguage: string
  bestContactTime: string
  preferredDays: string
  onAttachmentChange: (file: File | null) => void
  onContactMethodChange: (value: string) => void
  onPreferredLanguageChange: (value: string) => void
  onBestContactTimeChange: (value: string) => void
  onPreferredDaysChange: (value: string) => void
}

export function SupportSection({
  sectionRef,
  attachment,
  contactMethod,
  preferredLanguage,
  bestContactTime,
  preferredDays,
  onAttachmentChange,
  onContactMethodChange,
  onPreferredLanguageChange,
  onBestContactTimeChange,
  onPreferredDaysChange,
}: SupportSectionProps) {
  const { t } = useI18n()

  return (
    <section ref={sectionRef}>
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
              onAttachmentChange(file)
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
            onChange={(e) => onContactMethodChange(e.target.value)}
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
            onChange={(e) => onPreferredLanguageChange(e.target.value)}
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
            onChange={(e) => onBestContactTimeChange(e.target.value)}
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
            onChange={(e) => onPreferredDaysChange(e.target.value)}
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
  )
}

interface ConsentSectionProps {
  sectionRef: RefCallback<HTMLElement>
  kvkkAcknowledgement: boolean
  explicitConsent: boolean
  onKvkkAcknowledgementChange: (checked: boolean) => void
  onExplicitConsentChange: (checked: boolean) => void
}

export function ConsentSection({
  sectionRef,
  kvkkAcknowledgement,
  explicitConsent,
  onKvkkAcknowledgementChange,
  onExplicitConsentChange,
}: ConsentSectionProps) {
  const { t } = useI18n()

  return (
    <section ref={sectionRef}>
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

      <div className="mt-4 space-y-3">
        <label className="flex items-start gap-2.5 sm:gap-3">
          <input
            type="checkbox"
            required
            checked={kvkkAcknowledgement}
            onChange={(e) => onKvkkAcknowledgementChange(e.target.checked)}
            className="mt-0.5 sm:mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
          />
          <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {t('request.kvkkAcknowledgementBeforeLink')}
            <Link
              href="/personal-data-protection-law"
              className="font-semibold text-teal-700 underline-offset-2 hover:underline"
            >
              {t('request.kvkkAcknowledgementLink')}
            </Link>
            {t('request.kvkkAcknowledgementAfterLink')} *
          </span>
        </label>

        <label className="flex items-start gap-2.5 sm:gap-3">
          <input
            type="checkbox"
            required
            checked={explicitConsent}
            onChange={(e) => onExplicitConsentChange(e.target.checked)}
            className="mt-0.5 sm:mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
          />
          <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {t('request.explicitConsentLabel')} *
          </span>
        </label>
      </div>

      <p className="mt-3 text-[11px] sm:text-xs text-slate-500">
        {t('request.consentLegalLinksIntro')}
        <Link href="/privacy" className="font-semibold text-teal-700 underline-offset-2 hover:underline">
          {t('request.consentLegalLinksPrivacy')}
        </Link>
        {t('request.consentLegalLinksBetween')}
        <Link
          href="/personal-data-protection-law"
          className="font-semibold text-teal-700 underline-offset-2 hover:underline"
        >
          {t('request.consentLegalLinksKvkk')}
        </Link>
        {t('request.consentLegalLinksEnding')}
      </p>
    </section>
  )
}

interface PatientRequestErrorProps {
  message: string
}

export function PatientRequestError({ message }: PatientRequestErrorProps) {
  if (!message) {
    return null
  }

  return (
    <div className="rounded-xl sm:rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-red-700">
      {message}
    </div>
  )
}

interface PatientRequestFormActionsProps {
  isSubmitting: boolean
}

export function PatientRequestFormActions({ isSubmitting }: PatientRequestFormActionsProps) {
  const { t } = useI18n()

  return (
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
  )
}
