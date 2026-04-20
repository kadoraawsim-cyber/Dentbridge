'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getAppRole } from '@/lib/roles'

export default function SetPasswordPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function redirectToRoleFlow() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const role = getAppRole(user?.app_metadata?.role)

      if (role === 'student') {
        router.replace('/auth/set-password/student')
        return
      }

      if (role === 'faculty') {
        router.replace('/auth/set-password/faculty')
        return
      }

      setError('Invalid or expired invitation link.')
      setChecking(false)
    }

    redirectToRoleFlow()
  }, [router])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-8 inline-block text-sm text-slate-500 hover:text-slate-900">
          ← Back to home
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Redirecting to account setup</h1>
          <p className="mt-2 text-sm text-slate-500">
            We are checking your invitation and routing you to the correct setup flow.
          </p>

          {checking ? (
            <p className="mt-6 text-sm text-slate-500">Checking invitation session...</p>
          ) : error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
