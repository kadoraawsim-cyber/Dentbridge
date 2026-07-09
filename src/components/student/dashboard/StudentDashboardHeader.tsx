'use client'

import type { ChangeEvent, RefObject } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bell,
  CalendarDays,
  Camera,
  ChevronDown,
  KeyRound,
  LogOut,
  Trash2,
} from 'lucide-react'

import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n } from '@/lib/i18n'

import type { DashboardUiText } from './types'

interface StudentDashboardHeaderProps {
  actionRequiredCount: number
  profileMenuRef: RefObject<HTMLDivElement | null>
  avatarInputRef: RefObject<HTMLInputElement | null>
  profileMenuOpen: boolean
  avatarUrl: string
  avatarSaving: boolean
  avatarError: string
  studentInitials: string
  ui: DashboardUiText
  onProfileMenuToggle: () => void
  onCloseProfileMenu: () => void
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onAvatarImageError: () => void
  onOpenAvatarPicker: () => void
  onRemoveAvatar: () => void
  onSignOut: () => void
}

export function StudentDashboardHeader({
  actionRequiredCount,
  profileMenuRef,
  avatarInputRef,
  profileMenuOpen,
  avatarUrl,
  avatarSaving,
  avatarError,
  studentInitials,
  ui,
  onProfileMenuToggle,
  onCloseProfileMenu,
  onAvatarFileChange,
  onAvatarImageError,
  onOpenAvatarPicker,
  onRemoveAvatar,
  onSignOut,
}: StudentDashboardHeaderProps) {
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/dentbridge-icon.webp"
            alt="DentBridge"
            width={36}
            height={36}
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm sm:text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
            <p className="hidden sm:block truncate text-[10px] uppercase tracking-wider text-slate-400">
              {t('student.nav.clinicalPlatform')}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { href: '/student/dashboard', labelKey: 'student.nav.dashboard', active: true },
            { href: '/student/cases', labelKey: 'student.nav.casePool', active: false },
            { href: '/student/requests', labelKey: 'student.nav.myRequests', active: false },
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

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />

          {actionRequiredCount > 0 && (
            <div className="relative flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] sm:text-[9px] font-bold text-white">
                {actionRequiredCount}
              </span>
            </div>
          )}

          <div ref={profileMenuRef} className="relative">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarFileChange}
            />
            <button
              type="button"
              onClick={onProfileMenuToggle}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 pr-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-expanded={profileMenuOpen}
            >
              <span
                className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] sm:text-xs font-bold ring-2 ring-slate-100 ${
                  avatarUrl ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'
                }`}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Avatar URLs can be local object URLs from file previews, which are not safe for next/image.
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={onAvatarImageError}
                  />
                ) : (
                  studentInitials
                )}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link
                  href="/student/planner"
                  onClick={onCloseProfileMenu}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {t('student.nav.planner')}
                </Link>
                <Link
                  href="/change-password"
                  onClick={onCloseProfileMenu}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  Change Password
                </Link>
                <button
                  type="button"
                  onClick={onOpenAvatarPicker}
                  disabled={avatarSaving}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Camera className="h-4 w-4 text-slate-400" />
                  {avatarSaving ? ui.photoSaving : ui.changePhoto}
                </button>
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={avatarSaving || !avatarUrl}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 text-slate-400" />
                  {ui.removePhoto}
                </button>
                {avatarError && (
                  <div className="mx-3 my-1 rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-xs leading-relaxed text-red-700">
                    {avatarError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  {t('student.nav.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
