import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getClientIp } from '@/lib/api/rate-limit'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import { createStudentCaseRequest } from '@/lib/cases/student-case-request.service'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * POST /api/student/cases/[id]/request
 *
 * Creates a student claim request for a pool case through the DentBridge API
 * boundary. The route authenticates the session; the service performs explicit
 * role and case/stage authorization before writing with the service role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params
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

  const context = createAuditRequestContext(request, { ipAddress: getClientIp(request) })
  const result = await createStudentCaseRequest({
    caseId,
    actor: {
      userId: user.id,
      email: user.email ?? null,
      role: user.app_metadata?.role,
    },
    context,
  })

  return NextResponse.json(result.body, { status: result.status })
}
