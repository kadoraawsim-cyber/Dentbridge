import { describe, expect, it } from 'vitest'

import {
  HARD_MAX_UPLOAD_BYTES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  buildPatientFileObjectPath,
  getAllowedTypeByExtension,
  getAllowedTypeByMime,
  isExtensionValidForMime,
  maxBytesForMime,
} from '@/lib/files/file.constants'
import { detectMimeFromBytes, magicBytesMatchDeclaredMime } from '@/lib/files/magic-bytes'
import { createUploadTicket, verifyUploadTicket } from '@/lib/files/ticket'

describe('patient file upload security primitives', () => {
  it('allows only the supported MIME and extension combinations', () => {
    expect(getAllowedTypeByMime('image/jpeg')?.extensions).toEqual(['jpg', 'jpeg'])
    expect(getAllowedTypeByMime('image/png')?.extensions).toEqual(['png'])
    expect(getAllowedTypeByMime('application/pdf')).toBeNull()
    expect(getAllowedTypeByMime('text/plain')).toBeNull()

    expect(getAllowedTypeByExtension('JPEG')?.mime).toBe('image/jpeg')
    expect(getAllowedTypeByExtension('exe')).toBeNull()

    expect(isExtensionValidForMime('jpg', 'image/jpeg')).toBe(true)
    expect(isExtensionValidForMime('jpeg', 'image/jpeg')).toBe(true)
    expect(isExtensionValidForMime('png', 'image/jpeg')).toBe(false)
    expect(isExtensionValidForMime('pdf', 'image/png')).toBe(false)
  })

  it('keeps per-type and hard upload size limits explicit', () => {
    expect(maxBytesForMime('image/jpeg')).toBe(MAX_IMAGE_BYTES)
    expect(maxBytesForMime('image/png')).toBe(MAX_IMAGE_BYTES)
    expect(maxBytesForMime('application/pdf')).toBeNull()
    expect(maxBytesForMime('application/octet-stream')).toBeNull()
    expect(HARD_MAX_UPLOAD_BYTES).toBe(MAX_PDF_BYTES)
  })

  it('builds opaque object paths without patient-supplied filenames', () => {
    expect(buildPatientFileObjectPath('session-123', 'file-456', 'PDF')).toBe(
      'patient-requests/session-123/original/file-456.pdf'
    )
  })

  it('detects magic bytes and rejects disguised content', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb])
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])
    const unknown = new Uint8Array([0x4d, 0x5a, 0x90, 0x00])

    expect(detectMimeFromBytes(jpeg)).toBe('image/jpeg')
    expect(detectMimeFromBytes(png)).toBe('image/png')
    expect(detectMimeFromBytes(pdf)).toBe('application/pdf')
    expect(detectMimeFromBytes(unknown)).toBeNull()

    expect(magicBytesMatchDeclaredMime('application/pdf', pdf)).toBe(true)
    expect(magicBytesMatchDeclaredMime('image/png', pdf)).toBe(false)
  })

  it('binds upload tickets to file id and expiry', () => {
    const issuedAt = new Date('2026-07-09T10:00:00.000Z')
    const beforeExpiry = new Date('2026-07-09T10:29:59.000Z')
    const atExpiry = new Date('2026-07-09T10:30:00.000Z')
    const ticket = createUploadTicket('file-a', issuedAt)

    expect(verifyUploadTicket('file-a', ticket.value, beforeExpiry)).toBe(true)
    expect(verifyUploadTicket('file-b', ticket.value, beforeExpiry)).toBe(false)
    expect(verifyUploadTicket('file-a', ticket.value, atExpiry)).toBe(false)
    expect(verifyUploadTicket('file-a', 'not-a-ticket', beforeExpiry)).toBe(false)
    expect(verifyUploadTicket('', ticket.value, beforeExpiry)).toBe(false)
  })
})
