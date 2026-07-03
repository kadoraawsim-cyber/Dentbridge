# Phase 0 Safety Checklist

Last reviewed: 2026-07-03

This document covers Phase 0 only: preparation and safety. The source of truth
for the full hardening sequence is
[docs/PLATFORM_HARDENING_ROADMAP.md](./PLATFORM_HARDENING_ROADMAP.md).

Phase 0 must not execute Phase 1 or any later phase. It must not change code,
database schema, authentication, patient flow, API routes, UI behavior, real
environment files, secrets, or production behavior.

Secure OTP patient status verification belongs to Phase 3 in the platform
hardening roadmap. It is not part of Phase 0 and must not be implemented during
Phase 0.

## Branch Safety

- [ ] Create or confirm a dedicated hardening branch before any future changes.
- [ ] Confirm the branch name and base commit are recorded in project notes.
- [ ] Confirm the working tree is understood before starting later phases.
- [ ] Do not mix Phase 0 documentation with code, schema, auth, API, or UI
  changes.
- [ ] Do not merge or deploy future phase work without verification.

## DB Backup Checklist

Manual owner action required:

- [ ] Open the production Supabase project dashboard.
- [ ] Confirm database backups are enabled.
- [ ] Confirm backup retention is appropriate for production
  healthcare-adjacent operation.
- [ ] Create or verify a current database backup before any future schema or
  data work.
- [ ] Record the backup timestamp, Supabase project, restore method, and owner
  responsible for restore.
- [ ] Confirm how point-in-time recovery or snapshot restore would be performed
  if a migration damages production data.

Phase 0 note: no database backup was created from repository code, and no
database schema was changed.

## Supabase Storage Backup Checklist

Manual owner action required:

- [ ] Open the production Supabase Storage dashboard.
- [ ] Confirm the `patient-uploads` bucket remains private.
- [ ] Confirm whether Supabase Storage backups are available on the current
  project plan.
- [ ] If Supabase does not provide the required Storage backup workflow, define
  an external export/backup process.
- [ ] Record the Storage backup location, restore method, access owner, and
  recovery expectations.
- [ ] Confirm how individual patient upload objects would be restored without
  making the bucket public.

Phase 0 note: no Supabase Storage backup was created from repository code, and
no Storage policy or object was changed.

## Rollback Checklist

### Git Rollback

- [ ] Identify the last known-good commit SHA before any future phase work.
- [ ] Prefer `git revert <bad_commit_sha>` for a bad committed change.
- [ ] Use a controlled rollback branch for multiple commits.
- [ ] Do not rewrite shared history unless the project owner explicitly
  approves it.
- [ ] Record the bad commit, rollback commit, affected routes, and verifier.

### Vercel Rollback

Manual owner action required:

- [ ] Open the DentBridge Vercel project dashboard.
- [ ] Go to Deployments.
- [ ] Identify the last known-good production deployment.
- [ ] Use Vercel rollback or promote the known-good deployment if production is
  broken.
- [ ] Confirm the production domain resolves to the restored deployment.
- [ ] Record the deployment ID, rollback time, and verifier.

### Supabase DB Restore

Manual owner action required:

- [ ] Stop or pause risky writes if production data/schema is damaged.
- [ ] Identify the target restore time before the incident.
- [ ] Restore using Supabase backups or point-in-time recovery according to the
  project plan.
- [ ] Validate authentication, RLS, critical tables, RPCs, and critical flows
  after restore.
- [ ] Record restore timestamp, backup timestamp, affected data, and verifier.

### Supabase Storage Restore

Manual owner action required:

- [ ] Identify affected bucket objects and incident time window.
- [ ] Restore objects using the documented Supabase or external Storage backup
  process.
- [ ] Confirm `patient-uploads` remains private after restore.
- [ ] Confirm restored files are accessible only through intended restricted
  access paths.
- [ ] Record affected object paths, restore source, restore time, and verifier.

## Critical Flows Checklist

These flows must continue working before and after every future phase:

- [ ] Homepage
- [ ] Patient request
- [ ] Patient status
- [ ] Student login
- [ ] Student dashboard
- [ ] Student case request
- [ ] Admin login
- [ ] Admin request detail
- [ ] Faculty approval
- [ ] Planner

Minimum future smoke verification:

- [ ] `/` loads publicly.
- [ ] `/patient/request` loads and still blocks incomplete submissions.
- [ ] Patient request submission works in a safe test environment.
- [ ] `/patient/status` loads.
- [ ] Current patient status behavior remains unchanged until Phase 3 replaces
  phone-only lookup with secure phone/SMS OTP verification.
- [ ] `/student/login` accepts only a test student account.
- [ ] `/student/dashboard` loads for the test student.
- [ ] A test student can submit a case request for a test matched case.
- [ ] `/admin/login` accepts only a test faculty/admin account.
- [ ] `/admin/requests/[id]` loads a test case for a test faculty/admin user.
- [ ] A test faculty/admin user can approve or reject a test student request.
- [ ] `/student/planner` loads for the test student.
- [ ] Planner create/update/delete works in a safe test environment.
- [ ] Unauthorized users are redirected away from `/admin/*` and `/student/*`.
- [ ] Patient uploads remain private.

## Manual Owner Actions

- [ ] Confirm production Vercel project, domains, deployment history, and
  rollback permissions.
- [ ] Confirm production Supabase project, backup retention, and database
  restore process.
- [ ] Confirm Supabase Storage backup and restore process for
  `patient-uploads`.
- [ ] Confirm production environment variables in Vercel without exposing
  values.
- [ ] Confirm Supabase Auth redirect URLs for invitation and password flows.
- [ ] Confirm whether staging Supabase and staging Vercel environments exist.
- [ ] Create or designate test-only student, faculty/admin, and patient test
  data for future verification.
- [ ] Record who is authorized to perform Vercel rollback, Supabase DB restore,
  and Supabase Storage restore.

## Phase 0 Confirmation

This Phase 0 document is documentation-only. It does not execute Phase 1, does
not implement secure OTP, and does not change code, schema, auth, patient flow,
API routes, UI behavior, real env files, secrets, or production behavior.
