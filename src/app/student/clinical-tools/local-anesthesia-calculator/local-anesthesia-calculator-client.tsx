'use client'

import { FormEvent, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Info,
  Scale,
  ShieldCheck,
  Syringe,
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n } from '@/lib/i18n'
import { BackToDashboardLink } from '../BackToDashboardLink'

type AnestheticId = 'lidocaineVaso' | 'articaineEpinephrine' | 'mepivacaine' | 'prilocaine'

type AnestheticOption = {
  id: AnestheticId
  labelKey: string
  concentrationMgPerMl: number
  maxDoseMgPerKg: number
  absoluteMaximumMg: number
}

type CalculationResult = {
  anesthetic: AnestheticOption
  volumeMl: number
  patientWeightKg: number
  weightBasedMaxMg: number
  finalMaxMg: number
  mgPerCartridge: number
  maxCartridges: number
}

const ANESTHETICS: AnestheticOption[] = [
  {
    id: 'lidocaineVaso',
    labelKey: 'student.clinicalTools.localAnesthesia.anesthetics.lidocaineVaso',
    concentrationMgPerMl: 20,
    maxDoseMgPerKg: 7,
    absoluteMaximumMg: 500,
  },
  {
    id: 'articaineEpinephrine',
    labelKey: 'student.clinicalTools.localAnesthesia.anesthetics.articaineEpinephrine',
    concentrationMgPerMl: 40,
    maxDoseMgPerKg: 7,
    absoluteMaximumMg: 500,
  },
  {
    id: 'mepivacaine',
    labelKey: 'student.clinicalTools.localAnesthesia.anesthetics.mepivacaine',
    concentrationMgPerMl: 30,
    maxDoseMgPerKg: 6.6,
    absoluteMaximumMg: 400,
  },
  {
    id: 'prilocaine',
    labelKey: 'student.clinicalTools.localAnesthesia.anesthetics.prilocaine',
    concentrationMgPerMl: 40,
    maxDoseMgPerKg: 8,
    absoluteMaximumMg: 500,
  },
]

const CARTRIDGE_VOLUMES = [1.8, 2.0]

function parseDecimal(value: string) {
  return Number(value.replace(',', '.'))
}

function formatOneDecimal(value: number) {
  return value.toFixed(1)
}

function getAnestheticById(id: string) {
  return ANESTHETICS.find((option) => option.id === id) ?? ANESTHETICS[0]
}

export function LocalAnesthesiaCalculatorClient() {
  const { t } = useI18n()
  const [weight, setWeight] = useState('')
  const [anestheticId, setAnestheticId] = useState<AnestheticId>('lidocaineVaso')
  const [volumeMl, setVolumeMl] = useState('1.8')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [result, setResult] = useState<CalculationResult | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!weight.trim()) {
      setErrorKey('student.clinicalTools.localAnesthesia.emptyWeightError')
      setResult(null)
      return
    }

    const patientWeightKg = parseDecimal(weight)

    if (!Number.isFinite(patientWeightKg) || patientWeightKg <= 0) {
      setErrorKey('student.clinicalTools.localAnesthesia.positiveWeightError')
      setResult(null)
      return
    }

    if (patientWeightKg < 5 || patientWeightKg > 300) {
      setErrorKey('student.clinicalTools.localAnesthesia.realisticWeightError')
      setResult(null)
      return
    }

    const anesthetic = getAnestheticById(anestheticId)
    const selectedVolumeMl = parseDecimal(volumeMl)
    const weightBasedMaxMg = patientWeightKg * anesthetic.maxDoseMgPerKg
    const finalMaxMg = Math.min(weightBasedMaxMg, anesthetic.absoluteMaximumMg)
    const mgPerCartridge = anesthetic.concentrationMgPerMl * selectedVolumeMl

    setResult({
      anesthetic,
      volumeMl: selectedVolumeMl,
      patientWeightKg,
      weightBasedMaxMg,
      finalMaxMg,
      mgPerCartridge,
      maxCartridges: finalMaxMg / mgPerCartridge,
    })
    setErrorKey(null)
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

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <BackToDashboardLink label={t('student.clinicalTools.localAnesthesia.backToDashboard')} />

        <div className="mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
            <Syringe className="h-3.5 w-3.5" />
            {t('student.clinicalTools.localAnesthesia.eyebrow')}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t('student.clinicalTools.localAnesthesia.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            {t('student.clinicalTools.localAnesthesia.description')}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-6">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="weight" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {t('student.clinicalTools.localAnesthesia.patientWeightLabel')}
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
                    placeholder={t('student.clinicalTools.localAnesthesia.patientWeightPlaceholder')}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="anesthetic" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {t('student.clinicalTools.localAnesthesia.anestheticLabel')}
                </label>
                <select
                  id="anesthetic"
                  value={anestheticId}
                  onChange={(event) => setAnestheticId(event.target.value as AnestheticId)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {ANESTHETICS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="volume" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {t('student.clinicalTools.localAnesthesia.volumeLabel')}
                </label>
                <select
                  id="volume"
                  value={volumeMl}
                  onChange={(event) => setVolumeMl(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {CARTRIDGE_VOLUMES.map((volume) => (
                    <option key={volume} value={volume}>
                      {formatOneDecimal(volume)} {t('student.clinicalTools.localAnesthesia.unitMl')}
                    </option>
                  ))}
                </select>
              </div>

              {errorKey && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {t(errorKey)}
                </p>
              )}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Calculator className="h-4 w-4" />
                {t('student.clinicalTools.localAnesthesia.calculate')}
              </button>
            </div>
          </form>

          <div className="space-y-4 lg:space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Syringe className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-950">
                  {t('student.clinicalTools.localAnesthesia.resultTitle')}
                </h2>
              </div>

              {result ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 sm:py-4">
                    <p className="text-xs font-semibold text-slate-500">
                      {t('student.clinicalTools.localAnesthesia.maximumRecommendedLimit')}
                    </p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                      {formatOneDecimal(result.finalMaxMg)} {t('student.clinicalTools.localAnesthesia.unitMg')}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500">
                        {t('student.clinicalTools.localAnesthesia.approximateMaxCartridges')}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatOneDecimal(result.maxCartridges)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500">
                        {t('student.clinicalTools.localAnesthesia.mgPerCartridge')}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatOneDecimal(result.mgPerCartridge)}{' '}
                        {t('student.clinicalTools.localAnesthesia.unitMg')}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500">
                        {t('student.clinicalTools.localAnesthesia.selectedAnesthetic')}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {t(result.anesthetic.labelKey)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500">
                        {t('student.clinicalTools.localAnesthesia.cartridgeVolume')}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatOneDecimal(result.volumeMl)} {t('student.clinicalTools.localAnesthesia.unitMl')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold leading-relaxed text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{t('student.clinicalTools.localAnesthesia.useLowestEffectiveDose')}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <Calculator className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {t('student.clinicalTools.localAnesthesia.calculate')}
                  </p>
                </div>
              )}
            </div>

            {result && (
              <>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:rounded-2xl sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <p className="text-base font-bold text-slate-950">
                      {t('student.clinicalTools.localAnesthesia.calculationExplanationTitle')}
                    </p>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="font-semibold text-slate-800">
                          {t('student.clinicalTools.localAnesthesia.weightBasedLimit')}
                        </p>
                        <p className="mt-0.5">
                          {t('student.clinicalTools.localAnesthesia.weightBasedFormula')}: {' '}
                          {formatOneDecimal(result.patientWeightKg)} {t('student.clinicalTools.localAnesthesia.unitKg')}{' '}
                          x {formatOneDecimal(result.anesthetic.maxDoseMgPerKg)}{' '}
                          {t('student.clinicalTools.localAnesthesia.unitMg')}/
                          {t('student.clinicalTools.localAnesthesia.unitKg')} = {' '}
                          {formatOneDecimal(result.weightBasedMaxMg)}{' '}
                          {t('student.clinicalTools.localAnesthesia.unitMg')}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="font-semibold text-slate-800">
                          {t('student.clinicalTools.localAnesthesia.absoluteMaximumLimit')}
                        </p>
                        <p className="mt-0.5">
                          {t('student.clinicalTools.localAnesthesia.absoluteMaximumFormula')}: {' '}
                          {formatOneDecimal(result.anesthetic.absoluteMaximumMg)}{' '}
                          {t('student.clinicalTools.localAnesthesia.unitMg')}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="font-semibold text-slate-800">
                          {t('student.clinicalTools.localAnesthesia.finalLimit')}
                        </p>
                        <p className="mt-0.5">
                          {t('student.clinicalTools.localAnesthesia.finalLimitFormula')}: {' '}
                          {formatOneDecimal(result.finalMaxMg)}{' '}
                          {t('student.clinicalTools.localAnesthesia.unitMg')}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="font-semibold text-slate-800">
                          {t('student.clinicalTools.localAnesthesia.approximateMaxCartridges')}
                        </p>
                        <p className="mt-0.5">
                          {t('student.clinicalTools.localAnesthesia.cartridgesFormula')}: {' '}
                          {formatOneDecimal(result.finalMaxMg)} / {formatOneDecimal(result.mgPerCartridge)} = {' '}
                          {formatOneDecimal(result.maxCartridges)}
                        </p>
                      </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    {t('student.clinicalTools.localAnesthesia.calculationBasis')}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:rounded-2xl sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <Info className="h-4 w-4" />
                    </div>
                    <p className="text-base font-bold text-slate-950">
                      {t('student.clinicalTools.localAnesthesia.whatThisMeansTitle')}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    {t('student.clinicalTools.localAnesthesia.whatThisMeansText')}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:rounded-2xl sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-base font-bold text-slate-950">
                      {t('student.clinicalTools.localAnesthesia.dentalSafetyNotesTitle')}
                    </p>
                  </div>
                  <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-700 sm:grid-cols-2">
                    {[
                      'aspirate',
                      'injectSlowly',
                      'monitorPatient',
                      'multipleAnesthetics',
                      'vasoconstrictor',
                    ].map((key) => (
                      <li key={key} className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                        <span>{t(`student.clinicalTools.localAnesthesia.safetyNotes.${key}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm sm:rounded-2xl sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <p className="text-base font-bold text-amber-950">
                      {t('student.clinicalTools.localAnesthesia.toxicityWarningTitle')}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-amber-900">
                    {t('student.clinicalTools.localAnesthesia.toxicityWarningText')}
                  </p>
                  <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
                    {[
                      'metallicTaste',
                      'perioralNumbness',
                      'dizziness',
                      'tinnitus',
                      'confusion',
                      'muscleTwitching',
                      'seizure',
                      'lossOfConsciousness',
                      'cardiovascularSymptoms',
                    ].map((key) => (
                      <div key={key} className="rounded-lg bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-amber-950">
                        {t(`student.clinicalTools.localAnesthesia.toxicitySigns.${key}`)}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 sm:rounded-2xl sm:p-4">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <p className="font-bold text-slate-900">
                  {t('student.clinicalTools.localAnesthesia.patientReminderTitle')}
                </p>
                <p className="mt-1">{t('student.clinicalTools.localAnesthesia.patientReminderText')}</p>
              </div>
            </div>

            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 sm:rounded-2xl sm:p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">{t('student.clinicalTools.localAnesthesia.educationalWarningTitle')}</p>
                <p className="mt-1">{t('student.clinicalTools.localAnesthesia.educationalWarningText')}</p>
              </div>
            </div>

            <div className="flex gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 sm:rounded-2xl sm:p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">{t('student.clinicalTools.localAnesthesia.clinicalLimitationTitle')}</p>
                <p className="mt-1">{t('student.clinicalTools.localAnesthesia.clinicalLimitationText')}</p>
              </div>
            </div>

            <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 sm:rounded-2xl sm:p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <p className="font-bold text-slate-900">
                  {t('student.clinicalTools.localAnesthesia.legalDisclaimerTitle')}
                </p>
                <p className="mt-1">{t('student.clinicalTools.localAnesthesia.legalDisclaimerText')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
