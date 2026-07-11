import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import { cleanupOrphanPatientFiles, isValidCronAuthorization } from '@/lib/files/orphan-cleanup.service'

function adminMock(options?: { storageFails?: boolean }) {
  const rpc = vi.fn()
  rpc.mockResolvedValueOnce({
    data: [{ file_id: '11111111-1111-4111-8111-111111111111', object_path: 'opaque/path' }],
    error: null,
  })
  rpc.mockResolvedValueOnce({ data: true, error: null })
  const remove = vi.fn().mockResolvedValue({
    error: options?.storageFails ? { message: 'storage unavailable' } : null,
  })
  return {
    admin: {
      rpc,
      storage: { from: vi.fn(() => ({ remove })) },
    },
    remove,
    rpc,
  }
}

describe('orphan patient-file cleanup', () => {
  it('deletes an atomically claimed object and finalizes it', async () => {
    const { admin, remove, rpc } = adminMock()
    await expect(cleanupOrphanPatientFiles(admin as never)).resolves.toEqual({
      claimed: 1,
      deleted: 1,
      retryableFailures: 0,
    })
    expect(remove).toHaveBeenCalledWith(['opaque/path'])
    expect(rpc).toHaveBeenLastCalledWith('complete_patient_file_cleanup', {
      p_file_id: '11111111-1111-4111-8111-111111111111',
      p_success: true,
    })
  })

  it('keeps storage failures retryable and operationally visible', async () => {
    const { admin, rpc } = adminMock({ storageFails: true })
    await expect(cleanupOrphanPatientFiles(admin as never)).resolves.toMatchObject({
      deleted: 0,
      retryableFailures: 1,
    })
    expect(rpc).toHaveBeenLastCalledWith('complete_patient_file_cleanup', {
      p_file_id: '11111111-1111-4111-8111-111111111111',
      p_success: false,
    })
  })

  it('uses a constant-time bearer-secret check', () => {
    expect(isValidCronAuthorization('Bearer expected', 'expected')).toBe(true)
    expect(isValidCronAuthorization('Bearer wrong', 'expected')).toBe(false)
    expect(isValidCronAuthorization(null, 'expected')).toBe(false)
  })

  it('encodes linked-file protection and concurrent atomic claiming in SQL', () => {
    const sql = [
      'supabase/migrations/20260711000000_release_atomic_intake_file_cleanup.sql',
      'supabase/migrations/20260711001000_release_orphan_cleanup_claim.sql',
      'supabase/migrations/20260711002000_release_orphan_cleanup_finalize.sql',
    ].map((path) => readFileSync(path, 'utf8')).join('\n')
    expect(sql).toContain('pf.patient_request_id IS NULL')
    expect(sql).toContain('FOR UPDATE SKIP LOCKED')
    expect(sql).toContain("status = 'cleanup_claimed'")
    expect(sql).toContain("status = 'quarantined'")
    expect(sql).toContain("scan_state = 'pending'")
    expect(sql).not.toMatch(/UPDATE public\.patient_files[\s\S]{0,200}patient_request_id = NULL/)
  })
})
