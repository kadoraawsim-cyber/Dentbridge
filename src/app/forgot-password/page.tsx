'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n, type Locale } from '@/lib/i18n'

type MessageKey = 'emailRequired' | null

const copy: Record<
  Locale,
  {
    backHome: string
    title: string
    description: string
    emailLabel: string
    submit: string
    submitting: string
    studentLogin: string
    facultyLogin: string
    emailRequired: string
    success: string
  }
> = {
  en: {
    backHome: 'Back to home',
    title: 'Reset your password',
    description: 'Enter your DentBridge account email to receive a password reset link.',
    emailLabel: 'Email',
    submit: 'Send reset link',
    submitting: 'Sending...',
    studentLogin: 'Back to student login',
    facultyLogin: 'Back to faculty login',
    emailRequired: 'Please enter your email address.',
    success: 'If an account exists for this email, a password reset link will be sent.',
  },
  tr: {
    backHome: 'Ana sayfaya dön',
    title: 'Şifrenizi sıfırlayın',
    description:
      'Şifre sıfırlama bağlantısı almak için DentBridge hesabınıza ait e-posta adresini girin.',
    emailLabel: 'E-posta',
    submit: 'Sıfırlama bağlantısı gönder',
    submitting: 'Gönderiliyor...',
    studentLogin: 'Öğrenci girişine dön',
    facultyLogin: 'Akademik girişe dön',
    emailRequired: 'Lütfen e-posta adresinizi girin.',
    success: 'Bu e-posta için bir hesap varsa, şifre sıfırlama bağlantısı gönderilecektir.',
  },
}

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
const configuredResetRedirectUrl = process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL?.trim()

function getResetRedirectUrl() {
  const { hostname, origin } = window.location

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}/auth/update-password`
  }

  return configuredResetRedirectUrl || `${configuredSiteUrl || origin}/auth/update-password`
}

export default function ForgotPasswordPage() {
  const { locale } = useI18n()
  const ui = copy[locale]
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorKey, setErrorKey] = useState<MessageKey>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorKey(null)
    setSuccess(false)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setErrorKey('emailRequired')
      return
    }

    setLoading(true)

    try {
      await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getResetRedirectUrl(),
      })
    } catch {
      // Always show the same result so the form cannot be used to enumerate accounts.
    } finally {
      setLoading(false)
      setSuccess(true)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            {ui.backHome}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">{ui.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {ui.description}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {ui.emailLabel}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
                placeholder="name@university.edu"
              />
            </div>

            {errorKey && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {ui[errorKey]}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {ui.success}
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
              {loading ? ui.submitting : ui.submit}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4">
              <Link href="/student/login" className="text-teal-600 hover:underline">
                {ui.studentLogin}
              </Link>
              <Link href="/admin/login" className="text-teal-600 hover:underline">
                {ui.facultyLogin}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
