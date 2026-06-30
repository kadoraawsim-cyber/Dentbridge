'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ExternalLink, FileText, ShieldCheck } from 'lucide-react'
import PublicDocumentHeader from '@/components/PublicDocumentHeader'
import PublicFooter from '@/components/PublicFooter'
import { useI18n } from '@/lib/i18n'

const KVKK_DATA_SECURITY_EN =
  'https://www.kvkk.gov.tr/Icerik/6601/Obligations-Concerning-Data-Security-'
const KVKK_DATA_SECURITY_TR =
  'https://www.kvkk.gov.tr/Icerik/2040/Veri-Guvenligine-Iliskin-Yukumlulukler'

type TermsSection = {
  title: string
  body: ReactNode
}

function ExternalLegalLink({ href, children }: { href: string; children: ReactNode }) {
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

export default function TermsOfUsePage() {
  const { locale } = useI18n()
  const isTr = locale === 'tr'

  const intro = isTr ? (
    <>
      <p>
        Bu Kullanım Şartları, DentBridge platformunun kullanım kurallarını açıklar. Platform, bir diş hekimliği
        fakültesi ortamında hastalar, diş hekimliği öğrencileri, fakülte üyeleri ve yetkili personel arasında akademik
        klinik koordinasyonu desteklemek üzere tasarlanmıştır.
      </p>
      <p>
        DentBridge bağımsız bir diş kliniği değildir, acil durum hizmeti değildir ve bir diş hekiminin, fakülte üyesinin
        veya yetkili sağlık kurumunun klinik kararının yerine geçmez.
      </p>
    </>
  ) : (
    <>
      <p>
        These Terms of Use explain the rules for using DentBridge. The platform is designed to support academic clinical
        coordination between patients, dental students, faculty members, and authorized personnel within a dental faculty
        setting.
      </p>
      <p>
        DentBridge is not an independent dental clinic, is not an emergency service, and does not replace the clinical
        judgment of a dentist, faculty member, or qualified healthcare institution.
      </p>
    </>
  )

  const sections: TermsSection[] = isTr
    ? [
        {
          title: 'Platformun Amacı',
          body: (
            <>
              <p>
                DentBridge bir akademik klinik koordinasyon platformudur. Amacı; hasta taleplerinin düzenlenmesini,
                vakaların ilk uygunluk değerlendirmesini, yetkili personel tarafından triyaj sürecini, öğrenci vaka
                taleplerini ve fakülte gözetimi altında klinik iş akışı aşamalarının takibini desteklemektir.
              </p>
              <p>
                Platform eğitimsel ve klinik süreci destekler; ancak fakülte prosedürlerinin, fakülte kararlarının veya
                yetkili kişilerin mesleki sorumluluğunun yerine geçmez.
              </p>
            </>
          ),
        },
        {
          title: 'Fikri Mülkiyet ve Özel Platform Hakları',
          body: (
            <>
              <p>
                DentBridge™, Waseem Kadura odia tarafından kurulan özel mülkiyete ait bir dental teknoloji platformudur.
                DentBridge adı, platform kimliği, dijital konsepti, tasarımı, kullanıcı arayüzü, iş akışları, içerikleri,
                dokümantasyonu, ekran görüntüleri, yazılım yapısı, kodu ve ilgili materyalleri DentBridge ve kurucusu
                tarafından sahiplenilmekte, kontrol edilmekte ve korunmaktadır.
              </p>
              <p>
                DentBridge’in geliştirme, sahiplik ve dijital kayıtları 11 Kasım 2025 tarihine kadar uzanmaktadır. Bu
                platform açık kaynaklı değildir, kamu malı değildir ve önceden yazılı izin alınmadan kopyalama, taklit
                etme, çoğaltma, değiştirme, kamuya sunma, ticari kullanım, akademik proje olarak sunma, portföy kullanımı
                veya üçüncü kişiler tarafından yayınlama amacıyla kullanılamaz.
              </p>
              <p>
                DentBridge adının, platform kimliğinin, konseptinin, tasarımının, iş akışlarının, ekran görüntülerinin,
                içeriklerinin, kodunun, dokümantasyonunun veya karışıklığa yol açabilecek benzer bir ad, platform ya da
                sunumun izinsiz kullanımı kesinlikle yasaktır.
              </p>
              <p>
                DentBridge; web siteleri, sosyal medya, freelance platformları, kod depoları, portföyler, akademik
                projeler ve kamuya açık arama sonuçları dahil olmak üzere kendi adı, kimliği ve platform materyallerinin
                izinsiz kullanımını aktif olarak takip eder.
              </p>
              <p>
                İhlaller; derhal içerik kaldırma talepleri, platform bildirimleri, ihtar süreçleri, hukuki talepler,
                tazminat talepleri, hukuki masrafların tahsili ve DentBridge’in fikri mülkiyetini, ticari kimliğini,
                itibarını, ticari çıkarlarını ve uluslararası düzeyde saklı haklarını korumaya yönelik diğer işlemlerle
                sonuçlanabilir.
              </p>
              <p>Tüm haklar uluslararası düzeyde açıkça saklıdır.</p>
            </>
          ),
        },
        {
          title: 'Acil Durumlar',
          body: (
            <>
              <p>DentBridge tıbbi veya diş hekimliği acil durumları için kullanılmamalıdır.</p>
              <p>
                Şiddetli ağrı, belirgin şişlik, kanama, nefes almada güçlük, travma, yayılan enfeksiyon veya başka
                herhangi bir acil durumda kullanıcılar derhal acil yardım hizmetlerine, bir hastaneye, acil diş
                kliniğine veya yetkili bir sağlık profesyoneline başvurmalıdır.
              </p>
              <p>DentBridge üzerinden talep göndermek anında yanıt verileceğini garanti etmez.</p>
            </>
          ),
        },
        {
          title: 'Platformdaki Bilgi ve Yönlendirmelerin Sınırları',
          body: (
            <>
              <p>
                DentBridge üzerinden sunulan bilgiler yalnızca akademik klinik iş akışı içinde koordinasyon, eğitim,
                açıklama ve destek amacıyla sağlanır.
              </p>
              <p>
                Platform tıbbi tanı, tedavi planlaması, kişisel tıbbi tavsiye veya klinik karar vermez. Muayene, tedavi
                kabulü, tedavi türü veya takip süreciyle ilgili her karar, fakülte gözetimi altında yetkili kişiler
                tarafından verilmelidir.
              </p>
            </>
          ),
        },
        {
          title: 'Hasta Talepleri ve Tedavi Kabulü',
          body: (
            <>
              <p>
                DentBridge üzerinden tedavi talebi göndermek, vakanın tedaviye kabul edileceğini, bir öğrenciye
                atanacağını veya akademik klinik ortam için uygun bulunacağını garanti etmez.
              </p>
              <p>
                Her talep yetkili kişiler tarafından incelenebilir. Bazı vakalar reddedilebilir, beklemede kalabilir veya
                gözetimli öğrenci tedavisine uygun değilse başka bir tıbbi veya diş hekimliği hizmet sağlayıcısına
                yönlendirilebilir.
              </p>
              <p>
                Bir vaka eğitim ortamı için uygun görülürse, sınırlı vaka bilgileri klinik koordinasyon amacıyla son
                sınıf diş hekimliği öğrencilerinin erişimine sunulabilir. Herhangi bir tedavi sağlanacaksa, bu tedavi
                yetkili fakülte üyelerinin gözetimi altında ve fakülte prosedürlerine uygun olarak gerçekleştirilmelidir.
              </p>
            </>
          ),
        },
        {
          title: 'Talep Gönderen Hasta veya Kullanıcının Sorumluluğu',
          body: (
            <>
              <p>
                Kullanıcılar, DentBridge üzerinden talep gönderirken iletişim bilgileri, şikayetin açıklaması, ilgili
                tıbbi bilgiler ve yüklenmesi halinde dosya veya görüntüler dahil olmak üzere doğru, güncel ve mümkün
                olduğunca eksiksiz bilgi sağlamaktan sorumludur.
              </p>
              <p>
                Yanlış, eksik veya yanıltıcı bilgi verilmesi, talebin doğru şekilde değerlendirilmesini etkileyebilir,
                inceleme sürecini geciktirebilir veya talebin akademik klinik ortam için uygun bulunmamasına neden
                olabilir.
              </p>
              <p>
                Kullanıcılar, uygun yetki olmadan başka bir kişiye ait bilgileri göndermemeli ve talebin
                değerlendirilmesiyle ilgili olmayan dosya, görüntü veya ayrıntıları yüklememelidir.
              </p>
            </>
          ),
        },
        {
          title: 'Hesap Erişimi ve Yetkili Kullanıcılar',
          body: (
            <>
              <p>
                Platforma erişim yalnızca kullanıcıların rol ve sorumluluklarına göre yetkilendirilmiş kişilere sağlanır;
                bunlar öğrenciler, fakülte üyeleri ve görevlendirilmiş yetkilendirilmiş idari personel olabilir.
              </p>
              <p>
                Her kullanıcı yalnızca onaylanmış akademik klinik iş akışı için gerekli bilgilere erişebilir. Kullanıcı
                hesapları kişiseldir ve devredilemez.
              </p>
              <p>
                Kullanıcılar giriş bilgilerini, şifrelerini, erişim bağlantılarını veya platformdaki bilgileri yetkisiz
                kişilerle paylaşmamalıdır.
              </p>
              <p>
                Bir hesabın paylaşılması, kullanıcının erişimine sunulmamış bilgilere erişmeye çalışılması veya
                kişisel/klinik bilgilerin yetkisiz bir kişiye aktarılması; hastaların ve kullanıcıların gizliliğine zarar
                verebilir, bu Kullanım Şartlarını ihlal edebilir ve geçerli hukuk ile{' '}
                <ExternalLegalLink href={KVKK_DATA_SECURITY_TR}>
                  KVKK kapsamındaki veri güvenliği ilkeleri
                </ExternalLegalLink>{' '}
                doğrultusunda erişim kısıtlamalarına, kurumsal işlemlere veya hukuki sonuçlara yol açabilir.
              </p>
            </>
          ),
        },
        {
          title: 'Gizlilik ve Bilgilerin Kullanımı',
          body: (
            <>
              <p>
                DentBridge, akademik klinik koordinasyon, uygunluk değerlendirmesi, fakülte gözetimi ve klinik iş akışı
                yönetimi amacıyla kişisel bilgileri ve hasta talepleriyle ilgili bilgileri işler.
              </p>
              <p>
                Kişisel bilgiler,{' '}
                <Link href="/privacy" className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline">
                  Gizlilik Politikası
                </Link>{' '}
                ve{' '}
                <Link
                  href="/personal-data-protection-law"
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  KVKK / Kişisel Verilerin Korunması aydınlatma sayfasına
                </Link>{' '}
                uygun olarak ele alınır. Kullanıcıların hangi bilgilerin toplandığını, neden toplandığını, kimlerin
                erişebileceğini ve düzeltme veya silme taleplerinin nasıl iletilebileceğini anlamak için bu belgeleri
                incelemeleri önerilir.
              </p>
            </>
          ),
        },
        {
          title: 'Eğitsel Araçlar ve Destekleyici İçerikler',
          body: (
            <>
              <p>
                Platformda bulunan klinik veya eğitsel araçlar; hesaplayıcılar, bağlantılar, öğrenme içerikleri veya
                dijital asistanlar dahil olmak üzere yalnızca eğitsel ve destekleyici kullanım amacıyla sunulur.
              </p>
              <p>
                Bu araçlar klinik karar verme sürecinin tek dayanağı olarak kullanılmamalıdır. Öğrenciler fakülte
                yönlendirmelerine, kurumsal protokollere, eğitmen talimatlarına ve yetkili profesyonel klinik
                değerlendirmeye uymalıdır.
              </p>
            </>
          ),
        },
        {
          title: 'Pilot Aşama ve Güncellemeler',
          body: (
            <>
              <p>
                DentBridge pilot veya kontrollü uygulama aşamasındadır. Bazı özellikler, metinler, iş akışları veya
                platform yapıları akademik, klinik, teknik ve kullanıcı geri bildirimlerine göre zaman içinde
                güncellenebilir.
              </p>
              <p>
                Bu Kullanım Şartlarında yapılan güncellemelerden sonra platformun kullanılmaya devam edilmesi, geçerli
                olduğu durumlarda güncellenmiş şartların kabul edildiği anlamına gelir.
              </p>
            </>
          ),
        },
      ]
    : [
        {
          title: 'Purpose of the Platform',
          body: (
            <>
              <p>
                DentBridge is an academic clinical coordination platform. Its purpose is to support the organization of
                patient requests, initial case suitability review, triage by authorized personnel, student case requests,
                and tracking of clinical workflow stages under faculty supervision.
              </p>
              <p>
                The platform supports the educational and clinical process, but it does not replace faculty procedures,
                faculty decisions, or the professional responsibility of qualified personnel.
              </p>
            </>
          ),
        },
        {
          title: 'Intellectual Property and Proprietary Platform',
          body: (
            <>
              <p>
                DentBridge™ is a proprietary dental technology platform founded by Waseem Kadura odia. The DentBridge
                name, platform identity, digital concept, design, user interface, workflows, content, documentation,
                screenshots, software structure, code, and related materials are owned, controlled, and protected by
                DentBridge and its founder.
              </p>
              <p>
                DentBridge has documented development, ownership, and digital records dating back to 11 November 2025.
                The platform is not open-source, public-domain, or available for copying, imitation, reproduction,
                modification, public presentation, commercial use, academic submission, portfolio use, or third-party
                publication without prior written authorization.
              </p>
              <p>
                Unauthorized use of the DentBridge name, platform identity, concept, design, workflows, screenshots,
                content, code, documentation, or any confusingly similar name, platform, or presentation is strictly
                prohibited.
              </p>
              <p>
                DentBridge actively monitors unauthorized use of its name, identity, and platform materials across
                websites, social media, freelance platforms, repositories, portfolios, academic projects, and public
                search results.
              </p>
              <p>
                Violations may result in immediate takedown requests, platform reports, cease-and-desist notices, legal
                claims, claims for damages, recovery of legal costs, and further action to protect DentBridge’s
                intellectual property, business identity, reputation, commercial interests, and internationally reserved
                rights.
              </p>
              <p>All rights are expressly reserved internationally.</p>
            </>
          ),
        },
        {
          title: 'Emergency Situations',
          body: (
            <>
              <p>DentBridge must not be used for medical or dental emergencies.</p>
              <p>
                In cases of severe pain, significant swelling, bleeding, difficulty breathing, trauma, spreading
                infection, or any other urgent condition, users should immediately contact emergency services, a
                hospital, an emergency dental clinic, or a qualified healthcare professional.
              </p>
              <p>Submitting a request through DentBridge does not guarantee an immediate response.</p>
            </>
          ),
        },
        {
          title: 'Limits of Information and Advice on the Platform',
          body: (
            <>
              <p>
                The information available through DentBridge is intended only for coordination, education, explanation,
                and support within an academic clinical workflow.
              </p>
              <p>
                The platform does not provide medical diagnosis, treatment planning, personal medical advice, or clinical
                decision-making. Any decision regarding examination, treatment acceptance, treatment type, or follow-up
                care must be made by qualified personnel under faculty supervision.
              </p>
            </>
          ),
        },
        {
          title: 'Patient Requests and Treatment Acceptance',
          body: (
            <>
              <p>
                Submitting a treatment request through DentBridge does not guarantee that the case will be accepted for
                treatment, assigned to a student, or considered suitable for an academic clinical setting.
              </p>
              <p>
                Each request may be reviewed by authorized personnel. Some cases may be rejected, remain pending, or be
                referred to another medical or dental provider if they are not suitable for supervised student care.
              </p>
              <p>
                If a case is considered suitable for the educational setting, limited case information may be made
                available to senior dental students for clinical coordination. Any treatment, if provided, must take place
                under the supervision of qualified faculty members and according to faculty procedures.
              </p>
            </>
          ),
        },
        {
          title: 'Responsibility of Patients or Users Submitting a Request',
          body: (
            <>
              <p>
                Users are responsible for providing accurate, current, and complete information when submitting a request
                through DentBridge, including contact details, description of the concern, relevant medical information,
                and files or images if uploaded.
              </p>
              <p>
                Providing incorrect, incomplete, or misleading information may affect the ability to review the request
                properly, delay the review process, or result in the request being considered unsuitable for the academic
                clinical setting.
              </p>
              <p>
                Users should not submit information about another person without appropriate authorization, and should not
                upload files, images, or details that are not relevant to the review of the request.
              </p>
            </>
          ),
        },
        {
          title: 'Account Access and Authorized Users',
          body: (
            <>
              <p>
                Access to the platform is provided only to authorized users according to their role and responsibilities,
                such as students, faculty members, and designated authorized administrative personnel.
              </p>
              <p>
                Each user may access only the information required for the approved academic clinical workflow. User
                accounts are personal and non-transferable.
              </p>
              <p>
                Users must not share login credentials, passwords, access links, or information from the platform with any
                unauthorized person.
              </p>
              <p>
                Sharing an account, attempting to access information not intended for the user, or transferring personal
                or clinical information to an unauthorized party may harm the privacy of patients and users, violate these
                Terms of Use, and lead to access restrictions, institutional measures, or legal consequences in accordance
                with applicable law and{' '}
                <ExternalLegalLink href={KVKK_DATA_SECURITY_EN}>data security principles under KVKK</ExternalLegalLink>.
              </p>
            </>
          ),
        },
        {
          title: 'Privacy and Use of Information',
          body: (
            <>
              <p>
                DentBridge processes personal information and information related to patient requests for academic
                clinical coordination, suitability review, faculty supervision, and clinical workflow management.
              </p>
              <p>
                Personal information is handled according to the{' '}
                <Link href="/privacy" className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline">
                  Privacy Policy
                </Link>{' '}
                and the{' '}
                <Link
                  href="/personal-data-protection-law"
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  KVKK / Personal Data Protection clarification page
                </Link>
                . Users are encouraged to review these documents to understand what information is collected, why it is
                collected, who may access it, and how correction or deletion requests may be submitted.
              </p>
            </>
          ),
        },
        {
          title: 'Educational Tools and Supporting Content',
          body: (
            <>
              <p>
                Clinical or educational tools available on the platform, including calculators, links, learning content,
                or digital assistants, are intended for educational and supportive use only.
              </p>
              <p>
                These tools must not be used as the sole basis for clinical decision-making. Students must follow faculty
                guidance, institutional protocols, instructor instructions, and qualified professional clinical judgment.
              </p>
            </>
          ),
        },
        {
          title: 'Pilot Stage and Updates',
          body: (
            <>
              <p>
                DentBridge is in a pilot or controlled implementation stage. Some features, texts, workflows, or platform
                structures may be updated over time according to academic, clinical, technical, and user feedback.
              </p>
              <p>
                Continued use of the platform after updates to these Terms of Use constitutes acceptance of the updated
                terms where applicable.
              </p>
            </>
          ),
        },
      ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PublicDocumentHeader eyebrow={isTr ? 'Kullanım Şartları' : 'Terms of Use'} />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-teal-50 p-2 text-teal-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isTr ? 'Kullanım Şartları' : 'Terms of Use'}
              </h1>
              <div className="mt-2 max-w-3xl space-y-3 text-sm leading-relaxed text-slate-600">
                {intro}
              </div>
            </div>
          </div>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-2">
          {sections.map((section, index) => (
            <article key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {index + 1}
                </div>
                <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-slate-600">{section.body}</div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              {isTr
                ? 'Bu sayfa, DentBridge platformunun kullanım şartlarını açıklar ve hukuki uygunluk beyanı niteliği taşımaz.'
                : 'This page explains the DentBridge platform terms of use and is not a legal compliance statement.'}
            </p>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  )
}
