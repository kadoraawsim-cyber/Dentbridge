# DentBridge Project Status

Last updated: April 2026

## Current State

DentBridge is a working Next.js and Supabase application with:

- public patient intake
- patient status lookup by phone number
- role-protected admin/faculty workflow
- role-protected student workflow
- invitation-based account setup for students and faculty
- English and Turkish language support
- OpenAI-powered public patient chat guidance

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
- The form validates client-side, stores draft progress in session storage, optionally uploads one attachment, and inserts a row into `patient_requests` with `status = 'submitted'`.

### 2. Patient status lookup

- Patients use `/patient/status`.
- Lookup is based on phone number.
- The page calls the `get_request_status_by_phone` RPC and shows the latest request status and related non-sensitive details.

### 3. Admin and faculty workflow

- Admin and faculty authenticate through Supabase Auth.
- Middleware protects `/admin/*`.
- Admin and faculty can review the queue, assign departments, save drafts, reject cases, release cases to the pool, review student requests, return assigned cases to the pool, and move active cases through the treatment lifecycle.

### 4. Student workflow

- Students authenticate through Supabase Auth.
- Middleware protects `/student/*`.
- Students can browse matched pool cases, submit case requests, track request outcomes, manage approved active cases from the dashboard, and use the private planner.
- The exchange page is present but currently serves as a coming-soon page.

### 5. Invitation-based access

- Admin can invite students and faculty.
- Invitations go through Supabase Auth admin APIs.
- Invite links land on `/auth/callback`, then route users into role-specific set-password flows.

## Architecture Snapshot

### Frontend

- App Router pages under `src/app`
- Client-heavy dashboards and workflow screens
- Shared language provider and public patient chat mounted globally

### Backend and data layer

- Supabase browser client for public form submission and some authenticated client actions
- Supabase server client for server components and route handlers
- Route handlers under `src/app/api` for:
  - admin case actions
  - student case request submission
  - student lifecycle updates
  - student planner CRUD
  - admin invitation flows
  - public patient chat

### Security model

- Middleware checks authenticated role before portal access
- Supabase RLS is used for `patient_requests`, `student_case_requests`, storage access, and faculty profile access
- Public patient status lookup uses a dedicated RPC
- Patient uploads are intended to stay private

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

## Tables and Features In Use

### Confirmed in app code

- `patient_requests`
- `student_case_requests`
- `student_profiles`
- `faculty_profiles`
- `student_planner_events`

### Storage

- private `patient-uploads` bucket

### RPC

- `get_request_status_by_phone`

## Known Current Limitations

- `student/exchange` is still a placeholder page, not a complete workflow.
- `README.md` and project docs were previously stale and have now been refreshed to match the current codebase.
- There are existing lint issues in unrelated areas, mainly React purity, set-state-in-effect, and `img` optimization warnings. These were not changed as part of the recent documentation update.

## Recent Cleanup Notes

- Obsolete `city` usage has been removed from app code, internal queries, and EN/TR UI text.
- No database migration was applied as part of that cleanup.

## Environment Requirements

Expected environment variables for local or deployed environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Recommended Next Work

- apply the database migration to remove obsolete columns only after confirming production data needs
- address the existing lint errors in targeted cleanup passes
- keep route, auth, and data-flow docs aligned with future changes
