import { NextRequest, NextResponse } from 'next/server'

import {
  cleanupOrphanPatientFiles,
  isValidCronAuthorization,
} from '@/lib/files/orphan-cleanup.service'
import { getServerEnvironment } from '@/lib/env/server'

export const runtime = 'nodejs'

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = getServerEnvironment().CRON_SECRET
  if (!isValidCronAuthorization(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: HEADERS })
  }

  try {
    const summary = await cleanupOrphanPatientFiles()
    return NextResponse.json({ success: true, ...summary }, { status: 200, headers: HEADERS })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500, headers: HEADERS })
  }
}

export const POST = GET
