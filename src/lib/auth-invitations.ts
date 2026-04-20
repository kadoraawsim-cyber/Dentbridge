import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export type InvitedRole = 'student' | 'faculty'

export interface InviteUserWithRoleParams {
  email: string
  role: InvitedRole
  invitedBy: string
  redirectTo: string
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
}: InviteUserWithRoleParams): Promise<InviteUserWithRoleResult> {
  const normalizedEmail = normalizeEmail(email)

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('A valid email is required.')
  }

  if (role !== 'student' && role !== 'faculty') {
    throw new Error('Unsupported invite role.')
  }

  if (!redirectTo.trim()) {
    throw new Error('A redirect URL is required.')
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
    throw new Error(inviteError.message)
  }

  const invitedUserId = data.user?.id

  if (!invitedUserId) {
    throw new Error('Invitation succeeded but no user id was returned by Supabase Auth.')
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
      throw new Error(
        [
          'Invitation role assignment failed.',
          `Role update error: ${updateUserError.message}`,
          `Rollback delete error: ${rollbackError.message}`,
        ].join(' ')
      )
    }

    throw new Error(
      `Invitation role assignment failed and the invited auth user was rolled back. ${updateUserError.message}`
    )
  }

  return {
    success: true,
    email: normalizedEmail,
    userId: invitedUserId,
    role,
    redirectTo,
  }
}
