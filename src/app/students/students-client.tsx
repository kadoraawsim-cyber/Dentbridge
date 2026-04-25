'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileImage,
  FileText,
  GraduationCap,
  Handshake,
  Hospital,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n } from '@/lib/i18n'

const valueItems = [
  { key: 'cases', icon: ClipboardCheck },
  { key: 'chaos', icon: CheckCircle2 },
  { key: 'control', icon: Stethoscope },
  { key: 'experience', icon: GraduationCap },
] as const

const workflowSteps = [
  { key: 'patientSubmits', icon: FileText },
  { key: 'facultyReviews', icon: ShieldCheck },
  { key: 'categorized', icon: Hospital },
  { key: 'studentRequests', icon: Handshake },
  { key: 'assignmentApproved', icon: UserRoundCheck },
  { key: 'assigned', icon: ClipboardCheck },
  { key: 'beginTreatment', icon: Stethoscope },
] as const

const platformFeatures = [
  { key: 'exchange', icon: UsersRound },
  { key: 'planner', icon: CalendarDays },
  { key: 'requirements', icon: ClipboardCheck },
  { key: 'messaging', icon: Bell },
  { key: 'records', icon: ClipboardList },
  { key: 'notes', icon: MessageSquareText },
  { key: 'images', icon: FileImage },
  { key: 'protocols', icon: BookOpenCheck },
  { key: 'aiAssistant', icon: Sparkles },
] as const

export default function StudentsPageClient() {
  const { t } = useI18n()

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="dentbridge-link-lift flex min-w-0 items-center gap-3">
            <Image
              src="/dentbridge-icon.webp"
              alt="DentBridge icon"
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-none text-slate-900 sm:text-lg">DentBridge</p>
              <p className="hidden truncate text-xs text-slate-500 sm:block">{t('studentsPage.headerTagline')}</p>
            </div>
          </Link>

          <nav className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link
              href="/student/login"
              className="dentbridge-soft-control rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/50 hover:text-slate-900 sm:px-4"
            >
              {t('nav.studentPortal')}
            </Link>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#071638_0%,#10245a_42%,#0f766e_100%)] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.08)_0%,transparent_24%,transparent_72%,rgba(125,211,252,0.08)_100%)]" aria-hidden="true" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden="true" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#C8A96A] opacity-[0.07] blur-[100px]" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C8A96A]/40 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-teal-50 shadow-sm backdrop-blur">
              <GraduationCap className="h-4 w-4 text-[#C8A96A]" />
              {t('studentsPage.eyebrow')}
            </span>
            <h1 className="mt-6 max-w-3xl whitespace-pre-line text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t('studentsPage.heroTitle')}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:mx-0 sm:text-lg">
              {t('studentsPage.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#how-it-works"
                className="dentbridge-primary-cta inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_36px_-24px_rgba(255,255,255,0.8)] transition hover:bg-slate-100"
              >
                {t('studentsPage.accessCta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/student/login"
                className="dentbridge-secondary-cta inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur transition hover:border-white/35 hover:bg-white/20"
              >
                {t('nav.studentPortal')}
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#C8A96A]/[0.22] bg-white/[0.08] p-3 shadow-[0_32px_80px_-40px_rgba(0,0,0,0.85),0_0_80px_-30px_rgba(200,169,106,0.15)] backdrop-blur">
            <Image
              src="/students-photo.webp"
              alt="Dental students working in a supervised clinical environment"
              width={1280}
              height={717}
              priority
              sizes="(min-width: 1024px) 48vw, (min-width: 640px) 80vw, 100vw"
              className="h-[250px] w-full rounded-2xl object-cover sm:h-[360px] lg:h-[440px]"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {valueItems.slice(0, 3).map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.key} className="rounded-2xl border border-[#C8A96A]/25 bg-white/10 p-3 text-white">
                    <Icon className="h-5 w-5 text-[#C8A96A]" />
                    <p className="mt-2 text-xs font-semibold leading-5">{t(`studentsPage.heroStats.${item.key}`)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              {t('studentsPage.whyEyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {t('studentsPage.whyTitle')}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">{t('studentsPage.whyIntro')}</p>
            <p className="mt-4 text-base leading-8 text-slate-600">{t('studentsPage.whyBody')}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {valueItems.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.key} className="dentbridge-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C8A96A]/10 text-[#C8A96A] ring-1 ring-[#C8A96A]/25">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-900">
                    {t(`studentsPage.valueItems.${item.key}`)}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y border-slate-200 bg-white px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              {t('studentsPage.workflowEyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {t('studentsPage.workflowTitle')}
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <article key={step.key} className="dentbridge-card rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm lg:min-h-48">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white ring-2 ring-[#C8A96A]/30">
                      {index + 1}
                    </span>
                    <Icon className="h-5 w-5 text-[#C8A96A]" />
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-900">
                    {t(`studentsPage.workflow.${step.key}`)}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-12 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C8A96A]">
                {t('studentsPage.platformEyebrow')}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {t('studentsPage.platformTitle')}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                {t('studentsPage.platformIntro')}
              </p>
            </div>
            <div className="rounded-3xl border border-[#C8A96A]/20 bg-white/[0.06] p-5 shadow-[0_24px_70px_-44px_rgba(200,169,106,0.45)]">
              <p className="text-xl font-bold text-white">{t('studentsPage.smartSystemTitle')}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{t('studentsPage.smartSystemBody')}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platformFeatures.map((feature) => {
              const Icon = feature.icon
              return (
                <article key={feature.key} className="dentbridge-card rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C8A96A]/10 text-[#C8A96A] ring-1 ring-[#C8A96A]/25">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">
                    {t(`studentsPage.features.${feature.key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {t(`studentsPage.features.${feature.key}.body`)}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_58%,#ecfeff_100%)] p-6 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.35)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              {t('studentsPage.differenceEyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {t('studentsPage.differenceTitle')}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {t('studentsPage.differenceBody1')}
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {t('studentsPage.differenceBody2')}
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.65)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">
              {t('studentsPage.availabilityEyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              {t('studentsPage.availabilityTitle')}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              {t('studentsPage.availabilityBody1')}
            </p>
            <p className="mt-4 text-base leading-8 text-slate-300">
              {t('studentsPage.availabilityBody2')}
            </p>
          </article>
        </div>
      </section>

      <section id="access" className="bg-[linear-gradient(135deg,#0f766e_0%,#164e63_48%,#071638_100%)] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-100">
              {t('studentsPage.accessEyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t('studentsPage.accessTitle')}
            </h2>
            <p className="mt-4 text-base leading-8 text-teal-50">{t('studentsPage.accessBody1')}</p>
            <p className="mt-3 text-base leading-8 text-teal-50">{t('studentsPage.accessBody2')}</p>
            <p className="mt-3 text-base leading-8 text-teal-50">{t('studentsPage.accessBody3')}</p>
          </div>

          <Link
            href="/student/login"
            className="dentbridge-primary-cta inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_36px_-24px_rgba(255,255,255,0.8)] transition hover:bg-slate-100 sm:w-auto"
          >
            {t('studentsPage.dashboardCta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="flex justify-center border-t border-slate-100 bg-white px-4 py-6 sm:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          {t('studentsPage.backHome')}
        </Link>
      </div>
    </main>
  )
}
