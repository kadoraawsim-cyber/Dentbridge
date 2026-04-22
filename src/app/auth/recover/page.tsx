'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

function RecoverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()

  const tokenHash = searchParams.get('token_hash') ?? ''
  const type = searchParams.get('type') ?? ''

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isValidLink = tokenHash !== '' && type === 'recovery'

  async function handleContinue() {
    if (!isValidLink) return

    setLoading(true)
    setErrorMessage('')

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })

    setLoading(false)

    if (error) {
      setErrorMessage(t('auth.recover.expiredDescription'))
      return
    }

    router.replace('/auth/reset-password')
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            {t('auth.resetPassword.backToHome')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">{t('auth.recover.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {t('auth.recover.description')}
          </p>

          <div className="mt-6">
            {!isValidLink || errorMessage ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                  <p className="text-sm font-semibold text-red-800">
                    {t('auth.recover.expiredTitle')}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-red-700">
                    {errorMessage || t('auth.recover.invalidLink')}
                  </p>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="block w-full rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t('auth.recover.tryAgain')}
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? t('auth.recover.verifying') : t('auth.recover.continueButton')}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function RecoverPage() {
  return (
    <Suspense>
      <RecoverContent />
    </Suspense>
  )
}
