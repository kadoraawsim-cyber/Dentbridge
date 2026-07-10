import { describe, expect, it } from 'vitest'

import { getAuthorizedStageContext } from '@/lib/cases/case-stage-context'
import type { SupabaseAdminClient } from '@/lib/supabase-admin'

type SingleResult = { data: unknown; error: unknown }

function tableBuilder(single: SingleResult) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  for (const method of ['select', 'update', 'insert', 'eq', 'in', 'is', 'order', 'limit']) {
    builder[method] = chain
  }
  builder.maybeSingle = () => Promise.resolve(single)
  builder.single = () => Promise.resolve(single)
  builder.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(onFulfilled)
  return builder
}

function makeSupabase(results: Record<string, SingleResult>): SupabaseAdminClient {
  return {
    from(table: string) {
      return tableBuilder(results[table] ?? { data: null, error: null })
    },
  } as unknown as SupabaseAdminClient
}

const STUDENT = 'student-1'
const CASE = 'case-1'

describe('getAuthorizedStageContext — current-stage authorization', () => {
  it('authorizes the current-stage assignee', async () => {
    const supabase = makeSupabase({
      student_case_requests: { data: { id: 'req-1', stage_id: 'stage-2' }, error: null },
      patient_requests: {
        data: {
          status: 'in_treatment',
          full_name: 'Patient One',
          current_stage_id: 'stage-2',
          assigned_department: 'Endodontics',
        },
        error: null,
      },
      case_routing_stages: {
        data: { id: 'stage-2', department: 'Endodontics', student_id: STUDENT, status: 'in_treatment' },
        error: null,
      },
    })

    const { context, response } = await getAuthorizedStageContext({
      supabase,
      caseId: CASE,
      studentId: STUDENT,
    })

    expect(response).toBeNull()
    expect(context).not.toBeNull()
    expect(context?.stageId).toBe('stage-2')
  })

  it('locks out a student from a previous stage after handoff', async () => {
    // The student's approved request is for stage-1, but the case has advanced
    // to stage-2 (a new current stage). Access must be denied.
    const supabase = makeSupabase({
      student_case_requests: { data: { id: 'req-1', stage_id: 'stage-1' }, error: null },
      patient_requests: {
        data: {
          status: 'matched',
          full_name: 'Patient One',
          current_stage_id: 'stage-2',
          assigned_department: 'Endodontics',
        },
        error: null,
      },
    })

    const { context, response } = await getAuthorizedStageContext({
      supabase,
      caseId: CASE,
      studentId: STUDENT,
    })

    expect(context).toBeNull()
    expect(response?.status).toBe(403)
  })

  it('denies a student who is not the current stage assignee', async () => {
    const supabase = makeSupabase({
      student_case_requests: { data: { id: 'req-1', stage_id: 'stage-2' }, error: null },
      patient_requests: {
        data: {
          status: 'in_treatment',
          full_name: 'Patient One',
          current_stage_id: 'stage-2',
          assigned_department: 'Endodontics',
        },
        error: null,
      },
      case_routing_stages: {
        data: { id: 'stage-2', department: 'Endodontics', student_id: 'someone-else', status: 'in_treatment' },
        error: null,
      },
    })

    const { context, response } = await getAuthorizedStageContext({
      supabase,
      caseId: CASE,
      studentId: STUDENT,
    })

    expect(context).toBeNull()
    expect(response?.status).toBe(403)
  })

  it('denies a student with no approved request', async () => {
    const supabase = makeSupabase({
      student_case_requests: { data: null, error: null },
      patient_requests: {
        data: { status: 'matched', full_name: 'P', current_stage_id: 'stage-1', assigned_department: 'X' },
        error: null,
      },
    })

    const { context, response } = await getAuthorizedStageContext({
      supabase,
      caseId: CASE,
      studentId: STUDENT,
    })

    expect(context).toBeNull()
    expect(response?.status).toBe(403)
  })
})
