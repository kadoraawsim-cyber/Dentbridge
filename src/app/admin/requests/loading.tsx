export default function AdminRequestsLoading() {
  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="dentbridge-safe-header border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 sm:h-10 sm:w-10" />
            <div className="min-w-0 space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="hidden h-3 w-36 animate-pulse rounded bg-slate-100 sm:block" />
            </div>
          </div>
          <div className="hidden gap-3 md:flex">
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full max-w-lg animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100 sm:w-64" />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>

        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-5 w-56 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
