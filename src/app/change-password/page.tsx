'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { canAccessFacultyPortal, getAppRole, type AppRole } from '@/lib/roles'
import LanguageSwitcher from '@/components/LanguageSwitcher'

function getDashboardPath(role: AppRole | null) {
  if (role === 'student') return '/student/dashboard'
  if (canAccessFacultyPortal(role)) return '/admin'
  return '/'
}

export default function ChangePasswordPage() {
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [sessionUserId, setSessionUserId] = useState('')
  const [sessionEmail, setSessionEmail] = useState('')
  const [role, setRole] = useState<AppRole | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const dashboardPath = useMemo(() => getDashboardPath(role), [role])

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        setErrorMessage('Please sign in before changing your password.')
        setChecking(false)
        return
      }

      setSessionUserId(user.id)
      setSessionEmail(user.email)
      setEmail(user.email)
      setRole(getAppRole(user.app_metadata?.role))
      setChecking(false)
    }

    void checkSession()
  }, [])

  function validateForm() {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedSessionEmail = sessionEmail.trim().toLowerCase()

    if (!sessionUserId || !sessionEmail) {
      return 'Please sign in before changing your password.'
    }

    if (!normalizedEmail || normalizedEmail !== normalizedSessionEmail) {
      return "Email must match the email on your signed-in DentBridge account."
    }

    if (!currentPassword) {
      return 'Current password is required.'
    }

    if (!newPassword) {
      return 'New password is required.'
    }

    if (!confirmPassword) {
      return 'Confirm new password is required.'
    }

    if (newPassword.length < 8) {
      return 'New password must be at least 8 characters.'
    }

    if (newPassword !== confirmPassword) {
      return 'New password and confirm password must match.'
    }

    if (newPassword === currentPassword) {
      return 'New password must not be the same as current password.'
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

    const normalizedEmail = email.trim().toLowerCase()
    setLoading(true)

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: currentPassword,
    })

    if (signInError || signInData.user?.id !== sessionUserId) {
      setLoading(false)
      setErrorMessage('Current password is incorrect.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    setLoading(false)

    if (updateError) {
      setErrorMessage('Unable to update your password right now. Please try again.')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccessMessage('Password updated successfully.')
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
          <h1 className="text-2xl font-bold">Change password</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Confirm your current password, then choose a new DentBridge password.
          </p>

          {checking ? (
            <p className="mt-6 text-sm text-slate-500">Checking your session...</p>
          ) : !sessionUserId ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/admin/login"
                  className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Faculty login
                </Link>
                <Link
                  href="/student/login"
                  className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Student login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Current password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900"
                />
              </div>

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
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? 'Updating...' : 'Update password'}
              </button>

              {successMessage && (
                <Link
                  href={dashboardPath}
                  className="block w-full rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to dashboard
                </Link>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
