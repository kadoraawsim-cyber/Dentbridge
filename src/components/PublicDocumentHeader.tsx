'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import PublicPatientChatButton from '@/components/PublicPatientChatButton'
import { useI18n } from '@/lib/i18n'

type PublicDocumentHeaderProps = {
  eyebrow: string
}

export default function PublicDocumentHeader({ eyebrow }: PublicDocumentHeaderProps) {
  const { locale } = useI18n()

  return (
    <header className="dentbridge-safe-header border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/patients" className="flex items-center gap-3">
          <Image
            src="/dentbridge-icon.webp"
            alt="DentBridge"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <div>
            <p className="text-sm font-bold leading-none text-slate-900">DentBridge</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{eyebrow}</p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <LanguageSwitcher />
          <PublicPatientChatButton />
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {locale === 'tr' ? 'Hasta Ana Sayfasına Dön' : 'Back to Patient Home'}
          </Link>
        </div>
      </div>
    </header>
  )
}
