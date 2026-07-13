'use client'

import { useI18n } from '@/lib/i18n'

export function DataLoadErrorState({ reset, reference }: { reset(): void; reference?: string }) {
  const { locale } = useI18n()
  const isTr = locale === 'tr'
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          {isTr ? 'Veriler şu anda yüklenemiyor' : 'Data cannot be loaded right now'}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {isTr
            ? 'Bu boş bir liste değildir. Lütfen bağlantınızı kontrol edip tekrar deneyin.'
            : 'This is not an empty result. Check your connection and try again.'}
        </p>
        {reference && <p className="mt-3 text-xs text-slate-500">Reference: {reference}</p>}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {isTr ? 'Tekrar dene' : 'Try again'}
        </button>
      </section>
    </main>
  )
}
