import { createServerClient } from '@supabase/ssr'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

import type { Database } from '@/lib/database.types'

/**
 * Server-side Supabase client for use in Route Handlers and Server Components.
 * Reads and writes auth cookies via the provided cookie store.
 */
export function createSupabaseServerClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // `cookies()` is typed read-only, but in Route Handlers the runtime
          // store is mutable and exposes `set`. Model that narrowly instead of
          // erasing the type with `any`; Server Components still throw and are
          // caught below.
          const mutableCookieStore = cookieStore as ReadonlyRequestCookies & {
            set?: (name: string, value: string, options?: unknown) => void
          }
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              mutableCookieStore.set?.(name, value, options)
            } catch {
              // In Server Components the cookie store is read-only; ignore writes.
            }
          })
        },
      },
    }
  )
}
