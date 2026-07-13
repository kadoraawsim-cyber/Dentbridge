import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  fetchStudentActiveCases,
  fetchStudentPoolCases,
  fetchStudentRequestedCases,
} from '@/lib/cases/student-case-access'
import type { Database } from '@/lib/database.types'

function clientWithRpc(rpc: ReturnType<typeof vi.fn>): SupabaseClient<Database> {
  return { rpc } as unknown as SupabaseClient<Database>
}

describe('student pool projection', () => {
  it('reads the pool through the allowlisted RPC and never exposes patient identity', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'case-1',
          age: 40,
          treatment_type: 'Root Canal Treatment',
          complaint_text: 'pain',
          urgency: 'high',
          assigned_department: 'Endodontics',
          target_student_level: null,
          pain_score: 8,
          preferred_days: null,
          symptom_duration: 'A few days',
          medical_condition: 'None',
          clinical_notes: null,
          created_at: '2026-07-10T00:00:00Z',
          has_attachment: true,
        },
      ],
      error: null,
    })

    const cases = await fetchStudentPoolCases(clientWithRpc(rpc))

    expect(rpc).toHaveBeenCalledWith('student_pool_cases')
    expect(cases).toHaveLength(1)
    // The projection must carry attachment presence, never the raw path.
    expect(cases[0]).toHaveProperty('has_attachment', true)
    // Direct patient identifiers must never be present in the pool projection.
    for (const forbidden of ['full_name', 'phone', 'attachment_path']) {
      expect(Object.prototype.hasOwnProperty.call(cases[0], forbidden)).toBe(false)
    }
  })

  it('surfaces an RPC error instead of rendering a successful empty pool', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'denied' } })
    await expect(fetchStudentPoolCases(clientWithRpc(rpc))).rejects.toThrow(
      'Unable to load student.cases.pool.'
    )
  })
})

describe('student active cases', () => {
  it('reads contact detail only through the current-stage-gated RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'case-1',
          treatment_type: 'Fillings',
          assigned_department: 'Restorative Dentistry',
          status: 'in_treatment',
          full_name: 'Patient One',
          phone: '+900000000000',
          current_stage_id: 'stage-2',
        },
      ],
      error: null,
    })

    const active = await fetchStudentActiveCases(clientWithRpc(rpc))
    expect(rpc).toHaveBeenCalledWith('student_active_cases')
    expect(active[0].full_name).toBe('Patient One')
  })
})

describe('student requested-case overview', () => {
  it('reads the caller request history through the RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          request_id: 'req-1',
          case_id: 'case-1',
          stage_id: 'stage-1',
          request_status: 'approved',
          effective_status: 'revoked',
          created_at: '2026-07-10T00:00:00Z',
          treatment_type: 'Fillings',
          assigned_department: 'Restorative Dentistry',
          urgency: 'low',
          case_status: 'matched',
          current_stage_id: 'stage-2',
          stage_department: 'Restorative Dentistry',
        },
      ],
      error: null,
    })

    const overview = await fetchStudentRequestedCases(clientWithRpc(rpc))
    expect(rpc).toHaveBeenCalledWith('student_requested_case_overview')
    // A handed-off approved request is reported as revoked, never as live access.
    expect(overview[0].effective_status).toBe('revoked')
  })
})
