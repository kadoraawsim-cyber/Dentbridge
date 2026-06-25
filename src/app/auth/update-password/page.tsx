'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n, type Locale } from '@/lib/i18n'
import { getAppRole } from '@/lib/roles'

type ErrorKey =
  | 'invalidLink'
  | 'newPasswordRequired'
  | 'confirmPasswordRequired'
  | 'passwordTooShort'
  | 'passwordMismatch'
  | 'updateFailed'
  | null

const copy: Record<
  Locale,
  {
    backHome: string
    title: string
    description: string
    checking: string
    invalidLink: string
    requestNewLink: string
    newPasswordLabel: string
    confirmPasswordLabel: string
    submit: string
    submitting: string
    success: string
    facultyLogin: string
    studentLogin: string
    newPasswordRequired: string
    confirmPasswordRequired: string
    passwordTooShort: string
    passwordMismatch: string
    updateFailed: string
  }
> = {
  en: {
    backHome: 'Back to home',
    title: 'Choose a new password',
    description: 'Set a new password for your DentBridge account.',
    checking: 'Checking your recovery session...',
    invalidLink: 'This password reset link is invalid or has expired. Please request a new one.',
    requestNewLink: 'Request a new reset link',
    newPasswordLabel: 'New password',
    confirmPasswordLabel: 'Confirm new password',
    submit: 'Update password',
    submitting: 'Updating...',
    success: 'Password updated successfully. You can now sign in with your new password.',
    facultyLogin: 'Go to faculty login',
    studentLogin: 'Go to student login',
    newPasswordRequired: 'New password is required.',
    confirmPasswordRequired: 'Confirm password is required.',
    passwordTooShort: 'New password must be at least 8 characters.',
    passwordMismatch: 'New password and confirm password must match.',
    updateFailed: 'Something went wrong. Please request a new reset link.',
  },
  tr: {
    backHome: 'Ana sayfaya dön',
    title: 'Yeni şifre belirleyin',
    description: 'DentBridge hesabınız için yeni bir şifre belirleyin.',
    checking: 'Şifre sıfırlama oturumunuz kontrol ediliyor...',
    invalidLink:
      'Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.',
    requestNewLink: 'Yeni sıfırlama bağlantısı iste',
    newPasswordLabel: 'Yeni şifre',
    confirmPasswordLabel: 'Yeni şifreyi onayla',
    submit: 'Şifreyi güncelle',
    submitting: 'Güncelleniyor...',
    success: 'Şifre başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.',
    facultyLogin: 'Akademik girişe git',
    studentLogin: 'Öğrenci girişine git',
    newPasswordRequired: 'Yeni şifre gereklidir.',
    confirmPasswordRequired: 'Şifre onayı gereklidir.',
    passwordTooShort: 'Yeni şifre en az 8 karakter olmalıdır.',
    passwordMismatch: 'Yeni şifre ve onay şifresi eşleşmelidir.',
    updateFailed: 'Bir hata oluştu. Lütfen yeni bir sıfırlama bağlantısı isteyin.',
  },
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const { locale } = useI18n()
  const ui = copy[locale]
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [checking, setChecking] = useState(true)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorKey, setErrorKey] = useState<ErrorKey>(null)

  useEffect(() => {
    async function establishRecoverySession() {
      setChecking(true)
      setErrorKey(null)

      const searchParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type') || hashParams.get('type')
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const linkError = searchParams.get('error_description') || hashParams.get('error_description')
      const isRecoveryType = !type || type === 'recovery'

      if (linkError) {
        setErrorKey('invalidLink')
        setChecking(false)
        return
      }

      if (code && isRecoveryType) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setErrorKey('invalidLink')
          setChecking(false)
          return
        }
      } else if (accessToken && refreshToken && isRecoveryType) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          setErrorKey('invalidLink')
          setChecking(false)
          return
        }
      } else if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        if (error) {
          setErrorKey('invalidLink')
          setChecking(false)
          return
        }
      } else {
        setErrorKey('invalidLink')
        setChecking(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setErrorKey('invalidLink')
        setChecking(false)
        return
      }

      setRecoveryReady(true)
      setChecking(false)
    }

    void establishRecoverySession()
  }, [])

  function validateForm(): ErrorKey {
    if (!newPassword) {
      return 'newPasswordRequired'
    }

    if (!confirmPassword) {
      return 'confirmPasswordRequired'
    }

    if (newPassword.length < 8) {
      return 'passwordTooShort'
    }

    if (newPassword !== confirmPassword) {
      return 'passwordMismatch'
    }

    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorKey(null)
    setSuccess(false)

    const validationError = validateForm()
    if (validationError) {
      setErrorKey(validationError)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (error) {
      setErrorKey('updateFailed')
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setSuccess(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (getAppRole(user?.app_metadata?.role) === 'student' && user?.id) {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.full_name?.trim() || !profile.phone?.trim()) {
        window.setTimeout(() => {
          router.replace('/auth/set-password/student')
        }, 1200)
      }
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

          {checking ? (
            <p className="mt-6 text-sm text-slate-500">{ui.checking}</p>
          ) : !recoveryReady ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorKey ? ui[errorKey] : ui.invalidLink}
              </div>
              <Link
                href="/forgot-password"
                className="block w-full rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {ui.requestNewLink}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {ui.newPasswordLabel}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {ui.confirmPasswordLabel}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
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
                disabled={loading || success}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? ui.submitting : ui.submit}
              </button>
            </form>
          )}

          <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <Link
              href="/admin/login"
              className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {ui.facultyLogin}
            </Link>
            <Link
              href="/student/login"
              className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {ui.studentLogin}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
