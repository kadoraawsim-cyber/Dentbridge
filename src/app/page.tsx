'use client'

import React from 'react'
import Link from 'next/link'
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
  Info,
  ScanLine,
  ShieldCheck,
  ShieldPlus,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Users,
  Activity,
} from 'lucide-react'

const benefits = [
  { text: 'Affordable university care', icon: CheckCircle2 },
  { text: 'Faculty supervision', icon: ShieldCheck },
  { text: 'Structured case review', icon: ClipboardList },
  { text: 'Easy coordination', icon: CalendarCheck },
  { text: 'Modern digital workflow', icon: Building2 },
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
  const [openDepartment, setOpenDepartment] = React.useState<string | null>(null)

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

          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <Link href="/patient/request" className="hover:text-slate-900">
              Patient Access
            </Link>
            <Link href="/student/dashboard" className="hover:text-slate-900">
              Student Portal
            </Link>
            <Link href="/admin" className="hover:text-slate-900">
              Faculty Portal
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-[#1c2f6b] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full border border-teal-300 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-100">
              University-Supervised Clinical Access
            </span>

            <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
              Affordable University-Supervised Dental Care
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              DentBridge connects patients seeking affordable dental treatment with
              senior dental students working under strict faculty supervision through
              a structured university-based workflow.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/patient/request"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Submit Treatment Request
              </Link>
              <Link
                href="/patient/status"
                className="inline-flex items-center justify-center rounded-xl border border-slate-400 px-6 py-3 text-sm font-semibold text-white transition hover:border-white"
              >
                Check Treatment Status
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur">
              <img
                src="/hero-dental-clinic.png"
                alt="University dental care"
                className="h-[420px] w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-x-auto border-b border-slate-200 bg-teal-700 py-4">
        <div className="mx-auto flex min-w-max max-w-7xl items-center justify-start gap-8 px-4 text-sm font-medium text-white sm:px-6 lg:justify-center lg:px-8">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div key={benefit.text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-teal-100" />
                <span>{benefit.text}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
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
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
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

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-8 sm:px-8 lg:grid-cols-2">
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

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop"
              alt="Modern dental clinic"
              className="h-[320px] w-full rounded-3xl object-cover"
            />
            <div className="absolute -bottom-4 left-6 rounded-2xl bg-white px-4 py-3 shadow-lg">
              <p className="text-sm font-semibold text-slate-900">Online Appointment</p>
              <p className="text-xs text-slate-500">Fast and easy coordination</p>
            </div>
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

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl rounded-3xl bg-teal-600 px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Need a clinical evaluation?</h2>
              <p className="mt-2 max-w-2xl text-sm text-teal-50">
                Start your treatment request today and let the university team
                review your case.
              </p>
            </div>

            <Link
              href="/patient/request"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Submit Request <ArrowRight className="h-4 w-4" />
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
                <p className="text-xs text-slate-400">
                  Faculty-Supported Clinical Platform
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Connecting patients with affordable, supervised dental care through
              structured academic workflows.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Patient Services</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/patient/request" className="hover:text-white">
                  Request Treatment
                </Link>
              </li>
              <li>
                <Link href="/patient/status" className="hover:text-white">
                  Check Status
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Affordable Care Information
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Clinical Portals</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/student/dashboard" className="hover:text-white">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white">
                  Faculty Portal
                </Link>
              </li>
              <li>
                <Link href="/student/cases" className="hover:text-white">
                  Case Pool
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Clinical Requirements
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Contact</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Istanbul, Türkiye</li>
              <li>University-supported pilot platform</li>
              <li>WhatsApp support available</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-800 px-4 pt-6 text-xs text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} DentBridge. All treatments are provided under
          academic supervision.
        </div>
      </footer>
    </main>
  )
}