'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

import LanguageSwitcher from '@/components/LanguageSwitcher'
import PublicPatientChatButton from '@/components/PublicPatientChatButton'
import { useI18n } from '@/lib/i18n'

interface PatientRequestHeaderProps {
  onNewRequest: () => void
}

export function PatientRequestHeader({ onNewRequest }: PatientRequestHeaderProps) {
  const { t } = useI18n()

  return (
    <header className="dentbridge-safe-header border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image
            src="/dentbridge-icon.webp"
            alt="DentBridge icon"
            width={40}
            height={40}
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
              onNewRequest()
            }}
            className="text-slate-900"
          >
            {t('patientNav.newRequest')}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <PublicPatientChatButton />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  )
}

export function PatientRequestHero() {
  const { t } = useI18n()

  return (
    <>
      <Link
        href="/"
        className="mb-4 sm:mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('patientNav.backToHome')}
      </Link>

      <div className="mb-6 sm:mb-8">
        <div className="relative max-w-3xl">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            {t('request.pageTitle')}
          </h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600">
            {t('request.pageDescription')}
          </p>
        </div>
      </div>
    </>
  )
}

interface PatientRequestSuccessProps {
  onSubmitAnother: () => void
}

export function PatientRequestSuccess({ onSubmitAnother }: PatientRequestSuccessProps) {
  const { t } = useI18n()

  return (
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
            onClick={onSubmitAnother}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('request.success.submitAnother')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface PatientRequestFooterProps {
  onNewRequest: () => void
}

export function PatientRequestFooter({ onNewRequest }: PatientRequestFooterProps) {
  const { t } = useI18n()

  return (
    <footer className="bg-slate-950 py-8 sm:py-14 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-6 sm:gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/dentbridge-icon.webp"
              alt="DentBridge icon"
              width={40}
              height={40}
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
                  onNewRequest()
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
              <Link href="/about" className="hover:text-white">
                {t('footer.aboutDentBridge')}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white">
                {t('footer.privacyPolicy')}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white">
                {t('footer.termsOfUse')}
              </Link>
            </li>
            <li>
              <Link href="/personal-data-protection-law" className="hover:text-white">
                {t('footer.personalDataProtection')}
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
            <li>Istanbul, Türkiye</li>
            <li>
              <a href="mailto:contact@dentbridgetr.com" className="hover:text-white">
                {t('footer.email')}
              </a>
            </li>
            <li>
              <a href="mailto:support@dentbridgetr.com" className="hover:text-white">
                {t('footer.patientSupportEmail')}
              </a>
            </li>
            <li>
              <a href="mailto:privacy@dentbridgetr.com" className="hover:text-white">
                {t('footer.privacyEmail')}
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

      <div className="mx-auto mt-6 max-w-7xl border-t border-slate-800 px-4 pt-4 text-[10px] leading-relaxed text-slate-500 sm:mt-10 sm:px-6 sm:pt-6 sm:text-xs lg:px-8">
        <p>{t('footer.copyright')}</p>
        <p className="mt-2 max-w-5xl">{t('footer.legalNotice')}</p>
      </div>
    </footer>
  )
}
