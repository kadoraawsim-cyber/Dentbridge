/**
 * Client-only fetch wrapper for authenticated portal API calls.
 *
 * When a session expires (Supabase session time-box or inactivity timeout),
 * protected API routes return 401. Portal UIs must not surface that as a
 * generic inline error — the user needs to land back on their login page.
 * This wrapper detects exactly that case and performs a full-page redirect
 * to the portal's login route.
 *
 * Guarantees:
 * - Non-401 responses (success or error) are returned untouched; response
 *   bodies are never read here.
 * - Redirect targets are limited to the allowlisted portal login paths
 *   below — callers pick a portal, never a URL.
 * - On 401 the returned promise never settles: the page is navigating to
 *   the login screen, so the caller's inline error handling must not run.
 * - No retry, no sign-out call: the session is already gone server-side and
 *   the login pages handle any remaining local state.
 */

const PORTAL_LOGIN_PATHS = {
  admin: '/admin/login',
  student: '/student/login',
} as const

export type PortalName = keyof typeof PORTAL_LOGIN_PATHS

export async function portalFetch(
  portal: PortalName,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init)

  if (response.status === 401) {
    window.location.assign(PORTAL_LOGIN_PATHS[portal])
    return new Promise<Response>(() => {})
  }

  return response
}
