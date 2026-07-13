import { loadWorkflowEnvironment } from './lib/env.mts'
import { createServiceReadClient } from './lib/supabase-readers.mts'
import {
  assertSafeTarget,
  buildRunIdLikePattern,
  hasExactRunIdMarker,
  validateRunId,
} from './lib/safety.mts'

interface CleanupRecord {
  table: string
  id: string
  extra?: Record<string, string | null>
}

interface CleanupPlan {
  runId: string
  dryRun: boolean
  patientRequestIds: string[]
  records: CleanupRecord[]
  storageObjects: string[]
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
  table: string,
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

  if (storageObjects.length > 0) {
    const { error: storageError } = await service.storage.from('patient-uploads').remove(storageObjects)
    if (storageError) {
      throw new Error(`Storage cleanup failed before database deletes: ${storageError.message}`)
    }
  }

  if (caseIds.length > 0) {
    await service.from('case_decision_history').delete().in('case_id', caseIds).throwOnError()
    await service.from('student_planner_events').delete().in('patient_id', caseIds).throwOnError()
    await service.from('student_planner_events').delete().in('source_case_id', caseIds).throwOnError()
    await service.from('case_progress_entries').delete().in('case_id', caseIds).throwOnError()
    await service.from('student_case_requests').delete().in('case_id', caseIds).throwOnError()
    await service.from('case_routing_stages').delete().in('case_id', caseIds).throwOnError()
    await service.from('consent_records').delete().in('patient_request_id', caseIds).throwOnError()
    await service.from('patient_files').delete().in('patient_request_id', caseIds).throwOnError()
    await service.from('patient_requests').delete().in('id', caseIds).throwOnError()
  }

  console.log(`Deleted records for RUN_ID=${runId}. Test user accounts were not touched.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
