export const MAX_WORKFLOWS = 10
export const MAX_CONCURRENCY = 10
export const SUPPORTED_WORKFLOW_COUNTS = [2, 5, 10] as const
export const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{5,79}$/

export type SupportedWorkflowCount = (typeof SUPPORTED_WORKFLOW_COUNTS)[number]
export type AccountKey = 'A' | 'B'
export type FacultyStage = 'triage' | 'student_request_approval' | 'final_approval'

export interface CliOptions {
  workflows: SupportedWorkflowCount
  concurrency: number
  runId: string
  baseUrl: string
  allowProduction: boolean
}

function isSupportedWorkflowCount(value: number): value is SupportedWorkflowCount {
  return SUPPORTED_WORKFLOW_COUNTS.includes(value as SupportedWorkflowCount)
}

function readFlag(argv: string[], name: string): string | null {
  const prefix = `--${name}=`
  const inline = argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)

  const index = argv.indexOf(`--${name}`)
  if (index >= 0) return argv[index + 1] ?? ''

  return null
}

function parsePositiveInteger(name: string, value: string | undefined, fallback: number): number {
  if (value == null || value === '') return fallback
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be a positive integer.`)
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`)
  }
  return parsed
}

export function validateRunId(runId: string): string {
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new Error('RUN_ID must be 6-80 characters using only letters, numbers, and hyphens.')
  }
  return runId
}

export function buildRunIdMarker(runId: string): string {
  return `RUN_ID=[${validateRunId(runId)}]`
}

export function buildRunIdLikePattern(runId: string): string {
  return `%${buildRunIdMarker(runId)}%`
}

export function hasExactRunIdMarker(text: string | null | undefined, runId: string): boolean {
  return Boolean(text?.includes(buildRunIdMarker(runId)))
}

export function isLocalTarget(rawUrl: string): boolean {
  const url = new URL(rawUrl)
  return (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]' ||
    url.hostname === '::1'
  )
}

export function assertSafeTarget(rawUrl: string, allowProduction: boolean): URL {
  const url = new URL(rawUrl)
  const local = isLocalTarget(url.toString())

  if (local) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Local E2E target must use http or https.')
    }
    return url
  }

  if (!allowProduction) {
    throw new Error(
      `Refusing non-local E2E target ${url.origin}. Set ALLOW_PRODUCTION_E2E=true only for an explicit production run.`
    )
  }

  if (url.protocol !== 'https:') {
    throw new Error('Non-local E2E targets must use HTTPS.')
  }

  return url
}

export function parseCliOptions(
  argv: string[],
  env: Record<string, string | undefined>
): CliOptions {
  const workflowValue = readFlag(argv, 'workflows') ?? env.E2E_WORKFLOWS
  const workflows = parsePositiveInteger('workflows', workflowValue, 2)

  if (!isSupportedWorkflowCount(workflows)) {
    throw new Error('E2E workflow count must be exactly 2, 5, or 10.')
  }

  if (workflows > MAX_WORKFLOWS) {
    throw new Error(`E2E workflow count is hard-capped at ${MAX_WORKFLOWS}.`)
  }

  const concurrency = parsePositiveInteger(
    'concurrency',
    readFlag(argv, 'concurrency') ?? env.E2E_CONCURRENCY,
    Math.min(workflows, 2)
  )

  if (concurrency > MAX_CONCURRENCY) {
    throw new Error(`E2E concurrency is hard-capped at ${MAX_CONCURRENCY}.`)
  }

  if (concurrency > workflows) {
    throw new Error('E2E concurrency cannot exceed the workflow count.')
  }

  const baseUrl = (readFlag(argv, 'base-url') ?? env.E2E_BASE_URL ?? 'http://localhost:3000').trim()
  const allowProduction = (env.ALLOW_PRODUCTION_E2E ?? '').toLowerCase() === 'true'
  assertSafeTarget(baseUrl, allowProduction)

  const runId =
    (readFlag(argv, 'run-id') ?? env.E2E_RUN_ID)?.trim() ||
    `e2e-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}`

  validateRunId(runId)

  return {
    workflows,
    concurrency,
    runId,
    baseUrl: new URL(baseUrl).origin,
    allowProduction,
  }
}

export function studentForCase(caseNumber: number): AccountKey {
  return caseNumber % 2 === 1 ? 'A' : 'B'
}

export function facultyForCase(caseNumber: number, stage: FacultyStage): AccountKey {
  if (stage === 'triage') return caseNumber % 2 === 1 ? 'A' : 'B'
  if (stage === 'student_request_approval') return caseNumber % 2 === 1 ? 'B' : 'A'
  return caseNumber % 2 === 1 ? 'A' : 'B'
}

export function assertNoOtpOrSmsRoute(path: string): void {
  const normalized = path.toLowerCase()
  if (normalized.includes('otp') || normalized.includes('twilio') || normalized.includes('sms')) {
    throw new Error(`Refusing to call OTP/SMS/Twilio route: ${path}`)
  }
}
