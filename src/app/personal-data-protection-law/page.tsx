'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, FileCheck2, Landmark, ShieldCheck } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import PublicPatientChatButton from '@/components/PublicPatientChatButton'
import { useI18n } from '@/lib/i18n'

const LEGAL_LINKS = {
  law: 'https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law',
  communique:
    'https://www.kvkk.gov.tr/Icerik/6637/Communique-On-Principles-And-Procedures-To-Be-Followed-In-Fullfillment-Of-The-Obligation-To-Inform',
  obligation: 'https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-',
  specialCategories: 'https://www.kvkk.gov.tr/Icerik/2051/Ozel-Nitelikli-Kisisel-Veriler',
  explicitConsent: 'https://www.kvkk.gov.tr/Icerik/2037/Acik-Riza-Alirken-Dikkat-Edilecek-Hususlar',
  rights: 'https://www.kvkk.gov.tr/Icerik/2036/Ilgili-Kisinin-Haklari',
  erasure:
    'https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi',
} as const

type Section = {
  eyebrow?: string
  title: string
  body?: ReactNode
  bullets?: string[]
  note?: ReactNode
}

function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

function SectionCard({ section, index }: { section: Section; index: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
          {index + 1}
        </div>
        <div>
          {section.eyebrow && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {section.eyebrow}
            </p>
          )}
          <h2 className="text-lg font-bold text-slate-950">{section.title}</h2>
        </div>
      </div>

      {section.body && <div className="space-y-3 text-sm leading-7 text-slate-600">{section.body}</div>}

      {section.bullets && (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
          {section.bullets.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {section.note && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
          {section.note}
        </div>
      )}
    </article>
  )
}

export default function PersonalDataProtectionLawPage() {
  const { locale } = useI18n()
  const isTr = locale === 'tr'

  const workflowSections: Section[] = isTr
    ? [
        {
          eyebrow: 'A',
          title: 'Hasta Talebi Gönderimi',
          body: (
            <>
              <p>
                Bir hasta veya genel kullanıcı DentBridge üzerinden talep gönderdiğinde, platform talep formunda
                sağlanan kimlik/iletişim bilgileri, tedavi talebi ayrıntıları, klinik şikayet açıklaması, bölüm veya
                tedavi kategorisi, iletişim bilgileri ve kullanıcı tarafından yüklenmesi halinde isteğe bağlı dosya veya
                görüntüleri işleyebilir.
              </p>
              <p>
                Sağlıkla ilgili bilgiler{' '}
                <LegalLink href={LEGAL_LINKS.specialCategories}>özel nitelikli kişisel veri</LegalLink> olarak
                değerlendirilebilir ve daha yüksek özenle işlenmelidir.
              </p>
            </>
          ),
        },
        {
          eyebrow: 'B',
          title: 'Akademik Klinik Değerlendirme ve Fakülte Triyajı',
          body:
            'Gönderilen talepler; akademik klinik değerlendirme, bölüm yönlendirmesi, aciliyet sınıflandırması, uygunluk incelemesi ve denetimli vaka koordinasyonu amacıyla yetkili fakülte üyeleri veya idari kullanıcılar tarafından incelenebilir.',
        },
        {
          eyebrow: 'C',
          title: 'Öğrenci Vaka Talepleri ve Denetimli Koordinasyon',
          body:
            'Bir vaka öğrenci klinik iş akışı için uygun görülürse, sınırlı vaka bilgileri rol tabanlı erişim yetkilerine göre gözetim altındaki son sınıf diş hekimliği öğrencilerine sunulabilir. Öğrenci erişimi yalnızca akademik klinik koordinasyon ve denetimli tedavi iş akışı amacıyla sağlanır.',
        },
        {
          eyebrow: 'D',
          title: 'Öğrenci, Fakülte ve İdari Hesaplar',
          body:
            'Davet edilen öğrenci, fakülte ve idari kullanıcılar için DentBridge; ad, e-posta adresi, rol, giriş durumu, profil bilgileri ve kullanıcının yetkili rolüne göre platform içinde gerçekleştirilen işlemler gibi hesapla ilgili bilgileri işleyebilir.',
        },
        {
          eyebrow: 'E',
          title: 'Öğrenci Planlayıcı ve Eğitsel Klinik Araçlar',
          body:
            'Öğrenci planlayıcı kayıtları ve eğitsel klinik araçların kullanımı yalnızca öğrencinin akademik iş akışını desteklemek amacıyla işlenebilir. Klinik araçlar eğitsel referans niteliğindedir ve fakülte gözetiminin, kurumsal protokollerin veya profesyonel klinik kararların yerine geçmez.',
        },
      ]
    : [
        {
          eyebrow: 'A',
          title: 'Patient Request Submission',
          body: (
            <>
              <p>
                When a patient or public user submits a request through DentBridge, the platform may process information
                provided in the request form, such as identity/contact information, treatment request details, clinical
                concern description, department or treatment category, communication details, and optional uploaded files
                or images if submitted by the user.
              </p>
              <p>
                Health-related information may be considered a{' '}
                <LegalLink href={LEGAL_LINKS.specialCategories}>special category of personal data</LegalLink> and
                should be handled with additional care.
              </p>
            </>
          ),
        },
        {
          eyebrow: 'B',
          title: 'Academic Clinical Review and Faculty Triage',
          body:
            'Submitted requests may be reviewed by authorized faculty or administrative users for academic clinical assessment, department routing, urgency classification, eligibility review, and supervised case coordination.',
        },
        {
          eyebrow: 'C',
          title: 'Student Case Requests and Supervised Coordination',
          body:
            'If a case is considered eligible for the student clinical workflow, limited case information may be made available to supervised senior dental students according to role-based access permissions. Student access is intended only for academic clinical coordination and supervised treatment workflow.',
        },
        {
          eyebrow: 'D',
          title: 'Student, Faculty, and Admin Accounts',
          body:
            'For invited student, faculty, and admin users, DentBridge may process account-related information such as name, email address, role, login status, profile information, and actions performed within the platform according to the user’s authorized role.',
        },
        {
          eyebrow: 'E',
          title: 'Student Planner and Educational Clinical Tools',
          body:
            'Student planner entries and educational clinical tool usage may be processed only to support the student’s academic workflow. Clinical tools are educational references and do not replace faculty supervision, institutional protocols, or professional clinical judgment.',
        },
      ]

  const sections: Section[] = isTr
    ? [
        {
          title: 'Veri sorumlusu ve sorumlu iletişim',
          body: (
            <>
              <p>
                Kurumsal kullanım modeline bağlı olarak, veri sorumlusu veya veri işleyen rolleri ilgili akademik
                kurumla birlikte belirlenebilir. Kullanıcılar, gizlilikle ilgili talepleri için sorumlu DentBridge veya
                kurumsal iletişim kanalı üzerinden başvuru yapabilir.
              </p>
              <p>
                Mevcut iletişim kanalı:{' '}
                <a
                  href="mailto:Dentbridge.tr@gmail.com"
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  Dentbridge.tr@gmail.com
                </a>
              </p>
            </>
          ),
        },
        {
          title: 'Kişisel verileriniz nasıl işlenir?',
          body: 'DentBridge içinde kişisel veriler, yalnızca ilgili akademik klinik koordinasyon sürecinin gerektirdiği iş akışları kapsamında işlenebilir.',
        },
        {
          title: 'Kişisel verileriniz hangi amaçlarla işlenir?',
          body: 'Kişisel veriler aşağıdaki amaçlarla işlenebilir:',
          bullets: [
            'Hasta taleplerinin alınması ve düzenlenmesi',
            'Akademik klinik değerlendirme ve fakülte triyajı',
            'Bir talebin denetimli öğrenci tedavisine uygun olup olmadığının değerlendirilmesi',
            'Fakülte gözetimi altında öğrenci vaka taleplerinin koordine edilmesi',
            'Vaka durumu ve klinik iş akışı aşamalarının yönetilmesi',
            'Öğrencilerin akademik planlama ve klinik eğitim süreçlerinin desteklenmesi',
            'Platform güvenliği ve rol tabanlı erişimin sürdürülmesi',
            'Gizlilik, düzeltme veya silme taleplerinin yanıtlanması',
            'Pilot aşamada platformun iyileştirilmesi',
          ],
        },
        {
          title: 'Kişisel verilerinize kimler erişebilir?',
          body:
            'Kişisel verilere erişim kullanıcı rollerine göre sınırlandırılır. Yetkili fakülte üyeleri ve idari kullanıcılar hasta taleplerini ve vaka iş akışı bilgilerini inceleyebilir. Gözetim altındaki son sınıf diş hekimliği öğrencileri yalnızca onaylanmış akademik klinik iş akışı içinde kendilerine sunulan uygun vaka bilgilerine erişebilir. Genel kullanıcılar dahili vaka verilerine erişemez.',
        },
        {
          title: 'Kişisel verileriniz nasıl aktarılabilir?',
          body:
            'Kişisel veriler yalnızca akademik klinik iş akışı, denetimli vaka koordinasyonu, platform işletimi veya yasal yükümlülükler için gerekli olduğunda paylaşılabilir. Veriler; yetkili fakülte/idari kullanıcılar, uygun vakalar için gözetim altındaki son sınıf diş hekimliği öğrencileri, kullanım modeline bağlı olarak ilgili akademik kurum ve güvenli platform altyapısı için kullanılan teknik hizmet sağlayıcılar tarafından erişilebilir olabilir.',
          note:
            'DentBridge, gerçekten uygulanmadığı sürece MEDULA, E-Nabız, SGK, sigorta faturalandırması, ödeme işleme veya hastane faturalandırma entegrasyonlarına dayandığını belirtmez.',
        },
        {
          title: 'Verileriniz ne kadar süre saklanır?',
          body: (
            <p>
              Kişisel veriler yalnızca akademik klinik koordinasyon amacı, platform işletimi, pilot değerlendirme veya
              geçerli kurumsal/yasal gereklilikler için gerekli olduğu süre boyunca saklanır. Kullanıcılar, sorumlu
              iletişim kanalı üzerinden verilerinin düzeltilmesini veya{' '}
              <LegalLink href={LEGAL_LINKS.erasure}>silinmesini</LegalLink> talep edebilir. Silme talepleri akademik,
              klinik, teknik ve yasal gerekliliklere göre değerlendirilebilir.
            </p>
          ),
        },
        {
          title: 'Kişisel verilerinizle ilgili haklarınız nelerdir?',
          body: (
            <p>
              <LegalLink href={LEGAL_LINKS.rights}>İlgili kişinin hakları</LegalLink> kapsamında kullanıcılar; kişisel
              verilerinin işlenip işlenmediği, işleme amacı, eksik veya yanlış verilerin düzeltilmesi, uygun olduğu
              durumlarda silinmesi veya yok edilmesi, ilgili olduğu durumlarda üçüncü kişilere aktarım hakkında bilgi ve
              ilgili mevzuat kapsamında tanınan diğer haklara ilişkin taleplerde bulunabilir.
            </p>
          ),
          bullets: [
            'Kişisel verilerinin işlenip işlenmediği',
            'İşlenen kişisel verilere ilişkin bilgi',
            'İşleme amacı',
            'Eksik veya yanlış verilerin düzeltilmesi',
            'Uygun olduğu durumlarda silinmesi veya yok edilmesi',
            'İlgili olduğu durumlarda üçüncü kişilere aktarım hakkında bilgi',
            'Taleplerin sorumlu iletişim kanalı üzerinden değerlendirilmesi',
          ],
        },
        {
          title: 'Onay ve bilgilendirme',
          body: (
            <p>
              <LegalLink href={LEGAL_LINKS.explicitConsent}>Açık rıza</LegalLink> talep edildiğinde, belirli bir konuya
              ilişkin, bilgilendirmeye dayalı ve özgür iradeyle verilmiş olmalıdır. DentBridge üzerinden hasta talebi
              göndermek tedavi kabulünü garanti etmez. Onay ve bilgilendirme metinleri, kullanıcıları akademik klinik
              değerlendirme ve denetimli koordinasyon süreci hakkında bilgilendirmeyi amaçlar.
            </p>
          ),
        },
        {
          title: 'Acil durum ve tıbbi bilgilendirme',
          body:
            'DentBridge bir acil durum hizmeti değildir. Platform, acil diş hekimliği veya tıbbi durumlar için kullanılmamalıdır. Acil durumlarda kullanıcılar acil yardım hizmetlerine başvurmalı veya yetkili bir sağlık profesyonelinden derhal yardım almalıdır.',
        },
        {
          title: 'Pilot aşama bildirimi',
          body:
            'DentBridge, akademik, klinik, teknik ve kullanıcı geri bildirimlerine göre geliştirildiği için pilot aşamada değişiklik gösterebilir.',
        },
      ]
    : [
        {
          title: 'Data controller and responsible contact',
          body: (
            <>
              <p>
                Depending on the institutional deployment model, the responsible data controller or data processing roles
                may be determined together with the participating academic institution. Users may contact the responsible
                DentBridge or institutional contact channel for privacy-related requests.
              </p>
              <p>
                Current contact channel:{' '}
                <a
                  href="mailto:Dentbridge.tr@gmail.com"
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  Dentbridge.tr@gmail.com
                </a>
              </p>
            </>
          ),
        },
        {
          title: 'How is your personal data processed?',
          body:
            'Within DentBridge, personal data may be processed only within workflows required for the relevant academic clinical coordination process.',
        },
        {
          title: 'For what purposes is your personal data processed?',
          body: 'Personal data may be processed for the following purposes:',
          bullets: [
            'Receiving and organizing patient requests',
            'Academic clinical review and faculty triage',
            'Determining whether a request may be suitable for supervised student care',
            'Coordinating student case requests under faculty supervision',
            'Managing case status and clinical workflow stages',
            'Supporting student academic planning and clinical education',
            'Maintaining platform security and role-based access',
            'Responding to privacy, correction, or deletion requests',
            'Improving the platform during the pilot stage',
          ],
        },
        {
          title: 'Who may access your personal data?',
          body:
            'Access to personal data is limited according to user roles. Authorized faculty and administrative users may review submitted patient requests and case workflow information. Supervised senior dental students may access only eligible case information made available to them within the approved academic clinical workflow. Public users cannot access internal case data.',
        },
        {
          title: 'How may your personal data be transferred?',
          body:
            'Personal data may be shared only when necessary for the academic clinical workflow, supervised case coordination, platform operation, or legal obligations. Data may be accessible to authorized faculty/admin users, supervised senior dental students for eligible cases, the participating academic institution depending on the deployment model, and technical service providers used for secure platform infrastructure.',
          note:
            'DentBridge does not describe or rely on MEDULA, E-Nabız, SSI, insurance billing, payment processing, or hospital billing integrations unless such integrations are actually implemented.',
        },
        {
          title: 'How long is your data kept?',
          body: (
            <p>
              Personal data is kept only for as long as necessary for the academic clinical coordination purpose,
              platform operation, pilot evaluation, or applicable institutional/legal requirements. Users may request{' '}
              <LegalLink href={LEGAL_LINKS.erasure}>correction or deletion</LegalLink> of their data through the
              responsible contact channel. Deletion requests may be evaluated according to academic, clinical, technical,
              and legal requirements.
            </p>
          ),
        },
        {
          title: 'What are your rights regarding your personal data?',
          body: (
            <p>
              Within the scope of the <LegalLink href={LEGAL_LINKS.rights}>rights of the data subject</LegalLink>, users
              may request information about whether their personal data is processed, the purpose of processing,
              correction of incomplete or inaccurate data, deletion or destruction where applicable, information about
              transfers to third parties where applicable, and other rights provided under the relevant legislation.
            </p>
          ),
          bullets: [
            'Whether their personal data is processed',
            'Information about processed personal data',
            'The purpose of processing',
            'Correction of incomplete or inaccurate data',
            'Deletion or destruction where applicable',
            'Information about transfers to third parties where applicable',
            'Review of requests through the responsible contact channel',
          ],
        },
        {
          title: 'Consent and acknowledgement',
          body: (
            <p>
              Where <LegalLink href={LEGAL_LINKS.explicitConsent}>explicit consent</LegalLink> is requested, it should be
              specific, informed, and freely given. Submitting a patient request through DentBridge does not guarantee
              treatment acceptance. Consent and acknowledgement texts are intended to inform users about the academic
              clinical review and supervised coordination process.
            </p>
          ),
        },
        {
          title: 'Emergency and medical disclaimer',
          body:
            'DentBridge is not an emergency service. The platform must not be used for urgent or emergency dental or medical situations. For emergencies, users should contact emergency services or seek immediate care from a qualified healthcare provider.',
        },
        {
          title: 'Pilot-stage notice',
          body:
            'DentBridge may change during the pilot stage as the platform is improved based on academic, clinical, technical, and user feedback.',
        },
      ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/dentbridge-icon.webp"
              alt="DentBridge"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <div>
              <p className="text-sm font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                {isTr ? 'KVKK Aydınlatma Metni' : 'Personal Data Protection'}
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <LanguageSwitcher />
            <PublicPatientChatButton />
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {isTr ? 'Gizliliğe dön' : 'Back to privacy'}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_52%,#ecfeff_100%)] p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-800 shadow-sm">
                  <Landmark className="h-4 w-4" />
                  {isTr ? 'Akademik klinik koordinasyon' : 'Academic clinical coordination'}
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  {isTr
                    ? 'Kişisel Verilerin Korunması Kanunu / KVKK Aydınlatma Metni'
                    : 'Personal Data Protection Law / KVKK Clarification Text'}
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                  {isTr ? (
                    <>
                      Bu aydınlatma metni, DentBridge’in hasta talebi gönderimi, akademik klinik değerlendirme, fakülte
                      triyajı, öğrenci vaka talepleri, denetimli vaka koordinasyonu ve platform hesap erişimi kapsamındaki
                      kişisel veri işleme süreçleri hakkında kullanıcıları bilgilendirmek amacıyla;{' '}
                      <LegalLink href={LEGAL_LINKS.law}>
                        6698 sayılı Kişisel Verilerin Korunması Kanunu
                      </LegalLink>{' '}
                      ve <LegalLink href={LEGAL_LINKS.obligation}>aydınlatma yükümlülüğü</LegalLink> genel ilkeleri
                      dikkate alınarak hazırlanmıştır.
                    </>
                  ) : (
                    <>
                      This clarification text has been prepared for DentBridge, a faculty-supported academic clinical
                      coordination platform, to inform users about the processing of personal data within the scope of
                      patient request submission, academic clinical review, faculty triage, student case requests,
                      supervised case coordination, and platform account access, in line with the general principles of
                      the <LegalLink href={LEGAL_LINKS.law}>Personal Data Protection Law No. 6698</LegalLink> and the{' '}
                      <LegalLink href={LEGAL_LINKS.obligation}>obligation to inform</LegalLink>.
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white/80 p-4 text-sm leading-6 text-slate-600 shadow-sm lg:max-w-sm">
                <div className="mb-2 flex items-center gap-2 font-bold text-slate-950">
                  <ShieldCheck className="h-4 w-4 text-blue-700" />
                  {isTr ? 'Önemli not' : 'Important note'}
                </div>
                <p>
                  {isTr
                    ? 'DentBridge, denetimli akademik klinik iş akışı içinde kişisel verilerin gizlilik odaklı şekilde işlenmesini desteklemek üzere tasarlanmıştır. Daha geniş kurumsal kullanım öncesinde resmi bir KVKK hukuki incelemesi önerilir.'
                    : 'DentBridge is designed to support privacy-conscious handling of personal data within a supervised academic clinical workflow. Formal KVKK legal review is recommended before wider institutional deployment.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <FileCheck2 className="h-5 w-5 text-blue-700" />
              <p className="mt-2 text-sm font-bold text-slate-950">
                {isTr ? 'Kapsam' : 'Scope'}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {isTr
                  ? 'Hasta talepleri, fakülte değerlendirmesi, öğrenci iş akışı ve platform hesap erişimi.'
                  : 'Patient requests, faculty review, student workflow, and platform account access.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Landmark className="h-5 w-5 text-blue-700" />
              <p className="mt-2 text-sm font-bold text-slate-950">
                {isTr ? 'Yasal referanslar' : 'Legal references'}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {isTr ? (
                  <>
                    <LegalLink href={LEGAL_LINKS.communique}>
                      Aydınlatma Yükümlülüğüne İlişkin Usul ve Esaslar
                    </LegalLink>
                  </>
                ) : (
                  <>
                    <LegalLink href={LEGAL_LINKS.communique}>Communiqué on the Obligation to Inform</LegalLink>
                  </>
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              <p className="mt-2 text-sm font-bold text-slate-950">
                {isTr ? 'Sınır' : 'Limit'}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {isTr
                  ? 'Bu sayfa KVKK sertifikası veya hukuki uygunluk beyanı değildir.'
                  : 'This page is not a KVKK certification or legal compliance statement.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {sections.slice(0, 2).map((section, index) => (
            <SectionCard key={section.title} section={section} index={index} />
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {workflowSections.map((section, index) => (
            <SectionCard key={section.title} section={section} index={index} />
          ))}
        </div>

        <div className="mt-4 grid gap-4">
          {sections.slice(2).map((section, index) => (
            <SectionCard key={section.title} section={section} index={index + 2} />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-950">
            {isTr ? 'Son güncelleme: 26 Haziran 2026' : 'Last updated: June 26, 2026'}
          </p>
        </div>
      </section>
    </main>
  )
}
