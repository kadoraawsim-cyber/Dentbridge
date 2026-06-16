'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [checking, setChecking] = useState(true)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function establishRecoverySession() {
      setChecking(true)
      setErrorMessage('')

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
        setErrorMessage('This password reset link is invalid or has expired. Please request a new one.')
        setChecking(false)
        return
      }

      if (code && isRecoveryType) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setErrorMessage('This password reset link is invalid or has expired. Please request a new one.')
          setChecking(false)
          return
        }
      } else if (accessToken && refreshToken && isRecoveryType) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          setErrorMessage('This password reset link is invalid or has expired. Please request a new one.')
          setChecking(false)
          return
        }
      } else if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        if (error) {
          setErrorMessage('This password reset link is invalid or has expired. Please request a new one.')
          setChecking(false)
          return
        }
      } else {
        setErrorMessage('This password reset link is invalid or has expired. Please request a new one.')
        setChecking(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setErrorMessage('This password reset link is invalid or has expired. Please request a new one.')
        setChecking(false)
        return
      }

      setRecoveryReady(true)
      setChecking(false)
    }

    void establishRecoverySession()
  }, [])

  function validateForm() {
    if (!newPassword) {
      return 'New password is required.'
    }

    if (!confirmPassword) {
      return 'Confirm password is required.'
    }

    if (newPassword.length < 8) {
      return 'New password must be at least 8 characters.'
    }

    if (newPassword !== confirmPassword) {
      return 'New password and confirm password must match.'
    }

    return ''
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (error) {
      setErrorMessage('Unable to update your password right now. Please request a new reset link.')
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setSuccessMessage('Password updated successfully. You can now sign in with your new password.')
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            Back to home
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Set a new password for your DentBridge account.
          </p>

          {checking ? (
            <p className="mt-6 text-sm text-slate-500">Checking your recovery session...</p>
          ) : !recoveryReady ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
              <Link
                href="/forgot-password"
                className="block w-full rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  New password
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
                  Confirm new password
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

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(successMessage)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}

          <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <Link
              href="/admin/login"
              className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Go to faculty login
            </Link>
            <Link
              href="/student/login"
              className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Go to student login
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
