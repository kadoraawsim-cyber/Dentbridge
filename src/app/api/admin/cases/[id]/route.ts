import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getClientIp } from '@/lib/api/rate-limit'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import { executeAdminCaseAction } from '@/lib/cases/admin-case-actions.service'
import { canAccessFacultyPortal } from '@/lib/roles'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * PATCH /api/admin/cases/[id]
 *
 * Server-side gateway for faculty/admin case actions. Authentication happens in
 * the route; the Phase 6 service performs explicit role/authorization checks
 * and owns the sensitive service-role mutations.
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

  if (!canAccessFacultyPortal(user.app_metadata?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const context = createAuditRequestContext(request, { ipAddress: getClientIp(request) })
  return executeAdminCaseAction({
    caseId: id,
    body,
    actor: {
      userId: user.id,
      email: user.email ?? null,
      role: user.app_metadata?.role,
    },
    context,
  })
}
