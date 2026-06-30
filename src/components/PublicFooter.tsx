'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export default function PublicFooter() {
  const { t } = useI18n()

  return (
    <footer className="bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] py-10 text-slate-300 sm:py-14">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        <div>
          <div className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3">
            <Image
              src="/dentbridge-icon.webp"
              alt="DentBridge icon"
              width={40}
              height={40}
              className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10"
            />
            <div>
              <p className="text-sm font-bold text-white sm:text-base">DentBridge</p>
              <p className="text-[10px] text-slate-400 sm:text-xs">{t('footer.tagline')}</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">
            {t('footer.description')}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-white sm:mb-4 sm:text-base">
            {t('footer.patientServices')}
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-400 sm:space-y-2 sm:text-sm">
            <li>
              <Link href="/patient/request" className="transition hover:text-white">
                {t('footer.requestTreatment')}
              </Link>
            </li>
            <li>
              <Link href="/patient/status" className="transition hover:text-white">
                {t('footer.checkStatus')}
              </Link>
            </li>
            <li>
              <Link href="/about" className="transition hover:text-white">
                {t('footer.aboutDentBridge')}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="transition hover:text-white">
                {t('footer.privacyPolicy')}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="transition hover:text-white">
                {t('footer.termsOfUse')}
              </Link>
            </li>
            <li>
              <Link href="/personal-data-protection-law" className="transition hover:text-white">
                {t('footer.personalDataProtection')}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="transition hover:text-white">
                {t('footer.faq')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-white sm:mb-4 sm:text-base">
            {t('footer.contact')}
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-400 sm:space-y-2 sm:text-sm">
            <li>Istanbul, Türkiye</li>
            <li>
              <a href="mailto:contact@dentbridgetr.com" className="transition hover:text-white">
                {t('footer.email')}
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/dentbridge.tr"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                {t('footer.instagram')}
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/905411072665"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                {t('footer.whatsappSupport')}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 px-4 pt-5 text-xs leading-relaxed text-slate-500 sm:px-6 lg:px-8">
        <p>{t('footer.copyright')}</p>
        <p className="mt-2 max-w-5xl">{t('footer.legalNotice')}</p>
      </div>
    </footer>
  )
}
