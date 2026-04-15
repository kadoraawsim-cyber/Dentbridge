import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function StudentRequestsPage() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'student') {
    redirect('/student/login')
  }

  const { data: myRequests } = await supabase
    .from('student_case_requests')
    .select('id, case_id, status, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  const caseIds = (myRequests ?? []).map((r) => r.case_id)

  let caseMap: Record<
    string,
    {
      treatment_type: string
      assigned_department: string | null
      urgency: string
      city: string | null
    }
  > = {}

  if (caseIds.length > 0) {
    const { data: caseRows } = await supabase
      .from('patient_requests')
      .select('id, treatment_type, assigned_department, urgency, city')
      .in('id', caseIds)

    caseMap = Object.fromEntries(
      (caseRows ?? []).map((c) => [
        c.id,
        {
          treatment_type: c.treatment_type,
          assigned_department: c.assigned_department,
          urgency: c.urgency,
          city: c.city,
        },
      ])
    )
  }

  function getStatusStyles(status: string) {
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case 'pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'rejected':
        return 'bg-red-50 text-red-700 border border-red-200'
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200'
    }
  }

  function getUrgencyStyles(urgency: string) {
    switch ((urgency || '').toLowerCase()) {
      case 'high':
        return 'bg-red-50 text-red-700 border border-red-200'
      case 'medium':
        return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200'
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/dentbridge-icon.png" alt="DentBridge" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-[15px] font-bold leading-none text-slate-900">DentBridge</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Clinical Platform
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/student/dashboard"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/student/cases"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Case Pool
            </Link>
            <Link
              href="/student/requests"
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900"
            >
              My Requests
            </Link>
            <Link
              href="/student/exchange"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Exchange
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/student/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-800"
        >
          ← Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Requests</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            Track all case requests you have submitted and see their current approval status.
          </p>
        </div>

        {!myRequests || myRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-700">No requests yet</p>
            <p className="mt-1.5 max-w-xs text-sm text-slate-400">
              You have not requested any cases yet. Browse the case pool to submit your first request.
            </p>
            <Link
              href="/student/cases"
              className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse Case Pool
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {myRequests.map((req) => {
              const caseInfo = caseMap[req.case_id]

              return (
                <article
                  key={req.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      REQ #{req.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusStyles(
                        req.status
                      )}`}
                    >
                      {req.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="p-5">
                    <p className="text-base font-bold text-slate-900">
                      {caseInfo?.treatment_type || 'Case'}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {caseInfo?.assigned_department && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200">
                          {caseInfo.assigned_department}
                        </span>
                      )}

                      {caseInfo?.urgency && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getUrgencyStyles(
                            caseInfo.urgency
                          )}`}
                        >
                          {caseInfo.urgency.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {caseInfo?.city && (
                      <p className="mt-3 text-sm text-slate-500">City: {caseInfo.city}</p>
                    )}

                    <p className="mt-2 text-sm text-slate-500">
                      Submitted: {formatDate(req.created_at)}
                    </p>

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {req.status === 'pending' && 'Your request is waiting for faculty review.'}
                      {req.status === 'approved' &&
                        'Your request was approved. Continue from the dashboard.'}
                      {req.status === 'rejected' &&
                        'Your request was declined for this case.'}
                    </div>

                    {req.status === 'approved' && (
                      <Link
                        href="/student/dashboard"
                        className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Go to Dashboard
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}