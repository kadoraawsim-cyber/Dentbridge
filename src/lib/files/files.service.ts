import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import {
  auditFileConfirmed,
  auditFileRejected,
  auditFileSignedUrlCreated,
  auditFileUploadPrepared,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'
import { canAccessFacultyPortal, isStudentRole } from '@/lib/roles'
import { createSupabaseAdminClient, type SupabaseAdminClient } from '@/lib/supabase-admin'
import {
  buildPatientFileObjectPath,
  CONFIRMED_UNLINKED_GRACE_SECONDS,
  FILE_STATUS,
  getAllowedTypeByMime,
  HARD_MAX_UPLOAD_BYTES,
  isExtensionValidForMime,
  maxBytesForMime,
  PATIENT_UPLOADS_BUCKET,
  SCAN_STATE,
  SIGNED_URL_DOWNLOAD_TTL_SECONDS,
  SIGNED_URL_PREVIEW_TTL_SECONDS,
  type FileStatus,
} from './file.constants'
import { detectMimeFromBytes } from './magic-bytes'
import { createUploadTicket, verifyUploadTicket } from './ticket'


type ServiceErrorReason =
  | 'invalid_request'
  | 'validation_failed'
  | 'not_found'
  | 'forbidden'
  | 'server_error'

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ServiceErrorReason }

export interface PrepareUploadInput {
  fileName: unknown
  mimeType: unknown
  sizeBytes: unknown
  locale: string
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

export interface PrepareUploadData {
  fileId: string
  objectPath: string
  /** Full signed upload URL (PUT target). */
  uploadUrl: string
  /** Token for supabase-js `uploadToSignedUrl(path, token, file)`. */
  token: string
  expiresAt: string
  ticket: string
}

export interface ConfirmUploadInput {
  fileId: string
  ticket: unknown
  locale: string
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

export interface ConfirmUploadData {
  fileId: string
  status: FileStatus
}

export interface CreateSignedFileUrlInput {
  fileId: string
  purpose: 'preview' | 'download'
  actorUserId: string
  actorEmail?: string | null
  actorRole: unknown
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

export interface SignedFileUrlData {
  signedUrl: string
  expiresAt: string
  fileName: string
  mimeType: string
}

interface PatientFileRow {
  id: string
  object_path: string
  original_filename: string
  declared_mime: string
  detected_mime: string | null
  extension: string
  status: string
  scan_state: string | null
  patient_request_id: string | null
}

interface ObjectInspection {
  bytes: Uint8Array
  size: number | null
  checksum: string | null
}

/** Bytes to read from the head of a stored object for magic-byte detection. */
const INSPECT_RANGE_BYTES = 4096

function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data }
}

function err<T>(reason: ServiceErrorReason): ServiceResult<T> {
  return { ok: false, reason }
}

function sanitizeDisplayFilename(name: string): string {
  return name
    .replace(/\p{C}/gu, '')
    .replace(/[\\/]/g, '_')
    .trim()
    .slice(0, 255)
}

function extractExtension(fileName: string): string | null {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return null
  }
  const ext = fileName.slice(lastDot + 1).toLowerCase()
  return /^[a-z0-9]+$/.test(ext) ? ext : null
}

function parseDeclaredSize(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value)
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10)
  }
  return null
}

function parseTotalSize(response: Response, bufferLength: number): number | null {
  const contentRange = response.headers.get('content-range')
  if (contentRange) {
    const total = Number(contentRange.split('/')[1])
    if (Number.isInteger(total) && total > 0) {
      return total
    }
  }

  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isInteger(contentLength) && contentLength > 0) {
    return contentLength
  }

  return response.status === 200 ? bufferLength : null
}

async function loadPatientFile(
  supabase: SupabaseAdminClient,
  fileId: string
): Promise<ServiceResult<PatientFileRow>> {
  const { data: row, error } = await supabase
    .from('patient_files')
    .select(
      'id, object_path, original_filename, declared_mime, detected_mime, extension, status, scan_state, patient_request_id'
    )
    .eq('id', fileId)
    .maybeSingle<PatientFileRow>()

  if (error) {
    console.error('[files] Failed to load patient_files row', { error: error.message })
    return err('server_error')
  }
  if (!row) {
    return err('not_found')
  }

  return ok(row)
}

async function inspectStoredObject(
  supabase: SupabaseAdminClient,
  objectPath: string
): Promise<ObjectInspection | null> {
  const { data: signed, error } = await supabase.storage
    .from(PATIENT_UPLOADS_BUCKET)
    .createSignedUrl(objectPath, 60)

  if (error || !signed?.signedUrl) {
    return null
  }

  const rangeResponse = await fetch(signed.signedUrl, {
    headers: { Range: `bytes=0-${INSPECT_RANGE_BYTES - 1}` },
  })

  if (rangeResponse.status !== 200 && rangeResponse.status !== 206) {
    return null
  }

  const rangeBuffer = await rangeResponse.arrayBuffer()
  const headBytes = new Uint8Array(rangeBuffer)
  const size = parseTotalSize(rangeResponse, headBytes.length)

  if (size != null && size > HARD_MAX_UPLOAD_BYTES) {
    return { bytes: headBytes, size, checksum: null }
  }

  const fullResponse =
    rangeResponse.status === 200 ? rangeResponse : await fetch(signed.signedUrl)

  if (!fullResponse.ok) {
    return { bytes: headBytes, size, checksum: null }
  }

  const fullBuffer = await fullResponse.arrayBuffer()
  const fullBytes = new Uint8Array(fullBuffer)
  const fullSize = size ?? parseTotalSize(fullResponse, fullBytes.length) ?? fullBytes.length
  if (fullSize > HARD_MAX_UPLOAD_BYTES || fullBytes.length > HARD_MAX_UPLOAD_BYTES) {
    return { bytes: headBytes, size: fullSize, checksum: null }
  }

  return {
    bytes: fullBytes.slice(0, INSPECT_RANGE_BYTES),
    size: fullSize,
    checksum: createHash('sha256').update(Buffer.from(fullBuffer)).digest('hex'),
  }
}

function getSignedUrlTtlSeconds(purpose: 'preview' | 'download'): number {
  return purpose === 'download'
    ? SIGNED_URL_DOWNLOAD_TTL_SECONDS
    : SIGNED_URL_PREVIEW_TTL_SECONDS
}

/** Routing-stage statuses in which a student still actively owns the case. */
const ACTIVE_STAGE_STATUSES = [
  'student_assigned',
  'contacted',
  'appointment_scheduled',
  'in_treatment',
  'faculty_review',
]

async function canActorReadFile(
  supabase: SupabaseAdminClient,
  row: PatientFileRow,
  actorUserId: string,
  actorRole: unknown
): Promise<boolean> {
  if (canAccessFacultyPortal(actorRole)) {
    return true
  }

  if (!isStudentRole(actorRole) || !row.patient_request_id) {
    return false
  }

  // A student may read a patient file only while they are the CURRENT-stage
  // assignee of the case. A historical approved request from a previous,
  // handed-off stage no longer grants file access.
  const { data: approved, error: requestError } = await supabase
    .from('student_case_requests')
    .select('id, stage_id')
    .eq('case_id', row.patient_request_id)
    .eq('student_id', actorUserId)
    .eq('status', 'approved')
    .maybeSingle<{ id: string; stage_id: string | null }>()

  if (requestError) {
    console.error('[files] Failed to authorize student file read', { error: requestError.message })
    return false
  }

  if (!approved) {
    return false
  }

  const { data: caseRow, error: caseError } = await supabase
    .from('patient_requests')
    .select('current_stage_id')
    .eq('id', row.patient_request_id)
    .maybeSingle<{ current_stage_id: string | null }>()

  if (caseError) {
    console.error('[files] Failed to load case for file authorization', { error: caseError.message })
    return false
  }

  const currentStageId = caseRow?.current_stage_id ?? null

  // Legacy pre-routing case with no stage: the approved request alone authorizes.
  if (!currentStageId) {
    return true
  }

  // The approved request must be for the case's CURRENT stage.
  if (approved.stage_id && approved.stage_id !== currentStageId) {
    return false
  }

  const { data: stage, error: stageError } = await supabase
    .from('case_routing_stages')
    .select('student_id, status')
    .eq('id', currentStageId)
    .eq('case_id', row.patient_request_id)
    .maybeSingle<{ student_id: string | null; status: string | null }>()

  if (stageError || !stage) {
    if (stageError) {
      console.error('[files] Failed to load stage for file authorization', {
        error: stageError.message,
      })
    }
    return false
  }

  if (stage.student_id && stage.student_id !== actorUserId) {
    return false
  }

  return ACTIVE_STAGE_STATUSES.includes(stage.status ?? '')
}

export async function prepareUpload(
  input: PrepareUploadInput
): Promise<ServiceResult<PrepareUploadData>> {
  const supabase = input.supabase ?? createSupabaseAdminClient()

  try {
    if (typeof input.fileName !== 'string' || typeof input.mimeType !== 'string') {
      return err('invalid_request')
    }

    const displayName = sanitizeDisplayFilename(input.fileName)
    if (!displayName) {
      return err('invalid_request')
    }

    const mime = input.mimeType.trim()
    if (!getAllowedTypeByMime(mime)) {
      return err('validation_failed')
    }

    const extension = extractExtension(displayName)
    if (!extension || !isExtensionValidForMime(extension, mime)) {
      return err('validation_failed')
    }

    const maxBytes = maxBytesForMime(mime) ?? HARD_MAX_UPLOAD_BYTES
    const declaredSize = parseDeclaredSize(input.sizeBytes)
    if (declaredSize == null || declaredSize <= 0) {
      return err('invalid_request')
    }
    if (declaredSize > maxBytes || declaredSize > HARD_MAX_UPLOAD_BYTES) {
      return err('validation_failed')
    }

    const fileId = randomUUID()
    const sessionId = randomUUID()
    const objectPath = buildPatientFileObjectPath(sessionId, fileId, extension)
    const ticket = createUploadTicket(fileId)

    const { data: signed, error: signError } = await supabase.storage
      .from(PATIENT_UPLOADS_BUCKET)
      .createSignedUploadUrl(objectPath)

    if (signError || !signed) {
      console.error('[files] Failed to create signed upload URL', {
        error: signError?.message ?? 'Unknown error',
      })
      return err('server_error')
    }

    const { error: insertError } = await supabase.from('patient_files').insert({
      id: fileId,
      upload_session_id: sessionId,
      bucket: PATIENT_UPLOADS_BUCKET,
      object_path: objectPath,
      original_filename: displayName,
      declared_mime: mime,
      extension,
      status: FILE_STATUS.PENDING,
      uploaded_by_actor: 'anonymous_patient',
      ip_address: input.context.ipAddress,
      expires_at: ticket.expiresAt.toISOString(),
    })

    if (insertError) {
      console.error('[files] Failed to insert patient_files row', {
        error: insertError.message,
      })
      return err('server_error')
    }

    await auditFileUploadPrepared({
      fileId,
      declaredMime: mime,
      extension,
      declaredSizeBytes: declaredSize,
      locale: input.locale,
      context: input.context,
      supabase,
    })

    return ok({
      fileId,
      objectPath,
      uploadUrl: signed.signedUrl,
      token: signed.token,
      expiresAt: ticket.expiresAt.toISOString(),
      ticket: ticket.value,
    })
  } catch (error) {
    console.error('[files] Unexpected prepareUpload error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return err('server_error')
  }
}

export async function confirmUpload(
  input: ConfirmUploadInput
): Promise<ServiceResult<ConfirmUploadData>> {
  const supabase = input.supabase ?? createSupabaseAdminClient()

  try {
    if (!verifyUploadTicket(input.fileId, input.ticket)) {
      return err('validation_failed')
    }

    const rowResult = await loadPatientFile(supabase, input.fileId)
    if (!rowResult.ok) {
      return rowResult
    }
    const row = rowResult.data

    if (row.status === FILE_STATUS.QUARANTINED) {
      return ok({ fileId: row.id, status: FILE_STATUS.QUARANTINED })
    }
    if (row.status !== FILE_STATUS.PENDING && row.status !== FILE_STATUS.UPLOADED) {
      return err('validation_failed')
    }

    const inspection = await inspectStoredObject(supabase, row.object_path)
    if (!inspection) {
      return err('validation_failed')
    }

    const maxBytes = maxBytesForMime(row.declared_mime) ?? HARD_MAX_UPLOAD_BYTES
    const detectedMime = detectMimeFromBytes(inspection.bytes)
    const rejectReason =
      inspection.size == null || inspection.size <= 0
        ? 'size_indeterminate'
        : inspection.size > maxBytes || inspection.size > HARD_MAX_UPLOAD_BYTES
          ? 'size_exceeded'
          : detectedMime == null
            ? 'unrecognized_content'
            : detectedMime !== row.declared_mime
              ? 'mime_mismatch'
              : !inspection.checksum
                ? 'checksum_unavailable'
                : null

    if (rejectReason) {
      await supabase
        .from('patient_files')
        .update({
          status: FILE_STATUS.REJECTED,
          detected_mime: detectedMime,
          size_bytes: inspection.size,
          scanned_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      await supabase.storage.from(PATIENT_UPLOADS_BUCKET).remove([row.object_path])

      await auditFileRejected({
        fileId: row.id,
        reason: rejectReason,
        locale: input.locale,
        context: input.context,
        supabase,
      })

      return err('validation_failed')
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const { error: updateError } = await supabase
      .from('patient_files')
      .update({
        status: FILE_STATUS.QUARANTINED,
        scan_state: SCAN_STATE.PENDING,
        detected_mime: detectedMime,
        size_bytes: inspection.size,
        checksum_sha256: inspection.checksum,
        confirmed_at: nowIso,
        scanned_at: null,
        expires_at: new Date(
          now.getTime() + CONFIRMED_UNLINKED_GRACE_SECONDS * 1000
        ).toISOString(),
      })
      .eq('id', row.id)
      .eq('status', row.status)

    if (updateError) {
      console.error('[files] Failed to quarantine structurally validated file', {
        error: updateError.message,
      })
      return err('server_error')
    }

    await auditFileConfirmed({
      fileId: row.id,
      patientRequestId: row.patient_request_id,
      detectedMime,
      sizeBytes: inspection.size,
      locale: input.locale,
      context: input.context,
      supabase,
    })

    return ok({ fileId: row.id, status: FILE_STATUS.QUARANTINED })
  } catch (error) {
    console.error('[files] Unexpected confirmUpload error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return err('server_error')
  }
}

export async function createPatientFileSignedUrl(
  input: CreateSignedFileUrlInput
): Promise<ServiceResult<SignedFileUrlData>> {
  const supabase = input.supabase ?? createSupabaseAdminClient()

  try {
    const rowResult = await loadPatientFile(supabase, input.fileId)
    if (!rowResult.ok) {
      return rowResult
    }
    const row = rowResult.data

    if (
      row.status !== FILE_STATUS.CLEAN ||
      row.scan_state !== SCAN_STATE.CLEAN ||
      !row.patient_request_id
    ) {
      return err('not_found')
    }

    const actorRole = typeof input.actorRole === 'string' ? input.actorRole : ''
    const authorized = await canActorReadFile(supabase, row, input.actorUserId, actorRole)
    if (!authorized) {
      return err('forbidden')
    }

    const ttlSeconds = getSignedUrlTtlSeconds(input.purpose)
    const { data, error } = await supabase.storage
      .from(PATIENT_UPLOADS_BUCKET)
      .createSignedUrl(row.object_path, ttlSeconds, {
        download: input.purpose === 'download' ? row.original_filename : false,
      })

    if (error || !data?.signedUrl) {
      console.error('[files] Failed to create patient file signed URL', {
        error: error?.message ?? 'Unknown error',
      })
      return err('server_error')
    }

    await auditFileSignedUrlCreated({
      fileId: row.id,
      patientRequestId: row.patient_request_id,
      purpose: input.purpose,
      expirySeconds: ttlSeconds,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      actorRole,
      context: input.context,
      supabase,
    })

    return ok({
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      fileName: row.original_filename,
      mimeType: row.detected_mime ?? row.declared_mime,
    })
  } catch (error) {
    console.error('[files] Unexpected createPatientFileSignedUrl error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return err('server_error')
  }
}
