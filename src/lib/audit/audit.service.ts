import 'server-only'

import { randomUUID } from 'node:crypto'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export const AUDIT_ACTIONS = {
  PATIENT_REQUEST_CREATED: 'patient_request_created',
  PATIENT_STATUS_OTP_REQUESTED: 'patient_status_otp_requested',
  PATIENT_STATUS_LOOKUP: 'patient_status_lookup',
  FILE_UPLOAD_PREPARED: 'file_upload_prepared',
  FILE_CONFIRMED: 'file_confirmed',
  FILE_REJECTED: 'file_rejected',
  FILE_SIGNED_URL_CREATED: 'file_signed_url_created',
} as const

export const AUDIT_CATEGORIES = {
  CONSENT: 'consent',
  PRIVACY: 'privacy',
  SECURITY: 'security',
  WORKFLOW: 'workflow',
} as const

export const AUDIT_SEVERITIES = {
  INFO: 'info',
  NOTICE: 'notice',
  WARNING: 'warning',
  ERROR: 'error',
} as const

export const AUDIT_ACTOR_TYPES = {
  ANONYMOUS: 'anonymous',
  PATIENT: 'patient',
  SYSTEM: 'system',
  SERVICE: 'service',
} as const

const AUDIT_EVENT_VERSION = 1
const AUDIT_METADATA_SCHEMA = 'audit.v1'
const DEFAULT_SOURCE_SERVICE = 'dentbridge-web'
const DEFAULT_API_VERSION = 'v1'
const MAX_METADATA_KEYS = 25
const MAX_METADATA_BYTES = 4096
const MAX_METADATA_STRING_LENGTH = 256

const SENSITIVE_METADATA_KEYS = new Set([
  'authorization',
  'attachment_name',
  'attachment_path',
  'checksum',
  'checksum_sha256',
  'code',
  'filename',
  'object_path',
  'original_filename',
  'code_hash',
  'complaint_text',
  'full_name',
  'medical_condition',
  'otp',
  'password',
  'phone',
  'phone_number',
  'raw_phone',
  'secret',
  'token',
])

const SENSITIVE_METADATA_FRAGMENTS = ['otp', 'hash', 'secret', 'token', 'password']

type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]
type AuditCategory = (typeof AUDIT_CATEGORIES)[keyof typeof AUDIT_CATEGORIES]
type AuditSeverity = (typeof AUDIT_SEVERITIES)[keyof typeof AUDIT_SEVERITIES]
type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[keyof typeof AUDIT_ACTOR_TYPES]
type AuditMetadataValue = string | number | boolean | null
type AuditMetadata = Record<string, AuditMetadataValue>
type AuditMetadataInput = Record<string, unknown>
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

interface AuditEventDefinition {
  category: AuditCategory
  severity: AuditSeverity
  entityType: string
}

const AUDIT_EVENT_DEFINITIONS: Record<AuditAction, AuditEventDefinition> = {
  [AUDIT_ACTIONS.PATIENT_REQUEST_CREATED]: {
    category: AUDIT_CATEGORIES.WORKFLOW,
    severity: AUDIT_SEVERITIES.INFO,
    entityType: 'patient_request',
  },
  [AUDIT_ACTIONS.PATIENT_STATUS_OTP_REQUESTED]: {
    category: AUDIT_CATEGORIES.SECURITY,
    severity: AUDIT_SEVERITIES.INFO,
    entityType: 'patient_status',
  },
  [AUDIT_ACTIONS.PATIENT_STATUS_LOOKUP]: {
    category: AUDIT_CATEGORIES.PRIVACY,
    severity: AUDIT_SEVERITIES.NOTICE,
    entityType: 'patient_status',
  },
  [AUDIT_ACTIONS.FILE_UPLOAD_PREPARED]: {
    category: AUDIT_CATEGORIES.SECURITY,
    severity: AUDIT_SEVERITIES.INFO,
    entityType: 'patient_file',
  },
  [AUDIT_ACTIONS.FILE_CONFIRMED]: {
    category: AUDIT_CATEGORIES.SECURITY,
    severity: AUDIT_SEVERITIES.INFO,
    entityType: 'patient_file',
  },
  [AUDIT_ACTIONS.FILE_REJECTED]: {
    category: AUDIT_CATEGORIES.SECURITY,
    severity: AUDIT_SEVERITIES.WARNING,
    entityType: 'patient_file',
  },
  [AUDIT_ACTIONS.FILE_SIGNED_URL_CREATED]: {
    category: AUDIT_CATEGORIES.PRIVACY,
    severity: AUDIT_SEVERITIES.NOTICE,
    entityType: 'patient_file',
  },
}

export interface AuditRequestContext {
  ipAddress: string | null
  userAgent: string | null
  requestId: string
  correlationId: string
  sourceService: string
  apiVersion: string
}

interface AuditLogInput {
  actorUserId?: string | null
  actorEmail?: string | null
  actorRole?: string | null
  actorType?: AuditActorType
  action: AuditAction
  category?: AuditCategory
  severity?: AuditSeverity
  success?: boolean
  entityType?: string
  entityId?: string | null
  metadata?: AuditMetadataInput
  ipAddress?: string | null
  userAgent?: string | null
  requestId?: string | null
  correlationId?: string | null
  sourceService?: string | null
  apiVersion?: string | null
  metadataSchema?: string | null
  eventVersion?: number
  context?: AuditRequestContext
  supabase?: SupabaseAdminClient
}

interface PatientRequestAuditInput {
  patientRequestId: string
  consentRecordCount: number
  consentVersion: string
  hasAttachment: boolean
  locale: string
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

interface PatientStatusOtpAuditInput {
  phoneLast4: string | null
  locale: string
  otpIssued: boolean
  smsDelivered?: boolean | null
  provider?: string | null
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

interface PatientStatusLookupAuditInput {
  phoneLast4: string | null
  locale: string
  success: boolean
  result: 'verified' | 'verification_failed' | 'status_not_found'
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

function sanitizeText(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.slice(0, maxLength)
}

function getHeaderValue(request: Request, header: string, maxLength: number): string | null {
  return sanitizeText(request.headers.get(header), maxLength)
}

function getClientIpFromHeaders(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return sanitizeText(forwardedFor.split(',')[0], 128)
  }
  return getHeaderValue(request, 'x-real-ip', 128)
}

function isSensitiveMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase()
  if (SENSITIVE_METADATA_KEYS.has(normalized)) {
    return true
  }
  return SENSITIVE_METADATA_FRAGMENTS.some((fragment) => normalized.includes(fragment))
}

function normalizeMetadataValue(value: unknown): AuditMetadataValue | undefined {
  if (value == null) {
    return null
  }
  if (typeof value === 'string') {
    return value.slice(0, MAX_METADATA_STRING_LENGTH)
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'boolean') {
    return value
  }
  return undefined
}

function metadataByteLength(metadata: AuditMetadata): number {
  return new TextEncoder().encode(JSON.stringify(metadata)).length
}

function normalizeMetadata(input: AuditMetadataInput = {}): AuditMetadata {
  const normalized: AuditMetadata = {}
  let acceptedKeys = 0
  let droppedKeys = 0

  for (const [key, rawValue] of Object.entries(input)) {
    if (acceptedKeys >= MAX_METADATA_KEYS || isSensitiveMetadataKey(key)) {
      droppedKeys += 1
      continue
    }

    const value = normalizeMetadataValue(rawValue)
    if (value === undefined) {
      droppedKeys += 1
      continue
    }

    const candidate = { ...normalized, [key]: value }
    if (metadataByteLength(candidate) > MAX_METADATA_BYTES) {
      droppedKeys += 1
      continue
    }

    normalized[key] = value
    acceptedKeys += 1
  }

  if (droppedKeys > 0) {
    normalized.metadata_truncated = true
  }

  return normalized
}

export function createAuditRequestContext(
  request: Request,
  options?: { ipAddress?: string | null; sourceService?: string; apiVersion?: string }
): AuditRequestContext {
  const requestId = getHeaderValue(request, 'x-request-id', 128) ?? randomUUID()
  const correlationId = getHeaderValue(request, 'x-correlation-id', 128) ?? requestId

  return {
    ipAddress: options?.ipAddress ?? getClientIpFromHeaders(request),
    userAgent: getHeaderValue(request, 'user-agent', 512),
    requestId,
    correlationId,
    sourceService: sanitizeText(options?.sourceService ?? DEFAULT_SOURCE_SERVICE, 80) ?? DEFAULT_SOURCE_SERVICE,
    apiVersion: sanitizeText(options?.apiVersion ?? DEFAULT_API_VERSION, 40) ?? DEFAULT_API_VERSION,
  }
}

export function getPhoneLast4(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, '') ?? ''
  return digits.length >= 4 ? digits.slice(-4) : null
}

export async function createAuditLog(input: AuditLogInput): Promise<boolean> {
  const definition = AUDIT_EVENT_DEFINITIONS[input.action]
  const context = input.context

  try {
    const supabase = input.supabase ?? createSupabaseAdminClient()
    const { error } = await supabase.from('audit_logs').insert({
      actor_user_id: input.actorUserId ?? null,
      actor_email: sanitizeText(input.actorEmail, 320),
      actor_role: sanitizeText(input.actorRole, 80),
      actor_type: input.actorType ?? AUDIT_ACTOR_TYPES.ANONYMOUS,
      action: input.action,
      category: input.category ?? definition.category,
      severity: input.severity ?? definition.severity,
      success: input.success ?? true,
      entity_type: sanitizeText(input.entityType ?? definition.entityType, 120) ?? definition.entityType,
      entity_id: input.entityId ?? null,
      metadata_json: normalizeMetadata(input.metadata),
      ip_address: sanitizeText(input.ipAddress ?? context?.ipAddress, 128),
      user_agent: sanitizeText(input.userAgent ?? context?.userAgent, 512),
      request_id: sanitizeText(input.requestId ?? context?.requestId, 128),
      correlation_id: sanitizeText(input.correlationId ?? context?.correlationId, 128),
      source_service:
        sanitizeText(input.sourceService ?? context?.sourceService ?? DEFAULT_SOURCE_SERVICE, 80) ??
        DEFAULT_SOURCE_SERVICE,
      api_version: sanitizeText(input.apiVersion ?? context?.apiVersion ?? DEFAULT_API_VERSION, 40),
      metadata_schema:
        sanitizeText(input.metadataSchema ?? AUDIT_METADATA_SCHEMA, 80) ?? AUDIT_METADATA_SCHEMA,
      event_version: input.eventVersion ?? AUDIT_EVENT_VERSION,
    })

    if (error) {
      console.error('[audit] Failed to create audit log', {
        action: input.action,
        entityType: input.entityType ?? definition.entityType,
        error: error.message,
      })
      return false
    }

    return true
  } catch (error) {
    console.error('[audit] Unexpected audit log failure', {
      action: input.action,
      entityType: input.entityType ?? definition.entityType,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

export async function auditPatientRequestCreated(
  input: PatientRequestAuditInput
): Promise<boolean> {
  return createAuditLog({
    action: AUDIT_ACTIONS.PATIENT_REQUEST_CREATED,
    actorType: AUDIT_ACTOR_TYPES.ANONYMOUS,
    entityId: input.patientRequestId,
    metadata: {
      consent_record_count: input.consentRecordCount,
      consent_version: input.consentVersion,
      has_attachment: input.hasAttachment,
      locale: input.locale,
    },
    context: input.context,
    supabase: input.supabase,
  })
}

export async function auditPatientStatusOtpRequested(
  input: PatientStatusOtpAuditInput
): Promise<boolean> {
  return createAuditLog({
    action: AUDIT_ACTIONS.PATIENT_STATUS_OTP_REQUESTED,
    actorType: AUDIT_ACTOR_TYPES.ANONYMOUS,
    success: true,
    metadata: {
      phone_last4: input.phoneLast4,
      locale: input.locale,
      challenge_issued: input.otpIssued,
      sms_delivered: input.smsDelivered ?? null,
      provider: input.provider ?? null,
    },
    context: input.context,
    supabase: input.supabase,
  })
}

export async function auditPatientStatusLookup(
  input: PatientStatusLookupAuditInput
): Promise<boolean> {
  return createAuditLog({
    action: AUDIT_ACTIONS.PATIENT_STATUS_LOOKUP,
    actorType: AUDIT_ACTOR_TYPES.ANONYMOUS,
    success: input.success,
    severity: input.success ? AUDIT_SEVERITIES.NOTICE : AUDIT_SEVERITIES.WARNING,
    metadata: {
      phone_last4: input.phoneLast4,
      locale: input.locale,
      result: input.result,
    },
    context: input.context,
    supabase: input.supabase,
  })
}

interface FileUploadPreparedAuditInput {
  fileId: string
  declaredMime: string
  extension: string
  declaredSizeBytes: number | null
  locale: string
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

interface FileConfirmedAuditInput {
  fileId: string
  patientRequestId?: string | null
  detectedMime: string | null
  sizeBytes: number | null
  locale: string
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

interface FileRejectedAuditInput {
  fileId: string
  reason: string
  locale: string
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

interface FileSignedUrlCreatedAuditInput {
  fileId: string
  patientRequestId: string | null
  purpose: 'preview' | 'download'
  expirySeconds: number
  actorUserId: string
  actorEmail?: string | null
  actorRole: string
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

export async function auditFileUploadPrepared(
  input: FileUploadPreparedAuditInput
): Promise<boolean> {
  return createAuditLog({
    action: AUDIT_ACTIONS.FILE_UPLOAD_PREPARED,
    actorType: AUDIT_ACTOR_TYPES.ANONYMOUS,
    entityId: input.fileId,
    metadata: {
      file_id: input.fileId,
      declared_mime: input.declaredMime,
      extension: input.extension,
      declared_size_bytes: input.declaredSizeBytes,
      locale: input.locale,
    },
    context: input.context,
    supabase: input.supabase,
  })
}

export async function auditFileConfirmed(
  input: FileConfirmedAuditInput
): Promise<boolean> {
  return createAuditLog({
    action: AUDIT_ACTIONS.FILE_CONFIRMED,
    actorType: AUDIT_ACTOR_TYPES.ANONYMOUS,
    entityId: input.fileId,
    metadata: {
      file_id: input.fileId,
      patient_request_id: input.patientRequestId ?? null,
      detected_mime: input.detectedMime,
      size_bytes: input.sizeBytes,
      result: 'confirmed',
      locale: input.locale,
    },
    context: input.context,
    supabase: input.supabase,
  })
}

export async function auditFileRejected(
  input: FileRejectedAuditInput
): Promise<boolean> {
  return createAuditLog({
    action: AUDIT_ACTIONS.FILE_REJECTED,
    actorType: AUDIT_ACTOR_TYPES.ANONYMOUS,
    success: false,
    entityId: input.fileId,
    metadata: {
      file_id: input.fileId,
      reason: input.reason,
      result: 'rejected',
      locale: input.locale,
    },
    context: input.context,
    supabase: input.supabase,
  })
}

export async function auditFileSignedUrlCreated(
  input: FileSignedUrlCreatedAuditInput
): Promise<boolean> {
  return createAuditLog({
    action: AUDIT_ACTIONS.FILE_SIGNED_URL_CREATED,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    actorType: AUDIT_ACTOR_TYPES.SERVICE,
    entityId: input.fileId,
    metadata: {
      file_id: input.fileId,
      patient_request_id: input.patientRequestId,
      purpose: input.purpose,
      expiry_seconds: input.expirySeconds,
      actor_role: input.actorRole,
    },
    context: input.context,
    supabase: input.supabase,
  })
}
