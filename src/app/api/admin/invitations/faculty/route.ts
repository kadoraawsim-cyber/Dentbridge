import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { inviteUserWithRole } from '@/lib/auth-invitations'
import { isAdminRole } from '@/lib/roles'
import { getClientIp } from '@/lib/api/rate-limit'
import { createAuditRequestContext } from '@/lib/audit/audit.service'

const fallbackUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || fallbackUrl).replace(/\/$/, '')
const INVITE_REDIRECT_TO = process.env.INVITE_REDIRECT_URL || `${appUrl}/auth/callback`

interface InviteRequestBody {
  email?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdminRole(user.app_metadata?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: InviteRequestBody
  try {
    body = (await request.json()) as InviteRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const result = await inviteUserWithRole({
      email: body.email || '',
      role: 'faculty',
      invitedBy: user.email ?? 'admin',
      redirectTo: INVITE_REDIRECT_TO,
      context: createAuditRequestContext(request, { ipAddress: getClientIp(request) }),
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[admin-invitations:faculty] Failed to send invitation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
