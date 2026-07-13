import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import {
  DERIVATIVE_MIME,
  IMAGE_SANITIZER_VERSION,
  MAX_IMAGE_WIDTH,
  MAX_SOURCE_IMAGE_BYTES,
} from '@/lib/files/file.constants'
import { detectMimeFromBytes } from '@/lib/files/magic-bytes'
import { sanitizeImageBytes } from '@/lib/files/image-sanitizer'

async function pngFixture(): Promise<Buffer> {
  return sharp({
    create: {
      width: 16,
      height: 12,
      channels: 4,
      background: { r: 12, g: 90, b: 140, alpha: 0.35 },
    },
  })
    .png()
    .toBuffer()
}

async function jpegFixture(): Promise<Buffer> {
  return sharp({
    create: {
      width: 18,
      height: 10,
      channels: 3,
      background: { r: 220, g: 210, b: 180 },
    },
  })
    .jpeg()
    .toBuffer()
}

describe('scannerless image sanitizer', () => {
  it('re-encodes valid JPEG as a new sanitized JPEG derivative', async () => {
    const source = await jpegFixture()
    const result = await sanitizeImageBytes(source)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.sourceMime).toBe('image/jpeg')
    expect(result.data.derivativeMime).toBe(DERIVATIVE_MIME)
    expect(result.data.sanitizerVersion).toBe(IMAGE_SANITIZER_VERSION)
    expect(result.data.derivativeChecksumSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(detectMimeFromBytes(result.data.buffer)).toBe('image/jpeg')

    const metadata = await sharp(result.data.buffer).metadata()
    expect(metadata.format).toBe('jpeg')
    expect(metadata.exif).toBeUndefined()
    expect(metadata.icc).toBeUndefined()
    expect(metadata.xmp).toBeUndefined()
    expect(metadata.iptc).toBeUndefined()
  })

  it('flattens PNG transparency into an opaque JPEG', async () => {
    const source = await pngFixture()
    const result = await sanitizeImageBytes(source)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.sourceMime).toBe('image/png')
    const metadata = await sharp(result.data.buffer).metadata()
    expect(metadata.format).toBe('jpeg')
    expect(metadata.hasAlpha).toBe(false)
  })

  it.each([
    ['renamed executable', Buffer.from([0x4d, 0x5a, 0x90, 0x00])],
    ['PDF', Buffer.from('%PDF-1.7\n')],
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ['GIF', Buffer.from('GIF89a')],
    ['TIFF', Buffer.from([0x49, 0x49, 0x2a, 0x00])],
    ['DICOM', Buffer.concat([Buffer.alloc(128), Buffer.from('DICM')])],
  ])('rejects unsupported %s bytes', async (_label, source) => {
    const result = await sanitizeImageBytes(source)
    expect(result).toMatchObject({ ok: false, code: 'unsupported_format' })
  })

  it('rejects malformed JPEG bytes', async () => {
    const result = await sanitizeImageBytes(Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00]))
    expect(result).toMatchObject({ ok: false, code: 'processing_failed' })
  })

  it('rejects oversized source bytes before decoding', async () => {
    const result = await sanitizeImageBytes(Buffer.alloc(MAX_SOURCE_IMAGE_BYTES + 1))
    expect(result).toMatchObject({ ok: false, code: 'image_too_large' })
  })

  it('rejects images beyond the configured width limit', async () => {
    const source = await sharp({
      create: {
        width: MAX_IMAGE_WIDTH + 1,
        height: 1,
        channels: 3,
        background: 'white',
      },
    })
      .png()
      .toBuffer()

    const result = await sanitizeImageBytes(source)
    expect(result).toMatchObject({ ok: false, code: 'dimensions_exceeded' })
  })
})
