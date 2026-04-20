import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { canAccessFacultyPortal, getAppRole } from '@/lib/roles'

/**
 * Route protection rules:
 *
 *  /admin/*    → requires role = 'admin' or 'faculty'
 *  /student/*  → requires role = 'student'
 *
 * Explicit pass-throughs (never auth-checked):
 *  /admin/login      — the admin login page itself
 *  /student/login    — the student login page itself
 *  /auth/callback    — Supabase email-confirmation redirect handler
 *
 * Any authenticated user with no recognised role is sent to their
 * role-specific login page.
 * A student reaching /admin/* is redirected to /student/dashboard.
 * A faculty member or admin reaching /student/* is redirected to /admin.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isStudentRoute = pathname.startsWith('/student')

  // ── Explicit pass-throughs ─────────────────────────────────────────────────
  // These must be reachable without a session — checking them before any
  // auth logic prevents redirect loops and blocks the auth callback.
  if (
    pathname === '/admin/login' ||
    pathname === '/student/login' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  // Neither portal — pass through (public routes, /login, static assets, etc.)
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

  // getUser() makes a live network call to validate the JWT with Supabase Auth.
  // Intentionally used instead of getSession() — a tampered local JWT cannot
  // bypass this check.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!user) {
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.redirect(new URL('/student/login', request.url))
  }

  const role = getAppRole(user.app_metadata?.role)

  // ── No valid role ──────────────────────────────────────────────────────────
  if (!role) {
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.redirect(new URL('/student/login', request.url))
  }

  // ── Wrong role for the route ───────────────────────────────────────────────
  if (isAdminRoute && !canAccessFacultyPortal(role)) {
    // Student trying to reach /admin/*
    return NextResponse.redirect(new URL('/student/dashboard', request.url))
  }

  if (isStudentRoute && role !== 'student') {
    // Faculty/admin trying to reach /student/*
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // ── Authorised ────────────────────────────────────────────────────────────
  return response
}

export const config = {
  /*
   * Match /admin and all sub-paths, and /student and all sub-paths.
   * /admin/login and /student/login are in this matcher but are handled
   * by the explicit pass-through at the top of the function body.
   */
  matcher: [
    '/admin',
    '/admin/:path*',
    '/student',
    '/student/:path*',
  ],
}
