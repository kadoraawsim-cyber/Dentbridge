'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import {
  ArrowRight,
  GraduationCap,
  HeartPulse,
  Menu,
  X,
} from 'lucide-react'

const AUDIENCE_CARDS = [
  {
    href: '/patients',
    titleKey: 'landing.audiencePatientTitle',
    textKey: 'landing.audiencePatientText',
    buttonKey: 'landing.audiencePatientButton',
    icon: HeartPulse,
    glowBg: 'bg-teal-400',
    accentLine: 'from-teal-400 via-cyan-300 to-transparent',
    iconBg: 'bg-teal-500/30 ring-teal-400/25',
    btnCls:
      'border-white/15 bg-white/10 text-white group-hover:border-teal-400/50 group-hover:bg-teal-500/20 group-hover:text-teal-100',
  },
  {
    href: '/students',
    titleKey: 'landing.audienceStudentTitle',
    textKey: 'landing.audienceStudentText',
    buttonKey: 'landing.audienceStudentButton',
    icon: GraduationCap,
    glowBg: 'bg-indigo-500',
    accentLine: 'from-indigo-400 via-blue-300 to-transparent',
    iconBg: 'bg-indigo-500/30 ring-indigo-400/25',
    btnCls:
      'border-white/15 bg-white/10 text-white group-hover:border-indigo-400/50 group-hover:bg-indigo-500/20 group-hover:text-indigo-100',
  },
] as const

export default function HomePage() {
  const { t } = useI18n()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

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
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.5)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link href="/" className="dentbridge-link-lift flex min-w-0 items-center gap-2 sm:gap-3">
            <Image
              src="/dentbridge-icon.webp"
              alt="DentBridge icon"
              width={40}
              height={40}
              priority
              className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-none text-slate-900 sm:text-lg">DentBridge</p>
              <p className="hidden truncate text-[10px] text-slate-500 sm:block sm:text-xs">Faculty-Supported Clinical Platform</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-3 md:flex">
            <Link
              href="/admin/login"
              className="dentbridge-soft-control rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/50 hover:text-slate-900"
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

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-[linear-gradient(140deg,#050f2b_0%,#0d1f54_35%,#0a5c55_72%,#062a26_100%)] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">

        {/* Background layers */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Orbs */}
          <div className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-teal-400/[0.08] blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-[32rem] w-[32rem] rounded-full bg-cyan-300/[0.09] blur-3xl" />
          <div className="absolute left-[55%] top-[30%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-indigo-500/[0.07] blur-3xl" />
          <div className="absolute right-[10%] top-[8%] h-[18rem] w-[18rem] rounded-full bg-teal-300/[0.06] blur-2xl" />

          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-[0.028]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '26px 26px' }}
          />

          {/* Light gradient overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_18%,rgba(255,255,255,0.10),transparent_32%),radial-gradient(ellipse_at_76%_12%,rgba(45,212,191,0.10),transparent_30%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/50" />

          {/* Subtle top shimmer */}
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/30 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl">

          {/* ── Heading block ──────────────────────────────────────────── */}
          <div className="dentbridge-reveal mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/35 bg-teal-300/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200 shadow-[0_0_28px_-8px_rgba(45,212,191,0.5)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300 shadow-[0_0_10px_2px_rgba(94,234,212,0.8)]" />
              {t('hero.badge')}
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.07] tracking-[-0.04em] text-white sm:mt-8 sm:text-5xl lg:text-[3.75rem]">
              {t('hero.title')}
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300/80 sm:mt-5 sm:text-lg sm:leading-8">
              {t('hero.description')}
            </p>
          </div>

          {/* ── Audience cards ─────────────────────────────────────────── */}
          <div className="dentbridge-stagger-group mt-10 grid gap-4 sm:mt-14 sm:gap-5 lg:grid-cols-2 lg:gap-6">
            {AUDIENCE_CARDS.map((card) => {
              const Icon = card.icon

              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="dentbridge-reveal dentbridge-card group relative block overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.07] shadow-[0_24px_64px_-32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:rounded-3xl"
                >
                  {/* Corner accent glow */}
                  <div
                    className={`pointer-events-none absolute -right-10 -top-12 h-52 w-52 rounded-full ${card.glowBg} opacity-[0.18] blur-3xl transition-opacity duration-500 group-hover:opacity-30`}
                    aria-hidden="true"
                  />

                  <article className="relative flex min-h-[300px] flex-col p-6 sm:min-h-[340px] sm:p-8">
                    {/* Icon + arrow row */}
                    <div className="flex items-center justify-between">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${card.iconBg}`}>
                        <Icon className="h-[22px] w-[22px] text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-white/40 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white/80" />
                    </div>

                    {/* Title + description */}
                    <h2 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
                      {t(card.titleKey)}
                    </h2>
                    <p className="mt-3 flex-1 text-base leading-7 text-slate-300/85 sm:text-[1.05rem]">
                      {t(card.textKey)}
                    </p>

                    {/* CTA button */}
                    <div className="mt-8">
                      <span
                        className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold backdrop-blur-sm transition-all duration-200 ${card.btnCls}`}
                      >
                        {t(card.buttonKey)}
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </article>

                  {/* Bottom accent line on hover */}
                  <div
                    className={`pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r ${card.accentLine} opacity-0 transition-opacity duration-300 group-hover:opacity-70`}
                    aria-hidden="true"
                  />
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
