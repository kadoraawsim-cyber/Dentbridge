'use client'

import type { ReactNode } from 'react'
import PublicDocumentHeader from '@/components/PublicDocumentHeader'
import PublicFooter from '@/components/PublicFooter'
import { useI18n } from '@/lib/i18n'

const KVKK_LAW = 'https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law'
const EXPLICIT_CONSENT =
  'https://www.kvkk.gov.tr/Icerik/2037/Acik-Riza-Alirken-Dikkat-Edilecek-Hususlar'
const DATA_SUBJECT_RIGHTS = 'https://www.kvkk.gov.tr/Icerik/2036/Ilgili-Kisinin-Haklari'
const DATA_SECURITY =
  'https://www.kvkk.gov.tr/Icerik/2040/Veri-Guvenligine-Iliskin-Yukumlulukler'
const ERASURE =
  'https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi'

type LegalSection = {
  title: string
  content: ReactNode
}

function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800"
    >
      {children}
    </a>
  )
}

function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="my-4 list-disc space-y-1.5 pl-6">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export default function PersonalDataProtectionLawPage() {
  const { locale } = useI18n()
  const isTr = locale === 'tr'

  const title = isTr
    ? 'Kişisel Verilerin Korunması Kanunu / KVKK Aydınlatma Metni'
    : 'Personal Data Protection Law / KVKK Clarification Text'

  const intro = isTr ? (
    <>
      <p>
        Bu Aydınlatma Metni, DentiBridge kapsamında kişisel verilerin nasıl toplanabileceğini, kullanılabileceğini,
        erişilebileceğini, saklanabileceğini ve korunabileceğini açıklamaktadır.
      </p>
      <p>
        DentiBridge; hasta talebi gönderimi, ilk vaka uygunluk değerlendirmesi, fakülte triyajı, öğrenci vaka talepleri,
        denetimli vaka koordinasyonu ve akademik klinik iş akışı yönetimini desteklemek üzere tasarlanmış akademik bir
        dental klinik koordinasyon platformudur.
      </p>
      <p>
        DentiBridge bir hastane, bağımsız bir diş kliniği veya acil sağlık hizmeti değildir. DentiBridge bağımsız olarak
        teşhis, tedavi planlaması, tıbbi tavsiye veya klinik karar verme hizmeti sunmaz. Klinik değerlendirme, tedavi
        kararları ve hasta bakımı; yetkili sağlık meslek mensuplarının ve ilgili akademik veya klinik kurumun
        sorumluluğunda kalır.
      </p>
      <p>
        Bu sayfa, kişisel verilerin işlenmesi bakımından temel hak ve özgürlükleri, özellikle özel hayatın gizliliğini
        korumayı amaçlayan Türkiye’deki{' '}
        <LegalLink href={KVKK_LAW}>6698 sayılı Kişisel Verilerin Korunması Kanunu</LegalLink> genel ilkeleri doğrultusunda
        hazırlanmıştır.
      </p>
    </>
  ) : (
    <>
      <p>
        This Clarification Text explains how personal data may be collected, used, accessed, retained, and protected
        within DentiBridge.
      </p>
      <p>
        DentiBridge is an academic dental clinical coordination platform designed to support patient request submission,
        initial case suitability review, faculty triage, student case requests, supervised case coordination, and academic
        clinical workflow management.
      </p>
      <p>
        DentiBridge is not a hospital, an independent dental clinic, or an emergency healthcare service. It does not
        independently provide diagnosis, treatment planning, medical advice, or clinical decision-making. Clinical
        evaluation, treatment decisions, and patient care remain under the responsibility of qualified healthcare
        professionals and the relevant academic or clinical institution.
      </p>
      <p>
        This page is prepared in line with the general principles of Turkey’s{' '}
        <LegalLink href={KVKK_LAW}>Personal Data Protection Law No. 6698</LegalLink>, which states that the purpose of
        the law is to protect fundamental rights and freedoms, particularly the right to privacy, in relation to the
        processing of personal data.
      </p>
    </>
  )

  const sections: LegalSection[] = isTr
    ? [
        {
          title: '1. Bu Aydınlatma Metninin Amacı ve Kapsamı',
          content: (
            <>
              <p>
                Bu Aydınlatma Metni; hastaları, öğrencileri, öğretim üyelerini ve yetkili kullanıcıları DentiBridge
                kapsamında gerçekleşebilecek kişisel veri işleme faaliyetleri hakkında bilgilendirmeyi amaçlar.
              </p>
              <p>
                <LegalLink href={KVKK_LAW}>6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi</LegalLink>{' '}
                uyarınca ilgili kişiler; veri sorumlusunun kimliği, kişisel verilerin hangi amaçla işleneceği, işlenen
                kişisel verilerin kimlere ve hangi amaçla aktarılabileceği, kişisel veri toplamanın yöntemi ve hukuki
                sebebi ile 11. maddede sayılan hakları hakkında bilgilendirilmelidir.
              </p>
              <p>
                Bu sayfa yalnızca DentiBridge platformu üzerinden işlenen kişisel verilere uygulanır. Bir üniversite, diş
                hekimliği fakültesi, üniversite kliniği, hastane veya başka bir sağlık kurumu tarafından doğrudan
                toplanan, saklanan veya işlenen kişisel veriler; ilgili kurumun kendi gizlilik bildirimlerine, onam
                formlarına, hasta dokümantasyonu kurallarına ve hukuki yükümlülüklerine de tabi olabilir.
              </p>
            </>
          ),
        },
        {
          title: '2. Sorumlu İletişim ve Kurumsal Rol',
          content: (
            <>
              <p>
                DentiBridge, akademik dental klinik koordinasyonu için dijital bir ortam sağlar. Platformun nasıl
                kullanıma alındığına bağlı olarak veri sorumlusu, veri işleyen ve katılımcı akademik kurum rolleri; ilgili
                kurumsal düzenleme, erişim izinleri ve iş akışı sorumluluklarına göre belirlenebilir.
              </p>
              <p>
                DentiBridge bir akademik kurum bünyesinde veya bir akademik kurumla birlikte kullanıldığında, katılımcı
                kurum klinik inceleme prosedürlerinin, fakülte denetiminin, erişim izinlerinin, hasta dokümantasyonu
                gerekliliklerinin ve kurumsal iş akışı kurallarının belirlenmesinde rol alabilir.
              </p>
              <p>
                Gizlilikle ilgili sorular, düzeltme talepleri, silme talepleri veya kişisel verilerle ilgili diğer
                başvurular için DentiBridge ile şu adresten iletişime geçilebilir:
              </p>
              <p>
                <strong>
                  <a
                    href="mailto:privacy@dentbridgetr.com"
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-800"
                  >
                    privacy@dentbridgetr.com
                  </a>
                </strong>
              </p>
              <p>Gelecekte özel bir kurumsal iletişim kanalı oluşturulursa, bu sayfa buna göre güncellenebilir.</p>
            </>
          ),
        },
        {
          title: '3. İşlenebilecek Kişisel Veri Kategorileri',
          content: (
            <>
              <p>
                DentiBridge, kullanıcının rolüne ve kullanılan işleve bağlı olarak farklı kişisel veri kategorilerini
                işleyebilir.
              </p>
              <h3>3.1 Hasta Talep Bilgileri</h3>
              <p>Bir hasta veya genel kullanıcı DentiBridge üzerinden talep gönderdiğinde, platform aşağıdaki bilgileri işleyebilir:</p>
              <LegalList
                items={[
                  'ad ve iletişim bilgileri;',
                  'yaş veya temel arka plan bilgileri;',
                  'talebin nedeni;',
                  'dental şikayet türü veya talep edilen bölüm;',
                  'dental ağrı, şikayet, durum veya klinik ihtiyacın açıklaması;',
                  'kullanıcı tarafından gönüllü olarak iletilen tıbbi veya dental bilgiler;',
                  'uygunluk veya koordinasyonla ilgili bilgiler;',
                  'kullanıcı tarafından gönüllü olarak yüklenen görüntüler, belgeler veya dosyalar.',
                ]}
              />
              <p>
                Dental şikayetler, ağız içi görüntüler, radyografik görüntüler, tıbbi geçmiş veya sağlıkla ilgili diğer
                bilgiler özel nitelikli kişisel veri kapsamında değerlendirilebilir.{' '}
                <LegalLink href={KVKK_LAW}>6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 6. maddesi</LegalLink>,
                sağlığa ilişkin verileri özel nitelikli kişisel veri olarak tanımlar.
              </p>
              <h3>3.2 Öğrenci Hesabı ve İş Akışı Bilgileri</h3>
              <p>DentiBridge kullanımına davet edilen diş hekimliği öğrencileri bakımından platform aşağıdaki bilgileri işleyebilir:</p>
              <LegalList
                items={[
                  'ad;',
                  'e-posta adresi;',
                  'kullanıcı rolü veya platform statüsü;',
                  'temel profil bilgileri;',
                  'öğrenci tarafından gönderilen vaka talepleri;',
                  'öğrenciyle ilişkili vaka durumu bilgileri;',
                  'akademik klinik iş akışı kapsamında gerçekleştirilen işlemler.',
                ]}
              />
              <h3>3.3 Öğretim Üyesi ve Yetkili Kullanıcı Bilgileri</h3>
              <p>
                Öğretim üyeleri, klinik süpervizörler ve yetkilendirilmiş idari personel bakımından DentiBridge aşağıdaki
                bilgileri işleyebilir:
              </p>
              <LegalList
                items={[
                  'ad ve iletişim bilgileri;',
                  'kullanıcı rolü ve erişim izinleri;',
                  'vaka inceleme, triyaj veya denetim işlemleri;',
                  'vaka durumu güncellemeleri;',
                  'akademik klinik koordinasyon için gerekli iş akışı işlemleri.',
                ]}
              />
              <h3>3.4 Teknik ve Operasyonel Bilgiler</h3>
              <p>
                Güvenlik, erişim kontrolü, sorun giderme ve platformun işletilmesi amacıyla DentiBridge sınırlı teknik
                veya operasyonel bilgileri işleyebilir:
              </p>
              <LegalList
                items={[
                  'hesap durumu;',
                  'girişle ilgili bilgiler;',
                  'kullanıcı rolü ve izin seviyesi;',
                  'iş akışı işlemleri;',
                  'teknik sorunları, yetkisiz erişim girişimlerini veya platformun kötüye kullanımını belirlemek için gerekli kayıtlar.',
                ]}
              />
            </>
          ),
        },
        {
          title: '4. Toplama Yöntemleri ve Olası İşleme Dayanakları',
          content: (
            <>
              <p>
                Kişisel veriler; hasta talep formları, hesap oluşturma, giriş yapma, profil tamamlama, dosya yükleme,
                öğrenci vaka talepleri, vaka durumu güncellemeleri, platform araçları ve DentiBridge iletişim kanalına
                gönderilen mesajlar dahil olmak üzere, kullanıcıların DentiBridge içinde gerçekleştirdiği işlemler
                aracılığıyla elektronik ortamda toplanabilir.
              </p>
              <p>
                Kişisel verilerin işlenmesi; kullanıcı rolü, veri türü, kurumsal kullanım modeli ve uygulanabilir hukuki
                gerekliliklere bağlı olarak aşağıdakilerden bir veya birkaçına dayanabilir:
              </p>
              <LegalList
                items={[
                  'kullanıcının gönüllü olarak gönderdiği talep veya işlem;',
                  'gerekli olduğu durumlarda açık rıza;',
                  'akademik klinik bir talebin incelenmesi ve koordine edilmesi ihtiyacı;',
                  'kullanıcı hesaplarının, erişim izinlerinin ve denetimli iş akışlarının yönetilmesi ihtiyacı;',
                  'platform güvenliğinin korunması ve yetkisiz erişimin önlenmesi ihtiyacı;',
                  'uygulanabilir olduğu durumlarda kurumsal veya hukuki yükümlülükler.',
                ]}
              />
              <p>
                Açık rızanın gerekli olduğu durumlarda KVKK, açık rızayı “belirli bir konuya ilişkin, bilgilendirilmeye
                dayanan ve özgür iradeyle açıklanan rıza” olarak tanımlar; KVKK’nın{' '}
                <LegalLink href={EXPLICIT_CONSENT}>açık rıza</LegalLink> konusundaki rehberi de rızanın belirli bir
                işleme faaliyetiyle bağlantılı olması ve yanıltıcı veya toplu şekilde sunulmaması gerektiğini vurgular.
              </p>
              <p>
                DentiBridge kapsamındaki kişisel veri işleme faaliyetleri,{' '}
                <LegalLink href={KVKK_LAW}>6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 4. maddesinde</LegalLink>{' '}
                belirtilen “belirli, açık ve meşru amaçlar” için işleme ve bu amaçlarla “bağlantılı, sınırlı ve ölçülü”
                olma genel KVKK ilkelerini esas almayı amaçlar.
              </p>
            </>
          ),
        },
        {
          title: '5. Kişisel Verilerin İşlenme Amaçları',
          content: (
            <>
              <p>DentiBridge kişisel verileri aşağıdaki amaçlarla işleyebilir:</p>
              <LegalList
                items={[
                  'hasta taleplerinin alınması ve düzenlenmesi;',
                  'gönderilen vakaların ilk uygunluk değerlendirmesinin yapılması;',
                  'yetkili öğretim üyelerinin akademik klinik triyaj gerçekleştirmesine olanak sağlanması;',
                  'taleplerin ilgili dental alan veya bölüme yönlendirilmesi;',
                  'uygun vakaların denetim altında kıdemli diş hekimliği öğrencileriyle koordine edilmesi;',
                  'öğrencilerin uygun klinik vakalara talepte bulunabilmesi;',
                  'vaka durumu ve iş akışı adımlarının takip edilmesi;',
                  'fakülte denetiminin ve akademik klinik yönetimin desteklenmesi;',
                  'kullanıcı hesaplarının ve rol bazlı izinlerin oluşturulması ve yönetilmesi;',
                  'platform güvenliğinin korunması ve yetkisiz erişimin önlenmesi;',
                  'gizlilik, düzeltme, silme veya açıklama taleplerine yanıt verilmesi;',
                  'kullanıcı deneyiminin, platform kararlılığının ve pilot aşama iş akışlarının iyileştirilmesi.',
                ]}
              />
              <p>
                DentiBridge kişisel verileri hasta bilgilerinin satılması, hasta verilerinin kamuya açıklanması, üçüncü
                taraf pazarlama, sigorta faturalandırması, hastane faturalandırması, ödeme tahsilatı, CCTV izleme, çağrı
                merkezi kayıtları, laboratuvar aktarımı veya yataklı tedavi hizmetleri için kullanmaz.
              </p>
            </>
          ),
        },
        {
          title: '6. Kişisel Verilere Erişim ve Olası Aktarım',
          content: (
            <>
              <p>
                DentiBridge kapsamında kişisel verilere erişim; kullanıcı rolü, izin seviyesi ve akademik klinik iş
                akışının amacıyla sınırlıdır.
              </p>
              <p>Vaka türüne ve iş akışı aşamasına bağlı olarak kişisel verilere aşağıdaki kişiler erişebilir:</p>
              <LegalList
                items={[
                  'inceleme, triyaj, denetim veya akademik klinik karar desteği amacıyla yetkili öğretim üyeleri;',
                  'yalnızca koordinasyon, operasyon veya iş akışı desteği için gerekli olduğu ölçüde yetkilendirilmiş idari personel;',
                  'yalnızca bir vakanın denetimli koordinasyon için uygun görülmesi halinde ve yalnızca ilgili vaka için gerekli olduğu ölçüde kıdemli diş hekimliği öğrencileri;',
                  'platform işletimi, güvenlik, bakım veya altyapı desteği için gerekli olduğu hallerde yetkili teknik personel veya hizmet sağlayıcılar;',
                  'uygulanabilir olduğu hallerde ve ilgili kurumsal iş akışı ile erişim kurallarına uygun olarak katılımcı akademik kurum.',
                ]}
              />
              <p>
                Öğrenciler tüm hasta taleplerine veya tüm platform verilerine açık erişim elde etmez. Öğrenci erişimi,
                denetimli bir iş akışı kapsamında ilgili vaka bilgileriyle sınırlı olacak şekilde tasarlanmıştır.
              </p>
              <p>
                Kişisel veriler; yalnızca platformun işletilmesi, güvenli barındırma veya altyapı desteği, akademik
                klinik denetim, uygulanabilir kurumsal gereklilikler veya yetkili bir makamdan gelen geçerli hukuki talep
                için gerekli olduğu durumlarda üçüncü kişilere aktarılabilir veya erişilebilir hale getirilebilir.
              </p>
              <p>
                <LegalLink href={KVKK_LAW}>6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 8. maddesi</LegalLink>{' '}
                uyarınca kişisel verilerin aktarımı belirli hukuki şartlara tabidir. Her türlü erişim veya aktarım,
                ilgili amaç ve bu amaç için gerekli asgari bilgi ile sınırlı olmalıdır.
              </p>
            </>
          ),
        },
        {
          title: '7. Saklama, Düzeltme, Silme ve Anonim Hale Getirme',
          content: (
            <>
              <p>
                Kişisel veriler yalnızca toplandıkları amaç için gerekli olduğu süre boyunca veya uygulanabilir akademik,
                klinik, operasyonel, kurumsal veya hukuki yükümlülükler gerektirdiği ölçüde saklanır.
              </p>
              <p>Saklama süreleri aşağıdaki unsurlara göre değişebilir:</p>
              <LegalList
                items={[
                  'veri türü;',
                  'talebin durumu;',
                  'iş akışının aşaması;',
                  'vakanın kabul edilmiş, reddedilmiş, beklemede veya tamamlanmış olması;',
                  'akademik klinik denetim ihtiyacı;',
                  'dokümantasyon, güvenlik veya kullanıcı taleplerinin yönetimi ihtiyacı;',
                  'uygulanabilir kurumsal veya hukuki gereklilikler.',
                ]}
              />
              <p>
                İşleme sebepleri ortadan kalktığında,{' '}
                <LegalLink href={KVKK_LAW}>6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 7. maddesi</LegalLink>{' '}
                kişisel verilerin veri sorumlusu tarafından resen veya ilgili kişinin talebi üzerine, kanundaki şartlara
                tabi olarak “silinir, yok edilir veya anonim hâle getirilir” hükmünü içerir.
              </p>
              <p>
                Kullanıcılar hatalı verilerin düzeltilmesini, eksik verilerin tamamlanmasını, silme işlemini veya kişisel
                verileri hakkında açıklama yapılmasını talep edebilir. Bu talepler; veri türü, vaka durumu, kullanıcı rolü
                ve uygulanabilir akademik, klinik, teknik, kurumsal veya hukuki gerekliliklere göre değerlendirilir.
              </p>
              <p>Talepler şu adrese gönderilebilir:</p>
              <p>
                <strong>
                  <a
                    href="mailto:privacy@dentbridgetr.com"
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-800"
                  >
                    privacy@dentbridgetr.com
                  </a>
                </strong>
              </p>
            </>
          ),
        },
        {
          title: '8. İlgili Kişinin Hakları',
          content: (
            <>
              <p>
                <LegalLink href={KVKK_LAW}>6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 11. maddesi</LegalLink>{' '}
                uyarınca ilgili kişiler, kişisel verileriyle ilgili taleplerde bulunma hakkına sahiptir.
              </p>
              <p>Bu haklar şunları içerebilir:</p>
              <LegalList
                items={[
                  'kişisel verilerin işlenip işlenmediğini öğrenme;',
                  'kişisel veriler işlenmişse buna ilişkin bilgi talep etme;',
                  'işleme amacını ve verilerin bu amaca uygun kullanılıp kullanılmadığını öğrenme;',
                  'uygulanabilir olduğu hallerde kişisel verilerin aktarıldığı üçüncü kişileri bilme;',
                  'eksik veya yanlış işlenmiş kişisel verilerin düzeltilmesini isteme;',
                  'kanunda öngörülen şartlar kapsamında kişisel verilerin silinmesini veya yok edilmesini isteme;',
                  'uygulanabilir olduğu hallerde düzeltme veya silme işlemlerinin ilgili üçüncü kişilere bildirilmesini isteme;',
                  'yalnızca otomatik analiz sonucunda ortaya çıkan bir sonuca itiraz etme;',
                  'uygulanabilir olduğu ölçüde 11. madde kapsamındaki diğer hakları kullanma.',
                ]}
              />
              <p>Bu haklara ilişkin talepler şu adrese gönderilebilir:</p>
              <p>
                <strong>
                  <a
                    href="mailto:privacy@dentbridgetr.com"
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-800"
                  >
                    privacy@dentbridgetr.com
                  </a>
                </strong>
              </p>
              <p>
                Kişisel verileri korumak amacıyla DentiBridge, başvuruda bulunan kişinin kimliğini doğrulamak için
                gerekli bilgileri talep edebilir. Talepler, uygulanabilir usuller ve süreler doğrultusunda değerlendirilir.
              </p>
            </>
          ),
        },
        {
          title: '9. Veri Güvenliği ve Yetkili Erişim',
          content: (
            <>
              <p>
                DentiBridge, kullanıcıların akademik klinik iş akışı kapsamındaki rolleri için gerekli bilgilere
                erişebilmesini destekleyen rol bazlı erişim ve izin kontrolleriyle çalışacak şekilde tasarlanmıştır.
              </p>
              <p>Platform aşağıdaki önlemleri içerebilir:</p>
              <LegalList
                items={[
                  'kullanıcı hesabı kimlik doğrulaması;',
                  'genel kullanıcılar, öğrenciler, öğretim üyeleri ve yetkilendirilmiş idari personel arasında ayrım;',
                  'rol bazlı izinler;',
                  'hasta bilgilerine kısıtlı erişim;',
                  'vaka durumu yönetimi;',
                  'yüklenen dosyaların ve ilgili bilgilerin özel şekilde ele alınması;',
                  'uygulandığı ölçüde önemli iş akışı işlemleri için operasyonel kontroller.',
                ]}
              />
              <p>
                KVKK, veri sorumlusunun uygun güvenlik düzeyini sağlamak için gerekli teknik ve idari tedbirleri almakla
                yükümlü olduğunu belirtir. DentiBridge, kişisel verilerin gizlilik odaklı şekilde ele alınması bakımından
                resmi KVKK <LegalLink href={DATA_SECURITY}>veri güvenliği yükümlülükleri</LegalLink> rehberini referans
                noktası olarak dikkate alır.
              </p>
              <p>
                Platform hesabı bulunan kullanıcılar; giriş bilgilerini gizli tutmak, şifreleri veya erişim bağlantılarını
                paylaşmamak ve kişisel, dental veya klinik bilgileri yetkisiz kişilere aktarmamakla sorumludur.
              </p>
              <p>
                Hesap paylaşımı, kullanıcının erişimine yönelik olmayan bilgilere erişmeye çalışma veya kişisel ya da
                klinik bilgileri yetkisiz bir kişiye aktarma; hasta ve kullanıcı gizliliğine zarar verebilir ve
                uygulanabilir hukuk ile KVKK veri güvenliği ilkeleri doğrultusunda erişim kısıtlamalarına, kurumsal
                işlemlere veya hukuki sonuçlara yol açabilir.
              </p>
            </>
          ),
        },
        {
          title: '10. Açık Rıza ve Sağlıkla İlgili Bilgiler',
          content: (
            <>
              <p>
                Kişisel verilerin veya sağlıkla ilgili bilgilerin işlenmesi için açık rızanın gerekli olduğu durumlarda,
                bu rıza özgür iradeyle, açık şekilde ve belirli bir amaç için verilmelidir.
              </p>
              <p>
                DentiBridge üzerinden hasta talebi gönderilmesi dental veya tıbbi bilgilerin paylaşılmasını içerebilir.
                Bu bilgiler; ilk vaka uygunluk değerlendirmesi, akademik klinik koordinasyon, fakülte veya yetkili
                inceleme ve ilgili iş akışının yönetimi amacıyla gönderilir.
              </p>
              <p>
                Kullanıcı DentiBridge üzerinden talep göndermek zorunda değildir. Kullanıcı, inceleme için gerekli
                bilgilerin platform üzerinden işlenmesini istemiyorsa talep göndermemeyi tercih edebilir.
              </p>
              <p>
                Talep göndermeye verilen rıza; tedaviye kabul, randevu, teşhis veya akademik klinik iş akışına uygunluk
                garantisi vermez. Her vaka akademik, klinik, kurumsal ve operasyonel değerlendirmelere göre incelenebilir.
              </p>
            </>
          ),
        },
        {
          title: '11. Sayfa İçindeki Hukuki Referanslar',
          content: (
            <>
              <p>
                Bu sayfada yer alan hukuki referanslar;{' '}
                <LegalLink href={KVKK_LAW}>6698 sayılı Kişisel Verilerin Korunması Kanunu</LegalLink>, KVKK’nın{' '}
                <LegalLink href={EXPLICIT_CONSENT}>açık rıza</LegalLink> rehberi, KVKK’nın{' '}
                <LegalLink href={DATA_SUBJECT_RIGHTS}>ilgili kişinin hakları</LegalLink> sayfası, KVKK’nın{' '}
                <LegalLink href={DATA_SECURITY}>veri güvenliği yükümlülükleri</LegalLink> rehberi ve KVKK’nın{' '}
                <LegalLink href={ERASURE}>kişisel verilerin silinmesi, yok edilmesi veya anonim hale getirilmesi</LegalLink>{' '}
                açıklamasından alınmıştır.
              </p>
              <p>
                Bu referanslar, kullanıcıların bu Aydınlatma Metninin hukuki arka planını anlamalarına yardımcı olmak
                amacıyla sunulmaktadır. Herhangi bir makam tarafından verilmiş ayrı bir sertifikasyon, onay veya uyumluluk
                beyanı niteliği taşımaz.
              </p>
            </>
          ),
        },
        {
          title: '12. Sayfa Güncellemeleri',
          content: (
            <>
              <p>
                Bu Aydınlatma Metni; DentiBridge’deki değişiklikleri, düzenleyici gereklilikleri, kurumsal düzenlemeleri
                veya platform iş akışlarını yansıtmak amacıyla zaman zaman güncellenebilir.
              </p>
              <p>En güncel sürüm bu sayfada yayımlanacaktır.</p>
              <p>
                <strong>Son güncelleme: 27 Haziran 2026</strong>
              </p>
            </>
          ),
        },
      ]
    : [
        {
          title: '1. Purpose and Scope of This Clarification Text',
          content: (
            <>
              <p>
                This Clarification Text is intended to inform patients, students, faculty members, and authorized users
                about the personal data processing activities that may occur within DentiBridge.
              </p>
              <p>
                Under <LegalLink href={KVKK_LAW}>Article 10 of the Personal Data Protection Law No. 6698</LegalLink>,
                data subjects should be informed about the identity of the data controller, the purpose of processing, to
                whom and for which purposes personal data may be transferred, the method and legal basis of collection,
                and the rights referred to in Article 11.
              </p>
              <p>
                This page applies only to personal data processed through the DentiBridge platform. Personal data
                collected, stored, or processed directly by a university, dental faculty, university clinic, hospital, or
                other healthcare institution may also be subject to that institution’s own privacy notices, consent forms,
                patient documentation rules, and legal obligations.
              </p>
            </>
          ),
        },
        {
          title: '2. Responsible Contact and Institutional Role',
          content: (
            <>
              <p>
                DentiBridge provides a digital environment for academic dental clinical coordination. Depending on how the
                platform is deployed, the roles of data controller, data processor, and participating academic institution
                may be determined according to the applicable institutional arrangement, access permissions, and workflow
                responsibilities.
              </p>
              <p>
                When DentiBridge is used within or together with an academic institution, the participating institution
                may be involved in determining clinical review procedures, faculty supervision, access permissions,
                patient documentation requirements, and institutional workflow rules.
              </p>
              <p>
                For privacy-related questions, correction requests, deletion requests, or other personal data inquiries,
                DentiBridge can currently be contacted at:
              </p>
              <p>
                <strong>
                  <a
                    href="mailto:privacy@dentbridgetr.com"
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-800"
                  >
                    privacy@dentbridgetr.com
                  </a>
                </strong>
              </p>
              <p>If a dedicated institutional contact channel is introduced in the future, this page may be updated accordingly.</p>
            </>
          ),
        },
        {
          title: '3. Categories of Personal Data That May Be Processed',
          content: (
            <>
              <p>DentiBridge may process different categories of personal data depending on the user’s role and the function being used.</p>
              <h3>3.1 Patient Request Information</h3>
              <p>When a patient or public user submits a request through DentiBridge, the platform may process information such as:</p>
              <LegalList
                items={[
                  'name and contact details;',
                  'age or basic background information;',
                  'reason for the request;',
                  'type of dental concern or requested department;',
                  'description of dental pain, complaint, condition, or clinical need;',
                  'medical or dental information voluntarily submitted by the user;',
                  'availability or coordination-related details;',
                  'images, documents, or files uploaded voluntarily by the user.',
                ]}
              />
              <p>
                Dental complaints, intraoral images, radiographic images, medical history, or other health-related
                information may fall within special categories of personal data.{' '}
                <LegalLink href={KVKK_LAW}>Article 6 of the Personal Data Protection Law No. 6698</LegalLink> identifies
                data concerning health as a special category of personal data.
              </p>
              <h3>3.2 Student Account and Workflow Information</h3>
              <p>For dental students who are invited to use DentiBridge, the platform may process information such as:</p>
              <LegalList
                items={[
                  'name;',
                  'email address;',
                  'user role or platform status;',
                  'basic profile information;',
                  'case requests submitted by the student;',
                  'case status information related to the student;',
                  'actions performed within an academic clinical workflow.',
                ]}
              />
              <h3>3.3 Faculty and Authorized User Information</h3>
              <p>
                For faculty members, clinical supervisors, and authorized administrative personnel, DentiBridge may process
                information such as:
              </p>
              <LegalList
                items={[
                  'name and contact details;',
                  'user role and access permissions;',
                  'case review, triage, or supervision actions;',
                  'case status updates;',
                  'workflow actions required for academic clinical coordination.',
                ]}
              />
              <h3>3.4 Technical and Operational Information</h3>
              <p>
                For security, access control, troubleshooting, and platform operation, DentiBridge may process limited
                technical or operational information, such as:
              </p>
              <LegalList
                items={[
                  'account status;',
                  'login-related information;',
                  'user role and permission level;',
                  'workflow actions;',
                  'records required to identify technical issues, unauthorized access attempts, or misuse of the platform.',
                ]}
              />
            </>
          ),
        },
        {
          title: '4. Methods of Collection and Possible Processing Basis',
          content: (
            <>
              <p>
                Personal data may be collected electronically through actions taken by users within DentiBridge, including
                patient request forms, account creation, login, profile completion, file upload, student case requests,
                case status updates, platform tools, and messages sent to DentiBridge’s contact channel.
              </p>
              <p>
                The processing of personal data may be based on one or more of the following, depending on the user role,
                data type, institutional deployment model, and applicable legal requirements:
              </p>
              <LegalList
                items={[
                  'a request or action voluntarily submitted by the user;',
                  'explicit consent, where required;',
                  'the need to review and coordinate an academic clinical request;',
                  'the need to manage user accounts, access permissions, and supervised workflows;',
                  'the need to protect platform security and prevent unauthorized access;',
                  'institutional or legal obligations, where applicable.',
                ]}
              />
              <p>
                Where explicit consent is required, KVKK describes explicit consent as consent that is “freely given,
                specific and informed,” and the KVKK guidance on{' '}
                <LegalLink href={EXPLICIT_CONSENT}>explicit consent</LegalLink> emphasizes that consent should be
                connected to a specific processing activity and should not be presented in a misleading or bundled manner.
              </p>
              <p>
                Personal data processing within DentiBridge is intended to follow the general KVKK principles that
                personal data should be processed for “specified, explicit and legitimate purposes” and should be
                “relevant, limited and proportionate” to those purposes, as stated in{' '}
                <LegalLink href={KVKK_LAW}>Article 4 of the Personal Data Protection Law No. 6698</LegalLink>.
              </p>
            </>
          ),
        },
        {
          title: '5. Purposes of Processing Personal Data',
          content: (
            <>
              <p>DentiBridge may process personal data for the following purposes:</p>
              <LegalList
                items={[
                  'receiving and organizing patient requests;',
                  'conducting an initial suitability review of submitted cases;',
                  'enabling authorized faculty members to perform academic clinical triage;',
                  'assigning or routing requests to a relevant dental field or department;',
                  'coordinating suitable cases with senior dental students under supervision;',
                  'enabling students to request appropriate clinical cases;',
                  'tracking case status and workflow steps;',
                  'supporting faculty supervision and academic clinical management;',
                  'creating and managing user accounts and role-based permissions;',
                  'protecting platform security and preventing unauthorized access;',
                  'responding to privacy, correction, deletion, or clarification requests;',
                  'improving user experience, platform stability, and pilot-stage workflows.',
                ]}
              />
              <p>
                DentiBridge does not use personal data for selling patient information, public disclosure of patient data,
                third-party marketing, insurance billing, hospital billing, payment collection, CCTV monitoring,
                call-center recordings, laboratory transfer, or inpatient services.
              </p>
            </>
          ),
        },
        {
          title: '6. Access to Personal Data and Possible Transfer',
          content: (
            <>
              <p>
                Access to personal data within DentiBridge is limited according to user role, permission level, and the
                purpose of the academic clinical workflow.
              </p>
              <p>Depending on the case type and workflow stage, personal data may be accessible to:</p>
              <LegalList
                items={[
                  'authorized faculty members for review, triage, supervision, or academic clinical decision support;',
                  'authorized administrative personnel, only where necessary for coordination, operation, or workflow support;',
                  'senior dental students, only when a case is considered suitable for supervised coordination and only to the extent necessary for that case;',
                  'authorized technical personnel or service providers, where necessary for platform operation, security, maintenance, or infrastructure support;',
                  'the participating academic institution, where applicable and in line with the relevant institutional workflow and access rules.',
                ]}
              />
              <p>
                Students do not receive open access to all patient requests or all platform data. Their access is intended
                to be limited to relevant case information within a supervised workflow.
              </p>
              <p>
                Personal data may be transferred or made accessible to third parties only where necessary for platform
                operation, secure hosting or infrastructure support, academic clinical supervision, applicable
                institutional requirements, or a valid legal request by a competent authority.
              </p>
              <p>
                Under <LegalLink href={KVKK_LAW}>Article 8 of the Personal Data Protection Law No. 6698</LegalLink>,
                personal data transfer is subject to specific legal conditions. Any access or transfer should be limited
                to the relevant purpose and the minimum information required for that purpose.
              </p>
            </>
          ),
        },
        {
          title: '7. Retention, Correction, Deletion, and Anonymization',
          content: (
            <>
              <p>
                Personal data is retained only for as long as necessary for the purpose for which it was collected, or as
                required by applicable academic, clinical, operational, institutional, or legal obligations.
              </p>
              <p>Retention periods may vary depending on:</p>
              <LegalList
                items={[
                  'the type of data;',
                  'the status of the request;',
                  'the stage of the workflow;',
                  'whether the case is accepted, rejected, pending, or completed;',
                  'the need for academic clinical supervision;',
                  'the need for documentation, security, or user request handling;',
                  'applicable institutional or legal requirements.',
                ]}
              />
              <p>
                When the reasons for processing no longer exist,{' '}
                <LegalLink href={KVKK_LAW}>Article 7 of the Personal Data Protection Law No. 6698</LegalLink> provides
                that personal data should be “erased, destroyed or anonymized” by the data controller, either ex officio
                or upon the request of the data subject, subject to the conditions of the law.
              </p>
              <p>
                Users may request the correction of inaccurate data, completion of incomplete data, deletion, or
                clarification regarding their personal data. Such requests will be reviewed according to the data type,
                case status, user role, and applicable academic, clinical, technical, institutional, or legal requirements.
              </p>
              <p>Requests may be sent to:</p>
              <p>
                <strong>
                  <a
                    href="mailto:privacy@dentbridgetr.com"
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-800"
                  >
                    privacy@dentbridgetr.com
                  </a>
                </strong>
              </p>
            </>
          ),
        },
        {
          title: '8. Rights of the Data Subject',
          content: (
            <>
              <p>
                Under <LegalLink href={KVKK_LAW}>Article 11 of the Personal Data Protection Law No. 6698</LegalLink>,
                data subjects have the right to submit requests regarding their personal data.
              </p>
              <p>These rights may include the right to:</p>
              <LegalList
                items={[
                  'learn whether personal data is being processed;',
                  'request information if personal data has been processed;',
                  'learn the purpose of processing and whether the data is used in line with that purpose;',
                  'know the third parties to whom personal data has been transferred, where applicable;',
                  'request correction of incomplete or inaccurate personal data;',
                  'request deletion or destruction of personal data under the conditions set out in the law;',
                  'request that relevant third parties be informed of correction or deletion, where applicable;',
                  'object to a result arising solely from automated analysis, where relevant;',
                  'exercise other rights available under Article 11, where applicable.',
                ]}
              />
              <p>Requests related to these rights may be sent to:</p>
              <p>
                <strong>
                  <a
                    href="mailto:privacy@dentbridgetr.com"
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-800"
                  >
                    privacy@dentbridgetr.com
                  </a>
                </strong>
              </p>
              <p>
                To protect personal data, DentiBridge may request information necessary to verify the identity of the
                person submitting the request. Requests will be reviewed in accordance with applicable procedures and
                timeframes.
              </p>
            </>
          ),
        },
        {
          title: '9. Data Security and Authorized Access',
          content: (
            <>
              <p>
                DentiBridge is designed to support role-based access and permission controls, so that users access only
                the information required for their role within the academic clinical workflow.
              </p>
              <p>The platform may include measures such as:</p>
              <LegalList
                items={[
                  'user account authentication;',
                  'separation between public users, students, faculty members, and authorized administrative personnel;',
                  'role-based permissions;',
                  'restricted access to patient information;',
                  'case status management;',
                  'private handling of uploaded files and related information;',
                  'operational controls for significant workflow actions, where implemented.',
                ]}
              />
              <p>
                KVKK states that the data controller is required to take necessary technical and administrative measures
                to ensure an appropriate level of security. DentiBridge refers to the official KVKK guidance on{' '}
                <LegalLink href={DATA_SECURITY}>data security obligations</LegalLink> as a reference point for
                privacy-conscious handling of personal data.
              </p>
              <p>
                Users with platform accounts are responsible for keeping their login credentials private, not sharing
                passwords or access links, and not transferring personal, dental, or clinical information to unauthorized
                persons.
              </p>
              <p>
                Sharing an account, attempting to access information not intended for the user, or transferring personal
                or clinical information to an unauthorized person may harm patient and user privacy and may result in
                access restrictions, institutional action, or legal consequences in accordance with applicable law and KVKK
                data security principles.
              </p>
            </>
          ),
        },
        {
          title: '10. Explicit Consent and Health-Related Information',
          content: (
            <>
              <p>
                Where explicit consent is required for processing personal data or health-related information, such consent
                should be given freely, clearly, and for a specific purpose.
              </p>
              <p>
                Submitting a patient request through DentiBridge may involve sharing dental or medical information. Such
                information is submitted for the purpose of initial case suitability review, academic clinical
                coordination, faculty or authorized review, and management of the relevant workflow.
              </p>
              <p>
                A user is not required to submit a request through DentiBridge. If the user does not wish the information
                required for review to be processed through the platform, the user may choose not to submit the request.
              </p>
              <p>
                Consent to submit a request does not guarantee acceptance for treatment, an appointment, diagnosis, or
                suitability for an academic clinical workflow. Each case may be reviewed according to academic, clinical,
                institutional, and operational considerations.
              </p>
            </>
          ),
        },
        {
          title: '11. Embedded Legal References',
          content: (
            <>
              <p>
                The legal references included in this page are drawn from official KVKK sources, including the{' '}
                <LegalLink href={KVKK_LAW}>Personal Data Protection Law No. 6698</LegalLink>, the KVKK guidance on{' '}
                <LegalLink href={EXPLICIT_CONSENT}>explicit consent</LegalLink>, the KVKK page on{' '}
                <LegalLink href={DATA_SUBJECT_RIGHTS}>data subject rights</LegalLink>, the KVKK guidance on{' '}
                <LegalLink href={DATA_SECURITY}>data security obligations</LegalLink>, and the KVKK explanation on{' '}
                <LegalLink href={ERASURE}>erasure, destruction, or anonymization of personal data</LegalLink>.
              </p>
              <p>
                These references are provided to help users understand the legal background of this Clarification Text.
                They do not represent a separate certification, approval, or compliance statement by any authority.
              </p>
            </>
          ),
        },
        {
          title: '12. Page Updates',
          content: (
            <>
              <p>
                This Clarification Text may be updated from time to time to reflect changes in DentiBridge, regulatory
                requirements, institutional arrangements, or platform workflows.
              </p>
              <p>The most recent version will be published on this page.</p>
              <p>
                <strong>Last updated: 27 June 2026</strong>
              </p>
            </>
          ),
        },
      ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <PublicDocumentHeader eyebrow={isTr ? 'KVKK Aydınlatma Metni' : 'KVKK Clarification Text'} />

      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
          <h2 className="mt-8 border-b border-slate-200 pb-3 text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>
          <div className="legal-document-content mt-5 space-y-4 text-sm leading-7 text-slate-700 sm:text-[15px]">
            {intro}
          </div>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-slate-200 pt-7">
                <h2 className="text-xl font-bold tracking-tight text-slate-950">{section.title}</h2>
                <div className="legal-document-content mt-4 space-y-4 text-sm leading-7 text-slate-700 sm:text-[15px]">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
      <PublicFooter />
    </main>
  )
}
