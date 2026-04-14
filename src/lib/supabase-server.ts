import { createServerClient } from '@supabase/ssr'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

/**
 * Server-side Supabase client for use in Route Handlers and Server Components.
 * Reads and writes auth cookies via the provided cookie store.
 */
export function createSupabaseServerClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              // cookieStore.set is available in Route Handlers but not Server Components
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(cookieStore as any).set(name, value, options)
            } catch {
              // In Server Components the cookie store is read-only; ignore writes.
            }
          })
        },
      },
    }
  )
}
