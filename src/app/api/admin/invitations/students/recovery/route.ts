import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isAdminRole, isStudentRole } from '@/lib/roles'

const STUDENT_SETUP_REDIRECT_TO = 'https://dentbridgetr.com/auth/set-password/student'

interface RecoveryRequestBody {
  email?: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const supabaseAdmin = createSupabaseAdminClient()
  const perPage = 1000
  const maxPages = 10

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw new Error(error.message)
    }

    const user = (data.users ?? []).find(
      (candidate) => normalizeEmail(candidate.email ?? '') === email
    )

    if (user) {
      return user
    }

    if ((data.users ?? []).length < perPage) {
      return null
    }
  }

  return null
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

  let body: RecoveryRequestBody
  try {
    body = (await request.json()) as RecoveryRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = normalizeEmail(body.email ?? '')

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }

  try {
    const existingUser = await findAuthUserByEmail(email)

    if (!existingUser) {
      return NextResponse.json({ error: 'No existing auth user was found.' }, { status: 404 })
    }

    if (!isStudentRole(existingUser.app_metadata?.role)) {
      return NextResponse.json(
        { error: 'The existing account is not a student account.' },
        { status: 409 }
      )
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: STUDENT_SETUP_REDIRECT_TO,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      email,
      redirectTo: STUDENT_SETUP_REDIRECT_TO,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to send account setup recovery link.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
