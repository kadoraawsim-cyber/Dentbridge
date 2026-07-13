import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { assertQuerySucceeded, DataLoadError } from '@/lib/data/data-load'

describe('dashboard data-load correctness', () => {
  it('distinguishes successful empty results from failed queries', () => {
    expect(() => assertQuerySucceeded(null, 'test.empty')).not.toThrow()
    expect(() => assertQuerySucceeded({ code: '42501' }, 'test.denied')).toThrow(DataLoadError)
    expect(() => assertQuerySucceeded({ code: '08006' }, 'test.retryable')).toThrow(DataLoadError)
  })

  it('checks every audited server page before rendering empty arrays', () => {
    for (const file of [
      'src/app/admin/page.tsx',
      'src/app/admin/requests/page.tsx',
      'src/app/student/cases/page.tsx',
      'src/app/student/dashboard/page.tsx',
      'src/app/student/planner/page.tsx',
    ]) {
      expect(readFileSync(file, 'utf8')).toContain('assertQuerySucceeded')
    }
    expect(readFileSync('src/app/student/requests/page.tsx', 'utf8')).toContain(
      'fetchStudentRequestedCases'
    )
  })
})
