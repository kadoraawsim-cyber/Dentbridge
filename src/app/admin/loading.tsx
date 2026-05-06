export default function AdminDashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 sm:h-10 sm:w-10" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="hidden gap-3 md:flex">
            <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-8 w-16 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-3 w-28 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-slate-100 p-4 sm:grid-cols-[1.2fr_1fr_0.8fr_0.6fr]">
                <div className="h-4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
