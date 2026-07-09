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
}

const FILE_SIGNATURES: readonly FileSignature[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // "%PDF-"
]

/**
 * Return the detected MIME type from the leading bytes, or null if the prefix
 * does not match any supported signature.
 */
export function detectMimeFromBytes(bytes: Uint8Array): string | null {
  for (const signature of FILE_SIGNATURES) {
    if (bytes.length < signature.bytes.length) {
      continue
    }
    if (signature.bytes.every((byte, index) => bytes[index] === byte)) {
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
