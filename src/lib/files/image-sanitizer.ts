import 'server-only'

import { createHash } from 'node:crypto'
import sharp from 'sharp'

import {
  DERIVATIVE_MIME,
  IMAGE_PROCESSING_TIMEOUT_MS,
  IMAGE_SANITIZER_VERSION,
  JPEG_DERIVATIVE_QUALITY,
  MAX_DERIVATIVE_LONG_EDGE,
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_WIDTH,
  MAX_SOURCE_IMAGE_BYTES,
} from './file.constants'
import { detectMimeFromBytes } from './magic-bytes'

export type ImageSanitizerErrorCode =
  | 'unsupported_format'
  | 'image_too_large'
  | 'image_unreadable'
  | 'animated_or_multipage'
  | 'dimensions_exceeded'
  | 'pixel_limit_exceeded'
  | 'processing_timeout'
  | 'processing_failed'

export interface SanitizedImage {
  buffer: Buffer
  sourceMime: string
  derivativeMime: typeof DERIVATIVE_MIME
  sourceSizeBytes: number
  derivativeSizeBytes: number
  width: number
  height: number
  pixelCount: number
  derivativeChecksumSha256: string
  sanitizerVersion: string
}

export type SanitizeImageResult =
  | { ok: true; data: SanitizedImage }
  | { ok: false; code: ImageSanitizerErrorCode; detectedMime: string | null }

const SUPPORTED_SOURCE_MIME = new Set(['image/jpeg', 'image/png'])

function isSupportedSourceMime(mime: string | null): mime is 'image/jpeg' | 'image/png' {
  return mime != null && SUPPORTED_SOURCE_MIME.has(mime)
}

function checksumSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

function timeoutPromise(): Promise<never> {
  return new Promise((_, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('image_processing_timeout'))
    }, IMAGE_PROCESSING_TIMEOUT_MS)
    timeout.unref?.()
  })
}

function hasMultipleFrames(metadata: sharp.Metadata): boolean {
  const pages = metadata.pages ?? 1
  return pages > 1 || (metadata.delay?.length ?? 0) > 1
}

function validateDimensions(metadata: sharp.Metadata): ImageSanitizerErrorCode | null {
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  if (width <= 0 || height <= 0) {
    return 'image_unreadable'
  }
  if (width > MAX_IMAGE_WIDTH) {
    return 'dimensions_exceeded'
  }
  if (height > MAX_IMAGE_HEIGHT) {
    return 'dimensions_exceeded'
  }
  if (width * height > MAX_IMAGE_PIXELS) {
    return 'pixel_limit_exceeded'
  }
  return null
}

async function processImage(bytes: Buffer, sourceMime: 'image/jpeg' | 'image/png'): Promise<SanitizedImage> {
  const source = sharp(bytes, {
    animated: false,
    failOn: 'warning',
    limitInputPixels: MAX_IMAGE_PIXELS,
    pages: 1,
  })
  const metadata = await source.metadata()

  if (hasMultipleFrames(metadata)) {
    throw new Error('animated_or_multipage')
  }

  const dimensionError = validateDimensions(metadata)
  if (dimensionError) {
    throw new Error(dimensionError)
  }

  const derivative = await sharp(bytes, {
    animated: false,
    failOn: 'warning',
    limitInputPixels: MAX_IMAGE_PIXELS,
    pages: 1,
  })
    .rotate()
    .resize({
      width: MAX_DERIVATIVE_LONG_EDGE,
      height: MAX_DERIVATIVE_LONG_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toColorspace('srgb')
    .jpeg({ mozjpeg: true, quality: JPEG_DERIVATIVE_QUALITY })
    .toBuffer()

  const outputMetadata = await sharp(derivative, {
    failOn: 'warning',
    limitInputPixels: MAX_IMAGE_PIXELS,
  }).metadata()
  const width = outputMetadata.width ?? 0
  const height = outputMetadata.height ?? 0
  if (width <= 0 || height <= 0) {
    throw new Error('processing_failed')
  }

  return {
    buffer: derivative,
    sourceMime,
    derivativeMime: DERIVATIVE_MIME,
    sourceSizeBytes: bytes.length,
    derivativeSizeBytes: derivative.length,
    width,
    height,
    pixelCount: width * height,
    derivativeChecksumSha256: checksumSha256(derivative),
    sanitizerVersion: IMAGE_SANITIZER_VERSION,
  }
}

function mapSanitizerError(error: unknown): ImageSanitizerErrorCode {
  const message = error instanceof Error ? error.message : ''
  if (message === 'image_processing_timeout') return 'processing_timeout'
  if (message === 'animated_or_multipage') return 'animated_or_multipage'
  if (message === 'dimensions_exceeded') return 'dimensions_exceeded'
  if (message === 'pixel_limit_exceeded') return 'pixel_limit_exceeded'
  if (message === 'image_unreadable') return 'image_unreadable'
  if (message.includes('Input image exceeds pixel limit')) return 'pixel_limit_exceeded'
  if (message.includes('unsupported image format')) return 'image_unreadable'
  return 'processing_failed'
}

export async function sanitizeImageBytes(bytes: Buffer): Promise<SanitizeImageResult> {
  if (bytes.length <= 0 || bytes.length > MAX_SOURCE_IMAGE_BYTES) {
    return { ok: false, code: 'image_too_large', detectedMime: null }
  }

  const detectedMime = detectMimeFromBytes(bytes)
  if (!isSupportedSourceMime(detectedMime)) {
    return { ok: false, code: 'unsupported_format', detectedMime }
  }

  try {
    const data = await Promise.race([
      processImage(bytes, detectedMime),
      timeoutPromise(),
    ])
    return { ok: true, data }
  } catch (error) {
    return { ok: false, code: mapSanitizerError(error), detectedMime }
  }
}
