'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useI18n } from '@/lib/i18n'

import type { PlannerView } from './types'

interface PlannerToolbarProps {
  view: PlannerView
  periodLabel: string
  onViewChange: (view: PlannerView) => void
  onPrevious: () => void
  onToday: () => void
  onNext: () => void
}

export function PlannerToolbar({
  view,
  periodLabel,
  onViewChange,
  onPrevious,
  onToday,
  onNext,
}: PlannerToolbarProps) {
  const { t } = useI18n()

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(['month', 'week', 'day'] as PlannerView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onViewChange(option)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                view === option
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {option === 'month'
                ? t('student.planner.monthView')
                : option === 'week'
                  ? t('student.planner.weekView')
                  : t('student.planner.dayView')}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('student.planner.previous')}
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {t('student.planner.today')}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {t('student.planner.next')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {periodLabel}
        </h2>
      </div>
    </>
  )
}
