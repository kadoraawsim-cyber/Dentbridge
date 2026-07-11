import { NextRequest, NextResponse } from 'next/server'

import { getServerEnvironment } from '@/lib/env/server'
import { isValidCronAuthorization } from '@/lib/files/orphan-cleanup.service'
import { captureMessage } from '@/lib/observability/error-monitor'

export const runtime = 'nodejs'

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.ENABLE_MONITORING_TEST_ROUTE !== 'true') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (
    !isValidCronAuthorization(
      request.headers.get('authorization'),
      getServerEnvironment().CRON_SECRET
    )
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  await captureMessage('DentBridge monitoring verification event.', {
    actorType: 'service',
    route: 'internal.monitoring_test',
    metadata: { safe_test_event: true },
  })
  return NextResponse.json({ success: true }, { status: 202 })
}
