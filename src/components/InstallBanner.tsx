'use client'

import { useState, useEffect } from 'react'
import { X, Smartphone, Share, MoreVertical } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type Platform = 'android' | 'ios' | null
type BannerState = {
  platform: Platform
  visible: boolean
}

type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const DISMISS_KEY = 'dentbridge-pwa-dismissed'
const HIDDEN_BANNER_STATE: BannerState = { platform: null, visible: false }

function getClientBannerState(): BannerState {
  // Already running in standalone (installed) — nothing to show
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return HIDDEN_BANNER_STATE
  }

  // User previously dismissed
  if (window.localStorage.getItem(DISMISS_KEY) === '1') {
    return HIDDEN_BANNER_STATE
  }

  const ua = window.navigator.userAgent
  const isIOS = /iP(hone|ad|od)/.test(ua)
  // Only show on iOS Safari — Chrome/Firefox iOS cannot install PWAs
  const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  const isAndroid = /Android/.test(ua)

  if (isIOSSafari) {
    return { platform: 'ios', visible: true }
  }

  // Android visibility waits for beforeinstallprompt.
  if (isAndroid) {
    return { platform: 'android', visible: false }
  }

  return HIDDEN_BANNER_STATE
}

export default function InstallBanner() {
  const { t } = useI18n()
  const [{ platform, visible }, setBannerState] = useState<BannerState>(HIDDEN_BANNER_STATE)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    let cancelled = false
    const frameId = window.requestAnimationFrame(() => {
      if (cancelled) return

      const clientState = getClientBannerState()
      setBannerState((current) => (current.visible ? current : clientState))
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setBannerState({ platform: 'android', visible: true })
    }
    const appInstalledHandler = () => {
      setBannerState((current) => ({ ...current, visible: false }))
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', appInstalledHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', appInstalledHandler)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setBannerState((current) => ({ ...current, visible: false }))
  }

  async function handleAndroidInstall() {
    if (deferredPrompt) {
      setInstalling(true)
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setInstalling(false)
      if (outcome === 'accepted') {
        setBannerState((current) => ({ ...current, visible: false }))
        return
      }
      setDeferredPrompt(null)
    }
    // No native prompt available — show manual steps
    setExpanded(true)
  }

  if (!visible || !platform) return null

  return (
    <div className="mx-3 mb-3 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mx-6 sm:mb-4 lg:mx-8">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900">
          <Smartphone className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{t('pwa.bannerTitle')}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{t('pwa.bannerSubtitle')}</p>

          {!expanded && (
            <div className="mt-3 flex flex-wrap gap-2">
              {platform === 'android' && (
                <button
                  type="button"
                  onClick={handleAndroidInstall}
                  disabled={installing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                >
                  {installing ? '…' : t('pwa.installButton')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t('pwa.howToInstall')}
              </button>
            </div>
          )}

          {expanded && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {/* iOS steps */}
              {(platform === 'ios' || platform === 'android') && platform === 'ios' && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <Share className="h-3.5 w-3.5" />
                    {t('pwa.iosStepsTitle')}
                  </p>
                  <ol className="space-y-1 text-xs text-slate-600">
                    {(['iosStep1', 'iosStep2', 'iosStep3', 'iosStep4'] as const).map((k, i) => (
                      <li key={k} className="flex gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                          {i + 1}
                        </span>
                        {t(`pwa.${k}`)}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Android steps */}
              {(platform === 'android') && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <MoreVertical className="h-3.5 w-3.5" />
                    {t('pwa.androidStepsTitle')}
                  </p>
                  <ol className="space-y-1 text-xs text-slate-600">
                    {(['androidStep1', 'androidStep2', 'androidStep3'] as const).map((k, i) => (
                      <li key={k} className="flex gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                          {i + 1}
                        </span>
                        {t(`pwa.${k}`)}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label={t('pwa.dismiss')}
          onClick={dismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
