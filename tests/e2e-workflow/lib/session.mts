import { createServerClient } from '@supabase/ssr'

import type { Database } from '../../../src/lib/database.types.ts'
import type { TestAccount } from './env.mts'

interface StoredCookie {
  name: string
  value: string
}

export interface AuthenticatedSession {
  account: TestAccount
  userId: string
  role: string
  client: ReturnType<typeof createServerClient<Database>>
  cookieHeader(): string
  mergeSetCookie(headers: Headers): void
}

function mergeCookie(cookies: StoredCookie[], name: string, value: string): StoredCookie[] {
  const next = cookies.filter((cookie) => cookie.name !== name)
  next.push({ name, value })
  return next
}

function parseSetCookie(value: string): { name: string; value: string } | null {
  const [pair] = value.split(';')
  const index = pair?.indexOf('=') ?? -1
  if (!pair || index <= 0) return null
  return {
    name: pair.slice(0, index),
    value: pair.slice(index + 1),
  }
}

export async function authenticateSession(input: {
  account: TestAccount
  supabaseUrl: string
  supabaseAnonKey: string
}): Promise<AuthenticatedSession> {
  let cookies: StoredCookie[] = []

  const client = createServerClient<Database>(input.supabaseUrl, input.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookies
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          cookies = mergeCookie(cookies, cookie.name, cookie.value)
        }
      },
    },
  })

  const { data, error } = await client.auth.signInWithPassword({
    email: input.account.email,
    password: input.account.password,
  })

  if (error || !data.user) {
    throw new Error(`Unable to authenticate ${input.account.label}.`)
  }

  const role = typeof data.user.app_metadata?.role === 'string' ? data.user.app_metadata.role : ''
  const validRole =
    input.account.role === 'student' ? role === 'student' : role === 'faculty' || role === 'admin'

  if (!validRole) {
    await client.auth.signOut()
    throw new Error(`${input.account.label} authenticated with unexpected role "${role || 'none'}".`)
  }

  return {
    account: input.account,
    userId: data.user.id,
    role,
    client,
    cookieHeader() {
      return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
    },
    mergeSetCookie(headers: Headers) {
      const setCookie = headers.get('set-cookie')
      if (!setCookie) return
      for (const rawCookie of setCookie.split(/,(?=\s*[^;,]+=)/)) {
        const parsed = parseSetCookie(rawCookie.trim())
        if (parsed) cookies = mergeCookie(cookies, parsed.name, parsed.value)
      }
    },
  }
}
