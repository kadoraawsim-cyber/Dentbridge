export default function StudentDashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 sm:h-9 sm:w-9" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
            <div className="hidden h-8 w-20 animate-pulse rounded-lg bg-slate-100 sm:block" />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-8 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200 sm:h-14 sm:w-14" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-8 w-16 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 hidden h-4 w-36 animate-pulse rounded bg-slate-100 sm:block" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-5 h-9 w-32 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
