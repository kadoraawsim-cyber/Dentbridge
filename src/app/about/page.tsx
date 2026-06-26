'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  HeartPulse,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import PublicPatientChatButton from '@/components/PublicPatientChatButton'

const steps = [
  {
    titleKey: 'aboutPage.steps.submitTitle',
    textKey: 'aboutPage.steps.submitText',
    icon: ClipboardList,
  },
  {
    titleKey: 'aboutPage.steps.reviewTitle',
    textKey: 'aboutPage.steps.reviewText',
    icon: ShieldCheck,
  },
  {
    titleKey: 'aboutPage.steps.matchingTitle',
    textKey: 'aboutPage.steps.matchingText',
    icon: Users,
  },
  {
    titleKey: 'aboutPage.steps.supervisedTitle',
    textKey: 'aboutPage.steps.supervisedText',
    icon: HeartPulse,
  },
] as const

const differences = [
  'aboutPage.differences.workflow',
  'aboutPage.differences.supervision',
  'aboutPage.differences.communication',
  'aboutPage.differences.tracking',
  'aboutPage.differences.education',
  'aboutPage.differences.accessibility',
] as const

export default function AboutPage() {
  const { t } = useI18n()

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/dentbridge-icon.webp"
              alt="DentBridge icon"
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-none text-slate-900">DentBridge</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-slate-400">
                {t('footer.tagline')}
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <LanguageSwitcher />
            <PublicPatientChatButton />
            <Link
              href="/patient/request"
              className="hidden rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 sm:inline-flex"
            >
              {t('aboutPage.ctaButton')}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#ecfeff_0%,#f8fafc_44%,#eef2ff_100%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex rounded-full border border-teal-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700 shadow-sm">
              {t('aboutPage.title')}
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {t('aboutPage.heroSubtitle')}
            </h1>
            <div className="mt-6 max-w-2xl space-y-4 text-base leading-8 text-slate-600 sm:text-lg">
              <p>{t('aboutPage.introOne')}</p>
              <p>{t('aboutPage.introTwo')}</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/patient/request"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
              >
                {t('aboutPage.ctaButton')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/patient/status"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t('footer.checkStatus')}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              t('aboutPage.differences.workflow'),
              t('aboutPage.differences.supervision'),
              t('aboutPage.differences.accessibility'),
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold leading-relaxed text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              DentBridge
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {t('aboutPage.whyTitle')}
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
              <p>{t('aboutPage.whyContentOne')}</p>
              <p>{t('aboutPage.whyContentTwo')}</p>
              <p>{t('aboutPage.whyContentThree')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                DentBridge
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                {t('aboutPage.howTitle')}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              {t('aboutPage.academicContentThree')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <article key={step.titleKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-950">{t(step.titleKey)}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{t(step.textKey)}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            {t('aboutPage.academicTitle')}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
            <p>{t('aboutPage.academicContentOne')}</p>
            <p>{t('aboutPage.academicContentTwo')}</p>
            <p>{t('aboutPage.academicContentThree')}</p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            {t('aboutPage.differentTitle')}
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {differences.map((key) => (
              <div key={key} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <p className="text-sm font-medium leading-6 text-slate-700">{t(key)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm lg:grid-cols-[1fr_0.8fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-300">
              {t('aboutPage.visionTitle')}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
              {t('aboutPage.ctaTitle')}
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300 sm:text-base">
              <p>{t('aboutPage.visionContentOne')}</p>
              <p>{t('aboutPage.visionContentTwo')}</p>
              <p>{t('aboutPage.ctaText')}</p>
            </div>
          </div>
          <div className="flex items-center bg-[linear-gradient(135deg,rgba(20,184,166,0.18),rgba(59,130,246,0.16))] p-6 sm:p-8 lg:p-10">
            <Link
              href="/patient/request"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100 sm:w-auto"
            >
              {t('aboutPage.ctaButton')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)] py-10 text-slate-300 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          <div>
            <div className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3">
              <Image
                src="/dentbridge-icon.webp"
                alt="DentBridge icon"
                width={40}
                height={40}
                className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10"
              />
              <div>
                <p className="text-sm font-bold text-white sm:text-base">DentBridge</p>
                <p className="text-[10px] text-slate-400 sm:text-xs">{t('footer.tagline')}</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white sm:mb-4 sm:text-base">{t('footer.patientServices')}</h3>
            <ul className="space-y-1.5 text-xs text-slate-400 sm:space-y-2 sm:text-sm">
              <li>
                <Link href="/patient/request" className="transition hover:text-white">
                  {t('footer.requestTreatment')}
                </Link>
              </li>
              <li>
                <Link href="/patient/status" className="transition hover:text-white">
                  {t('footer.checkStatus')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition hover:text-white">
                  {t('footer.aboutDentBridge')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition hover:text-white">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition hover:text-white">
                  {t('footer.termsOfUse')}
                </Link>
              </li>
              <li>
                <Link href="/personal-data-protection-law" className="transition hover:text-white">
                  {t('footer.personalDataProtection')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition hover:text-white">
                  {t('footer.faq')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white sm:mb-4 sm:text-base">{t('footer.contact')}</h3>
            <ul className="space-y-1.5 text-xs text-slate-400 sm:space-y-2 sm:text-sm">
              <li>Istanbul, Türkiye</li>
              <li>
                <a href="mailto:Dentbridge.tr@gmail.com" className="transition hover:text-white">
                  {t('footer.email')}
                </a>
              </li>
              <li>{t('footer.universityPilot')}</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 px-4 pt-5 text-xs text-slate-500 sm:px-6 lg:px-8">
          {t('footer.copyright')}
        </div>
      </footer>
    </main>
  )
}
