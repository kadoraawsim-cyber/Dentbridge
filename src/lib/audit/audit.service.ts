import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export const AUDIT_ACTIONS = {
  PATIENT_REQUEST_CREATED: 'patient_request_created',
  PATIENT_STATUS_OTP_REQUESTED: 'patient_status_otp_requested',
  PATIENT_STATUS_LOOKUP: 'patient_status_lookup',
} as const

type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]
type AuditMetadataValue = string | number | boolean | null
type AuditMetadata = Record<string, AuditMetadataValue>

interface AuditLogInput {
  actorUserId?: string | null
  actorEmail?: string | null
  actorRole?: string | null
  action: AuditAction
  entityType: string
  entityId?: string | null
  metadata?: AuditMetadata
  ipAddress?: string | null
  userAgent?: string | null
}

export async function createAuditLog(input: AuditLogInput): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('audit_logs').insert({
      actor_user_id: input.actorUserId ?? null,
      actor_email: input.actorEmail ?? null,
      actor_role: input.actorRole ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata_json: input.metadata ?? {},
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    })

    if (error) {
      console.error('[audit] Failed to create audit log', {
        action: input.action,
        entityType: input.entityType,
        error: error.message,
      })
      return false
    }

    return true
  } catch (error) {
    console.error('[audit] Unexpected audit log failure', {
      action: input.action,
      entityType: input.entityType,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}
