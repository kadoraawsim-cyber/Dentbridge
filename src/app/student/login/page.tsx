'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Eye, EyeOff } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { canAccessFacultyPortal } from '@/lib/roles'

// Copy for the role-mismatch screen lives inline (not in the shared i18n
// dictionaries) so this fix stays confined to the two login pages.
const roleMismatchCopy = {
  en: {
    heading: 'Role mismatch',
    signedInAs: 'You are currently signed in as:',
    roleLabel: 'Faculty / Administrator',
    selected: 'You selected:',
    portalLabel: 'Student Portal',
    instruction: 'To continue, either:',
    returnLabel: 'Return to Faculty Portal',
    switchLabel: 'Sign out and switch account',
    signingOut: 'Signing out…',
  },
  tr: {
    heading: 'Rol uyuşmazlığı',
    signedInAs: 'Şu anda oturum açtığınız rol:',
    roleLabel: 'Fakülte / Yönetici',
    selected: 'Seçtiğiniz portal:',
    portalLabel: 'Öğrenci Portalı',
    instruction: 'Devam etmek için:',
    returnLabel: 'Fakülte Portalına Dön',
    switchLabel: 'Oturumu kapat ve hesap değiştir',
    signingOut: 'Oturum kapatılıyor…',
  },
} as const

export default function StudentLoginPage() {
  const router = useRouter()
  const { t, locale } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [roleMismatch, setRoleMismatch] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // If already authenticated, redirect to the correct portal immediately.
  // getUser() validates the JWT server-side — more reliable than getSession()
  // which only reads the local cookie without network validation.
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const role = user.app_metadata?.role
        if (canAccessFacultyPortal(role)) {
          // Signed in as faculty/admin but opened the student portal: show the
          // role-mismatch screen instead of silently redirecting.
          setRoleMismatch(true)
          setChecking(false)
        } else if (role === 'student') {
          router.replace('/student/dashboard')
        } else {
          setChecking(false)
        }
      } else {
        setChecking(false)
      }
    })
  }, [router])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) return

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    setLoading(false)

    if (error) {
      setErrorMessage(t('student.login.errorInvalidCredentials'))
      return
    }

    const role = data.user?.app_metadata?.role

    if (role === 'student') {
      window.location.href = '/student/dashboard'
    } else {
      await supabase.auth.signOut()
      setErrorMessage(
        canAccessFacultyPortal(role)
          ? t('student.login.errorNotStudentPortal')
          : t('student.login.errorNoRole')
      )
    }
  }

  async function handleSignOutAndSwitch() {
    setSigningOut(true)
    await supabase.auth.signOut()
    window.location.replace('/student/login')
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">{t('student.login.checkingSession')}</p>
      </main>
    )
  }

  if (roleMismatch) {
    const copy = roleMismatchCopy[locale]
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{copy.heading}</h1>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <p>
              {copy.signedInAs}{' '}
              <span className="font-semibold text-slate-900">{copy.roleLabel}</span>
            </p>
            <p>
              {copy.selected}{' '}
              <span className="font-semibold text-slate-900">{copy.portalLabel}</span>
            </p>
            <p>{copy.instruction}</p>
          </div>
          <div className="mt-6 space-y-3">
            <Link
              href="/admin"
              className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {copy.returnLabel}
            </Link>
            <button
              type="button"
              onClick={handleSignOutAndSwitch}
              disabled={signingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              )}
              {signingOut ? copy.signingOut : copy.switchLabel}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/dentbridge-icon.webp"
            alt="DentBridge icon"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <div>
            <p className="text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              {t('student.login.clinicalPlatform')}
            </p>
          </div>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-8">
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              <h1 className="text-xl font-semibold text-slate-900">{t('student.login.title')}</h1>
            </div>
            <p className="text-sm text-slate-500">{t('student.login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t('student.login.emailLabel')}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t('student.login.passwordLabel')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? t('student.login.hidePassword') : t('student.login.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-medium text-teal-600 hover:underline">
                {t('auth.forgotPassword.linkLabel')}
              </Link>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {loading ? t('student.login.signingIn') : t('student.login.signIn')}
            </button>
          </form>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/70 px-8 py-5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            {t('student.login.clinicalStudentsOnly')}
          </div>
          <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-400">
            <p>
              {t('student.login.facultyAdminQuestion')}{' '}
              <Link href="/admin/login" className="text-teal-600 hover:underline">
                {t('student.login.adminPortalLink')}
              </Link>
            </p>
            <p>
              {t('student.login.patientQuestion')}{' '}
              <Link href="/patient/request" className="text-teal-600 hover:underline">
                {t('student.login.submitRequest')}
              </Link>{' '}
              or{' '}
              <Link href="/patient/status" className="text-teal-600 hover:underline">
                {t('student.login.checkStatus')}
              </Link>
              . {t('student.login.noAccountNeeded')}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
