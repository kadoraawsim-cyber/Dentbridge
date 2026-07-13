'use client'

import Image from 'next/image'
import Link from 'next/link'
import { GraduationCap, LogOut } from 'lucide-react'

import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n } from '@/lib/i18n'

interface CasesHeaderProps {
  onSignOut: () => void
}

export function CasesHeader({ onSignOut }: CasesHeaderProps) {
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/dentbridge-icon.webp" alt="DentBridge" width={36} height={36} className="h-9 w-9 object-contain" />
          <div>
            <p className="text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              {t('student.nav.clinicalPlatform')}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { href: '/student/dashboard', labelKey: 'student.nav.dashboard', active: false },
            { href: '/student/cases',     labelKey: 'student.nav.casePool',  active: true  },
          ].map(({ href, labelKey, active }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {t(labelKey)}
            </Link>
          ))}
          <Link
            href="/student/exchange"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-50"
          >
            {t('student.nav.exchange')}
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-600">
              {t('student.exchange.comingSoonTitle')}
            </span>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="hidden h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 sm:flex">
            <GraduationCap className="h-4 w-4" />
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('student.nav.signOut')}
          </button>
        </div>
      </div>
    </header>
  )
}
