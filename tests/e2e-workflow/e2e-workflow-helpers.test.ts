import { describe, expect, it } from 'vitest'

import { buildPatientPayload, buildWorkflowSeed } from './lib/data.mts'
import { parseDotenv } from './lib/env.mts'
import {
  assertNoOtpOrSmsRoute,
  assertSafeTarget,
  buildRunIdMarker,
  facultyForCase,
  hasExactRunIdMarker,
  parseCliOptions,
  studentForCase,
  validateRunId,
} from './lib/safety.mts'

describe('e2e workflow helper safety', () => {
  it('parses local env templates without exposing shell syntax', () => {
    expect(
      parseDotenv(`
        E2E_STUDENT_A_EMAIL="student-a@example.test"
        E2E_STUDENT_A_PASSWORD='secret'
        # ignored
      `)
    ).toEqual({
      E2E_STUDENT_A_EMAIL: 'student-a@example.test',
      E2E_STUDENT_A_PASSWORD: 'secret',
    })
  })

  it('defaults to localhost and permits only the supported workflow modes', () => {
    expect(parseCliOptions([], {}).baseUrl).toBe('http://localhost:3000')
    expect(parseCliOptions(['--workflows=2'], {}).workflows).toBe(2)
    expect(parseCliOptions(['--workflows=5'], {}).workflows).toBe(5)
    expect(parseCliOptions(['--workflows=10', '--concurrency=10'], {}).concurrency).toBe(10)
    expect(() => parseCliOptions(['--workflows=11'], {})).toThrow('2, 5, or 10')
  })

  it('rejects SQL LIKE wildcard characters in run IDs', () => {
    expect(validateRunId('abc-123')).toBe('abc-123')
    expect(() => validateRunId('abc_123')).toThrow('letters, numbers, and hyphens')
    expect(() => validateRunId('abc%123')).toThrow('letters, numbers, and hyphens')
    expect(() => parseCliOptions(['--run-id=abc_123'], {})).toThrow(
      'letters, numbers, and hyphens'
    )
  })

  it('refuses non-local targets unless production opt-in is explicit', () => {
    expect(() => assertSafeTarget('https://example.test', false)).toThrow('Refusing non-local')
    expect(assertSafeTarget('https://example.test', true).origin).toBe('https://example.test')
    expect(assertSafeTarget('http://127.0.0.1:3000', false).origin).toBe('http://127.0.0.1:3000')
  })

  it('uses deterministic account distribution across students and faculty', () => {
    expect([1, 3, 5, 7, 9].map(studentForCase)).toEqual(['A', 'A', 'A', 'A', 'A'])
    expect([2, 4, 6, 8, 10].map(studentForCase)).toEqual(['B', 'B', 'B', 'B', 'B'])
    expect([1, 2].map((caseNumber) => facultyForCase(caseNumber, 'triage'))).toEqual(['A', 'B'])
    expect([1, 2].map((caseNumber) => facultyForCase(caseNumber, 'student_request_approval'))).toEqual([
      'B',
      'A',
    ])
    expect([1, 2].map((caseNumber) => facultyForCase(caseNumber, 'final_approval'))).toEqual([
      'A',
      'B',
    ])
  })

  it('builds unique non-real patient data without invalid full-name characters', () => {
    const first = buildWorkflowSeed('e2e-test-run', 1)
    const second = buildWorkflowSeed('e2e-test-run', 2)
    expect(first.fullName).not.toBe(second.fullName)
    expect(first.fullName.replace(/[\p{L}\s'.-]/gu, '')).toBe('')
    expect(first.phone).not.toBe(second.phone)
    expect(first.syntheticEmail.endsWith('@example.test')).toBe(true)

    const payload = buildPatientPayload(first)
    expect(payload.complaintText).toContain('RUN_ID=[e2e-test-run]')
    expect(first.clinicalNotes).toContain('RUN_ID=[e2e-test-run]')
    expect(payload).not.toHaveProperty('email')
  })

  it('selects only exact bracketed run markers', () => {
    expect(buildRunIdMarker('abc-123')).toBe('RUN_ID=[abc-123]')
    expect(hasExactRunIdMarker('Synthetic RUN_ID=[abc-123] case', 'abc-123')).toBe(true)
    expect(hasExactRunIdMarker('Synthetic RUN_ID=[abc-1234] case', 'abc-123')).toBe(false)

    const rows = [
      { id: 'exact', complaint_text: 'Synthetic RUN_ID=[abc-123] case' },
      { id: 'longer', complaint_text: 'Synthetic RUN_ID=[abc-1234] case' },
      { id: 'legacy', complaint_text: 'Synthetic RUN_ID=abc-123 case' },
      { id: 'missing', complaint_text: 'Synthetic case' },
    ]

    expect(rows.filter((row) => hasExactRunIdMarker(row.complaint_text, 'abc-123'))).toEqual([
      rows[0],
    ])
  })

  it('blocks OTP, SMS, and Twilio routes in the workflow HTTP helper', () => {
    expect(() => assertNoOtpOrSmsRoute('/api/v1/patient/status/request-otp')).toThrow('OTP')
    expect(() => assertNoOtpOrSmsRoute('/api/twilio/test')).toThrow('OTP')
    expect(() => assertNoOtpOrSmsRoute('/api/admin/cases/123')).not.toThrow()
  })
})
