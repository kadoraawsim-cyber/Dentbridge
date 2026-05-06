export default function StudentPlannerLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-5 w-36 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-100" />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.95fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="px-3 py-3">
                  <div className="mx-auto h-3 w-10 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }).map((_, index) => (
                <div key={index} className="min-h-[96px] border-r border-b border-slate-100 px-2 py-3 sm:min-h-[120px]">
                  <div className="h-5 w-5 animate-pulse rounded-full bg-slate-100" />
                  {index % 3 === 0 && <div className="mt-3 h-7 animate-pulse rounded-lg bg-slate-100" />}
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 space-y-3">
                  <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </aside>
        </div>
      </section>
    </main>
  )
}
