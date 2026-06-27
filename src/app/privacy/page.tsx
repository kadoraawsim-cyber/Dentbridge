'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ShieldCheck, Clock3 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import PublicDocumentHeader from '@/components/PublicDocumentHeader'
import PublicFooter from '@/components/PublicFooter'

type PrivacySection = {
  title: string
  body: ReactNode
  bullets?: string[]
  afterBullets?: string
}

const PRIVACY_EMAIL = 'Dentbridge.tr@gmail.com'

export default function PrivacyPolicyPage() {
  const { locale } = useI18n()
  const isTr = locale === 'tr'

  const intro = isTr ? (
    <>
      <p>
        Bu Gizlilik Politikası, DentiBridge’in akademik klinik koordinasyon platformu kapsamında bilgileri nasıl
        topladığını, kullandığını, sakladığını ve koruduğunu açıklar.
      </p>
      <p>
        DentiBridge; hasta taleplerinin düzenlenmesini, vakaların ilk uygunluk değerlendirmesini, fakülte gözetimini,
        son sınıf diş hekimliği öğrencileriyle koordinasyonu ve denetimli bir eğitim ortamında klinik iş akışının
        yönetilmesini desteklemek üzere tasarlanmıştır.
      </p>
      <p>
        Bu Gizlilik Politikası, DentiBridge platformunun kullanımına ilişkindir. Türkiye’deki kişisel verilerin
        korunması ilkeleri kapsamında kişisel verilerin işlenmesine ilişkin daha geniş açıklama,{' '}
        <Link
          href="/personal-data-protection-law"
          className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
        >
          KVKK / Kişisel Verilerin Korunması aydınlatma sayfasında
        </Link>{' '}
        yer almaktadır.
      </p>
    </>
  ) : (
    <>
      <p>
        This Privacy Policy explains how DentiBridge collects, uses, stores, and protects information within an academic
        clinical coordination platform.
      </p>
      <p>
        DentiBridge is designed to support the organization of patient requests, initial case suitability review, faculty
        supervision, coordination with senior dental students, and clinical workflow management within a supervised
        educational setting.
      </p>
      <p>
        This Privacy Policy applies to the use of the DentiBridge platform. A broader explanation of personal data
        processing under Turkish personal data protection principles is available in the{' '}
        <Link
          href="/personal-data-protection-law"
          className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
        >
          KVKK / Personal Data Protection clarification page
        </Link>
        .
      </p>
    </>
  )

  const sections: PrivacySection[] = isTr
    ? [
        {
          title: 'Toplayabileceğimiz Bilgiler',
          body:
            'Bir kullanıcı DentiBridge üzerinden talep gönderdiğinde, platform talep formunda sağlanan aşağıdaki bilgileri toplayabilir:',
          bullets: [
            'Ad ve iletişim bilgileri',
            'Talebin değerlendirilmesi için gerekli yaş veya temel arka plan bilgileri',
            'Talep türü veya tercih edilen diş hekimliği bölümü',
            'Şikayetin ya da başvuru nedeninin açıklaması',
            'Kullanıcının paylaşmayı tercih ettiği tıbbi veya diş hekimliği bilgileri',
            'Koordinasyon için gerekli uygunluk zamanı veya ilgili ayrıntılar',
            'Kullanıcı tarafından isteğe bağlı olarak yüklenen dosyalar, görüntüler veya belgeler',
          ],
          afterBullets:
            'Öğrenciler, fakülte üyeleri ve diğer yetkili kullanıcılar için platform; hesap bilgileri, rol, profil ayrıntıları, giriş durumu ve akademik klinik iş akışı içinde gerçekleştirilen işlemlerle ilgili bilgileri de işleyebilir.',
        },
        {
          title: 'Bilgileri Nasıl Kullanırız?',
          body:
            'DentiBridge üzerinden toplanan bilgiler, akademik klinik koordinasyon iş akışını yürütmek amacıyla kullanılır. Bu kapsamda bilgiler aşağıdaki amaçlarla işlenebilir:',
          bullets: [
            'Hasta taleplerini almak ve düzenlemek',
            'Vaka uygunluğunun ilk değerlendirmesini desteklemek',
            'Vakaları fakülte üyeleri veya yetkili personel tarafından incelenmek üzere yönlendirmek',
            'Uygun vakaları gözetim altındaki son sınıf diş hekimliği öğrencileriyle koordine etmek',
            'Vaka durumlarını ve klinik iş akışı aşamalarını yönetmek',
            'Talep ile ilgili temel iletişimi desteklemek',
            'Diş hekimliği fakültesi ortamındaki eğitimsel ve klinik faaliyetleri desteklemek',
            'Platform güvenliğini, yetkileri ve rol tabanlı erişimi sürdürmek',
          ],
          afterBullets:
            'Bilgiler genel ticari reklam, dışarıya açık yayın veya üçüncü kişilere satış amacıyla kullanılmaz.',
        },
        {
          title: 'Bilgilere Kimler Erişebilir?',
          body: (
            <>
              <p>DentiBridge’te bilgilere erişim rol ve yetkilendirme esasına göre sınırlandırılır.</p>
              <p>
                Bir hasta tarafından gönderilen bilgiler; yetkili fakülte üyeleri, görevlendirilmiş yetkili idari
                personel ve uygun olduğu durumlarda yalnızca vaka denetimli akademik klinik iş akışı içinde paylaşılmaya
                uygun görüldüğünde son sınıf diş hekimliği öğrencileri tarafından erişilebilir olabilir.
              </p>
              <p>
                Öğrenciler tüm hasta taleplerine açık erişime sahip değildir. Öğrenci erişimi, onaylanmış iş akışıyla
                ilgili vakalar ve denetimli klinik koordinasyon için gerekli bilgilerle sınırlıdır.
              </p>
              <p>
                Sisteme teknik erişim, gerekli olduğu durumlarda yalnızca yetkili kişilerle ve operasyonel, güvenlik veya
                bakım amaçlarıyla sınırlıdır.
              </p>
            </>
          ),
        },
        {
          title: 'Yüklenen Dosyalar, Görüntüler ve Belgeler',
          body: (
            <>
              <p>
                Bir kullanıcı dosya, görüntü veya belge yüklemeyi seçerse, bu bilgiler yalnızca talebin incelenmesi, ilk
                değerlendirme ve akademik klinik koordinasyon amacıyla kullanılır.
              </p>
              <p>
                Yüklenen dosya ve görüntüler kamuya açık şekilde yayınlanmak için kullanılmaz. Bu bilgilere erişim,
                kullanıcının rolüne ve akademik klinik ihtiyaca göre yetkili kullanıcılarla sınırlı olmalıdır.
              </p>
              <p>
                Kullanıcılar, uygun yetki olmadan başka bir kişiye ait görüntü, belge veya bilgileri yüklememelidir.
              </p>
            </>
          ),
        },
        {
          title: 'Sağlıkla İlgili Bilgiler ve Hassasiyet',
          body: (
            <>
              <p>
                DentiBridge üzerinden gönderilen bazı bilgiler tıbbi veya diş hekimliği bilgileri içerebilir. Bu tür
                bilgiler sıradan kişisel bilgilerden daha hassas olabilir ve daha dikkatli şekilde ele alınmalıdır.
              </p>
              <p>
                DentiBridge, bilgilere gereksiz erişimi azaltmayı ve bilgilerin yalnızca akademik klinik iş akışının
                incelenmesi, koordinasyonu, gözetimi ve yönetimiyle ilgili amaçlar için kullanılmasını destekleyecek
                şekilde tasarlanmıştır.
              </p>
            </>
          ),
        },
        {
          title: 'Verilerin Saklanması',
          body: (
            <>
              <p>
                Bilgiler; talebin değerlendirilmesi, akademik klinik koordinasyonun desteklenmesi, fakülte gözetiminin
                sağlanması, klinik iş akışının yönetilmesi, kurumsal ihtiyaçların karşılanması veya geçerli yasal
                gerekliliklere uyulması için gerekli olduğu sürece saklanabilir.
              </p>
              <p>
                Saklama süresi; bilginin türüne, talebin durumuna, akademik veya klinik ihtiyaçlara ve kurumsal veya
                yasal yükümlülüklere göre değişebilir.
              </p>
              <p>
                Bilgi artık gerekli olmadığında, bilginin niteliğine ve uygulanabilir gerekliliklere göre silme,
                kısıtlama veya anonimleştirme değerlendirilebilir.
              </p>
            </>
          ),
        },
        {
          title: 'Düzeltme veya Silme Talepleri',
          body: (
            <>
              <p>
                Kullanıcılar, yanlış bilgilerin düzeltilmesini veya mümkün olduğu durumlarda bilgilerin silinmesini talep
                edebilir. Bu talepler akademik, klinik, teknik veya yasal gerekliliklere tabi olabilir.
              </p>
              <p>
                Düzeltme veya silme talepleri e-posta yoluyla iletilebilir:{' '}
                <a
                  href={`mailto:${PRIVACY_EMAIL}`}
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  {PRIVACY_EMAIL}
                </a>
              </p>
              <p>
                Bazı durumlarda bilgiler hemen silinemeyebilir. Örneğin klinik kayıt, kurumsal inceleme, yasal
                yükümlülükler veya mevcut bir talebin değerlendirilmesinin devamı için gerekli olan bilgiler belirli bir
                süre saklanabilir.
              </p>
            </>
          ),
        },
        {
          title: 'Bilgilerin Dış Taraflarla Paylaşılması',
          body: (
            <>
              <p>DentiBridge kişisel bilgileri üçüncü kişilere satmaz.</p>
              <p>
                Bilgiler yalnızca platformun işletilmesi, akademik klinik koordinasyon, fakülte gözetimi, kurumsal
                gereklilikler, yasal yükümlülükler veya sistemin çalışması için gerekli teknik hizmetler kapsamında
                gerekli olduğunda erişilebilir veya paylaşılabilir.
              </p>
              <p>Bu tür paylaşımlar ilgili amaçla ve bu amaç için gerekli bilgilerle sınırlı olmalıdır.</p>
            </>
          ),
        },
        {
          title: 'Bilgi Güvenliği',
          body: (
            <>
              <p>
                DentiBridge, kullanıcıların yalnızca onaylanmış akademik klinik iş akışı için gerekli bilgilere
                erişebilmesini destekleyen rol tabanlı erişim ve yetkilendirme yapısıyla tasarlanmıştır.
              </p>
              <p>
                Platform; güvenli kimlik doğrulama, rol tabanlı erişim sınırlamaları, özel dosya yönetimi ve yetkili
                kullanıcılar için sınırlı erişim bağlantıları gibi teknik önlemler kullanabilir.
              </p>
              <p>
                DentiBridge, denetimli akademik klinik iş akışına uygun gizlilik odaklı erişim ve veri işleme
                uygulamalarını destekler. Kullanıcılar da hesap bilgilerini gizli tutarak ve platform verilerini yetkisiz
                kişilerle paylaşmayarak bilgilerin korunmasında önemli bir rol oynar.
              </p>
            </>
          ),
        },
        {
          title: 'Platformu İyileştirmek İçin Bilgilerin Kullanımı',
          body: (
            <>
              <p>
                Genel bilgiler, kullanıcı geri bildirimleri ve kullanım ile ilgili veriler; platformu geliştirmek, teknik
                sorunları gidermek, kullanıcı deneyimini iyileştirmek, akademik klinik iş akışlarını geliştirmek ve pilot
                aşamadaki ihtiyaçları belirlemek amacıyla kullanılabilir.
              </p>
              <p>
                İyileştirme amacıyla bilgi kullanıldığında, mümkün olduğu ölçüde sınırlı, anonim veya kimliği
                belirlenemeyen bilgiler tercih edilmelidir.
              </p>
            </>
          ),
        },
        {
          title: 'İlgili Sayfalar',
          body: (
            <>
              <p>
                Platformun kullanım kuralları hakkında daha fazla bilgi için{' '}
                <Link
                  href="/terms"
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  Kullanım Şartları
                </Link>{' '}
                sayfasını inceleyebilirsiniz.
              </p>
              <p>
                KVKK / Kişisel Verilerin Korunması kapsamında kişisel verilerin işlenmesine ilişkin daha geniş açıklama
                için{' '}
                <Link
                  href="/personal-data-protection-law"
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  KVKK / Kişisel Verilerin Korunması aydınlatma sayfasını
                </Link>{' '}
                inceleyebilirsiniz.
              </p>
            </>
          ),
        },
        {
          title: 'Politika Güncellemeleri',
          body: (
            <>
              <p>
                Bu Gizlilik Politikası; platformun gelişimi, kurumsal gereklilikler, iş akışı değişiklikleri veya
                gizlilik ve bilgi güvenliği ihtiyaçları doğrultusunda zaman zaman güncellenebilir.
              </p>
              <p>Bu Gizlilik Politikasının en güncel sürümü bu sayfada yayımlanır.</p>
              <p className="font-semibold text-slate-800">Son güncelleme: 26 Haziran 2026</p>
            </>
          ),
        },
      ]
    : [
        {
          title: 'Information We May Collect',
          body:
            'When a user submits a request through DentiBridge, the platform may collect information provided in the request form, such as:',
          bullets: [
            'Name and contact details',
            'Age or basic background information needed to review the request',
            'Type of request or preferred dental department',
            'Description of the concern or reason for the request',
            'Medical or dental information that the user chooses to provide',
            'Availability or details needed for coordination',
            'Files, images, or documents uploaded voluntarily by the user',
          ],
          afterBullets:
            'For students, faculty members, and other authorized users, the platform may also process account-related information, role, profile details, login status, and actions performed within the academic clinical workflow.',
        },
        {
          title: 'How We Use Information',
          body:
            'The information collected through DentiBridge is used to operate the academic clinical coordination workflow, including to:',
          bullets: [
            'Receive and organize patient requests',
            'Support initial review of case suitability',
            'Route cases for review by faculty members or authorized personnel',
            'Coordinate suitable cases with senior dental students under supervision',
            'Manage case status and clinical workflow stages',
            'Support basic communication related to the request',
            'Support educational and clinical activities within the dental faculty setting',
            'Maintain platform security, permissions, and role-based access',
          ],
          afterBullets:
            'The information is not intended for general commercial advertising, external publication, or sale to third parties.',
        },
        {
          title: 'Who May Access Information',
          body: (
            <>
              <p>Access to information in DentiBridge is limited according to role and authorization.</p>
              <p>
                Information submitted by a patient may be accessible to authorized faculty members, designated authorized
                administrative personnel, and, where appropriate, senior dental students only when the case is considered
                suitable for sharing within a supervised academic clinical workflow.
              </p>
              <p>
                Students do not have open access to all patient requests. Student access is limited to cases relevant to
                the approved workflow and to the information needed for supervised clinical coordination.
              </p>
              <p>
                Technical access to the system, where necessary, is limited to authorized personnel and only for
                operational, security, or maintenance purposes.
              </p>
            </>
          ),
        },
        {
          title: 'Uploaded Files, Images, and Documents',
          body: (
            <>
              <p>
                If a user chooses to upload a file, image, or document, the information is used only for reviewing the
                request, initial assessment, and academic clinical coordination.
              </p>
              <p>
                Uploaded files and images are not intended for public display. Access to them should be limited to
                authorized users according to their role and the academic clinical need.
              </p>
              <p>
                Users should not upload images, documents, or information belonging to another person without appropriate
                authorization.
              </p>
            </>
          ),
        },
        {
          title: 'Health-Related Information and Sensitivity',
          body: (
            <>
              <p>
                Some information submitted through DentiBridge may include medical or dental information. This type of
                information may be more sensitive than ordinary personal information and should be handled with additional
                care.
              </p>
              <p>
                DentiBridge is designed to reduce unnecessary access to information and to support the use of information
                only for purposes related to review, coordination, supervision, and management of the academic clinical
                workflow.
              </p>
            </>
          ),
        },
        {
          title: 'Data Retention',
          body: (
            <>
              <p>
                Information may be kept for as long as needed to handle the request, support academic clinical
                coordination, allow faculty supervision, manage the clinical workflow, meet institutional needs, or comply
                with applicable legal requirements.
              </p>
              <p>
                The retention period may vary depending on the type of information, the status of the request, academic or
                clinical needs, and institutional or legal obligations.
              </p>
              <p>
                When information is no longer needed, deletion, restriction, or anonymization may be evaluated according
                to the nature of the information and applicable requirements.
              </p>
            </>
          ),
        },
        {
          title: 'Correction or Deletion Requests',
          body: (
            <>
              <p>
                Users may request correction of inaccurate information or deletion of information where possible and
                subject to academic, clinical, technical, or legal requirements.
              </p>
              <p>
                Correction or deletion requests may be submitted by email at:{' '}
                <a
                  href={`mailto:${PRIVACY_EMAIL}`}
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  {PRIVACY_EMAIL}
                </a>
              </p>
              <p>
                Some information may not be deleted immediately in certain cases, for example when it is required for
                clinical documentation, institutional review, legal obligations, or continued review of an existing
                request.
              </p>
            </>
          ),
        },
        {
          title: 'Sharing Information with External Parties',
          body: (
            <>
              <p>DentiBridge does not sell personal information to third parties.</p>
              <p>
                Information may be accessible or shared only where necessary for operating the platform, academic clinical
                coordination, faculty supervision, institutional requirements, legal obligations, or technical services
                required to run the system.
              </p>
              <p>Any such sharing should be limited to the relevant purpose and to the information necessary for that purpose.</p>
            </>
          ),
        },
        {
          title: 'Information Security',
          body: (
            <>
              <p>
                DentiBridge is designed to support role-based access and authorization so that users may access only the
                information needed for the approved academic clinical workflow.
              </p>
              <p>
                The platform may use technical measures such as secure authentication, role-based access restrictions,
                private file handling, and limited access links for authorized users.
              </p>
              <p>
                DentiBridge applies privacy-conscious access and data-handling practices appropriate for a supervised
                academic clinical workflow. Users also play an important role in protecting information by keeping account
                credentials private and avoiding unauthorized sharing of platform data.
              </p>
            </>
          ),
        },
        {
          title: 'Use of Information to Improve the Platform',
          body: (
            <>
              <p>
                General information, user feedback, and usage-related data may be used to improve the platform, resolve
                technical issues, improve user experience, enhance academic clinical workflows, and identify pilot-stage
                needs.
              </p>
              <p>
                When information is used for improvement purposes, limited, anonymous, or non-identifying information
                should be preferred whenever possible.
              </p>
            </>
          ),
        },
        {
          title: 'Related Pages',
          body: (
            <>
              <p>
                For more information about the rules for using the platform, please review the{' '}
                <Link
                  href="/terms"
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  Terms of Use
                </Link>
                .
              </p>
              <p>
                For a broader explanation of personal data processing within the scope of KVKK / Personal Data
                Protection, please review the{' '}
                <Link
                  href="/personal-data-protection-law"
                  className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                >
                  KVKK / Personal Data Protection clarification page
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          title: 'Policy Updates',
          body: (
            <>
              <p>
                This Privacy Policy may be updated from time to time according to platform development, institutional
                requirements, workflow changes, or privacy and information security needs.
              </p>
              <p>The latest version of this Privacy Policy will be published on this page.</p>
              <p className="font-semibold text-slate-800">Last updated: 26 June 2026</p>
            </>
          ),
        },
      ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PublicDocumentHeader eyebrow={isTr ? 'Gizlilik Politikası' : 'Privacy Policy'} />

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
              <div className="mt-2 max-w-3xl space-y-3 text-sm leading-relaxed text-slate-600">
                {intro}
              </div>
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
              <div className="space-y-3 text-sm leading-relaxed text-slate-600">
                {typeof section.body === 'string' ? <p>{section.body}</p> : section.body}
                {section.bullets && (
                  <ul className="space-y-2">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {'afterBullets' in section && typeof section.afterBullets === 'string' && (
                  <p>{section.afterBullets}</p>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              {isTr
                ? 'Bu sayfa, DentiBridge platformunun gizlilik uygulamalarını açıklar ve gerektiğinde güncellenebilir.'
                : 'This page explains DentiBridge privacy practices and may be updated when needed.'}
            </p>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  )
}
