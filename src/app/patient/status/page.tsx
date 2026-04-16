'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, Stethoscope } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type PatientRequest = {
  id: string
  treatment_type: string
  status: string
  created_at: string | null
  reviewed_at?: string | null
  preferred_days: string | null
  assigned_department: string | null
}

const STATUS_FLOW_KEYS = [
  'submitted',
  'under_review',
  'matched',
  'student_approved',
  'contacted',
  'appointment_scheduled',
  'in_treatment',
  'completed',
] as const

type StatusKey = typeof STATUS_FLOW_KEYS[number]

function getStatusBadgeClass(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return 'bg-slate-100 text-slate-700 border border-slate-200'
    case 'under_review':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'matched':
      return 'bg-violet-50 text-violet-700 border border-violet-200'
    case 'student_approved':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'contacted':
      return 'bg-cyan-50 text-cyan-700 border border-cyan-200'
    case 'appointment_scheduled':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    case 'in_treatment':
      return 'bg-purple-50 text-purple-700 border border-purple-200'
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    case 'cancelled':
      return 'bg-slate-100 text-slate-500 border border-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

function formatDate(dateString: string | null, locale: string) {
  if (!dateString) return '—'
  const localeCode = locale === 'tr' ? 'tr-TR' : 'en-GB'
  return new Date(dateString).toLocaleDateString(localeCode, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string | null, locale: string) {
  if (!dateString) return '—'
  const localeCode = locale === 'tr' ? 'tr-TR' : 'en-GB'
  return new Date(dateString).toLocaleString(localeCode, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getLocalizedStatusMessage(status: string, locale: string) {
  const key = (status || '').toLowerCase()

  if (locale === 'tr') {
    switch (key) {
      case 'submitted':
        return 'Talebiniz başarıyla alındı.'
      case 'under_review':
        return 'Vakanız şu anda fakülte incelemesindedir.'
      case 'matched':
        return 'Vakanız uygun bölüme yönlendirildi.'
      case 'student_approved':
        return 'Vakanız için bir öğrenci eşleştirildi.'
      case 'contacted':
        return 'Tedavi talebinizle ilgili sizinle iletişime geçildi.'
      case 'appointment_scheduled':
        return 'Randevunuz planlandı.'
      case 'in_treatment':
        return 'Tedaviniz şu anda devam ediyor.'
      case 'completed':
        return 'Tedaviniz başarıyla tamamlandı.'
      case 'rejected':
        return 'Talebiniz tedavi için uygun bulunmadı.'
      case 'cancelled':
        return 'Bu talep şu anda kapatılmış durumda.'
      default:
        return 'Talebiniz işleniyor.'
    }
  }

  switch (key) {
    case 'submitted':
      return 'Your request has been received successfully.'
    case 'under_review':
      return 'Your case is currently under faculty review.'
    case 'matched':
      return 'Your case has been assigned to the appropriate department.'
    case 'student_approved':
      return 'A student has been assigned to your case.'
    case 'contacted':
      return 'You have been contacted regarding your treatment request.'
    case 'appointment_scheduled':
      return 'Your appointment has been scheduled.'
    case 'in_treatment':
      return 'Your treatment is currently in progress.'
    case 'completed':
      return 'Your treatment has been completed successfully.'
    case 'rejected':
      return 'Your request could not be accepted for treatment.'
    case 'cancelled':
      return 'This request is currently closed.'
    default:
      return 'Your request is being processed.'
  }
}

function getLocalizedStatusGuidance(status: string, locale: string) {
  const key = (status || '').toLowerCase()

  if (locale === 'tr') {
    switch (key) {
      case 'submitted':
      case 'under_review':
        return 'Talebinizi yeniden göndermenize gerek yok. Vakanız zaten inceleniyor.'
      case 'matched':
      case 'student_approved':
        return 'Vakanız bir sonraki aşamaya geçti. Lütfen telefonunuzu ulaşılabilir durumda tutun.'
      case 'contacted':
        return 'Ekip sizinle iletişime geçtiyse, lütfen size verilen yönlendirmeleri takip edin.'
      case 'appointment_scheduled':
        return 'Lütfen planlanan randevunuza belirtilen gün ve saatte katılın.'
      case 'in_treatment':
        return 'Vakanız aktiftir. Tedavi planına göre ek seanslar gerekebilir.'
      case 'completed':
        return 'Bu tedavi talebi tamamlandı. Yeni bir ihtiyacınız varsa yeni bir başvuru gönderebilirsiniz.'
      case 'rejected':
        return 'Gerekirse daha net bilgi veya görüntülerle yeni bir başvuru gönderebilirsiniz.'
      case 'cancelled':
        return 'Durumunuz değiştiyse yeni bir başvuru oluşturabilirsiniz.'
      default:
        return 'Vakanızla ilgili bir gelişme olduğunda sizinle iletişime geçilecektir.'
    }
  }

  switch (key) {
    case 'submitted':
    case 'under_review':
      return 'You do not need to resubmit. Your request is already being reviewed.'
    case 'matched':
    case 'student_approved':
      return 'Your case has progressed. Please keep your phone available for contact.'
    case 'contacted':
      return 'If you already spoke with the team, please follow the instructions given to you.'
    case 'appointment_scheduled':
      return 'Please attend your scheduled appointment at the agreed time.'
    case 'in_treatment':
      return 'Your case is active. Follow-up visits may still be needed depending on treatment progress.'
    case 'completed':
      return 'This treatment request has been completed. If you need new care, you can submit a new request.'
    case 'rejected':
      return 'If needed, you may submit a new request with updated information or clearer images.'
    case 'cancelled':
      return 'If your situation has changed, you can submit a new request.'
    default:
      return 'You will be contacted if there is an update on your case.'
  }
}

function getLocalizedDepartmentGuidance(locale: string) {
  return locale === 'tr'
    ? 'Vakanız fakülte değerlendirmesine göre bu bölüme yönlendirilmiştir.'
    : 'Your case was routed to this department based on faculty review.'
}

function getLocalizedLastUpdatedLabel(locale: string) {
  return locale === 'tr' ? 'Son Güncelleme' : 'Last Updated'
}

function getLocalizedCtaLabel(locale: string) {
  return locale === 'tr' ? 'Yeni Tedavi Talebi Gönder' : 'Submit New Treatment Request'
}

function StatusStepper({
  status,
  t,
}: {
  status: string
  t: (key: string) => string
}) {
  const normalised = (status || '').toLowerCase()
  const isClosed = normalised === 'rejected' || normalised === 'cancelled'
  const currentIndex = STATUS_FLOW_KEYS.indexOf(normalised as StatusKey)

  return (
    <div>
      {isClosed && (
        <p className="mb-3 text-xs font-semibold text-rose-600">
          {normalised === 'cancelled'
            ? t('status.closedCancelled')
            : t('status.closedRejected')}
        </p>
      )}

      <div className="flex items-center">
        {STATUS_FLOW_KEYS.map((key, i) => {
          const isDone = !isClosed && i < currentIndex
          const isCurrent = !isClosed && i === currentIndex

          return (
            <React.Fragment key={key}>
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${
                  isDone
                    ? 'bg-teal-500'
                    : isCurrent
                    ? 'border-2 border-teal-500 bg-white'
                    : 'bg-slate-200'
                }`}
              />
              {i < STATUS_FLOW_KEYS.length - 1 && (
                <div
                  className={`h-px flex-1 transition-colors ${
                    isDone ? 'bg-teal-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      <div className="mt-2 hidden justify-between sm:flex">
        {STATUS_FLOW_KEYS.map((key, i) => {
          const isDone = !isClosed && i < currentIndex
          const isCurrent = !isClosed && i === currentIndex

          return (
            <span
              key={key}
              className={`text-[10px] font-medium leading-tight ${
                isCurrent ? 'text-teal-700' : isDone ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {t(`status.step.${key}`)}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function PatientStatusPage() {
  const { t, locale } = useI18n()

  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [result, setResult] = useState<PatientRequest | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  function getStatusLabel(status: string): string {
    const key = (status || '').toLowerCase()
    const tKey = `status.badge.${key}` as const
    const label = t(tKey)
    return label !== tKey ? label : status
  }

  async function handleSearch(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage('')
    setResult(null)
    setSearched(false)

    const trimmed = phone.trim()
    if (!trimmed) return

    setLoading(true)

    const { data, error } = await supabase
      .rpc('get_request_status_by_phone', { lookup_phone: trimmed })
      .maybeSingle()

    setLoading(false)
    setSearched(true)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setResult(data as PatientRequest | null)
  }

  const shouldShowRepeatCta = ['completed', 'cancelled', 'rejected'].includes(
    (result?.status || '').toLowerCase()
  )

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
            <Link href="/patient/status" className="text-slate-900">
              {t('patientNav.myPortal')}
            </Link>
            <Link href="/patient/request" className="hover:text-slate-900">
              {t('patientNav.newRequest')}
            </Link>
          </nav>

          <LanguageSwitcher />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('patientNav.backToHome')}
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {t('status.pageTitle')}
          </h1>
          <p className="mt-3 text-slate-600">{t('status.pageDescription')}</p>
        </div>

        <form
          onSubmit={handleSearch}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              <h2 className="text-lg font-semibold text-slate-900">{t('status.lookupTitle')}</h2>
            </div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              {t('status.phoneLabel')}
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('request.phonePlaceholder')}
                className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? t('status.searching') : t('status.searchButton')}
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </div>
        </form>

        {!loading && searched && !result && !errorMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <Search className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-700">{t('status.notFoundTitle')}</p>
              <p className="mt-1 text-sm text-slate-500">
                {t('status.notFoundBefore')}{' '}
                <Link href="/patient/request" className="text-teal-600 hover:underline">
                  {t('status.notFoundLink')}
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {!loading && result && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <span className="font-mono text-xs font-bold text-slate-400">
                REF #{result.id.slice(0, 8).toUpperCase()}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                  result.status
                )}`}
              >
                {getStatusLabel(result.status)}
              </span>
            </div>

            <div className="p-5 sm:p-7">
              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-base font-semibold text-slate-900">
                  {getLocalizedStatusMessage(result.status, locale)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {getLocalizedStatusGuidance(result.status, locale)}
                </p>
              </div>

              <div className="mb-6">
                <StatusStepper status={result.status} t={t} />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-5">
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('status.gridTreatment')}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{result.treatment_type}</p>
                </div>

                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('status.gridSubmitted')}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(result.created_at, locale)}
                  </p>
                </div>

                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('status.gridAvailability')}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {result.preferred_days || '—'}
                  </p>
                </div>

                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('status.gridDepartment')}
                  </p>
                  {result.assigned_department ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                        <p className="text-sm font-semibold text-blue-900">
                          {result.assigned_department}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {getLocalizedDepartmentGuidance(locale)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">{t('status.pendingReview')}</p>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {getLocalizedLastUpdatedLabel(locale)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDateTime(result.reviewed_at || result.created_at, locale)}
                </p>
              </div>

              {shouldShowRepeatCta && (
                <div className="mt-5">
                  <Link
                    href="/patient/request"
                    className="inline-flex items-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                  >
                    {getLocalizedCtaLabel(locale)}
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <p className="text-xs text-slate-400">{t('status.footerNote')}</p>
            </div>
          </div>
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
            <p className="text-sm leading-relaxed text-slate-400">{t('footer.description')}</p>
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
                <span className="cursor-default text-slate-600">
                  {t('footer.affordableCareInfo')}
                </span>
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
                <span className="cursor-default text-slate-600">
                  {t('footer.clinicalRequirements')}
                </span>
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