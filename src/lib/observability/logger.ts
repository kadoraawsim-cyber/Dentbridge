import 'server-only'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogPrimitive = string | number | boolean | null
export type LogMetadata = Record<string, unknown>
type SafeLogValue = LogPrimitive | SafeLogValue[] | { [key: string]: SafeLogValue }

export interface LogContext {
  requestId?: string | null
  correlationId?: string | null
  route?: string | null
  method?: string | null
  path?: string | null
  actorRole?: string | null
  actorType?: string | null
  statusCode?: number | null
  durationMs?: number | null
  metadata?: LogMetadata
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  event: string
  service: 'dentbridge-web'
  request_id?: string
  correlation_id?: string
  route?: string
  method?: string
  path?: string
  actor_role?: string
  actor_type?: string
  status_code?: number
  duration_ms?: number
  metadata?: SafeLogValue
}

const REDACTED = '[REDACTED]'
const MAX_STRING_LENGTH = 512
const MAX_DEPTH = 4
const MAX_ARRAY_LENGTH = 20

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const SENSITIVE_KEYS = new Set([
  'authorization',
  'attachment',
  'attachmentname',
  'attachmentpath',
  'clinicalnote',
  'clinicalnotes',
  'code',
  'codehash',
  'complaint',
  'complainttext',
  'cookie',
  'filename',
  'filepath',
  'fileticket',
  'fullname',
  'medicalcondition',
  'medicalconditiondetails',
  'name',
  'note',
  'notes',
  'objectpath',
  'originalfilename',
  'otp',
  'password',
  'path',
  'phone',
  'phonecountrycode',
  'phonenumber',
  'progressnote',
  'progressnotes',
  'rawphone',
  'secret',
  'signedurl',
  'token',
  'uploadurl',
])

const SENSITIVE_KEY_FRAGMENTS = [
  'authorization',
  'bearer',
  'codehash',
  'cookie',
  'credential',
  'medical',
  'objectpath',
  'otp',
  'password',
  'secret',
  'token',
]

const PHONE_LIKE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function isSensitiveLogKey(key: string): boolean {
  const normalized = normalizeKey(key)
  return (
    SENSITIVE_KEYS.has(normalized) ||
    SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment))
  )
}

function sanitizeString(value: string): string {
  return value
    .replace(BEARER_PATTERN, 'Bearer [REDACTED]')
    .replace(PHONE_LIKE_PATTERN, '[REDACTED_PHONE]')
    .slice(0, MAX_STRING_LENGTH)
}

export function sanitizeLogMetadata(value: unknown, depth = 0): SafeLogValue {
  if (value == null) {
    return null
  }

  if (typeof value === 'string') {
    return sanitizeString(value)
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (value instanceof Error) {
    return {
      error_name: sanitizeString(value.name),
      error_message: sanitizeString(value.message),
    }
  }

  if (depth >= MAX_DEPTH) {
    return '[MAX_DEPTH]'
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeLogMetadata(item, depth + 1))
  }

  if (typeof value === 'object') {
    const safeObject: { [key: string]: SafeLogValue } = {}
    for (const [key, raw] of Object.entries(value)) {
      safeObject[key] = isSensitiveLogKey(key) ? REDACTED : sanitizeLogMetadata(raw, depth + 1)
    }
    return safeObject
  }

  return String(value).slice(0, MAX_STRING_LENGTH)
}

function configuredLogLevel(): LogLevel | 'silent' {
  const value = process.env.LOG_LEVEL?.toLowerCase()
  if (value === 'silent') {
    return 'silent'
  }
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

function shouldEmit(level: LogLevel): boolean {
  const configured = configuredLogLevel()
  return configured !== 'silent' && LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configured]
}

function addString(entry: LogEntry, key: keyof LogEntry, value: string | null | undefined) {
  const safeValue = value ? sanitizeString(value) : null
  if (safeValue) {
    ;(entry as unknown as Record<string, unknown>)[key] = safeValue
  }
}

export function writeLog(level: LogLevel, event: string, context: LogContext = {}) {
  if (!shouldEmit(level)) {
    return
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event: sanitizeString(event),
    service: 'dentbridge-web',
  }

  addString(entry, 'request_id', context.requestId)
  addString(entry, 'correlation_id', context.correlationId)
  addString(entry, 'route', context.route)
  addString(entry, 'method', context.method)
  addString(entry, 'path', context.path)
  addString(entry, 'actor_role', context.actorRole)
  addString(entry, 'actor_type', context.actorType)

  if (typeof context.statusCode === 'number') {
    entry.status_code = context.statusCode
  }
  if (typeof context.durationMs === 'number') {
    entry.duration_ms = Math.max(0, Math.round(context.durationMs))
  }
  if (context.metadata) {
    entry.metadata = sanitizeLogMetadata(context.metadata)
  }

  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  debug(event: string, context?: LogContext) {
    writeLog('debug', event, context)
  },
  info(event: string, context?: LogContext) {
    writeLog('info', event, context)
  },
  warn(event: string, context?: LogContext) {
    writeLog('warn', event, context)
  },
  error(event: string, context?: LogContext) {
    writeLog('error', event, context)
  },
}
