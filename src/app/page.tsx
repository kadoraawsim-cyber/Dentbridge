'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import PublicPatientChatButton from '@/components/PublicPatientChatButton'
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
  Phone,
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
  const { t, locale } = useI18n()
  const [openDepartment, setOpenDepartment] = React.useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Clear any staff session when landing on the public home page.
  // Patients are always anonymous so signOut() is a no-op for them.
  useEffect(() => {
    supabase.auth.signOut()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>('.dentbridge-reveal')
    )

    if (revealElements.length === 0) {
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => {
        element.classList.add('dentbridge-reveal-visible')
      })
      return
    }

    root.classList.add('dentbridge-motion-ready')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          entry.target.classList.add('dentbridge-reveal-visible')
          observer.unobserve(entry.target)
        })
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.14,
      }
    )

    revealElements.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
      root.classList.remove('dentbridge-motion-ready')
    }
  }, [])

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.5)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link href="/" className="dentbridge-link-lift flex min-w-0 items-center gap-2 sm:gap-3">
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
              className="dentbridge-soft-control rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/50 hover:text-slate-900"
            >
              {t('nav.studentPortal')}
            </Link>
            <Link
              href="/admin/login"
              className="dentbridge-soft-control rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/50 hover:text-slate-900"
            >
              {t('nav.facultyLogin')}
            </Link>
            <PublicPatientChatButton />
            <LanguageSwitcher />
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <PublicPatientChatButton />
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="dentbridge-soft-control flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-teal-50 hover:text-teal-700"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="dentbridge-mobile-menu border-t border-slate-100 bg-white/95 px-4 pb-4 pt-2 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.5)] backdrop-blur-xl md:hidden">
            <nav className="flex flex-col gap-1">
              <Link
                href="/student/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-800"
              >
                {t('nav.studentPortal')}
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-800"
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
          <div className="dentbridge-reveal text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/40 bg-teal-300/10 px-3 py-1 text-[10px] font-medium text-teal-100 shadow-[0_10px_30px_-24px_rgba(45,212,191,0.9)] backdrop-blur sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300 shadow-[0_0_18px_rgba(94,234,212,0.9)]" />
              {t('hero.badge')}
            </span>

            <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-[1.08] tracking-[-0.035em] text-white sm:mt-7 sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>

            <p className="mt-3 mx-auto max-w-xl text-sm leading-relaxed text-slate-300 sm:mx-0 sm:mt-6 sm:text-lg sm:leading-8">
              {t('hero.description')}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-3 sm:mt-9">
              <Link
                href="/patient/request"
                className="dentbridge-primary-cta inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_36px_-24px_rgba(255,255,255,0.8)] transition hover:bg-slate-100 sm:w-auto sm:px-6 sm:py-3"
              >
                {t('nav.requestTreatment')}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <Link
                href="/patient/status"
                className="dentbridge-secondary-cta inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur transition hover:border-white/30 hover:bg-white/20 sm:w-auto sm:px-6 sm:py-3"
              >
                {t('cta.checkStatus')}
              </Link>
            </div>
          </div>

          <div className="dentbridge-reveal mt-4 flex flex-col items-center justify-center gap-4 sm:mt-0 sm:gap-5">
            <div className="relative w-full max-w-xl">
              <div className="dentbridge-image-frame overflow-hidden rounded-2xl border border-white/15 bg-white/8 p-2 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-3">
                <img
                  src="/hero-dental-clinic.png"
                  alt="University dental care"
                  className="h-[180px] w-full rounded-xl sm:rounded-2xl object-cover sm:h-[300px] lg:h-[420px]"
                />
              </div>
            </div>

            <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-white/10 p-3 text-left shadow-[0_22px_54px_-30px_rgba(15,23,42,0.75)] backdrop-blur-md sm:p-3.5">
              {/* Row 1: identity */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 shadow-sm sm:h-14 sm:w-14">
                  <img
                    src="/isu%202026%20logo.jpg"
                    alt={t('landing.activePartnerStripLogoAlt')}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200/90">
                    {t('landing.activePartnerStripEyebrow')}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-5 text-white sm:text-[15px]">
                    {t('landing.activePartnerStripTitle')}
                  </p>
                </div>
              </div>

              {/* Row 2: actions */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                <a
                  href="https://maps.app.goo.gl/9ff82yYpHHAzEuEz7?g_st=ic"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="dentbridge-glass-button inline-flex items-center justify-center gap-2 rounded-full border border-teal-300/35 bg-teal-400/15 px-4 py-2 text-sm font-semibold text-teal-50 shadow-sm transition hover:bg-teal-400/25"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-teal-200" />
                  {t('landing.activePartnerStripButton')}
                </a>
                <a
                  href={locale === 'tr' ? 'https://www.istinyedentalhospital.com/' : 'https://www.istinyedentalhospital.com/en'}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="dentbridge-glass-button inline-flex items-center justify-center gap-2 rounded-full border border-teal-300/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-white/15"
                >
                  {t('landing.activePartnerStripWebsiteButton')}
                </a>
                <a
                  href="tel:4446623"
                  aria-label={t('landing.activePartnerStripContactButton')}
                  className="dentbridge-glass-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-300/35 bg-white/10 text-teal-200 shadow-sm transition hover:bg-white/15"
                >
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-teal-900/10 bg-gradient-to-r from-teal-800 via-teal-700 to-cyan-800 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:py-4">
        {/* Swipeable on mobile, wrapped on desktop */}
        <div className="dentbridge-stagger-group mx-auto flex max-w-7xl overflow-x-auto whitespace-nowrap px-4 pb-2 text-xs font-medium text-white sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-8 sm:pb-0 sm:text-sm lg:px-8 gap-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div key={benefit.key} className="dentbridge-reveal flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.04] px-1.5 py-1 ring-1 ring-white/[0.06] sm:gap-2 sm:bg-transparent sm:px-0 sm:py-0 sm:ring-0">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-teal-100" />
                <span>{t(benefit.key)}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] py-10 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="dentbridge-reveal mb-6 text-center sm:mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t('landing.howItWorksTitle')}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mt-4 sm:text-base">
              {t('landing.howItWorksDesc')}
            </p>
          </div>

          {/* Swipeable Cards on Mobile */}
          <div className="dentbridge-stagger-group flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 sm:pb-0 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="dentbridge-reveal dentbridge-card w-[80vw] shrink-0 snap-center rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_42px_-34px_rgba(15,23,42,0.4)] sm:w-auto sm:rounded-2xl sm:p-6"
                >
                  <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 sm:mb-4 sm:h-12 sm:w-12 sm:rounded-2xl">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{t(`landing.step${item.step}Title`)}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-sm">{t(`landing.step${item.step}Desc`)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="dentbridge-reveal relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-teal-50/60 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.28)] sm:rounded-3xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.1),transparent_30%)]" />

            <div className="relative grid items-center gap-6 px-4 py-6 sm:gap-10 sm:px-8 sm:py-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h2 className="mb-5 text-2xl font-bold tracking-tight text-slate-950 sm:mb-6 sm:text-3xl">
                  {t('landing.whyTitle')}
                </h2>

                <div className="dentbridge-stagger-group grid gap-3 sm:gap-4">
                  {WHY_CHOOSE_ITEMS.map((item) => {
                    const Icon = item.icon

                    return (
                      <div
                        key={item.titleKey}
                        className="dentbridge-reveal dentbridge-card rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-200/40 backdrop-blur-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
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
                <div className="dentbridge-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-32px_rgba(13,148,136,0.45)] sm:rounded-3xl">
                  <img
                    src="/images/why-choose-clinic.jpg"
                    alt="University-supervised dental clinic"
                    className="h-[180px] w-full object-cover sm:h-[320px]"
                  />
                  <div className="border-t border-slate-100 bg-white/95 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700">
                      {t('landing.whyImageCaptionTitle')}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {t('landing.whyImageCaptionDesc')}
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
          <div className="dentbridge-reveal mb-6 text-center sm:mb-12">
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-950 sm:mb-4 sm:text-3xl">{t('landing.deptsTitle')}</h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">{t('landing.deptsDesc')}</p>
          </div>

          <div className="dentbridge-stagger-group grid items-start gap-3 sm:gap-4 md:grid-cols-2">
            {DEPARTMENTS.map((dept) => {
              const Icon = dept.icon
              const isOpen = openDepartment === dept.slug

              return (
                <div
                  key={dept.slug}
                  className="dentbridge-reveal dentbridge-card self-start overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition sm:rounded-2xl"
                >
                  <button
                    type="button"
                    onClick={() => setOpenDepartment(isOpen ? null : dept.slug)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50/80 sm:gap-4 sm:px-5 sm:py-5"
                  >
                    <div className="flex items-center sm:items-start gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100 sm:h-12 sm:w-12 sm:rounded-2xl">
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
                    <div className="dentbridge-accordion-panel border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-5 sm:py-5">
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
        <div className="dentbridge-reveal mx-auto max-w-7xl overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 px-5 py-6 shadow-[0_24px_70px_-42px_rgba(13,148,136,0.9)] ring-1 ring-teal-500/20 sm:rounded-3xl sm:px-8 sm:py-8 lg:px-10">
          <div className="flex flex-col items-center text-center sm:text-left sm:items-start justify-between gap-5 sm:gap-6 lg:flex-row lg:items-center">
            <div className="w-full">
              <h2 className="text-xl sm:text-2xl font-bold text-white">{t('callout.heading')}</h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-teal-50 sm:mt-2 sm:text-sm">
                {t('callout.description')}
              </p>
            </div>

            <Link
              href="/patient/request"
              className="dentbridge-primary-cta inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_36px_-24px_rgba(255,255,255,0.8)] transition hover:bg-slate-100 sm:w-auto"
            >
              <span className="truncate">{t('cta.submitRequest')}</span> <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] py-10 text-slate-300 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 sm:gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          <div className="dentbridge-reveal">
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

          <div className="dentbridge-reveal">
            <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-white">{t('footer.patientServices')}</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-400">
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
                <Link href="/privacy" className="transition hover:text-white">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition hover:text-white">
                  {t('footer.faq')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="dentbridge-reveal">
            <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-white">{t('footer.contact')}</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-400">
              <li>
                Istanbul, Türkiye
              </li>
              <li>
                <a href="mailto:Dentbridge.tr@gmail.com" className="transition hover:text-white">
                  {t('footer.email')}
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/dentbridge.tr"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-white"
                >
                  {t('footer.instagram')}
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/905411072665"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-white"
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
