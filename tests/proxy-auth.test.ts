import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser: mocks.getUser } })),
}))

import { proxy } from '@/proxy'

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`)
}

beforeEach(() => mocks.getUser.mockReset())

describe('protected-route proxy', () => {
  it.each(['/admin', '/admin/requests'])('redirects anonymous admin access from %s', async (path) => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const response = await proxy(request(path))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin/login')
  })

  it('redirects a wrong-role student away from admin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { app_metadata: { role: 'student' } } } })
    const response = await proxy(request('/admin'))
    expect(response.headers.get('location')).toBe('http://localhost:3000/student/dashboard')
  })

  it('redirects faculty away from student routes', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { app_metadata: { role: 'faculty' } } } })
    const response = await proxy(request('/student/dashboard'))
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin')
  })

  it.each([
    ['/admin', 'admin'],
    ['/admin', 'faculty'],
    ['/student/dashboard', 'student'],
  ])('allows the correct role on %s', async (path, role) => {
    mocks.getUser.mockResolvedValue({ data: { user: { app_metadata: { role } } } })
    const response = await proxy(request(path))
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('treats an expired or tampered session as anonymous', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } })
    const response = await proxy(request('/student/cases'))
    expect(response.headers.get('location')).toBe('http://localhost:3000/student/login')
  })
})
