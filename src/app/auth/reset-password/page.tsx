'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getAppRole, type AppRole } from '@/lib/roles'

function getRedirectPath(role: AppRole | null) {
  if (role === 'student') {
    return '/student/login'
  }

  return '/admin/login'
}

function getSuccessMessage(role: AppRole | null, t: (key: string) => string) {
  if (role === 'student') {
    return t('auth.resetPassword.successStudent')
  }

  if (role === 'faculty') {
    return t('auth.resetPassword.successFaculty')
  }

  return t('auth.resetPassword.successAdmin')
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [sessionInvalid, setSessionInvalid] = useState(false)
  const [role, setRole] = useState<AppRole | null>(null)

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSessionInvalid(true)
        setErrorMessage(t('auth.resetPassword.invalidLink'))
        setChecking(false)
        return
      }

      setRole(getAppRole(user.app_metadata?.role))
      setChecking(false)
    }

    void checkSession()
  }, [t])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (password.length < 8) {
      setErrorMessage(t('auth.resetPassword.passwordTooShort'))
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.resetPassword.passwordMismatch'))
      return
    }

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      setErrorMessage(t('auth.resetPassword.invalidLink'))
      return
    }

    const resolvedRole = getAppRole(user.app_metadata?.role)
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setErrorMessage(error.message || t('auth.resetPassword.updateError'))
      return
    }

    const nextRole = resolvedRole ?? role
    const redirectPath = getRedirectPath(nextRole)
    setSuccessMessage(getSuccessMessage(nextRole, t))

    window.setTimeout(() => {
      router.replace(redirectPath)
    }, 1200)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            {t('auth.resetPassword.backToHome')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">{t('auth.resetPassword.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {t('auth.resetPassword.description')}
          </p>

          {checking ? (
            <p className="mt-6 text-sm text-slate-500">{t('auth.resetPassword.checkingSession')}</p>
          ) : sessionInvalid ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t('auth.resetPassword.passwordLabel')}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('auth.resetPassword.passwordPlaceholder')}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t('auth.resetPassword.confirmPasswordLabel')}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
                />
              </div>

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !!successMessage}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
