'use client'

import { LOCALES, useI18n, type Locale } from '@/lib/i18n'

/**
 * Compact EN / TR switcher for the site header.
 * Renders a pill with each locale code as a button.
 * Active locale is visually highlighted; inactive locale is a ghost button.
 *
 * Adding a new language: add its entry to LOCALES in src/lib/i18n/index.tsx
 * and create the corresponding translation file — no changes needed here.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLocale(l.code as Locale)}
          aria-label={`Switch to ${l.label}`}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            locale === l.code
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
