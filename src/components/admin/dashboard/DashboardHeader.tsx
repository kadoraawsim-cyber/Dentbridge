'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, KeyRound, LogOut, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface DashboardHeaderProps {
  adminEmail: string
  onSignOut: () => void
}

/**
 * Admin dashboard header with the account dropdown (change password /
 * sign out). This header is intentionally richer than the shared
 * AdminPortalHeader used by the triage list and case detail screens.
 */
export function DashboardHeader({ adminEmail, onSignOut }: DashboardHeaderProps) {
  const { t } = useI18n()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!profileMenuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [profileMenuOpen])

  return (
    <header className="dentbridge-safe-header border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/dentbridge-icon.webp"
            alt="DentBridge icon"
            width={40}
            height={40}
            className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm sm:text-lg font-bold leading-none text-slate-900">DentBridge</p>
            <p className="hidden sm:block truncate text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-500">
              {t('admin.shared.clinicalPlatform')}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="/admin" className="text-slate-900">
            {t('admin.shared.navDashboard')}
          </Link>
          <Link href="/admin/requests" className="hover:text-slate-900">
            {t('admin.shared.navTriageReview')}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {adminEmail && (
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" />
              <span className="max-w-[150px] truncate">{adminEmail}</span>
            </div>
          )}
          <LanguageSwitcher />
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              aria-expanded={profileMenuOpen}
              aria-label="Open account menu"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" />
              <span className="hidden sm:inline">Account</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-52 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link
                  href="/change-password"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  Change Password
                </Link>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  {t('admin.shared.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
