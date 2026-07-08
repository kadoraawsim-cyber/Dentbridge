import 'server-only'

import {
  auditProfileCompleted,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type ProfileRole = 'student' | 'faculty'
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type ServiceErrorReason = 'invalid_request' | 'forbidden' | 'server_error'

export type ProfileCompletionResult =
  | { ok: true }
  | { ok: false; reason: ServiceErrorReason }

export interface CompleteProfileInput {
  role: ProfileRole
  userId: string
  userEmail: string | null | undefined
  fullName: unknown
  phone: unknown
  context: AuditRequestContext
  supabase?: SupabaseAdminClient
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/\p{C}/gu, '').trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').trim()
  if (!normalized || normalized.length < 7 || normalized.length > 32) {
    return null
  }

  return normalized
}

export async function completeProfile(
  input: CompleteProfileInput
): Promise<ProfileCompletionResult> {
  const fullName = normalizeText(input.fullName, 160)
  const phone = normalizePhone(input.phone)
  const email = normalizeText(input.userEmail ?? null, 320)

  if (!input.userId || !email || !fullName || !phone) {
    return { ok: false, reason: 'invalid_request' }
  }

  const supabase = input.supabase ?? createSupabaseAdminClient()
  const nowIso = new Date().toISOString()

  try {
    if (input.role === 'student') {
      const { error } = await supabase.from('student_profiles').upsert({
        id: input.userId,
        email,
        full_name: fullName,
        phone,
        updated_at: nowIso,
      })

      if (error) {
        console.error('[profile-completion] Failed to upsert student profile', {
          error: error.message,
        })
        return { ok: false, reason: 'server_error' }
      }
    } else {
      const { error } = await supabase.from('faculty_profiles').upsert({
        id: input.userId,
        email,
        full_name: fullName,
        phone,
        updated_at: nowIso,
      })

      if (error) {
        console.error('[profile-completion] Failed to upsert faculty profile', {
          error: error.message,
        })
        return { ok: false, reason: 'server_error' }
      }
    }

    await auditProfileCompleted({
      actorUserId: input.userId,
      actorEmail: email,
      actorRole: input.role,
      context: input.context,
      supabase,
    })

    return { ok: true }
  } catch (error) {
    console.error('[profile-completion] Unexpected profile completion error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return { ok: false, reason: 'server_error' }
  }
}
