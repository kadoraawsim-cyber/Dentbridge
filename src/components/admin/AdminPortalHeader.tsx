'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface AdminPortalHeaderProps {
  adminEmail: string
  onSignOut: () => void
  /**
   * The triage list historically renders the email chip before the language
   * switcher while the case detail renders the switcher first. Preserved as a
   * prop so this Phase 8 extraction changes no visual order; unifying the
   * order is a separate design decision.
   */
  emailBeforeSwitcher?: boolean
}

/**
 * Shared header for the admin triage list and case detail screens (Phase 8
 * dedup of two previously identical inline headers). The admin dashboard has
 * its own richer header (profile dropdown) and does not use this component.
 */
export function AdminPortalHeader({
  adminEmail,
  onSignOut,
  emailBeforeSwitcher = false,
}: AdminPortalHeaderProps) {
  const { t } = useI18n()

  const emailChip = adminEmail ? (
    <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 sm:flex">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" />
      <span className="max-w-[200px] truncate">{adminEmail}</span>
    </div>
  ) : null

  return (
    <header className="dentbridge-safe-header border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 sm:py-4 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/dentbridge-icon.webp"
            alt="DentBridge icon"
            width={40}
            height={40}
            className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-none text-slate-900 sm:text-lg">DentBridge</p>
            <p className="hidden truncate text-[11px] uppercase tracking-wide text-slate-500 sm:block">
              {t('admin.shared.clinicalPlatform')}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="/admin" className="hover:text-slate-900">
            {t('admin.shared.navDashboard')}
          </Link>
          <Link href="/admin/requests" className="text-slate-900">
            {t('admin.shared.navTriageReview')}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {emailBeforeSwitcher ? (
            <>
              {emailChip}
              <LanguageSwitcher />
            </>
          ) : (
            <>
              <LanguageSwitcher />
              {emailChip}
            </>
          )}
          <button
            type="button"
            onClick={onSignOut}
            aria-label={t('admin.shared.signOut')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{t('admin.shared.signOut')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
