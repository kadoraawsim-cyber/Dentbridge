'use client'

import { CircleHelp } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import PublicDocumentHeader from '@/components/PublicDocumentHeader'
import PublicFooter from '@/components/PublicFooter'

export default function FaqPage() {
  const { t } = useI18n()

  const faqs = [
    {
      question: t('faqPage.items.whatIsDentBridgeQuestion'),
      answer: t('faqPage.items.whatIsDentBridgeAnswer'),
    },
    {
      question: t('faqPage.items.isDentBridgeClinicQuestion'),
      answer: t('faqPage.items.isDentBridgeClinicAnswer'),
    },
    {
      question: t('faqPage.items.whoWillReviewRequestQuestion'),
      answer: t('faqPage.items.whoWillReviewRequestAnswer'),
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
      question: t('faqPage.items.treatmentGuaranteeQuestion'),
      answer: t('faqPage.items.treatmentGuaranteeAnswer'),
    },
    {
      question: t('faqPage.items.whatHappensAfterSubmitQuestion'),
      answer: t('faqPage.items.whatHappensAfterSubmitAnswer'),
    },
    {
      question: t('faqPage.items.responseTimeQuestion'),
      answer: t('faqPage.items.responseTimeAnswer'),
    },
    {
      question: t('faqPage.items.doINeedToKnowDepartmentQuestion'),
      answer: t('faqPage.items.doINeedToKnowDepartmentAnswer'),
    },
    {
      question: t('faqPage.items.whatInformationShouldIProvideQuestion'),
      answer: t('faqPage.items.whatInformationShouldIProvideAnswer'),
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
      question: t('faqPage.items.canICheckStatusQuestion'),
      answer: t('faqPage.items.canICheckStatusAnswer'),
    },
    {
      question: t('faqPage.items.platformCostQuestion'),
      answer: t('faqPage.items.platformCostAnswer'),
    },
    {
      question: t('faqPage.items.howMuchDoesTreatmentCostQuestion'),
      answer: t('faqPage.items.howMuchDoesTreatmentCostAnswer'),
    },
    {
      question: t('faqPage.items.emergencyQuestion'),
      answer: t('faqPage.items.emergencyAnswer'),
    },
    {
      question: t('faqPage.items.whatKindsOfCasesQuestion'),
      answer: t('faqPage.items.whatKindsOfCasesAnswer'),
    },
    {
      question: t('faqPage.items.canRequestBeRejectedQuestion'),
      answer: t('faqPage.items.canRequestBeRejectedAnswer'),
    },
    {
      question: t('faqPage.items.editOrDeleteInfoQuestion'),
      answer: t('faqPage.items.editOrDeleteInfoAnswer'),
    },
  ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PublicDocumentHeader eyebrow={t('faqPage.eyebrow')} />

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
      <PublicFooter />
    </main>
  )
}
