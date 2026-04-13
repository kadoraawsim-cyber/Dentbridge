# DentBridge — Project Status

**Platform:** Faculty-Supported Clinical Platform  
**Stack:** Next.js 16.2.3 · React 19 · TypeScript · Tailwind CSS v4 · Supabase JS v2 · Lucide React  
**Last updated:** April 2026

---

## Working Routes

| Route | Description | Data Source |
|---|---|---|
| `/` | Landing page | Static |
| `/patient/request` | Patient treatment request form | Supabase (INSERT) |
| `/patient/status` | Patient status lookup by phone | Supabase (SELECT) |
| `/admin` | Admin dashboard with stats | Supabase (SELECT) |
| `/admin/requests` | Full patient request list with search | Supabase (SELECT) |
| `/admin/requests/[id]` | Case detail — review, assign, approve/reject | Supabase (SELECT + UPDATE) |
| `/student/dashboard` | Student overview with pool stats | Supabase + mock |
| `/student/cases` | Available case pool with filter/search | Supabase (SELECT) |
| `/student/exchange` | Case exchange board | Mock only |

All routes are reachable through in-app navigation without typing URLs manually.

---

## What Is Already Functional

### Patient Flow
- Treatment request form with full validation (name, age, phone, treatment type, complaint, urgency, consent)
- File attachment upload to Supabase Storage (`patient-uploads` bucket, `patient-requests/` prefix), with 10MB client-side size check
- Post-submit confirmation with link to status page
- Status lookup page — queries most recent request by phone number and displays status, department, and submission date

### Admin Flow
- Dashboard shows live stats: new requests today, pending review count, active treatments, exchange approvals
- Department load panel (calculated from live assignment data)
- Urgent cases alert panel (live count)
- Full patient request list with text search (name, phone, treatment, city)
- Case detail page:
  - Displays all patient-submitted fields
  - Editable department assignment with keyword-based auto-suggestion
  - Editable urgency, target student level, and clinical notes
  - Save Draft (sets status → `under_review`), Approve (sets status → `matched`), Reject (sets status → `rejected`)
  - 3-second success confirmation banner after each action
  - Signed URL attachment viewer (60-second expiry, opens in new tab)
  - All changes persist to Supabase immediately

### Student Flow
- Dashboard shows live pool case count and urgent pool case count from Supabase
- Case pool page shows all `status = 'matched'` cases from Supabase, filterable by department chip and searchable by name, treatment, city, or department

---

## What Is Still Mock or Incomplete

### Student Identity
The logged-in student is hardcoded in `src/app/student/dashboard/page.tsx`:
```ts
const STUDENT = { name: 'Yusuf Aydın', year: 'Year 4 Clinical Student', university: 'Istanbul University' }
```
Replace with real auth session data when authentication is implemented.

### Student Dashboard Stats
- "Active Cases" stat: hardcoded `2`
- "Completed" stat: hardcoded `7`
- "Semester Progress" bar: hardcoded `58%`

These require a `student_case_assignments` table to calculate from real data.

### "Request This Case" Button (Student Cases)
Clicking "Request This Case" in `/student/cases` sets a 3-second optimistic UI confirmation but **writes nothing to the database**. The `handleRequest` function is a placeholder. Requires a `student_case_assignments` table.

### Case Exchange Board (`/student/exchange`)
The entire exchange board is mock data:
- `MOCK_MY_CASES` — 2 hardcoded active student cases
- `MOCK_EXCHANGE_BOARD` — 4 hardcoded open exchange offers
- "Offer for Exchange" and "Accept Exchange" buttons are optimistic UI only, no DB writes

Requires an `exchange_requests` table and a faculty approval workflow.

### Admin Department Load Capacity
The capacity percentage shown in the admin dashboard sidebar is synthetic: `Math.min(100, count * 12 + 15)`. Replace with a real formula or configurable capacity values per department.

### Language Switcher (EN / TR / AR)
The language buttons appear in every header but have no functionality. Internationalization (i18n) is not implemented.

### "Clinical Requirements" Link
The footer link "Clinical Requirements" points to `href="#"` on all pages. No page exists for it.

---

## Known Limitations

- **No authentication anywhere.** All routes — including full admin case management — are publicly accessible to anyone with the URL.
- **`patient_requests` type is duplicated** across 5 files (`admin/page.tsx`, `admin/requests/page.tsx`, `admin/requests/[id]/page.tsx`, `patient/status/page.tsx`, `student/dashboard/page.tsx`, `student/cases/page.tsx`). A shared `src/types/index.ts` would reduce maintenance burden.
- **No pagination.** The admin requests list and student cases list load all records in a single query. This will degrade as data grows.
- **No form spam protection.** The patient request form has no rate limiting, CAPTCHA, or bot detection.
- **No real-time updates.** The admin dashboard does not refresh automatically when new requests arrive. The admin must reload the page.
- **File type not validated.** Only file size is checked client-side. Any file type can be uploaded.

---

## Next Priorities (In Order)

1. **Authentication** — Add Supabase Auth (email/password) and a `src/middleware.ts` that protects `/admin/*` and `/student/*`. This is the prerequisite for everything else.
2. **Supabase RLS** — Tighten row-level security policies once auth exists (see Supabase Notes below).
3. **`student_case_assignments` table** — Enables "Request This Case" to write to the database and student active/completed stats to be real.
4. **Real student identity** — Replace hardcoded `STUDENT` constant with authenticated session data.
5. **`exchange_requests` table** — Enables the case exchange board to be functional, including a faculty approval step.
6. **File type validation** — Add a MIME type allowlist (JPEG, PNG, PDF) before the Supabase Storage upload call.
7. **Pagination** — Add limit/offset or cursor-based pagination to requests list and case pool pages.
8. **Shared types file** — Extract `PatientRequest` to `src/types/index.ts` to eliminate duplication.

---

## Deployment Notes

- Environment variables required (set in hosting provider, e.g. Vercel):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `.env.local` is gitignored via `.env*` pattern — it will not be committed.
- No `.env.example` file exists. Create one before onboarding other developers.
- When server-side API routes are added (recommended for admin operations), a `SUPABASE_SERVICE_ROLE_KEY` will also be required. **Never prefix this with `NEXT_PUBLIC_`.**
- The `next.config.ts` is empty — no special configuration needed for current features.
- Build command: `next build` / Start command: `next start`

---

## Supabase Notes

### Tables in Use
- `patient_requests` — All patient submissions and admin decisions. Core table of the platform.

### Tables Needed (Not Yet Created)
- `student_case_assignments` — Links a student to a `patient_request`. Fields: `id`, `case_id` (→ `patient_requests`), `student_id` (→ auth user), `status`, `created_at`
- `exchange_requests` — Case exchange offers. Fields: `id`, `case_id` (→ `patient_requests`), `offered_by` (→ student), `reason`, `status` (`open` | `accepted` | `approved` | `cancelled`), `created_at`

### Storage
- Bucket: `patient-uploads`
- Upload prefix: `patient-requests/`
- Verify the bucket is set to **private** in the Supabase dashboard. Signed URLs (60-second expiry) are used for admin attachment access and are only secure if the bucket is not public.

### RLS Recommendations (After Auth Is Added)
| Table | anon role | authenticated patient | authenticated admin |
|---|---|---|---|
| `patient_requests` | INSERT only | SELECT own rows by user_id | SELECT all, UPDATE all |
| `patient-uploads` bucket | Upload only | None | Read via signed URL |

Currently the anon key has broad SELECT and UPDATE access because admin operations run client-side. Once admin routes use server-side API routes with the service role key, anon access can be locked down significantly.

---

## UI Improvements (Next Session)

These are visual/UX gaps that do not require new backend work:

- **Mobile navigation** — The header nav is hidden on small screens (`md:hidden`) with no hamburger menu or mobile drawer. The site is not usable on mobile.
- **Admin requests list — row click** — The full row should be clickable to open a case, not just the "Review" button at the end.
- **Patient form — progress indicator** — The form is long (single scroll). A step indicator or section dividers would improve orientation.
- **Empty state illustrations** — When no cases are in the pool or no results match a search, the "no results" message is plain text. A small illustration would improve the feel.
- **Status timeline on patient status page** — Instead of a single badge, showing a visual step-by-step progress bar (`submitted → under review → matched → contacted → completed`) would be much clearer for patients.
- **Admin case list — column sorting** — Clicking column headers (urgency, status, date) to sort would reduce scrolling.

---

## Backend / Auth Improvements (Later)

These require design decisions and new infrastructure:

- **Authentication system** — Supabase Auth with email/password. Separate roles: patient (optional), student, admin/faculty. Consider whether patients need accounts or phone-based lookup is sufficient.
- **Server-side admin API routes** — Move admin reads and writes to `src/app/api/` Route Handlers using the Supabase service role key. This removes the need for the anon key to have write access and enables proper audit logging.
- **Notification system** — Email or SMS to patient when status changes to `contacted`. Supabase Edge Functions + a provider like Resend or Twilio.
- **Audit log** — Record who changed what and when on each case. A `case_audit_log` table with `case_id`, `changed_by`, `old_status`, `new_status`, `timestamp`.
- **Rate limiting on patient form** — Vercel Edge middleware or a Cloudflare Turnstile CAPTCHA to prevent spam submissions.
- **Faculty approval step for exchanges** — When a student "accepts" an exchange offer, it should move to a pending faculty approval state before becoming final.
- **i18n** — Turkish and Arabic language support. Next.js `next-intl` or `next-i18next` library. The UI already has EN/TR/AR buttons — they just need to be wired up.

---

## Production Blockers

These issues must be resolved before this platform handles real patient data:

**1. No authentication (Critical)**  
Every route is publicly accessible. Anyone can read all patient PHI at `/admin/requests` and modify any record at `/admin/requests/[id]`. A `src/middleware.ts` protecting `/admin/*` and `/student/*` is the minimum fix.

**2. Supabase RLS policies not confirmed (Critical)**  
The browser-side anon key has whatever access the Supabase RLS policies allow. If RLS is disabled or permissive, all patient data (names, phone numbers, complaint descriptions, attachments) is readable by anyone who knows the Supabase URL and anon key — both of which are visible in the browser bundle. Audit and tighten RLS policies before collecting real data.

**3. Admin writes use the anon key client-side (High)**  
`UPDATE` on `patient_requests` (approve, reject, save draft) is executed from the browser using the anon key. Move these to server-side Route Handlers using the service role key. This also enables proper authorization checks.

**4. No file type validation (Medium)**  
The patient upload accepts any file extension. Add a MIME type allowlist (`image/jpeg`, `image/png`, `application/pdf`) before calling `supabase.storage.upload`. Also confirm the `patient-uploads` bucket is private in the Supabase dashboard.

**5. No rate limiting on the request form (Medium)**  
The patient submission form has no bot protection. Without it, the `patient_requests` table can be flooded with junk. Add a honeypot field as a minimum, or integrate a CAPTCHA before launch.
