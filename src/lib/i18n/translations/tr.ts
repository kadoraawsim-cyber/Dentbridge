import type { TranslationShape } from './en'

export const tr: TranslationShape = {
  nav: {
    requestTreatment: 'Tedavi Talep Et',
    checkStatus: 'Tedavi Durumunu Sorgula',
    studentPortal: 'Öğrenci Portalı',
    facultyLogin: 'Fakülte Girişi',
    facultyAdminLogin: 'Fakülte / Yönetici Girişi',
  },

  patientNav: {
    tagline: 'Fakülte Destekli Klinik Platform',
    myPortal: 'Portalım',
    newRequest: 'Yeni Tedavi Talebi',
    backToHome: 'Ana Sayfaya Dön',
  },

  cta: {
    submitRequest: 'Tedavi Talebi Gönder',
    checkStatus: 'Tedavi Durumunu Sorgula',
  },

  hero: {
    badge: 'Üniversite Denetimli Klinik Erişim',
    title: 'Uygun Fiyatlı Üniversite Denetimli Diş Bakımı',
    description:
      'DentBridge, hastaları uygun fiyatlı tedavilerle buluşturur: sıkı fakülte denetimi altında çalışan kıdemli diş hekimliği öğrencileri — yapılandırılmış, dijital bir iş akışı.',
  },

  benefits: {
    affordableCare: 'Uygun fiyatlı üniversite bakımı',
    facultySupervision: 'Fakülte denetimi',
    structuredReview: 'Yapılandırılmış vaka incelemesi',
    easyCoordination: 'Kolay koordinasyon',
    modernWorkflow: 'Modern dijital iş akışı',
  },

  callout: {
    heading: 'Klinik değerlendirmeye mi ihtiyacınız var?',
    description:
      'Bugün tedavi talebinizi başlatın ve üniversite ekibinin vakanızı incelemesine izin verin.',
  },

  landing: {
    howItWorksTitle: 'Nasıl Çalışır?',
    howItWorksDesc:
      'Klinik vaka eşleştirme platformumuz, her hastanın yapılandırılmış bakım almasını sağlarken bir sonraki nesil diş hekimlerini destekler.',
    step1Title: '1. Talep Gönderin',
    step1Desc: 'Hasta, diş ihtiyaçlarını açıklayan kısa bir form doldurur.',
    step2Title: '2. Fakülte İncelemesi',
    step2Desc: 'Akademik ekibimiz talebinizi inceler ve kategorize eder.',
    step3Title: '3. Akıllı Eşleştirme',
    step3Desc: 'Doğru bölüm ve klinik öğrenci ile eşleştirilirsiniz.',
    step4Title: '4. Tedavi',
    step4Desc:
      'Deneyimli öğretim üyelerinin doğrudan denetimi altında bakım sağlanır.',
    whyTitle: 'Neden Üniversite Denetimli Bakımı Tercih Etmelisiniz?',
    whyCareTitle: 'Uygun Fiyatlı Bakım',
    whyCareDesc:
      'Pek çok özel kliniğe kıyasla daha düşük maliyetle yüksek kaliteli tedaviye erişin.',
    whyOversightTitle: 'Uzman Denetimi',
    whyOversightDesc:
      'Her adım, nitelikli öğretim üyeleri tarafından izlenir ve onaylanır.',
    whyMultiTitle: 'Multidisipliner Yaklaşım',
    whyMultiDesc:
      'Karmaşık vakalar, farklı bölümler arasında koordineli konsültasyon alabilir.',
    whyDigitalTitle: 'Dijital Diş Hekimliği',
    whyDigitalDesc:
      'Modern tanı araçlarına, dijital görüntülemeye ve güncel tedavi planlamasına erişim.',
    deptsTitle: 'Klinik Bölümlerimiz',
    deptsDesc:
      'DentBridge, her hastayı semptomlar, tedavi ihtiyaçları ve fakülte değerlendirmesine göre en uygun üniversite diş hekimliği bölümüne yönlendirir.',
    deptWhatTreats: 'Bu bölümün tedavi ettiği durumlar',
    deptYouMayNeed: 'Bu bölüme ihtiyaç duyabilirsiniz eğer…',
    deptCommonTreatments: 'Yaygın tedaviler şunlardır',
    depts: {
      surgery: {
        name: 'Ağız, Diş ve Çene Cerrahisi',
        short: 'Diş, çene ve ağız çevresi dokular için cerrahi bakım.',
        description:
          'Bu bölüm, dişler, çeneler, ağız ve çevre yumuşak dokular üzerinde cerrahi tedavi gerektiren durumları ele alır.',
        when:
          'çekim gerektiren bir diş, gömülü 20 yaş dişleri, şişlik, kist, çeneye bağlı sorunlar veya cerrahi değerlendirme gerektiren ağız lezyonları söz konusuysa.',
        treatments:
          'diş çekimleri, 20 yaş dişi cerrahisi, gömülü diş ameliyatı ve ağız yumuşak dokusu ile çeneyle ilgili cerrahi durumların tedavisi.',
      },
      endodontics: {
        name: 'Endodonti',
        short: 'Kanal tedavisi, pulpa enfeksiyonu ve diş ağrısı tedavisi.',
        description:
          'Endodonti; dişin iç yapısını, özellikle pulpayı ve kök kanallarını etkileyen sorunlara odaklanır.',
        when:
          'şiddetli diş ağrısı, sıcağa veya soğuğa uzun süre devam eden hassasiyet, diş çevresinde şişlik, enfeksiyon veya daha önce yapılmış başarısız kanal tedavisi varsa.',
        treatments:
          'kanal tedavisi, kanal tedavisinin yenilenmesi, seçilmiş olgularda endodontik cerrahi, travmatize dişlerin tedavisi ve endodontik bakım sonrası internal ağartma.',
      },
      periodontology: {
        name: 'Periodontoloji',
        short: 'Diş etleri ve dişleri destekleyen dokular için bakım.',
        description:
          'Periodontoloji; diş etlerini ve dişleri destekleyen dokuları inceler.',
        when:
          'diş eti kanaması, şişmiş diş etleri, diş eti çekilmesi, diş eti hastalığına bağlı ağız kokusu, dişlerde sallantı veya periodontal iltihaplanma belirtileri varsa.',
        treatments:
          'diş eti hastalığı değerlendirmesi, periodontal temizlik, gingivitis ve periodontitis tedavisi ve doğal dişleri korumaya yönelik bakım.',
      },
      restorative: {
        name: 'Restoratif Diş Hekimliği',
        short: 'Çürük, diş hasarı ve cerrahi dışı estetik sorunların onarımı.',
        description:
          'Restoratif Diş Hekimliği; çürük, aşınma, kırık veya cerrahi olmayan diğer nedenlerle hasar görmüş dişleri onarır.',
        when:
          'diş çürükleri, kırık veya hasarlı dişler, aşınmış diş yüzeyleri ya da cerrahi olmadan giderilebilecek estetik kaygılar söz konusuysa.',
        treatments:
          'dolgular, hasarlı diş yapısının onarımı, direkt restorasyonlar ve konservatif estetik düzeltmeler.',
      },
      prosthodontics: {
        name: 'Protetik Diş Hekimliği',
        short: 'Eksik dişlerin yerine konması ve ağız fonksiyonunun yeniden kazandırılması.',
        description:
          'Protetik Diş Hekimliği; eksik dişleri restore etmeye, ağız fonksiyonu, konforu ve görünümünü yeniden oluşturmaya odaklanır.',
        when:
          'bir veya birden fazla eksik diş, diş kaybı nedeniyle çiğneme güçlüğü ya da kapsamlı restorasyon gerektiren dişler varsa.',
        treatments:
          'kronlar, köprüler, hareketli protezler ve implant destekli protetik restorasyonlar.',
      },
      orthodontics: {
        name: 'Ortodonti',
        short: 'Diş dizilimi ve ısırma sorunlarının düzeltilmesi.',
        description:
          'Ortodonti; diş ve çene diziliminin fonksiyon, kapanış ve görünüm açısından iyileştirilmesiyle ilgilenir.',
        when:
          'çapraz veya çapraşık dişler, dişler arası boşluklar, kapanış sorunları, çene pozisyon bozuklukları ya da tel veya şeffaf plak tedavisi düşünüyorsanız.',
        treatments:
          'metal tel, şeffaf plak, hareketli aparey ve çocuk, genç ile yetişkinlere yönelik ortodontik tedavi planlaması.',
      },
      pedodontics: {
        name: 'Pedodonti (Çocuk Diş Hekimliği)',
        short: 'Bebek, çocuk ve ergenlere yönelik diş bakımı.',
        description:
          'Pedodonti; bebeklikten ergenlik dönemine kadar çocukların ağız ve diş sağlığına odaklanır.',
        when:
          'hasta, diş çürüğü, ağrı, kırık diş, diş travması veya koruyucu bakım ihtiyacı olan bir çocuksa.',
        treatments:
          'çocuk diş muayeneleri, koruyucu bakım, süt dişleri için dolgular ve genç hastalarda diş travmasının yönetimi.',
      },
      radiology: {
        name: 'Ağız, Diş ve Çene Radyolojisi',
        short: 'Teşhis ve tedavi planlaması için diş görüntüleme.',
        description:
          'Ağız Radyolojisi; diş ve çene durumlarını doğru teşhis etmek ve tedavi planlamasını desteklemek için gerekli görüntüleri sağlar.',
        when:
          'tedavi öncesi görüntüleme, gömülü dişlerin değerlendirilmesi, enfeksiyon veya kemik kaybının tespiti ya da cerrahi ve implant için ileri görüntüleme gerekiyorsa.',
        treatments:
          'ağız içi dijital röntgen, panoramik radyografi ve CBCT 3D diş görüntülemesi.',
      },
    },
  },

  request: {
    pageTitle: 'Yeni Tedavi Talebi',
    pageDescription:
      'Fakültemizin sizi doğru bölüm ve öğrenci ile eşleştirebilmesi için diş sorununuzla ilgili ayrıntıları sağlayın.',
    success: {
      title: 'Talep Gönderildi',
      description:
        'Tedavi talebiniz alındı. Fakülte ekibimiz inceleyecek ve sizinle iletişime geçecektir.',
      checkStatus: 'Talep Durumumu Sorgula',
      submitAnother: 'Yeni Talep Gönder',
    },
    sectionPatient: 'Hasta Bilgileri',
    sectionClinical: 'Klinik Detaylar',
    sectionImages: 'Destekleyici Görüntüler',
    sectionImagesNote: '(isteğe bağlı)',
    sectionConsent: 'Onay',
    fullName: 'Ad Soyad',
    age: 'Yaş',
    phone: 'Telefon Numarası',
    preferredLanguage: 'Tercih Edilen Dil',
    city: 'Şehir',
    preferredUniversity: 'Tercih Edilen Üniversite / Klinik',
    optional: '(isteğe bağlı)',
    fullNamePlaceholder: 'Ad ve soyadınızı giriniz',
    agePlaceholder: 'Yaşınız',
    phonePlaceholder: '+90 5XX XXX XX XX',
    cityPlaceholder: 'Şehir',
    universityPlaceholder: 'Tercih edilen klinik',
    treatments: {
      initialExam: 'İlk Muayene / Konsültasyon',
      cleaning: 'Diş Temizliği',
      fillings: 'Dolgu',
      extraction: 'Diş Çekimi',
      rootCanal: 'Kanal Tedavisi',
      gum: 'Diş Eti Tedavisi',
      prosthetics: 'Protez / Kron',
      orthodontics: 'Ortodonti',
      pediatric: 'Çocuk Diş Hekimliği',
      esthetic: 'Estetik Diş Hekimliği',
      other: 'Diğer',
    },
    langTurkish: 'Türkçe',
    langEnglish: 'İngilizce',
    langArabic: 'Arapça',
    treatmentCategory: 'Tedavi Kategorisi',
    mainComplaint: 'Ana Şikayet',
    mainComplaintPlaceholder:
      'Semptomlarınızı, ağrınızı veya diş ihtiyaçlarınızı ayrıntılı olarak açıklayın…',
    urgency: 'Ağrı Düzeyi / Aciliyet',
    urgencyPlaceholder: 'Aciliyet seçin',
    urgencyLow: 'Düşük',
    urgencyMedium: 'Orta',
    urgencyHigh: 'Yüksek',
    availability: 'Tercih Edilen Uygunluk',
    dayNoPreference: 'Tercih Yok',
    dayWeekdayMornings: 'Hafta İçi Sabahları',
    dayWeekdayAfternoons: 'Hafta İçi Öğleden Sonra',
    dayAsSoonAsPossible: 'En Kısa Sürede',
    uploadTitle: 'Fotoğraf, röntgen veya PDF yüklemek için tıklayın',
    uploadSubtitle: 'JPG, JPEG, PNG veya PDF, en fazla 10 MB',
    uploadSelectedLabel: 'Seçilen dosya:',
    consentInfo:
      'Onay: Bu platformun beni, nitelikli öğretim üyelerinin denetimi altında tedavi sunan kıdemli diş hekimliği öğrencileriyle eşleştirdiğini anlıyorum.',
    consentLabel:
      'Tedavi talebimi akademik inceleme için göndermeyi anladığımı ve kabul ettiğimi onaylıyorum.',
    errorRequiredFields: 'Lütfen tüm zorunlu alanları doldurun.',
    errorConsent: 'Lütfen göndermeden önce onay kutusunu işaretleyin.',
    errorFileSize: 'Dosya boyutu 10 MB veya daha az olmalıdır.',
    cancel: 'İptal',
    submit: 'Tedavi Talebi Gönder',
    submitting: 'Gönderiliyor…',
  },

  status: {
    pageTitle: 'Tedavi Durumunuzu Sorgulayın',
    pageDescription:
      'Tedavi talebinizi gönderirken kullandığınız telefon numarasını girerek mevcut durumunu görüntüleyin.',
    lookupTitle: 'Hasta Sorgulama',
    phoneLabel: 'Telefon Numarası',
    searchButton: 'Durumu Sorgula',
    searching: 'Sorgulanıyor…',
    notFoundTitle: 'Kayıt bulunamadı',
    notFoundBefore:
      'Bu numaraya ait bir talep bulunamadı. Kontrol edip tekrar deneyin ya da',
    notFoundLink: 'yeni bir talep gönderin',
    step: {
      submitted: 'Gönderildi',
      under_review: 'İnceleniyor',
      matched: 'Bölüme Atandı',
      student_approved: 'Öğrenci Atandı',
      contacted: 'İletişim Kuruldu',
      appointment_scheduled: 'Randevu Alındı',
      in_treatment: 'Tedavide',
      completed: 'Tamamlandı',
    },
    badge: {
      submitted: 'Gönderildi — İnceleme Bekliyor',
      under_review: 'Fakülte İncelemesinde',
      matched: 'Bölüme Atandı — Öğrenci Bekleniyor',
      student_approved: 'Öğrenci Atandı — İletişim Hazırlığında',
      contacted: 'Hasta Öğrenci Tarafından Arandı',
      appointment_scheduled: 'Randevu Alındı',
      in_treatment: 'Tedavi Devam Ediyor',
      completed: 'Tedavi Tamamlandı',
      rejected: 'Kapsam Dışı',
      cancelled: 'İptal Edildi',
    },
    closedCancelled: 'Bu vaka iptal edilmiştir.',
    closedRejected:
      'Vaka, kapsam dışı olarak işaretlenmiştir — başka bir adım gerekmemektedir.',
    gridTreatment: 'TEDAVİ',
    gridSubmitted: 'GÖNDERİLDİ',
    gridAvailability: 'UYGUNLUK',
    gridDepartment: 'BÖLÜM',
    pendingReview: 'İnceleme bekliyor',
    footerNote:
      'En son talebiniz görüntülenmektedir. Sorularınız için kliniğe doğrudan başvurun.',
  },

  footer: {
    tagline: 'Fakülte Destekli Klinik Platform',
    description:
      'Hastaları yapılandırılmış akademik iş akışları aracılığıyla uygun fiyatlı, denetimli diş hekimliği bakımıyla buluşturur.',
    patientServices: 'Hasta Hizmetleri',
    clinicalPortals: 'Klinik Portallar',
    contact: 'İletişim',
    requestTreatment: 'Tedavi Talep Et',
    checkStatus: 'Durumu Sorgula',
    studentPortal: 'Öğrenci Portalı',
    facultyPortal: 'Fakülte Portalı',
    casePool: 'Vaka Havuzu',
    affordableCareInfo: 'Uygun Fiyatlı Bakım Bilgileri',
    faq: 'SSS',
    clinicalRequirements: 'Klinik Gereksinimler',
    universityPilot: 'Üniversite destekli pilot platform',
    whatsappSupport: 'WhatsApp desteği mevcut',
    copyright:
      '© {year} DentBridge. Tüm tedaviler akademik denetim altında sağlanmaktadır.',
  },
}
