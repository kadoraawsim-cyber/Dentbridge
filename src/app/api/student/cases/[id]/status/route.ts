import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getClientIp } from '@/lib/api/rate-limit'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import { updateStudentCaseStatus } from '@/lib/cases/student-case-status.service'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * PATCH /api/student/cases/[id]/status
 *
 * Allows an approved student to advance their existing case through the current
 * Phase 5 lifecycle. Phase 6 keeps the existing statuses and moves the
 * sensitive multi-table mutations into the DentBridge service boundary.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.app_metadata?.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const context = createAuditRequestContext(request, { ipAddress: getClientIp(request) })
  const result = await updateStudentCaseStatus({
    caseId: id,
    actor: {
      userId: user.id,
      email: user.email ?? null,
      role: user.app_metadata?.role,
    },
    body,
    context,
  })

  return NextResponse.json(result.body, { status: result.status })
}
