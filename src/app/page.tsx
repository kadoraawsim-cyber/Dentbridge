'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import {
  ArrowRight,
  Baby,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  HeartPulse,
  Menu,
  MapPin,
  ScanLine,
  ShieldCheck,
  ShieldPlus,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Users,
  Activity,
  X,
} from 'lucide-react'

const benefits = [
  { key: 'benefits.affordableCare', icon: CheckCircle2 },
  { key: 'benefits.facultySupervision', icon: ShieldCheck },
  { key: 'benefits.structuredReview', icon: ClipboardList },
  { key: 'benefits.easyCoordination', icon: CalendarCheck },
  { key: 'benefits.modernWorkflow', icon: Building2 },
]

// Translation-key arrays — text is resolved via t() at render time so
// hardcoded English strings no longer live in this file.
const HOW_IT_WORKS = [
  { step: 1, icon: FileText },
  { step: 2, icon: ShieldCheck },
  { step: 3, icon: Users },
  { step: 4, icon: CalendarCheck },
  { step: 5, icon: Stethoscope },
] as const

const WHY_CHOOSE_ITEMS = [
  { titleKey: 'landing.whyCareTitle', descKey: 'landing.whyCareDesc', icon: CheckCircle2 },
  { titleKey: 'landing.whyOversightTitle', descKey: 'landing.whyOversightDesc', icon: ShieldCheck },
  { titleKey: 'landing.whyMultiTitle', descKey: 'landing.whyMultiDesc', icon: ClipboardList },
  { titleKey: 'landing.whySupportTitle', descKey: 'landing.whySupportDesc', icon: Users },
  { titleKey: 'landing.whyDigitalTitle', descKey: 'landing.whyDigitalDesc', icon: Building2 },
] as const

const DEPARTMENTS = [
  { slug: 'surgery',        icon: Syringe },
  { slug: 'endodontics',    icon: HeartPulse },
  { slug: 'periodontology', icon: ShieldPlus },
  { slug: 'restorative',    icon: Sparkles },
  { slug: 'prosthodontics', icon: Smile },
  { slug: 'orthodontics',   icon: Activity },
  { slug: 'pedodontics',    icon: Baby },
  { slug: 'radiology',      icon: ScanLine },
] as const

export default function HomePage() {
  const { t } = useI18n()
  const [openDepartment, setOpenDepartment] = React.useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Clear any staff session when landing on the public home page.
  // Patients are always anonymous so signOut() is a no-op for them.
  useEffect(() => {
    supabase.auth.signOut()
  }, [])

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img
              src="/dentbridge-icon.png"
              alt="DentBridge icon"
              className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-base sm:text-lg font-bold leading-none text-slate-900">DentBridge</p>
              <p className="hidden sm:block truncate text-[10px] sm:text-xs text-slate-500">Faculty-Supported Clinical Platform</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-3 md:flex">
            <Link
              href="/student/login"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {t('nav.studentPortal')}
            </Link>
            <Link
              href="/admin/login"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {t('nav.facultyLogin')}
            </Link>
            <LanguageSwitcher />
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-1">
              <Link
                href="/student/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('nav.studentPortal')}
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('nav.facultyAdminLogin')}
              </Link>
            </nav>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e3480] via-[#1c2f6b] to-[#0f1e4a] px-4 py-8 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
        {/* Decorative background layers */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/8 blur-2xl" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a1533]/50" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-6 sm:gap-12 lg:grid-cols-2">
          <div className="text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 text-[10px] sm:text-xs font-medium text-teal-200 sm:px-4 sm:py-1.5 sm:text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              {t('hero.badge')}
            </span>

            <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-[1.1] tracking-tight text-white sm:mt-7 sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>

            <p className="mt-3 sm:mt-4 mx-auto sm:mx-0 max-w-xl text-sm sm:text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
              {t('hero.description')}
            </p>

            <div className="mt-5 max-w-xl rounded-2xl border border-white/15 bg-white/10 p-3 text-left shadow-[0_18px_40px_-28px_rgba(15,23,42,0.65)] backdrop-blur-md sm:mt-6 sm:p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
                <div className="flex justify-center sm:justify-start">
                  <div className="inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-sm">
                    <img
                      src="/isu%202026%20logo.jpg"
                      alt={t('landing.activePartnerStripLogoAlt')}
                      className="h-7 w-auto object-contain sm:h-8"
                    />
                  </div>
                </div>

                <p className="min-w-0 flex-1 text-center text-sm font-medium leading-6 text-slate-100 sm:text-left">
                  {t('landing.activePartnerStripMessage')}
                </p>

                <div className="flex justify-center sm:justify-end">
                  <a
                    href="https://maps.app.goo.gl/9ff82yYpHHAzEuEz7?g_st=ic"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-teal-700" />
                    {t('landing.activePartnerStripButton')}
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-3 sm:mt-9">
              <Link
                href="/patient/request"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 sm:py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 sm:px-6 sm:py-3"
              >
                {t('nav.requestTreatment')}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <Link
                href="/patient/status"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 sm:py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:px-6 sm:py-3"
              >
                {t('cta.checkStatus')}
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center mt-4 sm:mt-0">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-white/8 p-2 sm:p-2.5 shadow-2xl backdrop-blur sm:p-3">
              <img
                src="/hero-dental-clinic.png"
                alt="University dental care"
                className="h-[180px] w-full rounded-xl sm:rounded-2xl object-cover sm:h-[300px] lg:h-[420px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-teal-700 py-3 sm:py-4">
        {/* Swipeable on mobile, wrapped on desktop */}
        <div className="mx-auto flex max-w-7xl overflow-x-auto whitespace-nowrap px-4 pb-2 sm:pb-0 sm:flex-wrap sm:items-center sm:justify-center gap-4 sm:gap-x-8 text-xs font-medium text-white sm:text-sm lg:px-8">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div key={benefit.key} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-teal-100" />
                <span>{t(benefit.key)}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-slate-50 py-10 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">{t('landing.howItWorksTitle')}</h2>
            <p className="mx-auto mt-2 sm:mt-4 max-w-2xl text-sm sm:text-base text-slate-600">
              {t('landing.howItWorksDesc')}
            </p>
          </div>

          {/* Swipeable Cards on Mobile */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 sm:pb-0 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="w-[80vw] shrink-0 snap-center sm:w-auto rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-teal-50 text-teal-700">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{t(`landing.step${item.step}Title`)}</h3>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">{t(`landing.step${item.step}Desc`)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/60 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] sm:rounded-3xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.1),transparent_30%)]" />

            <div className="relative grid items-center gap-6 px-4 py-6 sm:gap-10 sm:px-8 sm:py-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h2 className="mb-5 text-2xl font-bold tracking-tight text-slate-900 sm:mb-6 sm:text-3xl">
                  {t('landing.whyTitle')}
                </h2>

                <div className="grid gap-3 sm:gap-4">
                  {WHY_CHOOSE_ITEMS.map((item) => {
                    const Icon = item.icon

                    return (
                      <div
                        key={item.titleKey}
                        className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-200/40 backdrop-blur-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 sm:text-base">
                              {t(item.titleKey)}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                              {t(item.descKey)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-2 sm:mt-0">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-32px_rgba(13,148,136,0.45)] sm:rounded-3xl">
                  <img
                    src="/images/why-choose-clinic.jpg"
                    alt="University-supervised dental clinic"
                    className="h-[180px] w-full object-cover sm:h-[320px]"
                  />
                  <div className="border-t border-slate-100 bg-white/95 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700">
                      {t('landing.whyOversightTitle')}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {t('landing.whyOversightDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-10 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-12 text-center">
            <h2 className="mb-2 sm:mb-4 text-2xl sm:text-3xl font-bold">{t('landing.deptsTitle')}</h2>
            <p className="mx-auto max-w-3xl text-sm sm:text-base text-slate-600">{t('landing.deptsDesc')}</p>
          </div>

          <div className="grid items-start gap-3 sm:gap-4 md:grid-cols-2">
            {DEPARTMENTS.map((dept) => {
              const Icon = dept.icon
              const isOpen = openDepartment === dept.slug

              return (
                <div
                  key={dept.slug}
                  className="self-start overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => setOpenDepartment(isOpen ? null : dept.slug)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-5 text-left"
                  >
                    <div className="flex items-center sm:items-start gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-2xl bg-teal-50 text-teal-700">
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                          {t(`landing.depts.${dept.slug}.name`)}
                        </h3>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-600">
                          {t(`landing.depts.${dept.slug}.short`)}
                        </p>
                      </div>
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-slate-500 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-5 sm:py-5">
                      <div className="space-y-4 sm:space-y-5 text-xs sm:text-sm leading-relaxed sm:leading-7 text-slate-700">
                        <div>
                          <p className="mb-0.5 sm:mb-1 font-semibold text-slate-900">
                            {t('landing.deptWhatTreats')}
                          </p>
                          <p>{t(`landing.depts.${dept.slug}.description`)}</p>
                        </div>
                        <div>
                          <p className="mb-0.5 sm:mb-1 font-semibold text-slate-900">
                            {t('landing.deptYouMayNeed')}
                          </p>
                          <p>{t(`landing.depts.${dept.slug}.when`)}</p>
                        </div>
                        <div>
                          <p className="mb-0.5 sm:mb-1 font-semibold text-slate-900">
                            {t('landing.deptCommonTreatments')}
                          </p>
                          <p>{t(`landing.depts.${dept.slug}.treatments`)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl sm:rounded-3xl bg-teal-600 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="flex flex-col items-center text-center sm:text-left sm:items-start justify-between gap-5 sm:gap-6 lg:flex-row lg:items-center">
            <div className="w-full">
              <h2 className="text-xl sm:text-2xl font-bold text-white">{t('callout.heading')}</h2>
              <p className="mt-1.5 sm:mt-2 max-w-2xl text-xs sm:text-sm text-teal-50">
                {t('callout.description')}
              </p>
            </div>

            <Link
              href="/patient/request"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              <span className="truncate">{t('cta.submitRequest')}</span> <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 py-10 sm:py-14 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 sm:gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          <div>
            <div className="mb-3 sm:mb-4 flex items-center gap-2.5 sm:gap-3">
              <img
                src="/dentbridge-icon.png"
                alt="DentBridge icon"
                className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 object-contain"
              />
              <div>
                <p className="font-bold text-sm sm:text-base text-white">DentBridge</p>
                <p className="text-[10px] sm:text-xs text-slate-400">{t('footer.tagline')}</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-white">{t('footer.patientServices')}</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-400">
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
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-400">
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

        <div className="mx-auto mt-8 sm:mt-10 max-w-7xl border-t border-slate-800 px-4 pt-4 sm:pt-6 text-[10px] sm:text-xs text-slate-500 sm:px-6 lg:px-8">
          {t('footer.copyright')}
        </div>
      </footer>
    </main>
  )
}
