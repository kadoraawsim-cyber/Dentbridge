'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n, type Locale } from '@/lib/i18n'

type MessageKey = 'emailRequired' | 'notFound' | 'generic' | null

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
    notFound: string
    success: string
    generic: string
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
    notFound:
      'No DentBridge account was found for this email. Please check the email address and try again.',
    success: 'A password reset link has been sent to this email.',
    generic: 'Something went wrong. Please try again.',
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
    notFound:
      'Bu e-posta adresiyle kayıtlı bir DentBridge hesabı bulunamadı. Lütfen e-posta adresini kontrol edip tekrar deneyin.',
    success: 'Şifre sıfırlama bağlantısı bu e-posta adresine gönderildi.',
    generic: 'Bir hata oluştu. Lütfen tekrar deneyin.',
  },
}

function getResetRedirectUrl() {
  const { hostname, origin } = window.location

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}/auth/update-password`
  }

  return 'https://dentbridgetr.com/auth/update-password'
}

export default function ForgotPasswordPage() {
  const { locale } = useI18n()
  const ui = copy[locale]
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorKey, setErrorKey] = useState<MessageKey>(null)

  async function emailExistsInDentBridge(normalizedEmail: string) {
    const response = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: normalizedEmail }),
    })

    if (!response.ok) {
      throw new Error('email_check_failed')
    }

    const result = (await response.json()) as { exists?: boolean }
    return result.exists === true
  }

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

    let accountExists = false
    try {
      accountExists = await emailExistsInDentBridge(normalizedEmail)
    } catch {
      setLoading(false)
      setErrorKey('generic')
      return
    }

    if (!accountExists) {
      setLoading(false)
      setErrorKey('notFound')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getResetRedirectUrl(),
    })

    setLoading(false)

    if (error) {
      setErrorKey('generic')
      return
    }

    setSuccess(true)
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
