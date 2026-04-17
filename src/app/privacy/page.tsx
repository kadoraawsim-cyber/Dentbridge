'use client'

import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Clock3 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function PrivacyPolicyPage() {
  const { locale } = useI18n()
  const isTr = locale === 'tr'

  const sections = isTr
    ? [
        {
          title: 'Toplanan veriler',
          body:
            'Adınız, iletişim bilgileriniz, tedavi talebiniz, yaşınız, uyumlu bölüm seçimi, ağrı skoru, uygunluk tercihi, tıbbi notlar ve yüklediğiniz dosyalar toplanabilir.',
        },
        {
          title: 'Neden toplanır',
          body:
            'Bu bilgiler, talebinizi değerlendirmek, doğru bölüme yönlendirmek, öğrenci eşleştirmesi yapmak ve tedavi koordinasyonunu sağlamak için kullanılır.',
        },
        {
          title: 'Kimler erişebilir',
          body:
            'Fakülte üyeleri ve yetkili sistem yöneticileri vakanızı görebilir. Öğrenciler yalnızca havuzdaki uygun vakaları ve kendilerine atanmış aktif vakaları görebilir.',
        },
        {
          title: 'Yüklenen görseller ve dosyalar',
          body:
            'Yüklediğiniz görseller ve dosyalar özel saklanır. Erişim yalnızca yetkili kullanıcılar için imzalı bağlantılar üzerinden sağlanır.',
        },
        {
          title: 'Veri saklama süresi',
          body:
            'Kayıtlar, klinik süreç ve yasal/kurumsal gereksinimler için gerekli olduğu süre boyunca saklanabilir.',
        },
        {
          title: 'Düzeltme veya silme',
          body:
            'Bilgilerinizde düzeltme veya silme talep etmek için klinik ekiple veya sistem yöneticisiyle iletişime geçebilirsiniz.',
        },
      ]
    : [
        {
          title: 'Data collected',
          body:
            'We may collect your name, contact details, treatment request, age, preferred department, pain score, availability, medical notes, and uploaded files.',
        },
        {
          title: 'Why we collect it',
          body:
            'We use this information to review your request, route it to the right department, match it with a student, and coordinate care.',
        },
        {
          title: 'Who can access it',
          body:
            'Faculty members and authorized system administrators can view your case. Students can only see eligible pool cases and their own approved active cases.',
        },
        {
          title: 'Uploaded images and files',
          body:
            'Uploaded images and files are stored privately. Access is provided only through signed links for authorized users.',
        },
        {
          title: 'How long we keep data',
          body:
            'Records may be kept for as long as needed for the clinical workflow and any legal or institutional requirements.',
        },
        {
          title: 'Correction or deletion',
          body:
            'If you want to correct or delete your information, please contact the clinic team or the system administrator.',
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
                {isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/patient/request"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {isTr ? 'Başvuruya dön' : 'Back to request'}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-teal-50 p-2 text-teal-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                {isTr
                  ? 'DentBridge, başvurunuzu güvenli şekilde işlemek ve klinik koordinasyonu sağlamak için gerekli verileri toplar ve korur.'
                  : 'DentBridge collects and protects the information needed to process your request and coordinate clinical care.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section, index) => (
            <article key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {index + 1}
                </div>
                <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{section.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              {isTr
                ? 'Gerekli olması halinde bu politika güncellenebilir. En güncel sürüm bu sayfada yayınlanır.'
                : 'This policy may be updated when needed. The latest version will always be published on this page.'}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
