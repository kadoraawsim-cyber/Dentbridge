'use client'

import Link from 'next/link'
import { ArrowLeft, CircleHelp } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import PublicPatientChatButton from '@/components/PublicPatientChatButton'

export default function FaqPage() {
  const { t } = useI18n()

  const faqs = [
    {
      question: t('faqPage.items.whatIsDentBridgeQuestion'),
      answer: t('faqPage.items.whatIsDentBridgeAnswer'),
    },
    {
      question: t('faqPage.items.whoWillTreatMeQuestion'),
      answer: t('faqPage.items.whoWillTreatMeAnswer'),
    },
    {
      question: t('faqPage.items.isTreatmentSupervisedQuestion'),
      answer: t('faqPage.items.isTreatmentSupervisedAnswer'),
    },
    {
      question: t('faqPage.items.howDoIRequestTreatmentQuestion'),
      answer: t('faqPage.items.howDoIRequestTreatmentAnswer'),
    },
    {
      question: t('faqPage.items.whatHappensAfterSubmitQuestion'),
      answer: t('faqPage.items.whatHappensAfterSubmitAnswer'),
    },
    {
      question: t('faqPage.items.doINeedToKnowDepartmentQuestion'),
      answer: t('faqPage.items.doINeedToKnowDepartmentAnswer'),
    },
    {
      question: t('faqPage.items.canIUploadPhotosQuestion'),
      answer: t('faqPage.items.canIUploadPhotosAnswer'),
    },
    {
      question: t('faqPage.items.isMyInformationPrivateQuestion'),
      answer: t('faqPage.items.isMyInformationPrivateAnswer'),
    },
    {
      question: t('faqPage.items.howMuchDoesTreatmentCostQuestion'),
      answer: t('faqPage.items.howMuchDoesTreatmentCostAnswer'),
    },
    {
      question: t('faqPage.items.canICheckStatusQuestion'),
      answer: t('faqPage.items.canICheckStatusAnswer'),
    },
    {
      question: t('faqPage.items.whatKindsOfCasesQuestion'),
      answer: t('faqPage.items.whatKindsOfCasesAnswer'),
    },
  ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/dentbridge-icon.png" alt="DentBridge" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-sm font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                {t('faqPage.eyebrow')}
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <LanguageSwitcher />
            <PublicPatientChatButton />
            <Link
              href="/patient/request"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('faqPage.backToRequest')}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-teal-50 p-2 text-teal-700">
              <CircleHelp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('faqPage.title')}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                {t('faqPage.description')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {faqs.map((item) => (
            <article key={item.question} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">{item.question}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
