'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Info, Loader2, Maximize2, Minimize2, Minus, SendHorizontal, X } from 'lucide-react'
import type { PatientChatPageContext, PublicPatientPageId } from '@/lib/chat/patient-site-context'
import { useI18n } from '@/lib/i18n'

const MAX_CLIENT_MESSAGE_LENGTH = 800
const RECENT_CONTEXT_MESSAGE_COUNT = 5
const BRIDGEY_AVATAR_SRC = '/new_avatar_logo-removebg-preview.png'
const OPEN_PUBLIC_PATIENT_CHAT_EVENT = 'dentbridge:open-patient-chat'
const APPROVED_PUBLIC_ROUTES = [
  '/patients',
  '/patient/request',
  '/patient/status',
  '/faq',
  '/privacy',
  '/terms',
  '/personal-data-protection-law',
] as const

type ApprovedPublicRoute = (typeof APPROVED_PUBLIC_ROUTES)[number]

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

type QuickSuggestion = {
  label: string
  type: 'question' | 'route'
  value: string
}

function shouldShowPatientChat(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/patients' ||
    pathname === '/faq' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/personal-data-protection-law' ||
    pathname.startsWith('/patient/')
  )
}

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getRecentContextMessages(messages: ChatMessage[], welcomeMessage: string) {
  return messages
    .filter((message) => message.content.trim() && message.content !== welcomeMessage)
    .slice(-RECENT_CONTEXT_MESSAGE_COUNT)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))
}

function isApprovedPublicRoute(value: string): value is ApprovedPublicRoute {
  return APPROVED_PUBLIC_ROUTES.includes(value as ApprovedPublicRoute)
}

function renderMessageContent(content: string) {
  const routePattern = /(\/personal-data-protection-law|\/patient\/request|\/patient\/status|\/patients|\/privacy|\/terms|\/faq)(?=[\s.,!?)]|$)/g
  const parts = content.split(routePattern)

  return parts.map((part, index) => {
    if (!isApprovedPublicRoute(part)) {
      return <span key={`${part}-${index}`}>{part}</span>
    }

    return (
      <Link
        key={`${part}-${index}`}
        href={part}
        className="inline-flex rounded-full border border-teal-200/80 bg-teal-50 px-2 py-0.5 text-[12px] font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-100"
      >
        {part}
      </Link>
    )
  })
}

function getLatestMessage(messages: ChatMessage[], role: ChatMessage['role']) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === role) {
      return messages[index]
    }
  }

  return null
}

function getNormalizedText(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('tr')
}

function isEmergencyChatContext(latestUserText: string, latestAssistantText: string) {
  const combined = getNormalizedText(`${latestUserText} ${latestAssistantText}`)

  return (
    combined.includes('urgent or emergency') ||
    combined.includes('emergency services') ||
    combined.includes('severe swelling') ||
    combined.includes('difficulty breathing') ||
    combined.includes('acil dental') ||
    combined.includes('acil tıbbi') ||
    combined.includes('acil tibbi') ||
    combined.includes('derhal acil')
  )
}

function getContextualSuggestions({
  latestUserText,
  latestAssistantText,
  locale,
}: {
  latestUserText: string
  latestAssistantText: string
  locale: 'en' | 'tr'
}): QuickSuggestion[] {
  const combined = getNormalizedText(`${latestUserText} ${latestAssistantText}`)
  const isTurkish = locale === 'tr'

  if (isEmergencyChatContext(latestUserText, latestAssistantText)) {
    return []
  }

  if (
    combined.includes('/patient/status') ||
    combined.includes('status') ||
    combined.includes('durum')
  ) {
    return isTurkish
      ? [
          { label: 'Talep durumu sayfasını aç', type: 'route', value: '/patient/status' },
          { label: 'Gönderdikten sonra ne olur?', type: 'question', value: 'Gönderdikten sonra ne olur?' },
          { label: 'Yanıt ne kadar sürer?', type: 'question', value: 'Yanıt ne kadar sürer?' },
        ]
      : [
          { label: 'Open status page', type: 'route', value: '/patient/status' },
          { label: 'What happens after submission?', type: 'question', value: 'What happens after submission?' },
          { label: 'How long does it take?', type: 'question', value: 'How long does it take?' },
        ]
  }

  if (
    combined.includes('/privacy') ||
    combined.includes('/personal-data-protection-law') ||
    combined.includes('privacy') ||
    combined.includes('private') ||
    combined.includes('kvkk') ||
    combined.includes('bilgi') ||
    combined.includes('gizli')
  ) {
    return isTurkish
      ? [
          { label: 'Gizlilik Politikasını aç', type: 'route', value: '/privacy' },
          { label: 'KVKK sayfasını aç', type: 'route', value: '/personal-data-protection-law' },
          { label: 'Bilgilerimi kim görebilir?', type: 'question', value: 'Bilgilerimi kim görebilir?' },
        ]
      : [
          { label: 'Open Privacy Policy', type: 'route', value: '/privacy' },
          { label: 'Open KVKK page', type: 'route', value: '/personal-data-protection-law' },
          { label: 'Who can see my information?', type: 'question', value: 'Who can see my information?' },
        ]
  }

  if (
    combined.includes('cost') ||
    combined.includes('fee') ||
    combined.includes('price') ||
    combined.includes('ücret') ||
    combined.includes('ucret') ||
    combined.includes('fiyat')
  ) {
    return isTurkish
      ? [
          { label: 'Tedavi ücreti ne kadar?', type: 'question', value: 'Tedavi ücreti ne kadar?' },
          { label: 'Tedavi kesin mi?', type: 'question', value: 'Tedavi kesin mi?' },
          { label: 'Nasıl talep gönderebilirim?', type: 'question', value: 'Nasıl talep gönderebilirim?' },
        ]
      : [
          { label: 'How much is treatment?', type: 'question', value: 'How much is treatment?' },
          { label: 'Is treatment guaranteed?', type: 'question', value: 'Is treatment guaranteed?' },
          { label: 'How do I submit a request?', type: 'question', value: 'How do I submit a request?' },
        ]
  }

  if (
    combined.includes('student') ||
    combined.includes('supervis') ||
    combined.includes('faculty') ||
    combined.includes('öğrenci') ||
    combined.includes('ogrenci') ||
    combined.includes('denetim') ||
    combined.includes('gözetim')
  ) {
    return isTurkish
      ? [
          { label: 'Tedavimi öğrenci mi yapacak?', type: 'question', value: 'Tedavimi öğrenci mi yapacak?' },
          { label: 'Tedavi denetimli mi?', type: 'question', value: 'Tedavi denetimli mi?' },
          { label: 'Tedavi kesin mi?', type: 'question', value: 'Tedavi kesin mi?' },
        ]
      : [
          { label: 'Will a student treat me?', type: 'question', value: 'Will a student treat me?' },
          { label: 'Is treatment supervised?', type: 'question', value: 'Is treatment supervised?' },
          { label: 'Is treatment guaranteed?', type: 'question', value: 'Is treatment guaranteed?' },
        ]
  }

  if (
    combined.includes('/patient/request') ||
    combined.includes('request') ||
    combined.includes('submit') ||
    combined.includes('apply') ||
    combined.includes('talep') ||
    combined.includes('başvuru') ||
    combined.includes('basvuru')
  ) {
    return isTurkish
      ? [
          { label: 'Talep formunu aç', type: 'route', value: '/patient/request' },
          { label: 'Talebimi kontrol edebilir miyim?', type: 'question', value: 'Talebimi kontrol edebilir miyim?' },
          { label: 'Tedavi kesin mi?', type: 'question', value: 'Tedavi kesin mi?' },
        ]
      : [
          { label: 'Open request form', type: 'route', value: '/patient/request' },
          { label: 'Can I check my status?', type: 'question', value: 'Can I check my status?' },
          { label: 'Is treatment guaranteed?', type: 'question', value: 'Is treatment guaranteed?' },
        ]
  }

  return isTurkish
    ? [
        { label: 'Nasıl talep gönderebilirim?', type: 'question', value: 'Nasıl talep gönderebilirim?' },
        { label: 'Talebimin durumunu kontrol edebilir miyim?', type: 'question', value: 'Talebimin durumunu kontrol edebilir miyim?' },
        { label: 'Ücretli mi?', type: 'question', value: 'Ücretli mi?' },
        { label: 'Bilgilerimi kim görebilir?', type: 'question', value: 'Bilgilerimi kim görebilir?' },
      ]
    : [
        { label: 'How do I request treatment?', type: 'question', value: 'How do I request treatment?' },
        { label: 'Can I check my status?', type: 'question', value: 'Can I check my status?' },
        { label: 'Does it cost money?', type: 'question', value: 'Does it cost money?' },
        { label: 'Who can see my information?', type: 'question', value: 'Who can see my information?' },
      ]
}

function BridgeyAvatar({
  sizeClass,
  className = '',
}: {
  sizeClass: string
  className?: string
}) {
  return (
    <div className={`relative shrink-0 ${sizeClass} overflow-hidden rounded-full ${className}`}>
      <Image
        src={BRIDGEY_AVATAR_SRC}
        alt="Bridgey"
        fill
        sizes="80px"
        draggable={false}
        className="object-contain"
      />
    </div>
  )
}

function getPatientChatPageContext(
  pathname: string,
  requestTreatmentLabel: string,
  statusLabel: string
): PatientChatPageContext | null {
  const byPage: Record<PublicPatientPageId, PatientChatPageContext> = {
    home: {
      page: 'home',
      visibleActions: [requestTreatmentLabel, statusLabel],
    },
    'patient-request': {
      page: 'patient-request',
      visibleActions: [requestTreatmentLabel],
    },
    'patient-status': {
      page: 'patient-status',
      visibleActions: [statusLabel],
    },
    faq: {
      page: 'faq',
      visibleActions: [requestTreatmentLabel, statusLabel],
    },
    privacy: {
      page: 'privacy',
      visibleActions: [requestTreatmentLabel, statusLabel],
    },
    terms: {
      page: 'terms',
      visibleActions: [requestTreatmentLabel, statusLabel],
    },
    'personal-data-protection-law': {
      page: 'personal-data-protection-law',
      visibleActions: [requestTreatmentLabel, statusLabel],
    },
  }

  if (pathname === '/' || pathname === '/patients') {
    return byPage.home
  }

  if (pathname === '/patient/request') {
    return byPage['patient-request']
  }

  if (pathname === '/patient/status') {
    return byPage['patient-status']
  }

  if (pathname === '/faq') {
    return byPage.faq
  }

  if (pathname === '/privacy') {
    return byPage.privacy
  }

  if (pathname === '/terms') {
    return byPage.terms
  }

  if (pathname === '/personal-data-protection-law') {
    return byPage['personal-data-protection-law']
  }

  return null
}

export default function PublicPatientChatWidget() {
  const pathname = usePathname()
  const { t, locale } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDisclaimerExpanded, setIsDisclaimerExpanded] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!shouldShowPatientChat(pathname)) {
      setIsOpen(false)
    }
  }, [pathname])

  useEffect(() => {
    if (!isOpen || messages.length > 0) {
      return
    }

    setMessages([
      {
        id: createMessageId(),
        role: 'assistant',
        content: t('patientChat.welcome'),
      },
    ])
  }, [isOpen, messages.length, t])

  useEffect(() => {
    if (!isOpen || !textareaRef.current) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen])

  useEffect(() => {
    if (!scrollContainerRef.current) {
      return
    }

    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
  }, [messages, isSending, errorMessage, isOpen])

  useEffect(() => {
    function handleOpen() {
      setIsOpen(true)
    }

    window.addEventListener(OPEN_PUBLIC_PATIENT_CHAT_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_PUBLIC_PATIENT_CHAT_EVENT, handleOpen)
  }, [])

  if (!shouldShowPatientChat(pathname)) {
    return null
  }

  const starterPrompts = [
    t('patientChat.starterRequestForm'),
    t('patientChat.starterAfterSubmit'),
    t('patientChat.starterStatus'),
    t('patientChat.starterPhotos'),
  ]
  const pageContext = getPatientChatPageContext(pathname, t('nav.requestTreatment'), t('footer.checkStatus'))

  const isDraftEmpty = draft.trim().length === 0
  const showStarters = messages.length <= 1
  const latestMessage = messages[messages.length - 1] ?? null
  const latestAssistantMessage = getLatestMessage(messages, 'assistant')
  const latestUserMessage = getLatestMessage(messages, 'user')
  const hasUserMessage = Boolean(latestUserMessage)
  const latestAssistantText = latestAssistantMessage?.content ?? ''
  const latestUserText = latestUserMessage?.content ?? ''
  const isEmergencyContext = isEmergencyChatContext(latestUserText, latestAssistantText)
  const contextualSuggestions =
    hasUserMessage &&
    latestAssistantMessage &&
    latestMessage?.role === 'assistant' &&
    latestAssistantText !== t('patientChat.welcome') &&
    !isSending
      ? getContextualSuggestions({
          latestUserText,
          latestAssistantText,
          locale,
        }).slice(0, 4)
      : []
  const showContextualSuggestions = contextualSuggestions.length > 0
  const panelHeightClass = isExpanded
    ? 'h-[min(82svh,44rem)] max-h-[calc(100svh-6rem)] sm:h-[min(84dvh,46rem)] sm:max-h-[calc(100dvh-4rem)]'
    : 'h-[min(62svh,32rem)] max-h-[calc(100svh-10rem)] sm:h-[min(70dvh,38rem)] sm:max-h-[calc(100dvh-8rem)]'
  const panelWidth = isExpanded ? 'min(38rem, calc(100vw - 32px))' : 'min(24rem, calc(100vw - 32px))'

  function resetConversation() {
    setMessages([])
    setDraft('')
    setErrorMessage('')
    setIsDisclaimerExpanded(false)
  }

  function handleSuggestion(suggestion: QuickSuggestion) {
    if (suggestion.type === 'question') {
      void submitMessage(suggestion.value)
    }
  }

  async function submitMessage(rawMessage: string) {
    const trimmedMessage = rawMessage.trim()

    if (!trimmedMessage || isSending) {
      return
    }

    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'user',
        content: trimmedMessage,
      },
    ])
    setDraft('')
    setErrorMessage('')
    setIsSending(true)

    try {
      const recentMessages = getRecentContextMessages(messages, t('patientChat.welcome'))
      const response = await fetch('/api/chat/patient', {
        method: 'POST',
        headers: {
          'Accept-Language': locale,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
          messages: recentMessages,
          locale,
          pageContext,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { reply?: unknown; error?: unknown }
        | null

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string' ? payload.error : t('patientChat.errorFallback')
        )
      }

      const reply =
        typeof payload?.reply === 'string' && payload.reply.trim()
          ? payload.reply.trim()
          : null

      if (!reply) {
        throw new Error(t('patientChat.errorFallback'))
      }

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: reply,
        },
      ])
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? error.message : t('patientChat.errorFallback')
      )
    } finally {
      setIsSending(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitMessage(draft)
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-live="polite">
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 md:bottom-16 md:right-6">
        {isOpen && (
          <section
            className={`bridgey-panel-enter pointer-events-auto flex ${panelHeightClass} flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)] ring-1 ring-slate-950/5 backdrop-blur`}
            style={{
              width: panelWidth,
            }}
          >
            {/* Header */}
            <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))] px-4 py-3.5 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3.5">
                  <BridgeyAvatar sizeClass="h-14 w-14" className="mt-0.5" />

                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-[15px] font-semibold leading-tight text-slate-900">
                      {t('patientChat.headerTitle')}
                    </h2>
                    <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
                      {t('patientChat.headerSubtitle')}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">
                      {t('patientChat.statusLine')}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExpanded((current) => !current)}
                    aria-label={isExpanded ? t('patientChat.collapseChat') : t('patientChat.expandChat')}
                    title={isExpanded ? t('patientChat.collapseChat') : t('patientChat.expandChat')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label={t('patientChat.closeChat')}
                    title={t('patientChat.closeChat')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-b border-slate-200/70 bg-white px-4 py-2.5 sm:px-5">
              <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-3 py-2 text-[11px] leading-5 text-slate-600">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                  <div className="min-w-0 flex-1">
                    <p>{t('patientChat.safetyNotice')}</p>
                    {isDisclaimerExpanded && (
                      <p className="mt-1 text-slate-500">{t('patientChat.disclaimer')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDisclaimerExpanded((current) => !current)}
                    className="shrink-0 rounded-full px-1.5 text-[11px] font-semibold text-teal-700 transition hover:bg-white/70"
                  >
                    {isDisclaimerExpanded
                      ? t('patientChat.safetyShowLess')
                      : t('patientChat.safetyLearnMore')}
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollContainerRef}
              className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,rgba(240,253,250,0.55),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3.5 sm:px-5"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex max-w-[92%] items-start gap-2.5 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <BridgeyAvatar sizeClass="h-10 w-10" className="mt-0.5 shrink-0" />
                    )}
                    <div
                      className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === 'user'
                          ? 'rounded-br-xl bg-slate-900 text-white'
                          : 'rounded-bl-xl border border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{renderMessageContent(message.content)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2.5">
                    <BridgeyAvatar sizeClass="h-10 w-10" className="mt-0.5 shrink-0" />
                    <div className="inline-flex items-center gap-2 rounded-3xl rounded-bl-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                      <span className="bridgey-typing-dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span>{t('patientChat.loadingReply')}</span>
                    </div>
                  </div>
                </div>
              )}

              {showStarters && (
                <div className="rounded-2xl border border-slate-100 bg-white/80 px-3 py-3 shadow-sm shadow-slate-100/60">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    {t('patientChat.starterLabel')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void submitMessage(prompt)}
                        disabled={isSending}
                        className="rounded-full border border-slate-200/90 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasUserMessage && latestAssistantMessage && !isSending && (
                <div className="rounded-2xl border border-slate-100 bg-white/80 px-3 py-3 shadow-sm shadow-slate-100/60">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[12px] font-medium text-slate-500">
                      {isEmergencyContext
                        ? t('patientChat.emergencyNextStep')
                        : t('patientChat.nextStepPrompt')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t('patientChat.closeChat')}
                    </button>
                  </div>

                  {showContextualSuggestions && (
                    <div className="flex flex-wrap gap-2">
                      {contextualSuggestions.map((suggestion) =>
                        suggestion.type === 'route' && isApprovedPublicRoute(suggestion.value) ? (
                          <Link
                            key={`${suggestion.type}-${suggestion.value}`}
                            href={suggestion.value}
                            className="rounded-full border border-slate-200/90 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                          >
                            {suggestion.label}
                          </Link>
                        ) : (
                          <button
                            key={`${suggestion.type}-${suggestion.value}`}
                            type="button"
                            onClick={() => handleSuggestion(suggestion)}
                            disabled={isSending}
                            className="rounded-full border border-slate-200/90 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {suggestion.label}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
              {errorMessage && (
                <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div className="mb-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={resetConversation}
                  disabled={isSending}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('patientChat.newChat')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  {t('patientChat.closeChat')}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <div className="min-w-0 flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner shadow-slate-100">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value)
                      if (errorMessage) {
                        setErrorMessage('')
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void submitMessage(draft)
                      }
                    }}
                    rows={2}
                    maxLength={MAX_CLIENT_MESSAGE_LENGTH}
                    placeholder={t('patientChat.inputPlaceholder')}
                    aria-label={t('patientChat.inputPlaceholder')}
                    enterKeyHint="send"
                    className="max-h-28 w-full resize-none border-0 bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending || isDraftEmpty}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.75)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">{t('patientChat.sending')}</span>
                    </>
                  ) : (
                    <>
                      <SendHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('patientChat.send')}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
      <style jsx>{`
        .bridgey-panel-enter {
          animation: bridgey-enter 220ms ease-out;
        }

        @keyframes bridgey-enter {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .bridgey-typing-dots {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .bridgey-typing-dots span {
          width: 5px;
          height: 5px;
          border-radius: 9999px;
          background: #0f766e;
          animation: bridgey-dot 1s ease-in-out infinite;
        }

        .bridgey-typing-dots span:nth-child(2) {
          animation-delay: 140ms;
        }

        .bridgey-typing-dots span:nth-child(3) {
          animation-delay: 280ms;
        }

        @keyframes bridgey-dot {
          0%,
          80%,
          100% {
            opacity: 0.35;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  )
}
