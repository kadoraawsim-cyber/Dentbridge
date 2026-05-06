export default function StudentCasesLoading() {
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
        <div className="mb-6">
          <div className="mb-4 h-5 w-36 animate-pulse rounded bg-slate-100" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100 sm:w-80" />
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-8 w-28 animate-pulse rounded-full bg-slate-100" />
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="mt-5 h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-5 h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
