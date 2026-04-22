'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAppRole } from '@/lib/roles'
import { useI18n } from '@/lib/i18n'

function getAuthFlowType() {
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  return searchParams.get('type') || hashParams.get('type')
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleAuth() {
      const searchParams = new URLSearchParams(window.location.search)
      const hash = window.location.hash
      const authFlowType = getAuthFlowType()

      const code = searchParams.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError(t('auth.callback.invalidLink'))
          return
        }
      }

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

      if (authFlowType === 'recovery') {
        router.replace('/auth/reset-password')
        return
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

      setError(t('auth.callback.invalidLink'))
    }

    void handleAuth()
  }, [router, t])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      {error || t('auth.callback.processing')}
    </main>
  )
}
