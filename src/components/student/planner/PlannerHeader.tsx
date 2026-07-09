'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LogOut } from 'lucide-react'

import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n } from '@/lib/i18n'

interface PlannerHeaderProps {
  studentInitials: string
  onSignOut: () => void
}

export function PlannerHeader({ studentInitials, onSignOut }: PlannerHeaderProps) {
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image src="/dentbridge-icon.webp" alt="DentBridge" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
            <p className="truncate text-[10px] uppercase tracking-wider text-slate-400">
              {t('student.nav.clinicalPlatform')}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm ring-2 ring-slate-100">
            {studentInitials}
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:inline-flex"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('student.nav.signOut')}
          </button>
        </div>
      </div>
    </header>
  )
}
