'use client'

import { FormEvent, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Activity, ArrowLeft, Calculator, CheckCircle2, Info, Ruler, Scale } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n } from '@/lib/i18n'

type BmiCategory = 'underweight' | 'normalWeight' | 'overweight' | 'obesity'

type BmiResult = {
  value: number
  category: BmiCategory
}

function parseDecimal(value: string) {
  return Number(value.replace(',', '.'))
}

function getBmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight'
  if (value < 25) return 'normalWeight'
  if (value < 30) return 'overweight'
  return 'obesity'
}

function getCategoryClass(category: BmiCategory) {
  switch (category) {
    case 'underweight':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    case 'normalWeight':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'overweight':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'obesity':
      return 'border-red-200 bg-red-50 text-red-700'
  }
}

export function BmiCalculatorClient() {
  const { t } = useI18n()
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [result, setResult] = useState<BmiResult | null>(null)
  const [error, setError] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const weightKg = parseDecimal(weight)
    const heightCm = parseDecimal(height)

    if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) {
      setResult(null)
      setError(true)
      return
    }

    const heightM = heightCm / 100
    const value = weightKg / (heightM * heightM)

    setResult({
      value,
      category: getBmiCategory(value),
    })
    setError(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/dentbridge-icon.webp"
              alt="DentBridge"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-slate-400">
                {t('student.nav.clinicalPlatform')}
              </p>
            </div>
          </Link>

          <LanguageSwitcher />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/student/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('student.clinicalTools.bmi.backToDashboard')}
        </Link>

        <div className="mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
            <Activity className="h-3.5 w-3.5" />
            {t('student.clinicalTools.bmi.eyebrow')}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t('student.clinicalTools.bmi.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            {t('student.clinicalTools.bmi.description')}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="weight" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {t('student.clinicalTools.bmi.weightLabel')}
                </label>
                <div className="relative">
                  <Scale className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    placeholder={t('student.clinicalTools.bmi.weightPlaceholder')}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="height" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {t('student.clinicalTools.bmi.heightLabel')}
                </label>
                <div className="relative">
                  <Ruler className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="height"
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    value={height}
                    onChange={(event) => setHeight(event.target.value)}
                    placeholder={t('student.clinicalTools.bmi.heightPlaceholder')}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {t('student.clinicalTools.bmi.validationError')}
                </p>
              )}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Calculator className="h-4 w-4" />
                {t('student.clinicalTools.bmi.calculate')}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Calculator className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">
                  {t('student.clinicalTools.bmi.resultTitle')}
                </h2>
              </div>

              {result ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500">
                      {t('student.clinicalTools.bmi.bmiValue')}
                    </p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                      {result.value.toFixed(1)}
                    </p>
                  </div>

                  <div className={`rounded-xl border px-4 py-3 ${getCategoryClass(result.category)}`}>
                    <p className="text-xs font-semibold opacity-80">
                      {t('student.clinicalTools.bmi.category')}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      {t(`student.clinicalTools.bmi.${result.category}`)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <Calculator className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {t('student.clinicalTools.bmi.calculate')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 sm:rounded-2xl sm:p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('student.clinicalTools.bmi.note')}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
