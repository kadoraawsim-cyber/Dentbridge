import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

function getEnvironmentName(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'
}

function getCommitSha(): string | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  return sha ? sha.slice(0, 12) : null
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: getEnvironmentName(),
      version: {
        commit: getCommitSha(),
      },
      readiness: {
        app: 'ok',
      },
    },
    { status: 200, headers: SECURITY_HEADERS }
  )
}
