'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Clock } from 'lucide-react'
import type { PoolCase, RequestInfo, ContactInfo } from './page'
import { useI18n } from '@/lib/i18n'
import { CasePoolCard } from '@/components/student/cases/CasePoolCard'
import {
  CasesEmptyState,
  CasesFilterBar,
  CasesPageHeader,
  type RequestFilter,
} from '@/components/student/cases/CasesControls'
import { CasesHeader } from '@/components/student/cases/CasesHeader'

interface Props {
  initialCases: PoolCase[]
  requestsByCaseId: Record<string, RequestInfo>
  contactDetails: Record<string, ContactInfo>
}

const DEPARTMENTS = [
  'All',
  'Endodontics',
  'Oral & Maxillofacial Surgery',
  'Periodontology',
  'Orthodontics',
  'Restorative Dentistry',
  'Prosthodontics',
  'Pedodontics',
  'Oral Radiology',
]

export function CasesClient({ initialCases, requestsByCaseId, contactDetails }: Props) {
  const router = useRouter()
  const { t } = useI18n()

  const [localRequests, setLocalRequests] =
    useState<Record<string, RequestInfo>>(requestsByCaseId)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [activeDepartment, setActiveDepartment] = useState('All')
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all')

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/student/login')
  }

  async function handleRequest(caseId: string) {
    if (submitting) return
    setSubmitting(caseId)
    setRequestErrors((prev) => { const next = { ...prev }; delete next[caseId]; return next })

    const res = await fetch(`/api/student/cases/${caseId}/request`, { method: 'POST' })
    setSubmitting(null)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }))
      setRequestErrors((prev) => ({
        ...prev,
        [caseId]: (body as { error?: string }).error ?? 'Request failed',
      }))
      return
    }

    const { data } = (await res.json()) as { data: { id: string; case_id: string; status: string } }
    setLocalRequests((prev) => ({
      ...prev,
      [caseId]: { requestId: data.id, status: 'pending' },
    }))
  }

  const myRequestCount = initialCases.filter((caseItem) => !!localRequests[caseItem.id]).length
  const pendingCount = Object.values(localRequests).filter((r) => r.status === 'pending').length

  const filtered = useMemo(() => {
    let result = initialCases

    if (requestFilter === 'my_requests') {
      result = result.filter((c) => !!localRequests[c.id])
    }

    if (activeDepartment !== 'All') {
      result = result.filter(
        (c) => (c.assigned_department || '').toLowerCase() === activeDepartment.toLowerCase()
      )
    }

    const q = searchTerm.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.treatment_type?.toLowerCase().includes(q) ||
          c.assigned_department?.toLowerCase().includes(q)
      )
    }

    return result
  }, [initialCases, searchTerm, activeDepartment, requestFilter, localRequests])

  function tTreatment(v: string): string {
    const map: Record<string, string> = {
      'Initial Examination / Consultation': t('request.treatments.initialExam'),
      'Dental Cleaning': t('request.treatments.cleaning'),
      'Fillings': t('request.treatments.fillings'),
      'Tooth Extraction': t('request.treatments.extraction'),
      'Root Canal Treatment': t('request.treatments.rootCanal'),
      'Gum Treatment': t('request.treatments.gum'),
      'Prosthetics / Crowns': t('request.treatments.prosthetics'),
      'Orthodontics': t('request.treatments.orthodontics'),
      'Pediatric Dentistry': t('request.treatments.pediatric'),
      'Esthetic Dentistry': t('request.treatments.esthetic'),
      'Other': t('request.treatments.other'),
    }
    return map[v] ?? v
  }

  function tDept(v: string | null): string {
    if (!v) return ''
    const map: Record<string, string> = {
      'Endodontics': t('landing.depts.endodontics.name'),
      'Oral & Maxillofacial Surgery': t('landing.depts.surgery.name'),
      'Orthodontics': t('landing.depts.orthodontics.name'),
      'Periodontology': t('landing.depts.periodontology.name'),
      'Restorative Dentistry': t('landing.depts.restorative.name'),
      'Prosthodontics': t('landing.depts.prosthodontics.name'),
      'Pedodontics': t('landing.depts.pedodontics.name'),
      'Oral Radiology': t('landing.depts.radiology.name'),
    }
    return map[v] ?? v
  }

  function tAvailability(v: string): string {
    const map: Record<string, string> = {
      'No Preference': t('request.dayNoPreference'),
      'Weekday Mornings': t('request.dayWeekdayMornings'),
      'Weekday Afternoons': t('request.dayWeekdayAfternoons'),
      'As Soon As Possible': t('request.dayAsSoonAsPossible'),
    }
    return map[v] ?? v
  }

  function tDuration(v: string): string {
    const map: Record<string, string> = {
      Today: t('request.durationToday'),
      'A few days': t('request.durationFewDays'),
      '1-2 weeks': t('request.durationOneToTwoWeeks'),
      'More than a month': t('request.durationMoreThanMonth'),
    }
    return map[v] ?? v
  }

  function tUrgency(v: string): string {
    switch ((v || '').toLowerCase()) {
      case 'high': return t('request.urgencyHigh')
      case 'medium': return t('request.urgencyMedium')
      case 'low': return t('request.urgencyLow')
      default: return v || 'Unknown'
    }
  }

  function tMedicalCondition(v: string | null): string {
    if (!v) return t('student.cases.noMedicalNote')

    const map: Record<string, string> = {
      None: t('request.medicalNone'),
      Diabetes: t('request.medicalDiabetes'),
      Pregnancy: t('request.medicalPregnancy'),
      'Blood thinner use': t('request.medicalBloodThinner'),
      Allergy: t('request.medicalAllergy'),
      Other: t('request.medicalOther'),
    }

    return map[v] ?? v
  }

  // Translate department display label (keep 'All' sentinel as-is for filter logic)
  function getDeptLabel(dept: string) {
    return dept === 'All' ? t('student.cases.filterAll') : tDept(dept)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <CasesHeader onSignOut={handleSignOut} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CasesPageHeader searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />

        <CasesFilterBar
          departments={DEPARTMENTS}
          requestFilter={requestFilter}
          activeDepartment={activeDepartment}
          initialCaseCount={initialCases.length}
          myRequestCount={myRequestCount}
          getDeptLabel={getDeptLabel}
          onRequestFilterChange={setRequestFilter}
          onDepartmentChange={setActiveDepartment}
        />

        {/* ── Pending requests note ──────────────────────────────────────── */}
        {pendingCount > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">
                {pendingCount === 1
                  ? t('student.cases.requestPendingReview')
                  : `${pendingCount} ${t('student.cases.requestsPendingReview')}`}
              </span>
              {' '}{t('student.cases.pendingNoteNotify')}
            </p>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <CasesEmptyState
            requestFilter={requestFilter}
            initialCaseCount={initialCases.length}
            activeDepartment={activeDepartment}
            searchTerm={searchTerm}
            onClearFilters={() => {
              setRequestFilter('all')
              setActiveDepartment('All')
              setSearchTerm('')
            }}
          />
        )}

        {/* ── Case grid ────────────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((c) => {
              return (
                <CasePoolCard
                  key={c.id}
                  caseItem={c}
                  myRequest={localRequests[c.id]}
                  contact={contactDetails[c.id]}
                  isSubmitting={submitting === c.id}
                  error={requestErrors[c.id]}
                  onRequest={handleRequest}
                  tTreatment={tTreatment}
                  tDept={tDept}
                  tAvailability={tAvailability}
                  tDuration={tDuration}
                  tUrgency={tUrgency}
                  tMedicalCondition={tMedicalCondition}
                  tAttachmentSummary={(caseItem) =>
                    caseItem.has_attachment
                      ? t('student.cases.oneImageAttachment')
                      : t('student.cases.noAttachments')
                  }
                />
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
