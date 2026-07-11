import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { FILE_STATUS, SCAN_STATE } from '@/lib/files/file.constants'
import { unavailableMalwareScanner } from '@/lib/files/malware-scanner'

describe('truthful file quarantine', () => {
  it('never treats structural validation as a malware-clean verdict', () => {
    const source = readFileSync('src/lib/files/files.service.ts', 'utf8')
    expect(source).toContain('status: FILE_STATUS.QUARANTINED')
    expect(source).toContain('scan_state: SCAN_STATE.PENDING')
    expect(source).not.toContain('scan_state: SCAN_STATE.SKIPPED')
    expect(source).toContain('row.scan_state !== SCAN_STATE.CLEAN')
    expect(FILE_STATUS.QUARANTINED).toBe('quarantined')
    expect(SCAN_STATE.PENDING).toBe('pending')
  })

  it('fails closed while no approved scanner is configured', async () => {
    await expect(unavailableMalwareScanner.scan({
      fileId: 'file', bucket: 'patient-uploads', objectPath: 'opaque/path',
      checksumSha256: 'a'.repeat(64), detectedMime: 'image/jpeg', sizeBytes: 100,
    })).resolves.toBe('unavailable')
  })
})
