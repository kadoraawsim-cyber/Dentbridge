'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Filter, RefreshCw, Search } from 'lucide-react'

import { useI18n } from '@/lib/i18n'

export type RequestFilter = 'all' | 'my_requests'

interface CasesPageHeaderProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
}

export function CasesPageHeader({ searchTerm, onSearchTermChange }: CasesPageHeaderProps) {
  const { t } = useI18n()

  return (
    <div className="mb-6">
      <Link
        href="/student/dashboard"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('student.cases.backToDashboard')}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {t('student.cases.pageTitle')}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            {t('student.cases.pageDesc')}
          </p>
        </div>

        <div className="relative w-full max-w-xs shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('student.cases.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>
      </div>
    </div>
  )
}

interface CasesFilterBarProps {
  departments: string[]
  requestFilter: RequestFilter
  activeDepartment: string
  initialCaseCount: number
  myRequestCount: number
  getDeptLabel: (department: string) => string
  onRequestFilterChange: (filter: RequestFilter) => void
  onDepartmentChange: (department: string) => void
}

export function CasesFilterBar({
  departments,
  requestFilter,
  activeDepartment,
  initialCaseCount,
  myRequestCount,
  getDeptLabel,
  onRequestFilterChange,
  onDepartmentChange,
}: CasesFilterBarProps) {
  const { t } = useI18n()

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onRequestFilterChange('all')}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            requestFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          {t('student.cases.filterAll')}
          {initialCaseCount > 0 && (
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              requestFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {initialCaseCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onRequestFilterChange('my_requests')}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            requestFilter === 'my_requests'
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          {t('student.cases.filterMyRequests')}
          {myRequestCount > 0 && (
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              requestFilter === 'my_requests' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              {myRequestCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <Filter className="h-3 w-3" />
          {t('student.cases.deptLabel')}
        </div>
        {departments.map((dept) => (
          <button
            key={dept}
            type="button"
            onClick={() => onDepartmentChange(dept)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              activeDepartment === dept
                ? 'bg-blue-900 text-white'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {getDeptLabel(dept)}
          </button>
        ))}
      </div>
    </div>
  )
}

interface CasesEmptyStateProps {
  requestFilter: RequestFilter
  initialCaseCount: number
  activeDepartment: string
  searchTerm: string
  onClearFilters: () => void
}

export function CasesEmptyState({
  requestFilter,
  initialCaseCount,
  activeDepartment,
  searchTerm,
  onClearFilters,
}: CasesEmptyStateProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {requestFilter === 'my_requests' ? (
          <Calendar className="h-7 w-7" />
        ) : (
          <Search className="h-7 w-7" />
        )}
      </div>
      <p className="text-base font-semibold text-slate-700">
        {requestFilter === 'my_requests'
          ? t('student.cases.emptyNoRequests')
          : initialCaseCount === 0
          ? t('student.cases.emptyNoPool')
          : t('student.cases.emptyNoMatch')}
      </p>
      <p className="mt-1.5 max-w-xs text-sm text-slate-400">
        {requestFilter === 'my_requests'
          ? t('student.cases.emptyNoRequestsDesc')
          : initialCaseCount === 0
          ? t('student.cases.emptyNoPoolDesc')
          : t('student.cases.emptyNoMatchDesc')}
      </p>
      {(requestFilter === 'my_requests' || activeDepartment !== 'All' || searchTerm) && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('student.cases.clearFilters')}
        </button>
      )}
    </div>
  )
}
