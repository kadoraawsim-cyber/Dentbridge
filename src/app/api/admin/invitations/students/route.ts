import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { inviteUserWithRole } from '@/lib/auth-invitations'
import { isAdminRole } from '@/lib/roles'

const INVITE_REDIRECT_TO = 'https://dentbridgetr.com/auth/callback'

interface InviteRequestBody {
  email?: string
}

export async function POST(request: NextRequest) {
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
      role: 'student',
      invitedBy: user.email ?? 'admin',
      redirectTo: INVITE_REDIRECT_TO,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send invitation.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
