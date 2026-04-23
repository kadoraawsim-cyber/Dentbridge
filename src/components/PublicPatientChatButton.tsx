'use client'

import { MessageSquareText } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

const OPEN_PUBLIC_PATIENT_CHAT_EVENT = 'dentbridge:open-patient-chat'

type Props = {
  className?: string
}

export default function PublicPatientChatButton({ className = '' }: Props) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PUBLIC_PATIENT_CHAT_EVENT))}
      aria-label={t('nav.aiAssistant')}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-teal-200/70 bg-gradient-to-b from-white to-teal-50/70 px-3 text-xs font-semibold text-slate-800 shadow-[0_10px_24px_-22px_rgba(13,148,136,0.75),inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:border-teal-300 hover:from-teal-50 hover:to-white hover:text-teal-800 hover:shadow-[0_14px_30px_-24px_rgba(13,148,136,0.9),inset_0_1px_0_rgba(255,255,255,0.95)] sm:px-3.5 sm:text-sm ${className}`}
    >
      <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-teal-700" />
      <span>{t('nav.aiAssistant')}</span>
    </button>
  )
}
