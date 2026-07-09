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
  UPLOADED: 'uploaded',
  SCANNING: 'scanning',
  CLEAN: 'clean',
  QUARANTINED: 'quarantined',
  REJECTED: 'rejected',
  ORPHANED: 'orphaned',
  DELETED: 'deleted',
} as const

export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS]

/** Malware-scan sub-state. Real scanning is deferred to 5F; interim is 'skipped'. */
export const SCAN_STATE = {
  SKIPPED: 'skipped',
  PENDING: 'pending',
  CLEAN: 'clean',
  INFECTED: 'infected',
} as const

const MB = 1024 * 1024

/** Per-type size caps (Phase 5B decision: 10 MB images, 15 MB PDF). */
export const MAX_IMAGE_BYTES = 10 * MB
export const MAX_PDF_BYTES = 15 * MB

/** Absolute ceiling enforced regardless of type (matches DB size CHECK). */
export const HARD_MAX_UPLOAD_BYTES = 15 * MB

export interface AllowedFileType {
  mime: string
  /** Accepted extensions (lowercase), including aliases. */
  extensions: readonly string[]
  /** Normalized extension used when constructing an object path. */
  canonicalExtension: string
  maxBytes: number
}

/** The complete allowlist. Adding a type here is the single point of change. */
export const ALLOWED_FILE_TYPES: readonly AllowedFileType[] = [
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], canonicalExtension: 'jpg', maxBytes: MAX_IMAGE_BYTES },
  { mime: 'image/png', extensions: ['png'], canonicalExtension: 'png', maxBytes: MAX_IMAGE_BYTES },
  { mime: 'application/pdf', extensions: ['pdf'], canonicalExtension: 'pdf', maxBytes: MAX_PDF_BYTES },
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
  return `patient-requests/${scopeId}/${fileId}.${extension.toLowerCase()}`
}
