'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Eye, EyeOff } from 'lucide-react'

export default function StudentLoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // If already authenticated, redirect to the correct portal immediately.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.app_metadata?.role
        if (role === 'admin') {
          router.replace('/admin')
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
      setErrorMessage('Invalid email or password. Please try again.')
      return
    }

    // Role always wins — even if someone with an admin account uses this page.
    const role = data.user?.app_metadata?.role

    if (role === 'admin') {
      router.replace('/admin')
    } else if (role === 'student') {
      router.replace('/student/dashboard')
    } else {
      await supabase.auth.signOut()
      setErrorMessage(
        'Your account does not have an assigned role. Contact the platform administrator.'
      )
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Checking session…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link href="/" className="mb-10 flex items-center gap-3">
        <img
          src="/dentbridge-icon.png"
          alt="DentBridge icon"
          className="h-10 w-10 object-contain"
        />
        <div>
          <p className="text-lg font-bold leading-none text-slate-900">DentBridge</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Faculty-Supported Clinical Platform
          </p>
        </div>
      </Link>

      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-5 p-8">
          <div className="mb-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              <h1 className="text-xl font-semibold text-slate-900">Student Portal Sign In</h1>
            </div>
            <p className="text-sm text-slate-500">
              This portal is for clinical students only. Use your university credentials to access your case dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-11 text-sm outline-none transition focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/70 px-8 py-5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            Clinical students only
          </div>
          <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-400">
            <p>
              Are you faculty or an administrator?{' '}
              <Link href="/admin/login" className="text-teal-600 hover:underline">
                Admin portal login
              </Link>
            </p>
            <p>
              Are you a patient?{' '}
              <Link href="/patient/request" className="text-teal-600 hover:underline">
                Submit a request
              </Link>{' '}
              or{' '}
              <Link href="/patient/status" className="text-teal-600 hover:underline">
                check your status
              </Link>
              . No account needed.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
