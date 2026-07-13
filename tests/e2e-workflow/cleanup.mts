import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { loadWorkflowEnvironment } from './lib/env.mts'
import { createServiceReadClient, type SupabaseServiceClient } from './lib/supabase-readers.mts'
import {
  assertSafeTarget,
  buildRunIdLikePattern,
  hasExactRunIdMarker,
  validateRunId,
} from './lib/safety.mts'

export const CLEANUP_DELETE_ORDER = [
  'case_decision_history',
  'student_planner_events',
  'case_progress_entries',
  'student_case_requests',
  'case_routing_stages',
  'consent_records',
  'patient_files',
  'patient_requests',
] as const

export type CleanupTable = (typeof CLEANUP_DELETE_ORDER)[number]

export interface CleanupRecord {
  table: CleanupTable
  id: string
  extra?: Record<string, string | null>
}

export interface CleanupPlan {
  runId: string
  dryRun: boolean
  patientRequestIds: string[]
  records: CleanupRecord[]
  storageObjects: string[]
}

export interface CleanupTableDelete {
  table: CleanupTable
  ids: string[]
}

export interface CleanupStorageResult {
  requested: string[]
  removed: string[]
  alreadyRemoved: string[]
}

export interface CleanupExecutionResult {
  database: Array<CleanupTableDelete & { deletedIds: string[]; alreadyRemovedIds: string[] }>
  storage: CleanupStorageResult
}

type CleanupQueryError = {
  message?: string
  code?: string
  status?: number
  statusCode?: string | number
}

type CleanupMutationResult = {
  data: Array<{ id: string | number }> | null
  error: CleanupQueryError | null
}

type CleanupDeleteQuery = PromiseLike<CleanupMutationResult> & {
  explain: (options?: { analyze?: boolean; format?: 'text' }) => Promise<CleanupMutationResult>
}

type CleanupTableClient = {
  delete: () => {
    in: (column: string, values: string[]) => {
      select: (columns: string) => CleanupDeleteQuery
    }
  }
}

type CleanupStorageBucket = {
  exists: (path: string) => Promise<{ data: boolean | null; error: CleanupQueryError | null }>
  remove: (paths: string[]) => Promise<{ data: unknown; error: CleanupQueryError | null }>
}

type CleanupExecutionHooks = {
  preflightDelete?: (service: SupabaseServiceClient, deletion: CleanupTableDelete) => Promise<void>
  deleteRows?: (service: SupabaseServiceClient, deletion: CleanupTableDelete) => Promise<string[]>
  removeStorageObjects?: (
    service: SupabaseServiceClient,
    storageObjects: string[]
  ) => Promise<CleanupStorageResult>
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function cleanupTable(service: SupabaseServiceClient, table: CleanupTable): CleanupTableClient {
  return service.from(table) as unknown as CleanupTableClient
}

function storageBucket(service: SupabaseServiceClient): CleanupStorageBucket {
  return service.storage.from('patient-uploads') as unknown as CleanupStorageBucket
}

function isMissingStorageObject(error: CleanupQueryError | null): boolean {
  if (!error) return false
  const status = Number(error.status ?? error.statusCode)
  const message = (error.message ?? '').toLowerCase()
  return status === 400 || status === 404 || message.includes('not found') || message.includes('not exist')
}

export class CleanupPreflightError extends Error {
  readonly manualSql: string

  constructor(message: string, plan: CleanupPlan) {
    super(`${message} No cleanup mutations were attempted.`)
    this.name = 'CleanupPreflightError'
    this.manualSql = generateManualSqlCleanupPlan(plan)
  }
}

function readFlag(argv: string[], name: string): string | null {
  const prefix = `--${name}=`
  const inline = argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)

  const index = argv.indexOf(`--${name}`)
  if (index >= 0) return argv[index + 1] ?? ''

  return null
}

function requireRunId(argv: string[]): string {
  const runId = readFlag(argv, 'run-id')?.trim()
  if (!runId) {
    throw new Error('Cleanup requires --run-id=<exact RUN_ID>.')
  }
  return validateRunId(runId)
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function addRows(
  records: CleanupRecord[],
  table: CleanupTable,
  rows: Array<{ id: string | number } & Record<string, unknown>>,
  extraKeys: string[] = []
) {
  for (const row of rows) {
    const extra: Record<string, string | null> = {}
    for (const key of extraKeys) {
      const value = row[key]
      extra[key] = typeof value === 'string' ? value : value == null ? null : String(value)
    }
    records.push({
      table,
      id: String(row.id),
      extra: Object.keys(extra).length > 0 ? extra : undefined,
    })
  }
}

export function buildDatabaseDeletePlan(records: CleanupRecord[]): CleanupTableDelete[] {
  const idsByTable = new Map<CleanupTable, string[]>(
    CLEANUP_DELETE_ORDER.map((table) => [table, []])
  )

  for (const record of records) {
    idsByTable.get(record.table)?.push(record.id)
  }

  return CLEANUP_DELETE_ORDER.map((table) => ({
    table,
    ids: unique(idsByTable.get(table) ?? []),
  })).filter((deletion) => deletion.ids.length > 0)
}

export function generateManualSqlCleanupPlan(plan: CleanupPlan): string {
  const deletions = buildDatabaseDeletePlan(plan.records)
  const lines = [
    `-- Manual database cleanup for RUN_ID=${plan.runId}`,
    '-- Execute as the database owner only after reviewing the exact IDs below.',
    'begin;',
  ]

  if (deletions.length === 0) {
    lines.push('-- No database rows were captured in the cleanup plan.')
  } else {
    for (const deletion of deletions) {
      lines.push(
        `delete from public.${deletion.table} where id in (${deletion.ids.map(sqlLiteral).join(', ')});`
      )
    }
  }

  lines.push('commit;')
  return lines.join('\n')
}

export async function preflightDeleteByExactIds(
  service: SupabaseServiceClient,
  deletion: CleanupTableDelete
): Promise<void> {
  const query = cleanupTable(service, deletion.table)
    .delete()
    .in('id', deletion.ids)
    .select('id')

  const { error } = await query.explain({ analyze: false, format: 'text' })
  if (error) {
    throw new Error(error.message ?? `Delete preflight failed for ${deletion.table}.`)
  }
}

export async function deleteRowsByExactIds(
  service: SupabaseServiceClient,
  deletion: CleanupTableDelete
): Promise<string[]> {
  const { data, error } = await cleanupTable(service, deletion.table)
    .delete()
    .in('id', deletion.ids)
    .select('id')

  if (error) {
    throw new Error(error.message ?? `Delete failed for ${deletion.table}.`)
  }

  return (data ?? []).map((row) => String(row.id))
}

export async function preflightDatabaseDeletes(
  service: SupabaseServiceClient,
  plan: CleanupPlan,
  preflightDelete: NonNullable<CleanupExecutionHooks['preflightDelete']> = preflightDeleteByExactIds
): Promise<void> {
  for (const deletion of buildDatabaseDeletePlan(plan.records)) {
    try {
      await preflightDelete(service, deletion)
    } catch (error) {
      throw new CleanupPreflightError(
        `Database cleanup preflight failed for ${deletion.table}: ${errorMessage(error)}.`,
        plan
      )
    }
  }
}

export async function removePlannedStorageObjects(
  service: SupabaseServiceClient,
  storageObjects: string[]
): Promise<CleanupStorageResult> {
  const bucket = storageBucket(service)
  const result: CleanupStorageResult = {
    requested: storageObjects,
    removed: [],
    alreadyRemoved: [],
  }

  for (const objectPath of storageObjects) {
    const existsResult = await bucket.exists(objectPath)
    if (existsResult.error && !isMissingStorageObject(existsResult.error)) {
      throw new Error(`Storage existence check failed for ${objectPath}: ${existsResult.error.message}`)
    }

    if (!existsResult.data) {
      result.alreadyRemoved.push(objectPath)
      continue
    }

    const removeResult = await bucket.remove([objectPath])
    if (removeResult.error) {
      if (isMissingStorageObject(removeResult.error)) {
        result.alreadyRemoved.push(objectPath)
        continue
      }
      throw new Error(`Storage cleanup failed for ${objectPath}: ${removeResult.error.message}`)
    }
    result.removed.push(objectPath)
  }

  return result
}

export async function executeCleanupPlan(
  service: SupabaseServiceClient,
  plan: CleanupPlan,
  hooks: CleanupExecutionHooks = {}
): Promise<CleanupExecutionResult> {
  const preflightDelete = hooks.preflightDelete ?? preflightDeleteByExactIds
  const deleteRows = hooks.deleteRows ?? deleteRowsByExactIds
  const removeStorageObjects = hooks.removeStorageObjects ?? removePlannedStorageObjects

  await preflightDatabaseDeletes(service, plan, preflightDelete)

  const database: CleanupExecutionResult['database'] = []
  for (const deletion of buildDatabaseDeletePlan(plan.records)) {
    const deletedIds = await deleteRows(service, deletion)
    const deletedSet = new Set(deletedIds)
    database.push({
      ...deletion,
      deletedIds,
      alreadyRemovedIds: deletion.ids.filter((id) => !deletedSet.has(id)),
    })
  }

  const storage = await removeStorageObjects(service, plan.storageObjects)

  return { database, storage }
}

async function main() {
  const argv = process.argv.slice(2)
  const runId = requireRunId(argv)
  const execute = argv.includes('--execute')
  const confirmRunId = readFlag(argv, 'confirm-run-id')?.trim() ?? ''
  const env = loadWorkflowEnvironment()

  if (!env.serviceRoleKey) {
    throw new Error('Cleanup requires SUPABASE_SERVICE_ROLE_KEY or E2E_VERIFICATION_SUPABASE_SERVICE_ROLE_KEY.')
  }

  const allowProduction = (process.env.ALLOW_PRODUCTION_E2E ?? '').toLowerCase() === 'true'
  assertSafeTarget(env.supabaseUrl, allowProduction)

  if (execute && confirmRunId !== runId) {
    throw new Error('Destructive cleanup requires --confirm-run-id to exactly match --run-id.')
  }

  if (execute && allowProduction) {
    console.error('DANGEROUS PRODUCTION CLEANUP MODE ENABLED. Deleting only records listed in this RUN_ID plan.')
  }

  const service = createServiceReadClient({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.serviceRoleKey,
  })

  const { data: patientRequests, error: patientError } = await service
    .from('patient_requests')
    .select('id, submission_id, full_name, complaint_text')
    .like('complaint_text', buildRunIdLikePattern(runId))

  if (patientError) throw new Error(`Unable to list patient requests: ${patientError.message}`)

  const exactPatientRequests = (patientRequests ?? []).filter((row) =>
    hasExactRunIdMarker(row.complaint_text, runId)
  )
  const caseIds = unique(exactPatientRequests.map((row) => row.id))
  const records: CleanupRecord[] = []
  addRows(records, 'patient_requests', exactPatientRequests, ['submission_id', 'full_name'])

  let storageObjects: string[] = []

  if (caseIds.length > 0) {
    const [
      filesResult,
      consentsResult,
      historyResult,
      progressResult,
      stagesResult,
      studentRequestsResult,
      plannerByPatientResult,
      plannerBySourceResult,
    ] = await Promise.all([
      service
        .from('patient_files')
        .select('id, patient_request_id, object_path, original_object_path, derivative_object_path')
        .in('patient_request_id', caseIds),
      service
        .from('consent_records')
        .select('id, patient_request_id, consent_type')
        .in('patient_request_id', caseIds),
      service
        .from('case_decision_history')
        .select('id, case_id, request_id, action')
        .in('case_id', caseIds),
      service.from('case_progress_entries').select('id, case_id, stage_id').in('case_id', caseIds),
      service.from('case_routing_stages').select('id, case_id, status').in('case_id', caseIds),
      service
        .from('student_case_requests')
        .select('id, case_id, stage_id, student_id, status')
        .in('case_id', caseIds),
      service.from('student_planner_events').select('id, patient_id, source_case_id').in('patient_id', caseIds),
      service
        .from('student_planner_events')
        .select('id, patient_id, source_case_id')
        .in('source_case_id', caseIds),
    ])

    for (const result of [
      filesResult,
      consentsResult,
      historyResult,
      progressResult,
      stagesResult,
      studentRequestsResult,
      plannerByPatientResult,
      plannerBySourceResult,
    ]) {
      if (result.error) throw new Error(`Unable to build cleanup plan: ${result.error.message}`)
    }

    const plannerRowsById = new Map<string, NonNullable<typeof plannerByPatientResult.data>[number]>()
    for (const row of [...(plannerByPatientResult.data ?? []), ...(plannerBySourceResult.data ?? [])]) {
      plannerRowsById.set(String(row.id), row)
    }

    addRows(records, 'patient_files', filesResult.data ?? [], ['patient_request_id'])
    addRows(records, 'consent_records', consentsResult.data ?? [], ['patient_request_id', 'consent_type'])
    addRows(records, 'case_decision_history', historyResult.data ?? [], ['case_id', 'request_id', 'action'])
    addRows(records, 'case_progress_entries', progressResult.data ?? [], ['case_id', 'stage_id'])
    addRows(records, 'case_routing_stages', stagesResult.data ?? [], ['case_id', 'status'])
    addRows(records, 'student_case_requests', studentRequestsResult.data ?? [], ['case_id', 'stage_id', 'student_id', 'status'])
    addRows(records, 'student_planner_events', Array.from(plannerRowsById.values()), ['patient_id', 'source_case_id'])

    storageObjects = unique(
      (filesResult.data ?? []).flatMap((row) => [
        row.object_path,
        row.original_object_path,
        row.derivative_object_path,
      ])
    )
  }

  const plan: CleanupPlan = {
    runId,
    dryRun: !execute,
    patientRequestIds: caseIds,
    records,
    storageObjects,
  }

  console.log(JSON.stringify(plan, null, 2))

  if (!execute) {
    console.log('Dry run only. Re-run with --execute --confirm-run-id=<same RUN_ID> to delete the listed records.')
    return
  }

  const result = await executeCleanupPlan(service, plan)
  console.log(JSON.stringify({ cleanupResult: result }, null, 2))

  if (result.storage.alreadyRemoved.length > 0) {
    console.log(
      `Storage objects already absent before cleanup: ${result.storage.alreadyRemoved.join(', ')}`
    )
  }

  console.log(`Deleted records for RUN_ID=${runId}. Test user accounts were not touched.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    if (error instanceof CleanupPreflightError) {
      console.error(error.message)
      console.error('')
      console.error('Manual SQL cleanup plan for database-owner execution:')
      console.error(error.manualSql)
    } else {
      console.error(error instanceof Error ? error.message : error)
    }
    process.exitCode = 1
  })
}
