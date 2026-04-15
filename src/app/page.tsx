'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import {
  ArrowRight,
  Baby,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  HeartPulse,
  Menu,
  ScanLine,
  ShieldCheck,
  ShieldPlus,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Users,
  Activity,
  X,
} from 'lucide-react'

const benefits = [
  { key: 'benefits.affordableCare', icon: CheckCircle2 },
  { key: 'benefits.facultySupervision', icon: ShieldCheck },
  { key: 'benefits.structuredReview', icon: ClipboardList },
  { key: 'benefits.easyCoordination', icon: CalendarCheck },
  { key: 'benefits.modernWorkflow', icon: Building2 },
]

const howItWorks = [
  {
    title: '1. Submit Request',
    desc: 'Patient completes a short form explaining their dental needs.',
    icon: FileText,
  },
  {
    title: '2. Faculty Review',
    desc: 'Our academic team reviews and categorizes your request.',
    icon: ShieldCheck,
  },
  {
    title: '3. Smart Match',
    desc: 'Matched with the right department and clinical student.',
    icon: Users,
  },
  {
    title: '4. Treatment',
    desc: 'Care provided under direct supervision of experienced faculty.',
    icon: Stethoscope,
  },
]

const departments = [
  {
    name: 'Oral & Maxillofacial Surgery',
    short: 'Surgical care for teeth, jaws, and oral tissues.',
    icon: Syringe,
    description:
      'This department deals with conditions that require surgical treatment involving the teeth, jaws, mouth, and surrounding soft tissues.',
    when:
      'a tooth that needs extraction, impacted wisdom teeth, swelling, cysts, jaw-related problems, or oral lesions that require surgical evaluation.',
    treatments:
      'tooth extractions, wisdom tooth removal, surgical removal of impacted teeth, and treatment of oral soft tissue or jaw-related surgical conditions.',
  },
  {
    name: 'Endodontics',
    short: 'Treatment of root canals, pulp infection, and tooth pain.',
    icon: HeartPulse,
    description:
      'Endodontics focuses on problems inside the tooth, especially the dental pulp and root canals.',
    when:
      'severe tooth pain, long-lasting sensitivity to hot or cold, swelling around a tooth, infection, or a failed previous root canal treatment.',
    treatments:
      'root canal treatment, root canal retreatment, endodontic surgery in selected cases, treatment of traumatized teeth, and internal whitening after endodontic care.',
  },
  {
    name: 'Periodontology',
    short: 'Care for gums and the tissues supporting the teeth.',
    icon: ShieldPlus,
    description:
      'Periodontology focuses on the gums and the tissues that support the teeth.',
    when:
      'bleeding gums, swollen gums, gum recession, bad breath related to gum disease, loose teeth, or signs of periodontal inflammation.',
    treatments:
      'gum disease evaluation, periodontal cleaning, treatment of gingivitis and periodontitis, and maintenance care to protect natural teeth.',
  },
  {
    name: 'Restorative Dentistry',
    short: 'Repair of cavities, tooth damage, and non-surgical esthetic issues.',
    icon: Sparkles,
    description:
      'Restorative Dentistry repairs teeth damaged by decay, wear, fractures, or other non-surgical causes.',
    when:
      'cavities, chipped or broken teeth, worn tooth surfaces, or esthetic concerns that can be improved without surgery.',
    treatments:
      'fillings, repair of damaged tooth structure, direct restorations, and conservative esthetic corrections.',
  },
  {
    name: 'Prosthodontics',
    short: 'Replacement of missing teeth and restoration of oral function.',
    icon: Smile,
    description:
      'Prosthodontics focuses on restoring missing teeth and rebuilding oral function, comfort, and appearance.',
    when:
      'one or more missing teeth, difficulty chewing because of tooth loss, or teeth that require major restoration.',
    treatments:
      'crowns, bridges, removable dentures, and implant-supported prosthetic restorations.',
  },
  {
    name: 'Orthodontics',
    short: 'Alignment of teeth and correction of bite problems.',
    icon: Activity,
    description:
      'Orthodontics is concerned with the alignment of teeth and jaws to improve function, bite, and appearance.',
    when:
      'crooked teeth, crowding, spacing, bite problems, jaw position issues, or if you are considering braces or clear aligners.',
    treatments:
      'metal braces, clear aligners, removable appliances, and orthodontic treatment planning for children, adolescents, and adults.',
  },
  {
    name: 'Pedodontics',
    short: 'Dental care for infants, children, and adolescents.',
    icon: Baby,
    description:
      'Pedodontics, also called pediatric dentistry, focuses on the oral and dental health of children from infancy through adolescence.',
    when:
      'the patient is a child with tooth decay, dental pain, broken teeth, dental trauma, or preventive care needs.',
    treatments:
      'children’s examinations, preventive care, fillings for primary teeth, and management of dental trauma in young patients.',
  },
  {
    name: 'Oral Radiology',
    short: 'Dental imaging for diagnosis and treatment planning.',
    icon: ScanLine,
    description:
      'Oral Radiology provides the imaging needed to diagnose dental and jaw conditions accurately and to support treatment planning.',
    when:
      'diagnostic imaging before treatment, evaluation of impacted teeth, assessment of infection or bone loss, or advanced imaging for surgery or implants.',
    treatments:
      'intraoral digital radiographs, panoramic radiography, and CBCT 3D dental imaging.',
  },
]

export default function HomePage() {
  const { t } = useI18n()
  const [openDepartment, setOpenDepartment] = React.useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Clear any staff session when landing on the public home page.
  // Patients are always anonymous so signOut() is a no-op for them.
  useEffect(() => {
    supabase.auth.signOut()
  }, [])

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/dentbridge-icon.png"
              alt="DentBridge icon"
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-lg font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-xs text-slate-500">Faculty-Supported Clinical Platform</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/patient/request" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              {t('nav.requestTreatment')}
            </Link>
            <Link href="/student/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              {t('nav.studentPortal')}
            </Link>
            <Link
              href="/admin/login"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {t('nav.facultyLogin')}
            </Link>
            <LanguageSwitcher />
          </nav>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-1">
              <Link
                href="/patient/request"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('nav.requestTreatment')}
              </Link>
              <Link
                href="/patient/status"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('nav.checkStatus')}
              </Link>
              <Link
                href="/student/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('nav.studentPortal')}
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('nav.facultyAdminLogin')}
              </Link>
              <div className="mt-2 border-t border-slate-100 pt-2">
                <LanguageSwitcher />
              </div>
            </nav>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e3480] via-[#1c2f6b] to-[#0f1e4a] px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
        {/* Decorative background layers */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/8 blur-2xl" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a1533]/50" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 sm:gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-200 sm:px-4 sm:py-1.5 sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              {t('hero.badge')}
            </span>

            <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-[1.1] tracking-tight text-white sm:mt-7 sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
              {t('hero.description')}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 sm:mt-9">
              <Link
                href="/patient/request"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 sm:px-6 sm:py-3"
              >
                {t('cta.submitRequest')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/patient/status"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:px-6 sm:py-3"
              >
                {t('cta.checkStatus')}
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-white/8 p-2.5 shadow-2xl backdrop-blur sm:p-3">
              <img
                src="/hero-dental-clinic.png"
                alt="University dental care"
                className="h-[200px] w-full rounded-2xl object-cover sm:h-[300px] lg:h-[420px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-teal-700 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-xs font-medium text-white sm:gap-x-8 sm:px-6 sm:text-sm lg:px-8">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div key={benefit.key} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-teal-100" />
                <span>{t(benefit.key)}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center sm:mb-12">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Our clinical case matching platform ensures every patient gets structured
              care while empowering the next generation of dentists.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.title}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 sm:mb-4 sm:h-12 sm:w-12">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-6 sm:gap-10 sm:px-8 sm:py-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 text-3xl font-bold text-slate-900">
              Why Choose University-Supervised Care?
            </h2>

            <div className="space-y-5">
              <div>
                <p className="font-semibold text-slate-900">Affordable Care</p>
                <p className="text-sm text-slate-600">
                  Access high-quality treatment at lower cost than many private clinics.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-900">Expert Oversight</p>
                <p className="text-sm text-slate-600">
                  Every step is monitored and approved by qualified faculty members.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-900">Multidisciplinary Approach</p>
                <p className="text-sm text-slate-600">
                  Complex cases can receive coordinated consultation across different departments.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-900">Digital Dentistry</p>
                <p className="text-sm text-slate-600">
                  Access to modern diagnostic tools, digital imaging, and contemporary treatment planning.
                </p>
              </div>
            </div>
          </div>

          <div>
            <img
              src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop"
              alt="Modern dental clinic"
              className="h-[200px] w-full rounded-3xl object-cover sm:h-[280px] lg:h-[320px]"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Our Clinical Departments</h2>
            <p className="mx-auto max-w-3xl text-slate-600">
              DentBridge helps route each patient to the most appropriate university
              dental department based on symptoms, treatment needs, and faculty review.
            </p>
          </div>

          <div className="grid items-start gap-4 md:grid-cols-2">
            {departments.map((department) => {
              const Icon = department.icon
              const isOpen = openDepartment === department.name

              return (
                <div
                  key={department.name}
                  className="self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => setOpenDepartment(isOpen ? null : department.name)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                        <Icon className="h-6 w-6" />
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {department.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {department.short}
                        </p>
                      </div>
                    </div>

                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-5">
                      <div className="space-y-5 text-sm leading-7 text-slate-700">
                        <div>
                          <p className="mb-1 font-semibold text-slate-900">
                            What this department treats
                          </p>
                          <p>{department.description}</p>
                        </div>

                        <div>
                          <p className="mb-1 font-semibold text-slate-900">
                            You may need this department if...
                          </p>
                          <p>{department.when}</p>
                        </div>

                        <div>
                          <p className="mb-1 font-semibold text-slate-900">
                            Common treatments include
                          </p>
                          <p>{department.treatments}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-teal-600 px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">{t('callout.heading')}</h2>
              <p className="mt-2 max-w-2xl text-sm text-teal-50">
                {t('callout.description')}
              </p>
            </div>

            <Link
              href="/patient/request"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              {t('cta.submitRequest')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 py-14 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/dentbridge-icon.png"
                alt="DentBridge icon"
                className="h-10 w-10 object-contain"
              />
              <div>
                <p className="font-bold text-white">DentBridge</p>
                <p className="text-xs text-slate-400">{t('footer.tagline')}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">{t('footer.patientServices')}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/patient/request" className="hover:text-white">
                  {t('footer.requestTreatment')}
                </Link>
              </li>
              <li>
                <Link href="/patient/status" className="hover:text-white">
                  {t('footer.checkStatus')}
                </Link>
              </li>
              <li>
                <span className="cursor-default text-slate-600">Affordable Care Information</span>
              </li>
              <li>
                <span className="cursor-default text-slate-600">FAQ</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">{t('footer.clinicalPortals')}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/student/login" className="hover:text-white">
                  {t('footer.studentPortal')}
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white">
                  {t('footer.facultyPortal')}
                </Link>
              </li>
              <li>
                <Link href="/student/cases" className="hover:text-white">
                  {t('footer.casePool')}
                </Link>
              </li>
              <li>
                <span className="cursor-default text-slate-600">Clinical Requirements</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">{t('footer.contact')}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Istanbul, Türkiye</li>
              <li>University-supported pilot platform</li>
              <li>WhatsApp support available</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-800 px-4 pt-6 text-xs text-slate-500 sm:px-6 lg:px-8">
          {t('footer.copyright').replace('{year}', String(new Date().getFullYear()))}
        </div>
      </footer>
    </main>
  )
}