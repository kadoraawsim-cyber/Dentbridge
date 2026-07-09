import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin environment variables are not configured.')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Service-role Supabase client type shared by server-only services (Phase 9).
 * Import this instead of re-deriving `ReturnType<typeof createSupabaseAdminClient>`
 * in every service module.
 */
export type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>
