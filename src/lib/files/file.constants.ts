/**
 * Shared constants and pure helpers for the patient file upload pipeline
 * (Phase 5, Branch 5B).
 *
 * This module is intentionally framework-light and free of Node-only APIs so it
 * can be shared between server routes/services and (later) client UX code
 * (size hints, allowed types). Server-only concerns (hashing, storage, tickets)
 * live in sibling modules.
 */

/** Private Supabase Storage bucket for patient attachments. */
export const PATIENT_UPLOADS_BUCKET = 'patient-uploads'

/** Lifecycle status of a `patient_files` row. Mirrors the DB CHECK constraint. */
export const FILE_STATUS = {
  PENDING: 'pending',
  ORIGINAL_RECEIVED: 'original_received',
  STRUCTURALLY_VALID: 'structurally_valid',
  SANITIZING: 'sanitizing',
  SANITIZED_UNSCANNED: 'sanitized_unscanned',
  UPLOADED: 'uploaded',
  SCANNING: 'scanning',
  CLEAN: 'clean',
  QUARANTINED: 'quarantined',
  REJECTED: 'rejected',
  SANITIZE_FAILED: 'sanitize_failed',
  CLEANUP_ELIGIBLE: 'cleanup_eligible',
  CLEANUP_CLAIMED: 'cleanup_claimed',
  ORPHANED: 'orphaned',
  DELETED: 'deleted',
} as const

export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS]

/** Malware-scan sub-state. Structural validation alone must remain `pending`. */
export const SCAN_STATE = {
  SKIPPED: 'skipped',
  PENDING: 'pending',
  CLEAN: 'clean',
  INFECTED: 'infected',
} as const

const MB = 1024 * 1024

/** Per-type size caps. Scannerless production uploads are image-only. */
export const MAX_IMAGE_BYTES = 10 * MB
export const MAX_PDF_BYTES = 15 * MB

/** Absolute ceiling enforced regardless of type (legacy PDFs may exist). */
export const HARD_MAX_UPLOAD_BYTES = 15 * MB

/** Scannerless sanitizer limits. Keep these in sync with the DB/docs/tests. */
export const IMAGE_SANITIZER_VERSION = 'sharp-jpeg-v1'
export const MAX_SOURCE_IMAGE_BYTES = MAX_IMAGE_BYTES
export const MAX_IMAGE_WIDTH = 8192
export const MAX_IMAGE_HEIGHT = 8192
export const MAX_IMAGE_PIXELS = 40_000_000
export const MAX_DERIVATIVE_LONG_EDGE = 4096
export const JPEG_DERIVATIVE_QUALITY = 92
export const IMAGE_PROCESSING_TIMEOUT_MS = 12_000
export const DERIVATIVE_MIME = 'image/jpeg'
export const DERIVATIVE_EXTENSION = 'jpg'

export const PATIENT_UPLOAD_POLICY = {
  DISABLED: 'disabled',
  SANITIZED_IMAGES: 'sanitized_images',
  MALWARE_SCANNED: 'malware_scanned',
} as const

export type PatientUploadPolicy =
  (typeof PATIENT_UPLOAD_POLICY)[keyof typeof PATIENT_UPLOAD_POLICY]

export interface AllowedFileType {
  mime: string
  /** Accepted extensions (lowercase), including aliases. */
  extensions: readonly string[]
  /** Normalized extension used when constructing an object path. */
  canonicalExtension: string
  maxBytes: number
}

/** The production scannerless allowlist. Future formats require Vercel proof. */
export const ALLOWED_FILE_TYPES: readonly AllowedFileType[] = [
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], canonicalExtension: 'jpg', maxBytes: MAX_IMAGE_BYTES },
  { mime: 'image/png', extensions: ['png'], canonicalExtension: 'png', maxBytes: MAX_IMAGE_BYTES },
]

export const ALLOWED_EXTENSIONS: readonly string[] = ALLOWED_FILE_TYPES.flatMap(
  (type) => type.extensions
)

export function getAllowedTypeByMime(mime: string): AllowedFileType | null {
  return ALLOWED_FILE_TYPES.find((type) => type.mime === mime) ?? null
}

export function getAllowedTypeByExtension(extension: string): AllowedFileType | null {
  const ext = extension.toLowerCase()
  return ALLOWED_FILE_TYPES.find((type) => type.extensions.includes(ext)) ?? null
}

export function isExtensionValidForMime(extension: string, mime: string): boolean {
  const type = getAllowedTypeByMime(mime)
  return type != null && type.extensions.includes(extension.toLowerCase())
}

export function maxBytesForMime(mime: string): number | null {
  return getAllowedTypeByMime(mime)?.maxBytes ?? null
}

/**
 * Pending-upload window: how long a prepared upload (and its signed token +
 * HMAC ticket) remain valid before the row is treated as an orphan. Also used
 * as the ticket TTL so both expire together.
 */
export const UPLOAD_TICKET_TTL_SECONDS = 30 * 60

/** Grace period before a structurally validated but unlinked upload is orphaned. */
export const CONFIRMED_UNLINKED_GRACE_SECONDS = 24 * 60 * 60

/** Signed download/preview URL lifetimes (Phase 5B decision). */
export const SIGNED_URL_PREVIEW_TTL_SECONDS = 120
export const SIGNED_URL_DOWNLOAD_TTL_SECONDS = 300

/**
 * Build the opaque, PII-free storage object key for a patient attachment.
 * `scopeId` is the pre-submit upload session id (or, later, the request id).
 */
export function buildPatientFileObjectPath(
  scopeId: string,
  fileId: string,
  extension: string
): string {
  return `patient-requests/${scopeId}/original/${fileId}.${extension.toLowerCase()}`
}

/** Build the opaque, PII-free path for the sanitized JPEG derivative. */
export function buildPatientFileDerivativeObjectPath(
  scopeId: string,
  fileId: string
): string {
  return `patient-requests/${scopeId}/sanitized/${fileId}.${DERIVATIVE_EXTENSION}`
}
