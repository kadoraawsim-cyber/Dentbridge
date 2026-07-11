# DentBridge Project Status

Last updated: July 2026

## Current State

DentBridge is a working Next.js and Supabase application with:

- public patient intake
- OTP-protected patient status lookup
- role-protected admin/faculty workflow
- role-protected student workflow
- invitation-based account setup for students and faculty
- English and Turkish language support
- OpenAI-powered public patient chat guidance
- service-role API boundaries for sensitive patient, file, profile, case,
  progress, and planner mutations

This file reflects the current checked-in app state.

## Live Route Map

### Public

- `/`
- `/patient/request`
- `/patient/status`
- `/faq`
- `/privacy`

### Auth

- `/admin/login`
- `/student/login`
- `/auth/callback`
- `/auth/set-password`
- `/auth/set-password/student`
- `/auth/set-password/faculty`

### Admin and faculty

- `/admin`
- `/admin/requests`
- `/admin/requests/[id]`

### Student

- `/student/dashboard`
- `/student/cases`
- `/student/requests`
- `/student/planner`
- `/student/exchange`

## Current Workflow Summary

### 1. Public patient request flow

- Patients do not create accounts.
- They submit a treatment request from `/patient/request`.
- The form validates client-side, stores draft progress in session storage,
  optionally uploads one attachment through the Phase 5 signed-upload flow, and
  submits to `/api/v1/patient/requests`.

### 2. Patient status lookup

- Patients use `/patient/status`.
- Lookup is OTP-protected: patients first request a one-time code for their phone number, then submit the code to view the latest request status and related non-sensitive details.

### 3. Admin and faculty workflow

- Admin and faculty authenticate through Supabase Auth.
- Middleware protects `/admin/*`.
- Admin and faculty can review the queue, assign departments, save drafts, reject cases, release cases to the pool, review student requests, return assigned cases to the pool, and move active cases through the treatment lifecycle.

### 4. Student workflow

- Students authenticate through Supabase Auth.
- Middleware protects `/student/*`.
- Students can browse matched pool cases, submit case requests, track request
  outcomes, manage approved active cases from the dashboard, and use the private
  planner.
- Student case request, progress, lifecycle, and planner mutations now go
  through DentBridge API services instead of direct browser writes.
- The exchange page is present but currently serves as a coming-soon page.

### 5. Invitation-based access

- Admin can invite students and faculty.
- Invitations go through Supabase Auth admin APIs.
- Invite links land on `/auth/callback`, then route users into role-specific set-password flows.
- Student and faculty profile completion writes go through
  `/api/auth/complete-profile/*`; browser profile table upserts are no longer
  used.

## Architecture Snapshot

### Frontend

- App Router pages under `src/app`
- Client-heavy dashboards and workflow screens
- Shared language provider and public patient chat mounted globally

### Backend and data layer

- Supabase browser client for Auth session flows and Phase 5 signed upload
  transport
- Supabase server client for server component reads and route authentication
- Supabase service-role clients inside server-only DentBridge services for
  sensitive workflow mutations
- Route handlers under `src/app/api` for:
  - admin case actions
  - student case request submission
  - student lifecycle updates
  - student planner CRUD
  - admin invitation flows
  - public patient chat

### Security model

- Middleware checks authenticated role before portal access
- Supabase RLS is used for browser-role reads and defense in depth.
- Sensitive workflow writes are routed through DentBridge API/services with
  explicit authorization because the service role bypasses RLS.
- Case lifecycle rules (statuses, transitions, actor permissions) are centralized
  in `src/lib/cases/case-lifecycle.ts`; the sensitive case services consult it.
  See `docs/CASE_LIFECYCLE.md`.
- Supabase clients are typed against generated schema types
  (`src/lib/database.types.ts`); shared service types live in
  `src/lib/api/service-types.ts`. See `docs/TYPES.md`.
- Focused Vitest coverage protects lifecycle rules, patient upload/OTP
  primitives, patient request validation, public error mapping, and student
  progress guards. See `docs/TESTING.md`.
- Structured operational logging, request correlation, a no-op error-monitoring
  seam, and `/api/health` are implemented for Phase 11. Operational logs are
  separate from audit logs and must remain PHI-free. See
  `docs/OBSERVABILITY.md`.
- Legacy phone-only patient status RPC execution is revoked for browser-facing
  roles.
- Patient uploads remain private and are accessed through audited signed URL
  APIs.

## Services In Use

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- OpenAI
- Vercel Analytics
- Vercel Speed Insights
- Vitest
- GitHub Actions CI
- Structured operational logging

## Tables and Features In Use

### Confirmed in app code

- `patient_requests`
- `student_case_requests`
- `student_profiles`
- `faculty_profiles`
- `student_planner_events`
- `case_progress_entries`
- `case_routing_stages`
- `audit_logs`
- `consent_records`
- `otp_codes`
- `patient_files`

### Storage

- private `patient-uploads` bucket
- direct browser upload uses only server-created signed upload tokens; direct
  anon/authenticated Storage INSERT is revoked

### API Boundary

- Public patient request submission uses `/api/v1/patient/requests`.
- Patient status lookup uses `/api/v1/patient/status/request-otp` and
  `/api/v1/patient/status`.
- File upload preparation, confirmation, and signed URL minting use
  `/api/v1/files/*`.
- Health checks use `/api/health`.
- Phase 6 profile, case workflow, progress, and planner mutations use
  DentBridge API/services rather than browser table writes.

## Known Current Limitations

- `student/exchange` is still a placeholder page, not a complete workflow.
- `README.md` and project docs were previously stale and have now been refreshed to match the current codebase.
- `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test`
  currently pass clean.

## Recent Cleanup Notes

- Obsolete `city` usage has been removed from app code, internal queries, and EN/TR UI text.
- No database migration was applied as part of that cleanup.

## Environment Requirements

Expected environment variables for local or deployed environments (see
`docs/PRODUCTION_RELEASE_GATES_2026-07-11.md` for the authoritative list):

- `APP_URL`
- `CRON_SECRET`
- `FILE_TICKET_SECRET`
- `INVITE_REDIRECT_URL`
- `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL`
- `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED` (`false` until malware scanning ships)
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `OPENAI_API_KEY`
- `PATIENT_UPLOADS_ENABLED` (`false` until malware scanning ships)
- `RATE_LIMIT_HMAC_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_VERIFY_SERVICE_SID`

## Recommended Next Work

- run Phase 6 Preview QA before applying the direct-write RLS cleanup migration
  to Production
- keep route, auth, and data-flow docs aligned with future changes
