import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Route protection rules:
 *
 *  /admin/*    → requires role = 'admin'
 *  /student/*  → requires role = 'student'
 *
 * Public routes (/, /patient/*, /login, /auth/*) are never intercepted.
 * Any authenticated user with no recognised role is sent back to /login.
 * A student trying to reach /admin/* is sent to /student/dashboard.
 * An admin trying to reach /student/* is sent to /admin.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isStudentRoute = pathname.startsWith('/student')

  // Neither portal — pass through (public routes, /login, /auth/callback, etc.)
  if (!isAdminRoute && !isStudentRoute) {
    return NextResponse.next()
  }

  // Build a response object so @supabase/ssr can refresh cookies on the way out.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies to the outgoing request AND response so the session
          // is refreshed transparently on every navigation.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() makes a network call to validate the JWT with Supabase Auth.
  // This is intentionally used instead of getSession() so a tampered local
  // JWT cannot bypass the check.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const role = user.app_metadata?.role as string | undefined

  // ── No valid role ──────────────────────────────────────────────────────────
  if (role !== 'admin' && role !== 'student') {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // ── Wrong role for the route ───────────────────────────────────────────────
  if (isAdminRoute && role !== 'admin') {
    // Student or any other non-admin trying to reach /admin/*
    return NextResponse.redirect(new URL('/student/dashboard', request.url))
  }

  if (isStudentRoute && role !== 'student') {
    // Admin or any other non-student trying to reach /student/*
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // ── Authorised ────────────────────────────────────────────────────────────
  return response
}

export const config = {
  /*
   * Match /admin and all sub-paths, and /student and all sub-paths.
   * Explicitly excludes Next.js internals and static files.
   */
  matcher: [
    '/admin',
    '/admin/:path*',
    '/student',
    '/student/:path*',
  ],
}
