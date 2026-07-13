import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { captureException } from '@/lib/observability/error-monitor'
import { logger } from '@/lib/observability/logger'
import { createSupabaseAdminClient, type SupabaseAdminClient } from '@/lib/supabase-admin'
import { PATIENT_UPLOADS_BUCKET } from './file.constants'

export interface OrphanCleanupSummary {
  claimed: number
  deleted: number
  originalsDeleted: number
  retryableFailures: number
}

export function isValidCronAuthorization(header: string | null, secret: string): boolean {
  if (!header || !header.startsWith('Bearer ') || !secret) {
    return false
  }
  const supplied = Buffer.from(header.slice(7))
  const expected = Buffer.from(secret)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function cleanupOrphanPatientFiles(
  supabase: SupabaseAdminClient = createSupabaseAdminClient(),
  limit = 50
): Promise<OrphanCleanupSummary> {
  const { data: claimed, error: claimError } = await supabase.rpc(
    'claim_orphan_patient_files',
    { p_limit: limit }
  )

  if (claimError) {
    void captureException(new Error('Patient-file cleanup claim failed.'), {
      actorType: 'service',
      route: 'internal.files.cleanup',
      metadata: { operation: 'claim_orphan_patient_files' },
    })
    throw new Error('Unable to claim orphan files for cleanup.')
  }

  const summary: OrphanCleanupSummary = {
    claimed: claimed?.length ?? 0,
    deleted: 0,
    originalsDeleted: 0,
    retryableFailures: 0,
  }

  for (const row of claimed ?? []) {
    const paths = [
      row.original_object_path,
      row.derivative_object_path,
    ].filter((path): path is string => typeof path === 'string' && path.length > 0)

    const { error: storageError } = await supabase.storage
      .from(PATIENT_UPLOADS_BUCKET)
      .remove(paths)

    const success = !storageError
    const { data: finalized, error: finalizeError } = await supabase.rpc(
      'complete_patient_file_cleanup',
      {
        p_file_id: row.file_id,
        p_success: success,
        p_cleanup_kind: row.cleanup_kind ?? 'full_row',
      }
    )

    if (success && finalized && !finalizeError) {
      if (row.cleanup_kind === 'original_only') {
        summary.originalsDeleted += 1
      } else {
        summary.deleted += 1
      }
      continue
    }

    summary.retryableFailures += 1
    logger.error('patient_file.cleanup_retryable_failure', {
      actorType: 'service',
      route: 'internal.files.cleanup',
      metadata: {
        file_id: row.file_id,
        stage: storageError ? 'storage_delete' : 'database_finalize',
      },
    })
    void captureException(new Error('Patient-file orphan cleanup failed.'), {
      actorType: 'service',
      route: 'internal.files.cleanup',
      metadata: {
        file_id: row.file_id,
        stage: storageError ? 'storage_delete' : 'database_finalize',
      },
    })
  }

  return summary
}
