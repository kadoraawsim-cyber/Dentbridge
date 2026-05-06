export default function AdminRequestDetailLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-44 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="hidden gap-3 md:flex">
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 h-5 w-36 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-7 w-64 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-7 w-28 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 h-5 w-44 animate-pulse rounded bg-slate-200" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 h-5 w-36 animate-pulse rounded bg-slate-200" />
              <div className="aspect-video animate-pulse rounded-xl bg-slate-100" />
              <div className="mt-4 h-10 animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 space-y-3">
                <div className="h-4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
