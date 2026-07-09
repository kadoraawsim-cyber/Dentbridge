'use client'

import Link from 'next/link'
import { ArrowLeft, CalendarDays, Plus } from 'lucide-react'

import { useI18n } from '@/lib/i18n'

interface PlannerHeroProps {
  onAddEvent: () => void
}

export function PlannerHero({ onAddEvent }: PlannerHeroProps) {
  const { t } = useI18n()

  return (
    <>
      <Link
        href="/student/dashboard"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('student.planner.backToDashboard')}
      </Link>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            <CalendarDays className="h-3.5 w-3.5" />
            {t('student.nav.planner')}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {t('student.planner.pageTitle')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            {t('student.planner.pageDesc')}
          </p>
        </div>

        <button
          type="button"
          onClick={onAddEvent}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          {t('student.planner.addEvent')}
        </button>
      </div>
    </>
  )
}
