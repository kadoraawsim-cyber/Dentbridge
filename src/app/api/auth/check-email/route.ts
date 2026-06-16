import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

interface CheckEmailBody {
  email?: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

async function emailExistsInProfiles(email: string) {
  const supabaseAdmin = createSupabaseAdminClient()

  const [studentResult, facultyResult] = await Promise.all([
    supabaseAdmin
      .from('student_profiles')
      .select('id')
      .eq('email', email)
      .limit(1),
    supabaseAdmin
      .from('faculty_profiles')
      .select('id')
      .eq('email', email)
      .limit(1),
  ])

  if (studentResult.error || facultyResult.error) {
    throw new Error('profile_lookup_failed')
  }

  return Boolean((studentResult.data ?? []).length || (facultyResult.data ?? []).length)
}

async function emailExistsInAuthUsers(email: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  const perPage = 1000
  const maxPages = 10

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw new Error('auth_lookup_failed')
    }

    const users = data.users ?? []
    if (users.some((user) => normalizeEmail(user.email ?? '') === email)) {
      return true
    }

    if (users.length < perPage) {
      return false
    }
  }

  return false
}

export async function POST(request: NextRequest) {
  let body: CheckEmailBody

  try {
    body = (await request.json()) as CheckEmailBody
  } catch {
    return NextResponse.json({ exists: false }, { status: 400 })
  }

  const email = normalizeEmail(body.email ?? '')

  if (!email) {
    return NextResponse.json({ exists: false })
  }

  try {
    const existsInProfiles = await emailExistsInProfiles(email)

    if (existsInProfiles) {
      return NextResponse.json({ exists: true })
    }

    const existsInAuth = await emailExistsInAuthUsers(email)
    return NextResponse.json({ exists: existsInAuth })
  } catch {
    return NextResponse.json({ exists: false }, { status: 500 })
  }
}
