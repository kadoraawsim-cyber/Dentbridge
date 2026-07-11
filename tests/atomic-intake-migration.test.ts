import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  'supabase/migrations/20260711000000_release_atomic_intake_file_cleanup.sql',
  'utf8'
)

describe('atomic patient intake migration', () => {
  it('keeps request, both consents, file claim, and audit evidence in one transaction', () => {
    expect(sql).toContain('FUNCTION public.submit_patient_request_atomic')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = public, pg_temp')
    expect(sql).toContain('INSERT INTO public.patient_requests')
    expect(sql).toContain('INSERT INTO public.consent_records')
    expect(sql).toContain('UPDATE public.patient_files')
    expect(sql).toContain('INSERT INTO public.audit_logs')
    expect(sql).toContain('FOR UPDATE')
  })

  it('requires two distinct immutable consent documents and an eligible unlinked file', () => {
    expect(sql).toContain('v_consent_count <> 2')
    expect(sql).toContain('v_type_count <> 2')
    expect(sql).toContain('v_title_count <> 2')
    expect(sql).toContain("NULLIF(item->>'document_fingerprint', '') IS NOT NULL")
    expect(sql).toContain('v_file.patient_request_id IS NOT NULL')
    expect(sql).toContain("v_file.status <> 'quarantined'")
  })

  it('deduplicates concurrent submission retries and prevents file reuse', () => {
    expect(sql).toContain('patient_requests_submission_id_uidx')
    expect(sql).toContain('ON CONFLICT (submission_id)')
    expect(sql).toContain("RAISE EXCEPTION 'file_claim_conflict'")
    expect(sql).not.toMatch(/DELETE FROM public\.patient_files/)
  })
})
