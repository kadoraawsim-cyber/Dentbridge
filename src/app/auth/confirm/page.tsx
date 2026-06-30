'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAppRole } from '@/lib/roles'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n, type Locale } from '@/lib/i18n'

const copy: Record<
  Locale,
  {
    platform: string
    title: string
    description: string
    button: string
    processing: string
    invalidLink: string
    unsupportedType: string
    invalidOrExpired: string
    missingRole: string
    facultyLogin: string
    studentLogin: string
  }
> = {
  en: {
    platform: 'Clinical Platform',
    title: 'Accept your DentBridge invitation',
    description:
      'You have been invited to create a DentBridge account. Click the button below to continue.',
    button: 'Accept invitation',
    processing: 'Accepting invitation…',
    invalidLink: 'Invalid invitation link.',
    unsupportedType: 'Unsupported confirmation type.',
    invalidOrExpired: 'This invitation link is invalid or expired. Please request a new invitation.',
    missingRole:
      'Your invitation was accepted, but your account role could not be determined. Please contact DentBridge support.',
    facultyLogin: 'Faculty login',
    studentLogin: 'Student login',
  },
  tr: {
    platform: 'Klinik Platform',
    title: 'DentBridge davetinizi kabul edin',
    description:
      'DentBridge hesabı oluşturmanız için davet edildiniz. Devam etmek için aşağıdaki butona tıklayın.',
    button: 'Daveti kabul et',
    processing: 'Davet kabul ediliyor…',
    invalidLink: 'Geçersiz davet bağlantısı.',
    unsupportedType: 'Desteklenmeyen doğrulama türü.',
    invalidOrExpired:
      'Bu davet bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir davet isteyin.',
    missingRole:
      'Davetiniz kabul edildi, ancak hesap rolünüz belirlenemedi. Lütfen DentBridge desteğiyle iletişime geçin.',
    facultyLogin: 'Akademik giriş',
    studentLogin: 'Öğrenci girişi',
  },
}

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale } = useI18n()
  const ui = copy[locale]
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const inviteParams = {
    tokenHash: searchParams.get('token_hash') ?? '',
    confirmationType: searchParams.get('type') ?? '',
    redirectTo: searchParams.get('redirect_to') ?? '',
  }

  const linkError = !inviteParams.tokenHash
    ? ui.invalidLink
    : inviteParams.confirmationType !== 'invite'
      ? ui.unsupportedType
      : ''

  async function handleAcceptInvitation() {
    if (!inviteParams.tokenHash || linkError || loading) return

    setLoading(true)
    setError('')
    setMessage('')

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: inviteParams.tokenHash,
      type: 'invite',
    })

    if (verifyError) {
      setLoading(false)
      setError(ui.invalidOrExpired)
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

    setLoading(false)
    setMessage(ui.missingRole)
  }

  return (
    <main
      className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900"
      data-has-redirect-to={inviteParams.redirectTo ? 'true' : 'false'}
    >
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/dentbridge-icon.webp"
              alt="DentBridge icon"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <div>
              <p className="text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                {ui.platform}
              </p>
            </div>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-teal-500" />
            <h1 className="text-xl font-semibold text-slate-900">{ui.title}</h1>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {ui.description}
          </p>

          {(linkError || error) && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {linkError || error}
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {message}
            </div>
          )}

          {!linkError && !error && !message && (
            <button
              type="button"
              onClick={handleAcceptInvitation}
              disabled={!inviteParams.tokenHash || loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {loading ? ui.processing : ui.button}
            </button>
          )}

          <div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4">
              <Link href="/admin/login" className="text-teal-600 hover:underline">
                {ui.facultyLogin}
              </Link>
              <Link href="/student/login" className="text-teal-600 hover:underline">
                {ui.studentLogin}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <AuthConfirmContent />
    </Suspense>
  )
}
