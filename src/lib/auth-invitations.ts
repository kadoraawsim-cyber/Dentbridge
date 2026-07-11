import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  auditInvitationSent,
  type AuditRequestContext,
} from '@/lib/audit/audit.service'

export type InvitedRole = 'student' | 'faculty'
export type InvitationFailure = 'invalid_request' | 'conflict' | 'rate_limited' | 'unavailable' | 'server_error'

export class InvitationError extends Error {
  constructor(readonly reason: InvitationFailure) {
    super('Invitation operation failed.')
    this.name = 'InvitationError'
  }
}

export interface InviteUserWithRoleParams {
  email: string
  role: InvitedRole
  invitedBy: string
  redirectTo: string
  context?: AuditRequestContext
}

export interface InviteUserWithRoleResult {
  success: true
  email: string
  userId: string
  role: InvitedRole
  redirectTo: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function inviteUserWithRole({
  email,
  role,
  invitedBy,
  redirectTo,
  context,
}: InviteUserWithRoleParams): Promise<InviteUserWithRoleResult> {
  const normalizedEmail = normalizeEmail(email)

  if (!isValidEmail(normalizedEmail)) {
    throw new InvitationError('invalid_request')
  }

  if (role !== 'student' && role !== 'faculty') {
    throw new InvitationError('invalid_request')
  }

  if (!redirectTo.trim()) {
    throw new InvitationError('invalid_request')
  }

  const supabaseAdmin = createSupabaseAdminClient()

  const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      redirectTo,
      data: {
        invited_by: invitedBy,
        invited_role: role,
      },
    }
  )

  if (inviteError) {
    const status = (inviteError as { status?: number }).status
    const code = (inviteError as { code?: string }).code
    if (status === 429) throw new InvitationError('rate_limited')
    if (status && status >= 500) throw new InvitationError('unavailable')
    if (status === 409 || code === 'email_exists' || code === 'user_already_exists') {
      throw new InvitationError('conflict')
    }
    throw new InvitationError('server_error')
  }

  const invitedUserId = data.user?.id

  if (!invitedUserId) {
    throw new InvitationError('server_error')
  }

  const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
    invitedUserId,
    {
      app_metadata: {
        ...(data.user?.app_metadata ?? {}),
        role,
      },
    }
  )

  if (updateUserError) {
    const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(invitedUserId)

    if (rollbackError) {
      throw new InvitationError('server_error')
    }

    throw new InvitationError('server_error')
  }

  if (context) {
    await auditInvitationSent({
      invitedUserId,
      invitedRole: role,
      actorEmail: invitedBy,
      actorRole: 'admin',
      context,
      supabase: supabaseAdmin,
    })
  }

  return {
    success: true,
    email: normalizedEmail,
    userId: invitedUserId,
    role,
    redirectTo,
  }
}
