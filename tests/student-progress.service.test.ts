import { beforeEach, describe, expect, it, vi } from 'vitest'

import { addStudentProgress } from '@/lib/cases/student-progress.service'
import { LIFECYCLE_MESSAGES } from '@/lib/cases/case-lifecycle'
import type { SupabaseAdminClient } from '@/lib/supabase-admin'

const mocks = vi.hoisted(() => ({
  auditStudentProgressAdded: vi.fn(),
  getAuthorizedStageContext: vi.fn(),
}))

vi.mock('@/lib/audit/audit.service', () => ({
  auditStudentProgressAdded: mocks.auditStudentProgressAdded,
}))

vi.mock('@/lib/cases/case-stage-context', () => ({
  getAuthorizedStageContext: mocks.getAuthorizedStageContext,
}))

const actor = {
  email: 'student@example.edu',
  role: 'student',
  userId: 'student-1',
}

const auditContext = {
  apiVersion: 'test',
  correlationId: 'test-correlation-id',
  ipAddress: '127.0.0.1',
  requestId: 'test-request-id',
  sourceService: 'test',
  userAgent: 'vitest',
}

function createSupabaseInsertErrorMock(): SupabaseAdminClient {
  const studentProfilesBuilder = {
    eq() {
      return studentProfilesBuilder
    },
    async maybeSingle() {
      return { data: { full_name: 'Student One' }, error: null }
    },
    select() {
      return studentProfilesBuilder
    },
  }

  const progressEntriesBuilder = {
    insert() {
      return progressEntriesBuilder
    },
    select() {
      return progressEntriesBuilder
    },
    async single() {
      return {
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      }
    },
  }

  const supabase = {
    from(table: string) {
      if (table === 'student_profiles') {
        return studentProfilesBuilder
      }
      if (table === 'case_progress_entries') {
        return progressEntriesBuilder
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  return supabase as unknown as SupabaseAdminClient
}

beforeEach(() => {
  mocks.auditStudentProgressAdded.mockReset()
  mocks.getAuthorizedStageContext.mockReset()
})

describe('addStudentProgress', () => {
  it('rejects non-student actors before service-role authorization checks', async () => {
    const result = await addStudentProgress({
      actor: { ...actor, role: 'faculty' },
      body: { note: 'Progress note' },
      caseId: 'case-1',
      context: auditContext,
    })

    expect(result).toEqual({
      body: { error: LIFECYCLE_MESSAGES.FORBIDDEN },
      status: 403,
    })
    expect(mocks.getAuthorizedStageContext).not.toHaveBeenCalled()
  })

  it('validates progress note body before loading case context', async () => {
    const result = await addStudentProgress({
      actor,
      body: { note: '   ' },
      caseId: 'case-1',
      context: auditContext,
    })

    expect(result).toEqual({
      body: { error: 'Progress note is required.' },
      status: 400,
    })
    expect(mocks.getAuthorizedStageContext).not.toHaveBeenCalled()
  })

  it('prevents progress notes unless the case is in treatment', async () => {
    mocks.getAuthorizedStageContext.mockResolvedValue({
      context: {
        approvedRequestId: 'request-1',
        currentCase: {
          assigned_department: 'Orthodontics',
          current_stage_id: 'stage-1',
          full_name: 'Patient One',
          status: 'contacted',
        },
        stageDepartment: 'Orthodontics',
        stageId: 'stage-1',
      },
      response: null,
    })

    const result = await addStudentProgress({
      actor,
      body: { note: 'Patient was seen today.' },
      caseId: 'case-1',
      context: auditContext,
      supabase: createSupabaseInsertErrorMock(),
    })

    expect(result).toEqual({
      body: { error: LIFECYCLE_MESSAGES.PROGRESS_ONLY_IN_TREATMENT },
      status: 409,
    })
    expect(mocks.auditStudentProgressAdded).not.toHaveBeenCalled()
  })

  it('returns a generic server error when the progress insert fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.getAuthorizedStageContext.mockResolvedValue({
      context: {
        approvedRequestId: 'request-1',
        currentCase: {
          assigned_department: 'Orthodontics',
          current_stage_id: 'stage-1',
          full_name: 'Patient One',
          status: 'in_treatment',
        },
        stageDepartment: 'Orthodontics',
        stageId: 'stage-1',
      },
      response: null,
    })

    const result = await addStudentProgress({
      actor,
      body: { note: 'Patient was seen today.' },
      caseId: 'case-1',
      context: auditContext,
      supabase: createSupabaseInsertErrorMock(),
    })

    expect(result).toEqual({
      body: { error: 'server_error' },
      status: 500,
    })
    expect(consoleError).toHaveBeenCalledWith('[student-progress] insertError', {
      error: 'duplicate key value violates unique constraint',
    })
    expect(mocks.auditStudentProgressAdded).not.toHaveBeenCalled()
  })
})
