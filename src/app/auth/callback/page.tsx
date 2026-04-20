'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAppRole } from '@/lib/roles'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleAuth() {
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
        }
      }

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

      if (role === 'admin') {
        router.replace('/admin')
        return
      }

      setError('Invalid or expired invitation link.')
    }

    handleAuth()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      {error || 'Processing invitation...'}
    </main>
  )
}
