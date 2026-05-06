export default function AdminRequestsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="hidden gap-3 md:flex">
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
