/**
 * Magic-byte (file signature) detection for the patient upload pipeline
 * (Phase 5, roadmap 5C, shipped inside the 5B branch).
 *
 * Extensions and declared MIME types are attacker-controllable, so the server
 * additionally sniffs the leading bytes of the stored object at confirm time and
 * requires the detected type to equal the declared type. This defeats disguised
 * content (e.g. a PDF or executable renamed to `.png`).
 *
 * Pure module: no I/O, no Node-only APIs.
 */

interface FileSignature {
  mime: string
  bytes: readonly number[]
  offset?: number
}

const FILE_SIGNATURES: readonly FileSignature[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // "GIF8"
  { mime: 'image/tiff', bytes: [0x49, 0x49, 0x2a, 0x00] },
  { mime: 'image/tiff', bytes: [0x4d, 0x4d, 0x00, 0x2a] },
  { mime: 'image/bmp', bytes: [0x42, 0x4d] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // "%PDF-"
  { mime: 'application/dicom', bytes: [0x44, 0x49, 0x43, 0x4d], offset: 128 }, // "DICM"
]

const ZIP_SIGNATURES: readonly FileSignature[] = [
  { mime: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04] },
  { mime: 'application/zip', bytes: [0x50, 0x4b, 0x05, 0x06] },
  { mime: 'application/zip', bytes: [0x50, 0x4b, 0x07, 0x08] },
]

function asciiPrefix(bytes: Uint8Array, maxLength: number): string {
  return String.fromCharCode(...bytes.slice(0, maxLength)).toLowerCase()
}

function matchesSignature(bytes: Uint8Array, signature: FileSignature): boolean {
  const offset = signature.offset ?? 0
  if (bytes.length < offset + signature.bytes.length) {
    return false
  }
  return signature.bytes.every((byte, index) => bytes[offset + index] === byte)
}

function detectIsoBmffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) {
    return null
  }

  const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase()
  if (brand === 'avif' || brand === 'avis') {
    return 'image/avif'
  }
  if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'hevx' || brand === 'mif1' || brand === 'msf1') {
    return 'image/heif'
  }
  return null
}

function detectRiffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) {
    return null
  }

  const riff = String.fromCharCode(...bytes.slice(0, 4))
  const webp = String.fromCharCode(...bytes.slice(8, 12))
  return riff === 'RIFF' && webp === 'WEBP' ? 'image/webp' : null
}

function detectSvg(bytes: Uint8Array): string | null {
  const prefix = asciiPrefix(bytes, 512).trimStart()
  return prefix.startsWith('<svg') || prefix.startsWith('<?xml') && prefix.includes('<svg')
    ? 'image/svg+xml'
    : null
}

/**
 * Return the detected MIME type from the leading bytes, or null if the prefix
 * does not match any supported signature.
 */
export function detectMimeFromBytes(bytes: Uint8Array): string | null {
  const containerMime = detectRiffMime(bytes) ?? detectIsoBmffMime(bytes) ?? detectSvg(bytes)
  if (containerMime) {
    return containerMime
  }

  for (const signature of FILE_SIGNATURES) {
    if (matchesSignature(bytes, signature)) {
      return signature.mime
    }
  }
  for (const signature of ZIP_SIGNATURES) {
    if (matchesSignature(bytes, signature)) {
      return signature.mime
    }
  }
  return null
}

/** True only when the detected signature exactly matches the declared MIME. */
export function magicBytesMatchDeclaredMime(declaredMime: string, bytes: Uint8Array): boolean {
  const detected = detectMimeFromBytes(bytes)
  return detected != null && detected === declaredMime
}
