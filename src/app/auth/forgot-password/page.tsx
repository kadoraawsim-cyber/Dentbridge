'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSubmitted(false)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      return
    }

    setLoading(true)

    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    })

    setLoading(false)

    if (error) {
      setErrorMessage(t('auth.forgotPassword.errorGeneric'))
      return
    }

    setSubmitted(true)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            {t('auth.forgotPassword.backToHome')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">{t('auth.forgotPassword.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {t('auth.forgotPassword.description')}
          </p>

          {submitted ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-800">
                {t('auth.forgotPassword.successTitle')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-700">
                {t('auth.forgotPassword.successDescription')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t('auth.forgotPassword.emailLabel')}
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
                />
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4">
              <Link href="/student/login" className="text-teal-600 hover:underline">
                {t('auth.forgotPassword.backToStudentLogin')}
              </Link>
              <Link href="/admin/login" className="text-teal-600 hover:underline">
                {t('auth.forgotPassword.backToFacultyLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
