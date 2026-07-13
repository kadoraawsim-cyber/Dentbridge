import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { portalFetch } from '@/lib/api/portal-fetch'

/**
 * Session-expiry UX patch:
 *  - portalFetch redirects to the correct portal login page on 401 and leaves
 *    every other response untouched.
 *  - The admin login page validates the session server-side (getUser) instead
 *    of trusting the locally cached session (getSession), which would redirect
 *    a revoked-but-locally-cached session to /admin and loop with the proxy.
 *
 * Component render tests are not possible here (node test environment, no
 * React testing library), so page-level guarantees follow the established
 * source-assertion pattern from session-continuity.test.ts.
 */

function makeResponse(status: number): Response {
  return { status } as Response
}

describe('portalFetch', () => {
  const assign = vi.fn()
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('window', { location: { assign } })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects a student portal 401 to /student/login', async () => {
    fetchMock.mockResolvedValue(makeResponse(401))

    const result = portalFetch('student', '/api/student/cases/abc/request', { method: 'POST' })

    // The promise must never settle on 401 so the caller's inline error path
    // cannot run while the page navigates to the login screen.
    const settled = await Promise.race([
      result.then(
        () => 'settled',
        () => 'settled'
      ),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 20)),
    ])

    expect(assign).toHaveBeenCalledExactlyOnceWith('/student/login')
    expect(settled).toBe('pending')
  })

  it('redirects an admin portal 401 to /admin/login', async () => {
    fetchMock.mockResolvedValue(makeResponse(401))

    void portalFetch('admin', '/api/admin/cases/abc', { method: 'PATCH' })
    await vi.waitFor(() => expect(assign).toHaveBeenCalled())

    expect(assign).toHaveBeenCalledExactlyOnceWith('/admin/login')
  })

  it.each([200, 400, 403, 404, 409, 422, 429, 500])(
    'returns a %i response untouched without redirecting',
    async (status) => {
      const response = makeResponse(status)
      fetchMock.mockResolvedValue(response)

      const result = await portalFetch('student', '/api/student/planner')

      expect(result).toBe(response)
      expect(assign).not.toHaveBeenCalled()
    }
  )

  it('passes the request through to fetch unchanged', async () => {
    fetchMock.mockResolvedValue(makeResponse(200))
    const init = { method: 'PATCH', body: '{"action":"approve"}' }

    await portalFetch('admin', '/api/admin/cases/abc', init)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/admin/cases/abc', init)
  })
})

describe('admin login session check', () => {
  const adminLogin = readFileSync('src/app/admin/login/page.tsx', 'utf8')
  const studentLogin = readFileSync('src/app/student/login/page.tsx', 'utf8')

  it('uses server-validated getUser() rather than the stale local session', () => {
    expect(adminLogin).toContain('auth.getUser()')
    expect(adminLogin).not.toContain('auth.getSession(')
  })

  it('shows the login form for an expired session instead of looping', () => {
    // getUser() returns no user for an expired/revoked session; the page must
    // fall through to the form (setChecking(false)) rather than redirecting.
    expect(adminLogin).toContain('setChecking(false)')
    // Redirect target stays the portal root, chosen only for a validated user.
    expect(adminLogin).toContain("router.replace('/admin')")
    // The check must not sign the user out automatically.
    expect(adminLogin).not.toContain('getUser().then(({ data: { user } }) => signOut')
  })

  it('keeps the cross-portal role-mismatch screens on both login pages', () => {
    expect(adminLogin).toContain('setRoleMismatch(true)')
    expect(studentLogin).toContain('setRoleMismatch(true)')
  })
})

describe('portal clients route 401s through portalFetch', () => {
  it.each([
    'src/app/student/dashboard/dashboard-client.tsx',
    'src/app/student/cases/cases-client.tsx',
    'src/app/student/planner/planner-client.tsx',
  ])('%s uses the student portal login on 401', (file) => {
    const source = readFileSync(file, 'utf8')
    expect(source).toContain("portalFetch(")
    expect(source).toContain("'student'")
    expect(source).not.toMatch(/await fetch\(/)
  })

  it.each([
    'src/app/admin/requests/requests-client.tsx',
    'src/app/admin/requests/[id]/detail-client.tsx',
  ])('%s uses the admin portal login on 401', (file) => {
    const source = readFileSync(file, 'utf8')
    expect(source).toContain("portalFetch('admin'")
    expect(source).not.toMatch(/[^l]fetch\(/)
  })
})
