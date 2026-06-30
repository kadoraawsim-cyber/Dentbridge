'use client'

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react'
import { en } from './translations/en'
import { tr } from './translations/tr'

// ── Supported locales ────────────────────────────────────────────────────────
// To add Arabic or Persian: add the locale code here and create its translation
// file in ./translations/, then add it to the `translations` map below.
export type Locale = 'en' | 'tr'

export const LOCALES: { code: Locale; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'EN', dir: 'ltr' },
  { code: 'tr', label: 'TR', dir: 'ltr' },
  // Future RTL additions — uncomment and add translation files:
  // { code: 'ar', label: 'AR', dir: 'rtl' },
  // { code: 'fa', label: 'FA', dir: 'rtl' },
]

const translations: Record<Locale, typeof en> = { en, tr }
const LOCALE_STORAGE_KEY = 'dentbridge_locale'
const LOCALE_CHANGE_EVENT = 'dentbridge_locale_change'

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
  return saved && translations[saved] ? saved : 'en'
}

function getServerLocaleSnapshot(): Locale {
  return 'en'
}

function subscribeToLocaleStore(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCALE_STORAGE_KEY) {
      onStoreChange()
    }
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(LOCALE_CHANGE_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(LOCALE_CHANGE_EVENT, onStoreChange)
  }
}

// ── Context ──────────────────────────────────────────────────────────────────
interface I18nContextValue {
  locale: Locale
  dir: 'ltr' | 'rtl'
  setLocale: (locale: Locale) => void
  /** Resolves a dot-separated key, e.g. t('nav.studentPortal') */
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocaleStore,
    getStoredLocale,
    getServerLocaleSnapshot
  )

  // Sync <html lang> and dir attributes whenever locale changes
  useEffect(() => {
    const localeConfig = LOCALES.find((l) => l.code === locale)
    document.documentElement.lang = locale
    document.documentElement.dir = localeConfig?.dir ?? 'ltr'
  }, [locale])

  function setLocale(l: Locale) {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, l)
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT))
  }

  function t(key: string): string {
    const parts = key.split('.')
    let node: unknown = translations[locale]
    for (const part of parts) {
      if (typeof node === 'object' && node !== null) {
        node = (node as Record<string, unknown>)[part]
      } else {
        // Key not found — fall back to English, then to the raw key
        let fallback: unknown = translations.en
        for (const p of parts) {
          if (typeof fallback === 'object' && fallback !== null) {
            fallback = (fallback as Record<string, unknown>)[p]
          } else {
            return key
          }
        }
        return typeof fallback === 'string' ? fallback : key
      }
    }
    return typeof node === 'string' ? node : key
  }

  const dir = LOCALES.find((l) => l.code === locale)?.dir ?? 'ltr'

  return (
    <I18nContext.Provider value={{ locale, dir, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within <LanguageProvider>')
  return ctx
}
