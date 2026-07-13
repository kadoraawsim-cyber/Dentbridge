import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import { cleanupOrphanPatientFiles, isValidCronAuthorization } from '@/lib/files/orphan-cleanup.service'

function adminMock(options?: { storageFails?: boolean }) {
  const rpc = vi.fn()
  rpc.mockResolvedValueOnce({
    data: [{
      file_id: '11111111-1111-4111-8111-111111111111',
      original_object_path: 'opaque/original',
      derivative_object_path: 'opaque/derivative',
      cleanup_kind: 'full_row',
    }],
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
      originalsDeleted: 0,
      retryableFailures: 0,
    })
    expect(remove).toHaveBeenCalledWith(['opaque/original', 'opaque/derivative'])
    expect(rpc).toHaveBeenLastCalledWith('complete_patient_file_cleanup', {
      p_file_id: '11111111-1111-4111-8111-111111111111',
      p_success: true,
      p_cleanup_kind: 'full_row',
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
      p_cleanup_kind: 'full_row',
    })
  })

  it('can clean a linked leftover original without deleting the derivative', async () => {
    const { admin, remove } = adminMock()
    ;(admin.rpc as ReturnType<typeof vi.fn>).mockReset()
    ;(admin.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{
        file_id: '11111111-1111-4111-8111-111111111111',
        original_object_path: 'opaque/original',
        derivative_object_path: null,
        cleanup_kind: 'original_only',
      }],
      error: null,
    })
    ;(admin.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: true, error: null })

    await expect(cleanupOrphanPatientFiles(admin as never)).resolves.toMatchObject({
      claimed: 1,
      originalsDeleted: 1,
      deleted: 0,
    })
    expect(remove).toHaveBeenCalledWith(['opaque/original'])
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
      'supabase/migrations/20260712010000_scannerless_image_sanitization.sql',
    ].map((path) => readFileSync(path, 'utf8')).join('\n')
    expect(sql).toContain('pf.patient_request_id IS NULL')
    expect(sql).toContain('FOR UPDATE SKIP LOCKED')
    expect(sql).toContain("status = 'cleanup_claimed'")
    expect(sql).toContain("source_state = 'cleanup_eligible'")
    expect(sql).toContain("'sanitizing','sanitized_unscanned','quarantined'")
    expect(sql).toContain('original_only')
    expect(sql).not.toMatch(/UPDATE public\.patient_files[\s\S]{0,200}patient_request_id = NULL/)
  })
})
