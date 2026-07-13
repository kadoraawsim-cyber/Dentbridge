import 'server-only'

import { sanitizeLogMetadata, type LogMetadata } from './logger'

export interface ErrorMonitorContext {
  requestId?: string | null
  correlationId?: string | null
  route?: string | null
  actorRole?: string | null
  actorType?: string | null
  metadata?: LogMetadata
}

export interface ErrorMonitorProvider {
  captureException(error: unknown, context: ErrorMonitorContext): void | Promise<void>
  captureMessage(message: string, context: ErrorMonitorContext): void | Promise<void>
}

let provider: ErrorMonitorProvider | null = null

export function setErrorMonitorProvider(nextProvider: ErrorMonitorProvider | null) {
  provider = nextProvider
}

function sanitizeContext(context: ErrorMonitorContext): ErrorMonitorContext {
  return {
    actorRole: context.actorRole ?? null,
    actorType: context.actorType ?? null,
    correlationId: context.correlationId ?? null,
    requestId: context.requestId ?? null,
    route: context.route ?? null,
    metadata: context.metadata
      ? (sanitizeLogMetadata(context.metadata) as LogMetadata)
      : undefined,
  }
}

function sanitizeException(error: unknown) {
  return sanitizeLogMetadata(error)
}

export async function captureException(error: unknown, context: ErrorMonitorContext = {}) {
  if (!provider) {
    return
  }
  try {
    await provider.captureException(sanitizeException(error), sanitizeContext(context))
  } catch {
    // Monitoring must never affect request behavior.
  }
}

export async function captureMessage(message: string, context: ErrorMonitorContext = {}) {
  if (!provider) {
    return
  }
  try {
    await provider.captureMessage(String(sanitizeLogMetadata(message)), sanitizeContext(context))
  } catch {
    // Monitoring must never affect request behavior.
  }
}
