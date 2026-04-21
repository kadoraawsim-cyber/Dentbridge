'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Loader2, Minus, SendHorizontal } from 'lucide-react'
import type { PatientChatPageContext, PublicPatientPageId } from '@/lib/chat/patient-site-context'
import { useI18n } from '@/lib/i18n'

const MAX_CLIENT_MESSAGE_LENGTH = 800
const BRIDGEY_AVATAR_SRC = '/new_avatar_logo-removebg-preview.png'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

function shouldShowPatientChat(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/faq' ||
    pathname === '/privacy' ||
    pathname.startsWith('/patient/')
  )
}

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
  }

  if (pathname === '/') {
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

  return null
}

export default function PublicPatientChatWidget() {
  const pathname = usePathname()
  const { t, locale } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showLauncherHint, setShowLauncherHint] = useState(true)
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
    if (isOpen || !showLauncherHint) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowLauncherHint(false)
    }, 3200)

    return () => window.clearTimeout(timeoutId)
  }, [isOpen, showLauncherHint])

  if (!shouldShowPatientChat(pathname)) {
    return null
  }

  const starterPrompts = [
    t('patientChat.starterRequestForm'),
    t('patientChat.starterAfterSubmit'),
    t('patientChat.starterStatus'),
    t('patientChat.starterPhotos'),
  ]
  const pageContext = getPatientChatPageContext(pathname, t('nav.requestTreatment'), t('cta.checkStatus'))

  const isDraftEmpty = draft.trim().length === 0
  const showStarters = messages.length <= 1

  function resetConversation() {
    setMessages([])
    setDraft('')
    setErrorMessage('')
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
      const response = await fetch('/api/chat/patient', {
        method: 'POST',
        headers: {
          'Accept-Language': locale,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
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
            className="bridgey-panel-enter pointer-events-auto flex h-[min(62dvh,32rem)] max-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)] ring-1 ring-slate-950/5 backdrop-blur sm:h-[min(70dvh,38rem)] sm:max-h-[calc(100dvh-8rem)]"
            style={{
              width: 'min(24rem, calc(100vw - 32px))',
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
                    <button
                      type="button"
                      onClick={resetConversation}
                      disabled={isSending}
                      className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('patientChat.newChat')}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={t('patientChat.close')}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                >
                  <Minus className="h-4 w-4" />
                </button>
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
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2.5">
                    <BridgeyAvatar sizeClass="h-10 w-10" className="mt-0.5 shrink-0" />
                    <div className="inline-flex items-center gap-2 rounded-3xl rounded-bl-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                      {t('patientChat.loadingReply')}
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
            </div>

            {/* Input */}
            <div className="border-t border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
              {errorMessage && (
                <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </div>
              )}

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

        {/* Closed launcher */}
        {!isOpen && (
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-expanded={false}
              aria-label={t('patientChat.fabOpen')}
              className="bridgey-fab-float group relative inline-flex items-center justify-center rounded-full bg-transparent transition hover:scale-[1.05]"
            >
              <span
                className={`pointer-events-none absolute bottom-full mb-2 rounded-full bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-sm backdrop-blur transition duration-200 ${
                  showLauncherHint ? 'opacity-100 translate-y-0' : 'translate-y-1 opacity-0'
                } group-hover:translate-y-0 group-hover:opacity-100`}
              >
                {t('patientChat.teaser')}
              </span>
              <BridgeyAvatar sizeClass="h-20 w-20" />
            </button>
          </div>
        )}
      </div>
      <style jsx>{`
        .bridgey-fab-float {
          animation: bridgey-float 6s ease-in-out infinite;
        }

        .bridgey-panel-enter {
          animation: bridgey-enter 220ms ease-out;
        }

        @keyframes bridgey-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
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
      `}</style>
    </div>
  )
}
