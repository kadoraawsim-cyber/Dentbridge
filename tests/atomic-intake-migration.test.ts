import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const scannerlessSql = readFileSync(
  'supabase/migrations/20260712010000_scannerless_image_sanitization.sql',
  'utf8'
)
const combinedSql = [
  'supabase/migrations/20260711000000_release_atomic_intake_file_cleanup.sql',
  'supabase/migrations/20260712010000_scannerless_image_sanitization.sql',
].map((path) => readFileSync(path, 'utf8')).join('\n')

describe('atomic patient intake migration', () => {
  it('keeps request, both consents, file claim, and audit evidence in one transaction', () => {
    expect(scannerlessSql).toContain('FUNCTION public.submit_patient_request_atomic')
    expect(scannerlessSql).toContain('SECURITY DEFINER')
    expect(scannerlessSql).toContain('SET search_path = public, pg_temp')
    expect(scannerlessSql).toContain('INSERT INTO public.patient_requests')
    expect(scannerlessSql).toContain('INSERT INTO public.consent_records')
    expect(scannerlessSql).toContain('UPDATE public.patient_files')
    expect(scannerlessSql).toContain('INSERT INTO public.audit_logs')
    expect(scannerlessSql).toContain('FOR UPDATE')
  })

  it('requires two distinct immutable consent documents and an eligible unlinked file', () => {
    expect(scannerlessSql).toContain('v_consent_count <> 2')
    expect(scannerlessSql).toContain('v_type_count <> 2')
    expect(scannerlessSql).toContain('v_title_count <> 2')
    expect(scannerlessSql).toContain("NULLIF(item->>'document_fingerprint', '') IS NOT NULL")
    expect(scannerlessSql).toContain('v_file.patient_request_id IS NOT NULL')
    expect(scannerlessSql).toContain("v_file.status <> 'sanitized_unscanned'")
    expect(scannerlessSql).toContain("v_file.security_state <> 'sanitized_unscanned'")
    expect(scannerlessSql).toContain("v_file.derivative_state <> 'ready'")
    expect(scannerlessSql).toContain('v_file.derivative_object_path IS NULL')
  })

  it('deduplicates concurrent submission retries and prevents file reuse', () => {
    expect(combinedSql).toContain('patient_requests_submission_id_uidx')
    expect(scannerlessSql).toContain('ON CONFLICT (submission_id)')
    expect(scannerlessSql).toContain("RAISE EXCEPTION 'file_claim_conflict'")
    expect(scannerlessSql).not.toMatch(/DELETE FROM public\.patient_files/)
  })
})
