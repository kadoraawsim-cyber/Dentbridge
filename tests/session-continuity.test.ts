import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('session continuity', () => {
  it('does not sign users out during normal public navigation', () => {
    for (const file of ['src/app/page.tsx', 'src/app/patients/patients-client.tsx']) {
      const source = readFileSync(file, 'utf8')
      expect(source).not.toContain('auth.signOut')
      expect(source).not.toContain('clearActiveSession')
    }
  })

  it('retains explicit portal logout controls', () => {
    const admin = readFileSync('src/app/admin/dashboard-client.tsx', 'utf8')
    const student = readFileSync('src/app/student/dashboard/dashboard-client.tsx', 'utf8')
    expect(admin).toContain('auth.signOut()')
    expect(student).toContain('auth.signOut()')
  })
})
