import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildDatabaseDeletePlan,
  CleanupPreflightError,
  executeCleanupPlan,
  generateManualSqlCleanupPlan,
  removePlannedStorageObjects,
  type CleanupPlan,
} from './cleanup.mts'
import { buildPatientPayload, buildWorkflowSeed } from './lib/data.mts'
import { parseDotenv } from './lib/env.mts'
import {
  assertAcceptedPatientRequestConsents,
  CONSENT_RECORDS_CONSISTENCY_SELECT,
  type SupabaseServiceClient,
} from './lib/supabase-readers.mts'
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

function selectedColumns(select: string): string[] {
  return select.split(',').map((column) => column.trim()).filter(Boolean)
}

function databaseRowFields(table: string): string[] {
  const source = readFileSync('src/lib/database.types.ts', 'utf8')
  const tableIndex = source.indexOf(`${table}: {`)
  expect(tableIndex).toBeGreaterThanOrEqual(0)

  const rowIndex = source.indexOf('Row: {', tableIndex)
  expect(rowIndex).toBeGreaterThanOrEqual(0)

  const rowEnd = source.indexOf('Insert: {', rowIndex)
  expect(rowEnd).toBeGreaterThan(rowIndex)

  const rowBlock = source.slice(rowIndex, rowEnd)
  return Array.from(rowBlock.matchAll(/^\s{10}([a-zA-Z0-9_]+):/gm), (match) => match[1]!)
}

function cleanupPlan(overrides: Partial<CleanupPlan> = {}): CleanupPlan {
  return {
    runId: 'e2e-test-run',
    dryRun: false,
    patientRequestIds: ['case-1'],
    records: [],
    storageObjects: [],
    ...overrides,
  }
}

const emptyService = {} as SupabaseServiceClient

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

  it('keeps E2E consent verification aligned with generated consent_records columns', () => {
    const fields = new Set(databaseRowFields('consent_records'))
    expect(fields.has('accepted')).toBe(false)

    for (const column of selectedColumns(CONSENT_RECORDS_CONSISTENCY_SELECT)) {
      expect(fields.has(column), `Missing consent_records column ${column}`).toBe(true)
    }
  })

  it('verifies consent through real accepted consent fields', () => {
    const baseConsent = {
      consent_status: 'accepted',
      accepted_at: '2026-07-13T01:43:04.000Z',
      source: 'patient_request',
      withdrawn_at: null,
      document_title: 'Consent document',
      canonical_route: '/privacy',
    }

    expect(() =>
      assertAcceptedPatientRequestConsents([
        { ...baseConsent, consent_type: 'kvkk_acknowledgement' },
        { ...baseConsent, consent_type: 'explicit_consent' },
      ])
    ).not.toThrow()

    expect(() =>
      assertAcceptedPatientRequestConsents([
        { ...baseConsent, consent_type: 'kvkk_acknowledgement' },
        { ...baseConsent, consent_type: 'explicit_consent', consent_status: 'withdrawn' },
      ])
    ).toThrow('not accepted')

    expect(() =>
      assertAcceptedPatientRequestConsents([
        { ...baseConsent, consent_type: 'kvkk_acknowledgement' },
      ])
    ).toThrow('Missing consent record')
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

  it('does not issue cleanup delete calls for tables with an empty plan', async () => {
    const plan = cleanupPlan({
      records: [
        { table: 'consent_records', id: 'consent-1' },
        { table: 'patient_requests', id: 'case-1' },
      ],
    })
    const deleteCalls: string[] = []

    expect(buildDatabaseDeletePlan(plan.records)).toEqual([
      { table: 'consent_records', ids: ['consent-1'] },
      { table: 'patient_requests', ids: ['case-1'] },
    ])

    await executeCleanupPlan(emptyService, plan, {
      preflightDelete: async () => {},
      deleteRows: async (_service, deletion) => {
        deleteCalls.push(deletion.table)
        return deletion.ids
      },
      removeStorageObjects: async (_service, storageObjects) => ({
        requested: storageObjects,
        removed: [],
        alreadyRemoved: [],
      }),
    })

    expect(deleteCalls).toEqual(['consent_records', 'patient_requests'])
    expect(deleteCalls).not.toContain('case_decision_history')
  })

  it('stops before Storage or database mutations when cleanup preflight fails', async () => {
    const plan = cleanupPlan({
      records: [{ table: 'patient_requests', id: 'case-1' }],
      storageObjects: ['patient/case-1/original.jpg'],
    })
    const dbMutations: string[] = []
    const storageMutations: string[] = []

    await expect(
      executeCleanupPlan(emptyService, plan, {
        preflightDelete: async () => {
          throw new Error('permission denied for table patient_requests')
        },
        deleteRows: async (_service, deletion) => {
          dbMutations.push(deletion.table)
          return deletion.ids
        },
        removeStorageObjects: async (_service, storageObjects) => {
          storageMutations.push(...storageObjects)
          return { requested: storageObjects, removed: storageObjects, alreadyRemoved: [] }
        },
      })
    ).rejects.toBeInstanceOf(CleanupPreflightError)

    expect(dbMutations).toEqual([])
    expect(storageMutations).toEqual([])
  })

  it('runs Storage cleanup only after database preflight succeeds', async () => {
    const plan = cleanupPlan({
      records: [
        { table: 'consent_records', id: 'consent-1' },
        { table: 'patient_requests', id: 'case-1' },
      ],
      storageObjects: ['patient/case-1/original.jpg'],
    })
    const events: string[] = []

    await executeCleanupPlan(emptyService, plan, {
      preflightDelete: async (_service, deletion) => {
        events.push(`preflight:${deletion.table}`)
      },
      deleteRows: async (_service, deletion) => {
        events.push(`db:${deletion.table}`)
        return deletion.ids
      },
      removeStorageObjects: async (_service, storageObjects) => {
        events.push('storage')
        return { requested: storageObjects, removed: storageObjects, alreadyRemoved: [] }
      },
    })

    expect(events).toEqual([
      'preflight:consent_records',
      'preflight:patient_requests',
      'db:consent_records',
      'db:patient_requests',
      'storage',
    ])
  })

  it('uses exact cleanup record IDs for database deletions and manual SQL', async () => {
    const plan = cleanupPlan({
      records: [
        { table: 'consent_records', id: 'consent-1', extra: { patient_request_id: 'case-1' } },
        { table: 'patient_requests', id: 'case-1' },
        { table: 'patient_requests', id: 'case-2' },
        { table: 'patient_requests', id: 'case-2' },
      ],
    })
    const deleteCalls: Array<{ table: string; ids: string[] }> = []

    await executeCleanupPlan(emptyService, plan, {
      preflightDelete: async () => {},
      deleteRows: async (_service, deletion) => {
        deleteCalls.push({ table: deletion.table, ids: deletion.ids })
        return deletion.ids
      },
      removeStorageObjects: async (_service, storageObjects) => ({
        requested: storageObjects,
        removed: [],
        alreadyRemoved: [],
      }),
    })

    expect(deleteCalls).toEqual([
      { table: 'consent_records', ids: ['consent-1'] },
      { table: 'patient_requests', ids: ['case-1', 'case-2'] },
    ])

    const manualSql = generateManualSqlCleanupPlan(plan)
    expect(manualSql).toContain("delete from public.consent_records where id in ('consent-1');")
    expect(manualSql).toContain("delete from public.patient_requests where id in ('case-1', 'case-2');")
    expect(manualSql).not.toContain('case_id in')
    expect(manualSql).not.toContain('patient_request_id in')
  })

  it('reports missing Storage cleanup objects as partial prior cleanup', async () => {
    const removeCalls: string[][] = []
    const service = {
      storage: {
        from: () => ({
          exists: async (path: string) =>
            path === 'already-gone.jpg'
              ? { data: false, error: { message: 'not found', status: 404 } }
              : { data: true, error: null },
          remove: async (paths: string[]) => {
            removeCalls.push(paths)
            return { data: [], error: null }
          },
        }),
      },
    } as unknown as SupabaseServiceClient

    const result = await removePlannedStorageObjects(service, [
      'already-gone.jpg',
      'still-present.jpg',
    ])

    expect(result).toEqual({
      requested: ['already-gone.jpg', 'still-present.jpg'],
      removed: ['still-present.jpg'],
      alreadyRemoved: ['already-gone.jpg'],
    })
    expect(removeCalls).toEqual([['still-present.jpg']])
  })

  it('turns permission-denied cleanup paths into manual SQL without partial cleanup', async () => {
    const plan = cleanupPlan({
      records: [
        { table: 'case_decision_history', id: 'history-1', extra: { case_id: 'case-1' } },
        { table: 'consent_records', id: 'consent-1', extra: { patient_request_id: 'case-1' } },
        { table: 'patient_requests', id: 'case-1' },
      ],
      storageObjects: ['patient/case-1/original.jpg'],
    })
    const dbMutations: string[] = []
    const storageMutations: string[] = []
    let caught: unknown

    try {
      await executeCleanupPlan(emptyService, plan, {
        preflightDelete: async (_service, deletion) => {
          if (deletion.table === 'case_decision_history') {
            throw new Error('permission denied for table case_decision_history')
          }
        },
        deleteRows: async (_service, deletion) => {
          dbMutations.push(deletion.table)
          return deletion.ids
        },
        removeStorageObjects: async (_service, storageObjects) => {
          storageMutations.push(...storageObjects)
          return { requested: storageObjects, removed: storageObjects, alreadyRemoved: [] }
        },
      })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(CleanupPreflightError)
    const manualSql = (caught as CleanupPreflightError).manualSql
    expect(manualSql).toContain(
      "delete from public.case_decision_history where id in ('history-1');"
    )
    expect(manualSql).toContain("delete from public.consent_records where id in ('consent-1');")
    expect(manualSql).toContain("delete from public.patient_requests where id in ('case-1');")
    expect(manualSql).not.toContain('case_id in')
    expect(manualSql).not.toContain('patient_request_id in')
    expect(dbMutations).toEqual([])
    expect(storageMutations).toEqual([])
  })
})
