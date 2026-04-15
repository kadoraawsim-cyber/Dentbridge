'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

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

      router.replace('/auth/set-password')
    }

    handleAuth()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      Processing invitation...
    </main>
  )
}