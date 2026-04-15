'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, GraduationCap, LogOut, RefreshCw } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function StudentExchangePage() {
  const router = useRouter()
  const { t } = useI18n()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
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
                {t('student.nav.clinicalPlatform')}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/student/dashboard"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              {t('student.nav.dashboard')}
            </Link>
            <Link
              href="/student/cases"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              {t('student.nav.availableCases')}
            </Link>
            <span className="flex cursor-default items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900">
              {t('student.nav.exchange')}
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                {t('student.exchange.comingSoonTitle')}
              </span>
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500">
              <GraduationCap className="h-4 w-4" />
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('student.nav.signOut')}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/student/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('student.exchange.backToDashboard')}
          </Link>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {t('student.exchange.pageTitle')}
          </h1>
        </div>

        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
            <RefreshCw className="h-8 w-8" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('student.exchange.pageTitle')}
          </h2>

          <span className="mt-3 inline-flex rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
            {t('student.exchange.comingSoonTitle')}
          </span>

          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-500">
            {t('student.exchange.comingSoonDesc')}
          </p>

          <Link
            href="/student/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('student.exchange.backToDashboard')}
          </Link>
        </div>
      </section>
    </main>
  )
}
