'use client'

import { useState } from 'react'

const EMAIL_VALIDATE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface AdminInviteCardProps {
  title: string
  description: string
  emailLabel: string
  emailPlaceholder: string
  submitLabel: string
  submittingLabel: string
  invalidEmailMessage: string
  genericErrorMessage: string
  successMessage: string
  /** Invitation endpoint, e.g. /api/admin/invitations or /api/admin/invitations/faculty */
  endpoint: string
}

/**
 * Single-email invitation card (Phase 8 dedup of the previously duplicated
 * student and faculty invite forms). The caller supplies resolved copy and the
 * endpoint; validation, submission state, and messaging behave exactly as the
 * two original inline forms did.
 */
export function AdminInviteCard({
  title,
  description,
  emailLabel,
  emailPlaceholder,
  submitLabel,
  submittingLabel,
  invalidEmailMessage,
  genericErrorMessage,
  successMessage,
  endpoint,
}: AdminInviteCardProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!EMAIL_VALIDATE_REGEX.test(normalizedEmail)) {
      setError(invalidEmailMessage)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(result.error || genericErrorMessage)
        setLoading(false)
        return
      }

      setMessage(successMessage)
      setEmail('')
    } catch {
      setError(genericErrorMessage)
    }

    setLoading(false)
  }

  return (
    <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="max-w-3xl">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
          {description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {emailLabel}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={emailPlaceholder}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? submittingLabel : submitLabel}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}
    </div>
  )
}
