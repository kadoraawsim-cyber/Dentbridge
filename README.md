# DentBridge

DentBridge is a faculty-supported clinical coordination platform built with Next.js and Supabase. It connects public patient intake with faculty triage, student case requests, and case lifecycle tracking.

## Current Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase Auth, Postgres, Storage, and SSR helpers
- OpenAI for the public patient chat assistant
- Vercel Analytics and Speed Insights

## Main Workflows

### Public patient flow

- `/` is the public landing page.
- `/patient/request` lets a patient submit a treatment request without an account.
- The request form submits through `/api/v1/patient/requests` and can upload one optional file through the server-mediated signed-upload flow.
- `/patient/status` lets a patient request a one-time code and then view the latest request status through the OTP-protected patient status API.
- Public FAQ and privacy pages are available at `/faq` and `/privacy`.

### Admin and faculty flow

- `/admin/login` is the faculty/admin sign-in page.
- `/admin` shows case stats and invitation actions.
- `/admin/requests` shows the triage queue and active cases.
- `/admin/requests/[id]` is the case file where faculty can:
  - review patient details
  - assign department and urgency
  - save draft triage
  - release a case to the student pool
  - reject a case
  - approve or reject student requests
  - return an assigned case to the pool
  - advance or close the treatment lifecycle

### Student flow

- `/student/login` is the student sign-in page.
- `/student/dashboard` shows pool stats, active patients, and quick actions.
- `/student/cases` shows matched pool cases that are open for student requests.
- `/student/requests` shows the student’s own submitted requests and outcomes.
- `/student/planner` is a working private planner tied to the student account, with optional links to active patients.
- `/student/exchange` exists as a coming-soon placeholder.
- Sensitive student, faculty, admin, case, progress, planner, profile, patient
  request, status, and file mutations are routed through DentBridge API/service
  boundaries.

## Authentication

DentBridge uses Supabase Auth with role-based access:

- `student`
- `faculty`
- `admin`

Protected routing is enforced in `src/middleware.ts`:

- `/student/*` requires `student`
- `/admin/*` requires `faculty` or `admin`

Student and faculty access is provisioned through invitation-based account setup:

- admin can invite students and faculty from the admin dashboard
- invite links route through `/auth/callback`
- invited users complete setup in `/auth/set-password/student` or `/auth/set-password/faculty`

## Language Support

The public and internal UI currently supports:

- English
- Turkish

Language switching is handled by the in-repo i18n layer under `src/lib/i18n`.

## Environment Variables

Create `.env.local` with the values needed for your environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FILE_TICKET_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_VERIFY_SERVICE_SID=
```

Notes:

- `OPENAI_API_KEY` is required for the public patient chat route.
- `SUPABASE_SERVICE_ROLE_KEY` is required for server-side patient, file,
  profile, case, planner, audit, consent, patient-status, and invitation workflows.
- The four `TWILIO_*` variables are server-only and required for SMS patient-status
  verification through Twilio Verify.
- `FILE_TICKET_SECRET` is required for signed file upload tickets.

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

See [docs/TESTING.md](./docs/TESTING.md) for the Phase 10 test and CI setup.
See [docs/OBSERVABILITY.md](./docs/OBSERVABILITY.md) for structured logging,
health checks, and safe production debugging.

## Important Directories

- `src/app` - routes, pages, and route handlers
- `src/components` - shared UI components
- `src/lib` - Supabase clients, roles, chat context, and i18n
- `src/lib/observability` - structured operational logging, request context,
  and error-monitoring seam
- `tests` - focused Vitest tests for lifecycle, security, and patient workflows
- `supabase/migrations` - checked-in SQL migrations and policy changes
- `.github/workflows` - CI verification workflow
- `public` - static assets

## Deployment Notes

- Production metadata and redirects are configured for `https://dentbridgetr.com`.
- The root layout includes Vercel Analytics and Speed Insights.
- Patient uploads are intended to stay private and be accessed through signed URLs.
