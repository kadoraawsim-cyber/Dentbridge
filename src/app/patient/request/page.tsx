'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PatientRequestPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [preferredUniversity, setPreferredUniversity] = useState('')
  const [treatmentType, setTreatmentType] = useState('')
  const [complaintText, setComplaintText] = useState('')
  const [urgency, setUrgency] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('Submitting...')

    console.log('Submitting form...')

    const { data, error } = await supabase.from('patient_requests').insert([
      {
        full_name: fullName,
        phone,
        city,
        preferred_university: preferredUniversity,
        treatment_type: treatmentType,
        complaint_text: complaintText,
        urgency,
      },
    ])

    console.log('Supabase result:', { data, error })

    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    setMessage('Your request was submitted successfully.')
    setFullName('')
    setPhone('')
    setCity('')
    setPreferredUniversity('')
    setTreatmentType('')
    setComplaintText('')
    setUrgency('')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Request Dental Treatment
        </h1>
        <p className="text-slate-600 mb-8">
          Fill in your details and describe the treatment you are looking for.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              placeholder="Enter your phone number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              placeholder="Enter your city"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Preferred University
            </label>
            <input
              type="text"
              value={preferredUniversity}
              onChange={(e) => setPreferredUniversity(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              placeholder="Enter the university you prefer"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Treatment Type
            </label>
            <select
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              required
            >
              <option value="">Choose treatment type</option>
              <option value="Dental Cleaning">Dental Cleaning</option>
              <option value="Fillings">Fillings</option>
              <option value="Extraction">Extraction</option>
              <option value="Root Canal">Root Canal</option>
              <option value="Scaling / Periodontal">Scaling / Periodontal</option>
              <option value="Crowns / Prosthetics">Crowns / Prosthetics</option>
              <option value="Orthodontic Consultation">Orthodontic Consultation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Main Complaint
            </label>
            <textarea
              rows={5}
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              placeholder="Describe your dental problem"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Urgency
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              required
            >
              <option value="">Select urgency</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 text-white py-3 font-medium hover:bg-slate-800 transition disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>

          {message && (
            <p className="text-sm font-medium text-slate-700">{message}</p>
          )}
        </form>
      </div>
    </main>
  )
}