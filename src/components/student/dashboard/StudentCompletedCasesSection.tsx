'use client'

import type { CompletedCasesByDepartment, DashboardUiText, LiveActiveCase } from './types'

interface StudentCompletedCasesSectionProps {
  completedCases: LiveActiveCase[]
  completedCasesByDepartment: CompletedCasesByDepartment[]
  ui: DashboardUiText
  getCompletedDate: (caseItem: LiveActiveCase) => string
  formatTimelineDateTime: (iso: string) => string
}

export function StudentCompletedCasesSection({
  completedCases,
  completedCasesByDepartment,
  ui,
  getCompletedDate,
  formatTimelineDateTime,
}: StudentCompletedCasesSectionProps) {
  return (
    <div id="completed-cases" className="mb-6 sm:mb-10 w-full scroll-mt-24">
      <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            {ui.completedCases}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {ui.completedCasesDesc}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {completedCases.length}
        </span>
      </div>

      {completedCases.length === 0 ? (
        <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
          {ui.noCompletedCases}
        </div>
      ) : (
        <div className="space-y-4">
          {completedCasesByDepartment.map((group) => (
            <div
              key={group.department}
              className="overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">{group.department}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {group.cases.map((c) => {
                  const completedDate = getCompletedDate(c)

                  return (
                    <div
                      key={c.caseId}
                      className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {ui.caseReference}
                        </p>
                        <p className="mt-1 font-mono text-xs font-bold text-slate-700">
                          #{c.caseId.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {ui.completedDate}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {completedDate ? formatTimelineDateTime(completedDate) : ui.notRecorded}
                        </p>
                      </div>
                      <span className="inline-flex w-fit whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        {ui.completedStatus}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
