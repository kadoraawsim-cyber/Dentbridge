# 03 — Runtime Architecture

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** application lifecycle, request runtime, and the primary user-workflow runtimes.
- **Status:** Baseline (v2). **Scope:** `main` / `ab36262`. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / NOT VERIFIED / RECOMMENDATION.

> This is not a voice/AI realtime application. Its runtime is a conventional SSR web app plus a set of database-authoritative workflows. Where a workflow crosses a trust boundary, the authoritative step is a Postgres RPC, not the Node layer.

## Application lifecycle (VERIFIED)

1. **Build/deploy:** `next build` wrapped by `withSentryConfig` (`next.config.ts`); Vercel host (`.vercel/`, `vercel.json`). Node 22.x (`.nvmrc`, `package.json engines`).
2. **Startup instrumentation:** `src/instrumentation.ts` / `src/instrumentation-client.ts` register Sentry (`src/sentry.server.config.ts`, `src/sentry.edge.config.ts`).
3. **Every response** carries security headers + CSP from `next.config.ts` `headers()`; requests to host `dentbridge.com` are permanently redirected to `APP_URL`.
4. **Server rendering:** App Router pages render server-side; interactive portals hydrate `*-client.tsx` components that call `/api/*` via `src/lib/api/portal-fetch.ts`.
5. **Scheduled work:** Vercel cron hits `/api/internal/files/cleanup` hourly, authenticated with `CRON_SECRET`.

## Request runtime pipeline (VERIFIED, typical sensitive route)

```
Request → same-origin check (src/lib/api/same-origin.ts, sensitive routes)
        → durable rate limit (src/lib/api/durable-rate-limit.ts → consume_rate_limit RPC)
        → identity: createSupabaseServerClient(cookies) → auth.getUser()
        → role guard (src/lib/roles.ts)
        → domain service (src/lib/**) → Supabase query OR atomic SECURITY DEFINER RPC
        → structured result / typed API error (src/lib/api/errors.ts)
        → observability (logger + Sentry via request-context)
```

RLS and the RPC's own role re-check are the last line of defense: an authorization mistake in the Node layer is still contained by the database.

## Patient intake runtime (VERIFIED)

`patient/request` page → `POST /api/v1/patient/requests` → `src/lib/patient-request/intake.service.ts` / `submission-flow.ts` → `submit_patient_request_atomic` RPC. The intake is **atomic with file linkage** (`supabase/migrations/20260711000000_release_atomic_intake_file_cleanup.sql`): a request and its prepared uploads are committed together or not at all. Anonymous direct `INSERT` on patient tables was explicitly revoked (`20260708020000_revoke_anon_patient_request_insert.sql`), forcing intake through the RPC.

## Patient status runtime (VERIFIED)

`patient/status` → `POST /api/v1/patient/status/request-otp` (Twilio Verify send) → `POST /api/v1/patient/status` (verify + `get_request_status_by_phone` RPC). Direct phone-status RPC access was revoked (`20260708010000_revoke_phone_status_rpc.sql`) so status is only reachable after OTP.

## Case lifecycle runtime (VERIFIED)

The lifecycle is a database-authoritative state machine. Faculty/admin actions call decision RPCs — `admin_update_case_triage_with_decision`, `admin_release_next_stage_with_decision`, `admin_return_case_to_pool_with_decision`, `admin_set_case_terminal_state_with_decision`, `admin_set_student_request_decision`. Each: re-checks role from the JWT, `SELECT ... FOR UPDATE` locks the case row, validates the current status against allowed transitions, writes a case-decision-history row, and returns `{ ok, code }`. Students see pool/active/requested cases through read RPCs (`student_pool_cases`, `student_active_cases`, `student_requested_case_overview`, `student_has_current_stage_assignment`) governed by RLS. See `06`.

## File upload runtime (VERIFIED)

1. `POST /api/v1/files/prepare-upload` → issues a signed, **ticketed** (`src/lib/files/ticket.ts`, HMAC via `FILE_TICKET_SECRET`) upload target into a **private quarantine**.
2. Client uploads original bytes to Supabase Storage (private).
3. `POST /api/v1/files/[id]/confirm` → magic-byte validation (`magic-bytes.ts`), **Sharp/libvips re-encode sanitization** (`image-sanitizer.ts`, migration `20260712010000_scannerless_image_sanitization.sql`), then link to the case.
4. `GET /api/v1/files/[id]/signed-url` → short-lived signed URL, fail-closed (`tests/file-signed-url-fail-closed.test.ts`).
5. Unlinked/expired rows are reclaimed by the hourly cron via `claim_orphan_patient_files` / `complete_patient_file_cleanup` using `FOR UPDATE SKIP LOCKED` (`docs/PRODUCTION_RELEASE_GATES_2026-07-11.md`).

Gated by `PATIENT_UPLOAD_POLICY` (`disabled` | `sanitized_images` | future `malware_scanned`) + UI mirror `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED`.

## Bridgey chat runtime (VERIFIED)

`POST /api/chat/patient`: content-type + same-origin + durable rate limit (8 req/60s) → `classifyPatientChatIntent(message)`. **If intent is `emergency`, the route returns a deterministic canned safety reply and never calls OpenAI** (`route.ts:420-424`). Otherwise it calls `openai.responses.create({ model: 'gpt-4.1-mini', store: false, safety_identifier, max_output_tokens: 400 })` with intent-specific guidance injected into `instructions`. History is capped (5 messages, 800 chars each). See `07`.

## Failure / degradation (VERIFIED)

| Condition | Behavior |
|---|---|
| OpenAI unset/unavailable | chat returns 503 `serviceUnavailable`; rest of app unaffected |
| Rate limit exceeded | typed rate-limit error (durable, DB-backed → consistent across instances) |
| Invalid case transition | RPC returns `{ ok:false, code:'invalid_state' }`; no partial write |
| Storage failure mid-cleanup | row returned to `orphaned` for retry after 15 min |
| Health/readiness | `/api/health`, `/api/readiness` routes exist (tested) |
