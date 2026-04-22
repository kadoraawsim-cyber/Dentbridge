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
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:px-3.5 sm:text-sm ${className}`}
    >
      <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
      <span>{t('nav.aiAssistant')}</span>
    </button>
  )
}
