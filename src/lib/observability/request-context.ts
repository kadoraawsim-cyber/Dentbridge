import 'server-only'

import { getClientIp } from '@/lib/api/rate-limit'
import { createAuditRequestContext } from '@/lib/audit/audit.service'
import { logger, type LogMetadata } from './logger'

export interface RequestContext {
  requestId: string
  correlationId: string
  method: string
  path: string
  route: string
  userAgent: string | null
  ipBucket: string | null
  startedAtMs: number
  durationMs: () => number
}

export interface RequestEndMetadata {
  actorRole?: string | null
  actorType?: string | null
  errorCode?: string | null
  outcome?: 'success' | 'failure'
  statusCode: number
  metadata?: LogMetadata
}

function safePath(request: Request): string {
  try {
    return new URL(request.url).pathname
  } catch {
    return 'unknown'
  }
}

function bucketIp(ip: string | null): string | null {
  if (!ip || ip === 'unknown') {
    return null
  }

  const ipv4Parts = ip.split('.')
  if (ipv4Parts.length === 4 && ipv4Parts.every((part) => /^\d{1,3}$/.test(part))) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.${ipv4Parts[2]}.0/24`
  }

  if (ip.includes(':')) {
    return `${ip.split(':').slice(0, 4).join(':')}::/64`
  }

  return null
}

export function createRequestContext(request: Request, options: { route: string }): RequestContext {
  const auditContext = createAuditRequestContext(request, { ipAddress: getClientIp(request) })
  const startedAtMs = Date.now()

  return {
    requestId: auditContext.requestId,
    correlationId: auditContext.correlationId,
    method: request.method,
    path: safePath(request),
    route: options.route,
    userAgent: auditContext.userAgent,
    ipBucket: bucketIp(auditContext.ipAddress),
    startedAtMs,
    durationMs: () => Date.now() - startedAtMs,
  }
}

export function logRequestStart(context: RequestContext, metadata?: LogMetadata) {
  logger.info('api.request.start', {
    correlationId: context.correlationId,
    method: context.method,
    path: context.path,
    requestId: context.requestId,
    route: context.route,
    metadata: {
      ip_bucket: context.ipBucket,
      ...metadata,
    },
  })
}

export function logRequestEnd(context: RequestContext, metadata: RequestEndMetadata) {
  const level = metadata.statusCode >= 500 ? 'error' : metadata.statusCode >= 400 ? 'warn' : 'info'
  logger[level]('api.request.end', {
    actorRole: metadata.actorRole,
    actorType: metadata.actorType,
    correlationId: context.correlationId,
    durationMs: context.durationMs(),
    method: context.method,
    path: context.path,
    requestId: context.requestId,
    route: context.route,
    statusCode: metadata.statusCode,
    metadata: {
      error_code: metadata.errorCode ?? null,
      outcome:
        metadata.outcome ?? (metadata.statusCode >= 400 ? 'failure' : 'success'),
      ...metadata.metadata,
    },
  })
}
