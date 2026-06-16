'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'

function getResetRedirectUrl() {
  const { hostname, origin } = window.location

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}/auth/update-password`
  }

  return 'https://dentbridgetr.com/auth/update-password'
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function emailExistsInDentBridge(normalizedEmail: string) {
    const [facultyResult, studentResult] = await Promise.all([
      supabase
        .from('faculty_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .limit(1),
      supabase
        .from('student_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .limit(1),
    ])

    if (facultyResult.error || studentResult.error) {
      throw new Error('profile_lookup_failed')
    }

    return Boolean((facultyResult.data ?? []).length || (studentResult.data ?? []).length)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setErrorMessage('Email is required.')
      return
    }

    setLoading(true)

    let accountExists = false
    try {
      accountExists = await emailExistsInDentBridge(normalizedEmail)
    } catch {
      setLoading(false)
      setErrorMessage('Unable to check this email right now. Please try again.')
      return
    }

    if (!accountExists) {
      setLoading(false)
      setErrorMessage(
        'No DentBridge account was found for this email. Please check the email address and try again.'
      )
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getResetRedirectUrl(),
    })

    setLoading(false)

    if (error) {
      setErrorMessage('Unable to send a reset link right now. Please try again.')
      return
    }

    setSuccessMessage('A password reset link has been sent to this email.')
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
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Enter your DentBridge account email to receive a Supabase password reset link.
          </p>

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
                placeholder="name@university.edu"
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
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4">
              <Link href="/student/login" className="text-teal-600 hover:underline">
                Back to student login
              </Link>
              <Link href="/admin/login" className="text-teal-600 hover:underline">
                Back to faculty login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
