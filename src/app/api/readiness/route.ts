import { NextResponse } from 'next/server'

import { getServerEnvironment } from '@/lib/env/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

export async function GET(): Promise<NextResponse> {
  try {
    getServerEnvironment()
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('patient_requests').select('id').limit(1)
    if (error) throw new Error('Database readiness check failed.')

    return NextResponse.json(
      { status: 'ready', checks: { configuration: 'ok', database: 'ok' } },
      { status: 200, headers: HEADERS }
    )
  } catch {
    return NextResponse.json(
      { status: 'not_ready', checks: { configuration: 'unknown', database: 'unknown' } },
      { status: 503, headers: HEADERS }
    )
  }
}
