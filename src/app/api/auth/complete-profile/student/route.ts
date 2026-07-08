import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { getClientIp } from '@/lib/api/rate-limit'
import { isAllowedSameOriginRequest } from '@/lib/api/same-origin'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import { completeProfile } from '@/lib/profiles/profile-completion.service'
import { isStudentRole } from '@/lib/roles'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

function isJsonContentType(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') || ''
  return contentType.split(';')[0]?.trim().toLowerCase() === 'application/json'
}

function jsonError(status: number): NextResponse {
  return NextResponse.json(
    { error: 'Unable to complete profile.' },
    { status, headers: SECURITY_HEADERS }
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAllowedSameOriginRequest(request)) {
    return jsonError(400)
  }

  if (!isJsonContentType(request)) {
    return jsonError(415)
  }

  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return jsonError(401)
  }

  const invitedRole = user.user_metadata?.invited_role
  if (!isStudentRole(user.app_metadata?.role) || (invitedRole && invitedRole !== 'student')) {
    return jsonError(403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400)
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError(400)
  }

  const { fullName, phone } = body as { fullName?: unknown; phone?: unknown }
  const clientIp = getClientIp(request)
  const context = createAuditRequestContext(request, { ipAddress: clientIp })

  const result = await completeProfile({
    role: 'student',
    userId: user.id,
    userEmail: user.email,
    fullName,
    phone,
    context,
  })

  if (!result.ok) {
    return jsonError(result.reason === 'forbidden' ? 403 : 400)
  }

  return NextResponse.json({ success: true }, { status: 200, headers: SECURITY_HEADERS })
}
