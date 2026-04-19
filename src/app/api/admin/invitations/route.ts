import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const INVITE_REDIRECT_TO = 'https://dentbridgetr.com/auth/callback'

interface InviteRequestBody {
  email?: string
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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

  if (user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: InviteRequestBody
  try {
    body = (await request.json()) as InviteRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient()

    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: INVITE_REDIRECT_TO,
      data: {
        invited_by: user.email ?? 'admin',
      },
    })

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    if (data.user?.id) {
      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user.id,
        {
          app_metadata: {
            ...(data.user.app_metadata ?? {}),
            role: 'student',
          },
        }
      )

      if (updateUserError) {
        return NextResponse.json({ error: updateUserError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      redirectTo: INVITE_REDIRECT_TO,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send invitation.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
