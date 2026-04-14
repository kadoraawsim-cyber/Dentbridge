import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Handles the redirect back from Supabase after:
 *   - Email confirmation links
 *   - Password reset links
 *
 * Supabase redirects the user to /auth/callback?code=<code>
 * This route exchanges the code for a session, then sends
 * the user to their correct portal.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const role = data.user.app_metadata?.role

      if (role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`)
      }
      if (role === 'student') {
        return NextResponse.redirect(`${origin}/student/dashboard`)
      }
    }
  }

  // Fallback: send to login if code is missing or exchange failed.
  return NextResponse.redirect(`${origin}/login`)
}
