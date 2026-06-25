'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { isStudentRole } from '@/lib/roles'

export default function StudentSetPasswordPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !isStudentRole(user.app_metadata?.role)) {
        setError('Invalid or expired student invitation link.')
      }

      setChecking(false)
    }

    checkSession()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!fullName.trim() || !phone.trim() || !password || !confirmPassword) {
      setError('Please complete all fields.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !isStudentRole(user.app_metadata?.role)) {
      setLoading(false)
      setError('Invalid or expired student invitation link.')
      return
    }

    const { error: updateAuthError } = await supabase.auth.updateUser({
      password,
      data: {
        full_name: fullName.trim(),
        phone: phone.trim(),
      },
    })

    if (updateAuthError) {
      setLoading(false)
      setError(updateAuthError.message)
      return
    }

    const { error: profileError } = await supabase
      .from('student_profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        phone: phone.trim(),
        updated_at: new Date().toISOString(),
      })

    setLoading(false)

    if (profileError) {
      setError(profileError.message)
      return
    }

    setMessage('Student account setup completed successfully. Redirecting to login...')

    setTimeout(() => {
      router.replace('/student/login')
    }, 1200)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-8 inline-block text-sm text-slate-500 hover:text-slate-900">
          ← Back to home
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Complete your student account</h1>
          <p className="mt-2 text-sm text-slate-500">
            Set your full name, phone number, and password to access the student portal.
          </p>

          {checking ? (
            <p className="mt-6 text-sm text-slate-500">Checking invitation session...</p>
          ) : error && !message ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="+90 5XX XXX XX XX"
                  pattern="^\+[0-9]{10,14}$"
                  title="Please enter a valid phone number starting with a country code, like +905371234567"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Repeat password"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
              >
                {loading ? 'Saving...' : 'Save and continue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
