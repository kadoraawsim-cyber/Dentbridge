'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, CheckCircle2, Info, UploadCloud } from 'lucide-react'

const treatmentOptions = [
  'Initial Examination / Consultation',
  'Dental Cleaning',
  'Fillings',
  'Tooth Extraction',
  'Root Canal Treatment',
  'Gum Treatment',
  'Prosthetics / Crowns',
  'Orthodontics',
  'Pediatric Dentistry',
  'Esthetic Dentistry',
  'Other',
]

const languageOptions = ['Turkish', 'English', 'Arabic']
const urgencyOptions = ['Low', 'Medium', 'High']
const dayOptions = [
  'No Preference',
  'Weekday Mornings',
  'Weekday Afternoons',
  'As Soon As Possible',
]

export default function PatientRequestPage() {
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [phone, setPhone] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('English')
  const [city, setCity] = useState('Istanbul')
  const [preferredUniversity, setPreferredUniversity] = useState('DentBridge Partner University')
  const [treatmentType, setTreatmentType] = useState('')
  const [complaintText, setComplaintText] = useState('')
  const [urgency, setUrgency] = useState('')
  const [preferredDays, setPreferredDays] = useState('No Preference')
  const [consent, setConsent] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmittedId(null)
    setErrorMessage('')

    if (!fullName || !age || !phone || !treatmentType || !complaintText || !urgency) {
      setErrorMessage('Please complete all required fields.')
      return
    }

    if (!consent) {
      setErrorMessage('Please confirm consent before submitting.')
      return
    }

    if (attachment && attachment.size > 10 * 1024 * 1024) {
      setErrorMessage('File size must be 10MB or less.')
      return
    }

    setIsSubmitting(true)

    let attachmentPath: string | null = null

    if (attachment) {
      const fileExt = attachment.name.split('.').pop()
      const safeName = fullName.trim().toLowerCase().replace(/\s+/g, '-')
      const fileName = `${safeName}-${Date.now()}.${fileExt}`
const filePath = fileName
      const { error: uploadError } = await supabase.storage
        .from('patient-uploads')
        .upload(filePath, attachment)

      if (uploadError) {
        setIsSubmitting(false)
        setErrorMessage(uploadError.message)
        return
      }

      attachmentPath = filePath
    }

const { error } = await supabase
  .from('patient_requests')
  .insert([
    {
      full_name: fullName,
      age: age ? Number(age) : null,
      phone,
      city,
      preferred_university: preferredUniversity,
      preferred_language: preferredLanguage,
      treatment_type: treatmentType,
      complaint_text: complaintText,
      urgency,
      preferred_days: preferredDays,
      consent,
      attachment_path: attachmentPath,
      attachment_name: attachment ? attachment.name : null,
      status: 'submitted',
    },
  ])

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

setSubmittedId('submitted')
    setFullName('')
    setAge('')
    setPhone('')
    setPreferredLanguage('English')
    setCity('Istanbul')
    setPreferredUniversity('DentBridge Partner University')
    setTreatmentType('')
    setComplaintText('')
    setUrgency('')
    setPreferredDays('No Preference')
    setConsent(false)
    setAttachment(null)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/dentbridge-icon.png"
              alt="DentBridge icon"
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-lg font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Faculty-Supported Clinical Platform
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/patient/status" className="hover:text-slate-900">
              My Portal
            </Link>
            <Link href="/patient/request" className="text-slate-900">
              New Treatment Request
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 sm:flex">
              <button type="button" className="rounded px-1 text-slate-900">
                EN
              </button>
              <span className="text-slate-300">|</span>
              <button type="button" className="rounded px-1 hover:text-slate-900">
                TR
              </button>
              <span className="text-slate-300">|</span>
              <button type="button" className="rounded px-1 hover:text-slate-900">
                AR
              </button>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0"
                />
              </svg>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            New Treatment Request
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Provide details about your dental concern to help our faculty match you with the right department and student.
          </p>
        </div>

        {submittedId && (
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
            <div className="px-6 py-12 text-center sm:px-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Request Submitted</h2>
              <p className="mx-auto mt-3 max-w-sm text-slate-600">
                Your treatment request has been received. Our faculty team will review it and contact you.
              </p>
              {submittedId !== 'submitted' && (
                <p className="mt-3 font-mono text-sm text-slate-500">
                  Reference: <span className="font-bold text-slate-700">{submittedId.slice(0, 8).toUpperCase()}</span>
                </p>
              )}
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/patient/status"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  Check My Request Status
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmittedId(null)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          </div>
        )}

        {!submittedId && (
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="space-y-8 p-6 sm:p-8">
            <section>
              <div className="mb-5 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-teal-500" />
                <h2 className="text-2xl font-semibold text-slate-900">
                  Patient Information
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Age *
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Your age"
                    min="1"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+90 5XX XXX XX XX"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Preferred Language <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  >
                    {languageOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    City <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Preferred University / Clinic <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={preferredUniversity}
                    onChange={(e) => setPreferredUniversity(e.target.value)}
                    placeholder="Preferred clinic"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-teal-500" />
                <h2 className="text-2xl font-semibold text-slate-900">
                  Clinical Details
                </h2>
              </div>

              <div className="mb-6">
                <label className="mb-3 block text-sm font-medium text-slate-700">
                  Treatment Category *
                </label>
                <div className="grid gap-3 md:grid-cols-3">
                  {treatmentOptions.map((option) => {
                    const isSelected = treatmentType === option

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setTreatmentType(option)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-900'
                            : 'border-slate-300 text-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Main Complaint *
                </label>
                <textarea
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Describe your symptoms, pain, or dental needs in detail..."
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Pain Level / Urgency *
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  >
                    <option value="">Select urgency</option>
                    {urgencyOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Preferred Availability <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <select
                    value={preferredDays}
                    onChange={(e) => setPreferredDays(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  >
                    {dayOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-teal-500" />
                <h2 className="text-2xl font-semibold text-slate-900">
                  Supporting Images
                  <span className="ml-2 text-base font-normal text-slate-400">(optional)</span>
                </h2>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8">
                <label className="block cursor-pointer">
                  <div className="text-center">
                    <UploadCloud className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                    <p className="font-medium text-slate-700">
                      Click to upload photos, x-rays, or PDF
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      JPG, JPEG, PNG, or PDF up to 10MB
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setAttachment(file)
                    }}
                  />
                </label>

                {attachment && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    Selected file: <span className="font-medium">{attachment.name}</span>
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-teal-500" />
                <h2 className="text-2xl font-semibold text-slate-900">Consent</h2>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    Consent: I understand that this platform matches me with
                    senior dental students who provide treatment under the
                    supervision of qualified faculty members.
                  </p>
                </div>
              </div>

              <label className="mt-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  I understand and agree to submit my treatment request for
                  academic review. *
                </span>
              </label>
            </section>

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Treatment Request'}
            </button>
          </div>
        </form>
        )}

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
                <span className="cursor-default text-slate-600">Affordable Care Information</span>
              </li>
              <li>
                <span className="cursor-default text-slate-600">FAQ</span>
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
                <span className="cursor-default text-slate-600">Clinical Requirements</span>
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