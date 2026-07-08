import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getClientIp } from '@/lib/api/rate-limit'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import { addStudentProgress } from '@/lib/cases/student-progress.service'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const result = await addStudentProgress({
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
