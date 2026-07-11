import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('patient request browser-storage privacy', () => {
  it('does not persist patient, clinical, file, or consent drafts', () => {
    const source = readFileSync('src/app/patient/request/page.tsx', 'utf8')
    expect(source).not.toMatch(/sessionStorage|localStorage/)
    expect(source).not.toMatch(/patient_request_draft|patient_request_step/)
  })
})
