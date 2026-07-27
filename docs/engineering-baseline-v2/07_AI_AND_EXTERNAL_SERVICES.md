# 07 — AI and External Services

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** document every AI component and third-party service integration, trust boundaries, and fallback behavior.
- **Status:** Baseline (v2). **Scope:** `src/lib/chat/*`, `src/app/api/chat/*`, `src/lib/otp/*`, Sentry/Vercel wiring. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / NOT VERIFIED / RECOMMENDATION.

## AI: "Bridgey" public patient chat (VERIFIED)

The **only AI/LLM feature in the repository** is the public patient assistant, "Bridgey."

- **Entry:** `POST /api/chat/patient` (`src/app/api/chat/patient/route.ts`), model **`gpt-4.1-mini`** via `openai.responses.create`, `store: false`, `safety_identifier` per request, `max_output_tokens: 400`, history capped (5 × 800 chars), message capped 2,000 chars.
- **Safety design (the important part):** intent is classified **deterministically before any model call** by `classifyPatientChatIntent` (`src/lib/chat/patient-intent-router.ts`). Intents: `emergency`, `medical_advice_or_diagnosis`, and general categories.
  - **`emergency` → hard short-circuit:** the route returns a fixed canned safety message (`getPatientChatEmergencyResponse`) and **never calls OpenAI** (`route.ts:420-424`). VERIFIED.
  - **`medical_advice_or_diagnosis` → does NOT short-circuit:** the model is still called, but steered by injected guidance ("clinical questions should be reviewed by qualified professionals; do not diagnose") via `buildInstructions(..., detectedIntent)`. So medical-advice safety is *model-steered*, not deterministic. VERIFIED — a meaningful nuance for reviewers.
- **Grounding:** `src/lib/chat/patient-site-context.ts` builds a bounded, public-only context (assistant name "Bridgey", what it can/can't do, page IDs). It explicitly forbids Bridgey from claiming KVKK/GDPR/HIPAA compliance, checking live request status, or accessing patient records.
- **Naming inconsistency (VERIFIED):** the intent router uses the spelling **"DentiBridge"** while site-context uses **"DentBridge"**; and `patient-site-context.ts:172` self-notes that "the public footer and Terms pages contain older malformed founder wording." These are content-hygiene issues (see `11`).

### Bridgey trust boundary (VERIFIED)

Bridgey has **no tools, no function-calling, no database access, and no write capability**. It can only emit text. It cannot read case/patient records (enforced by not being given any such context or credentials). This bounds the blast radius of a prompt-injection or hallucination to "wrong text shown to that same anonymous user."

### Bridgey testing (VERIFIED)

`tests/patient-site-context.test.ts` exists and covers the grounding context (`patient-site-context.ts` = 5/5 lines covered). **However, `patient-intent-router.ts` (the safety classifier) has 0% automated coverage** (LF:60, LH:0, first-hand). This is the single most important test gap for the AI surface — see `08`, `13`.

## Clinical Compass / Student AI Assistant (VERIFIED — NOT built here)

Strings referencing "Clinical Compass" and "Student AI Assistant" exist in i18n (`translations/en.ts:3086`, `tr.ts:743`), in `src/app/students/students-client.tsx` (behind a `developmentFeatureKeys` set), and in Bridgey grounding copy that states they are **"marked as in development on the public student page."** There is **no implementation, no route, and no integration** for either feature in this repository. See `18`.

## External services (VERIFIED)

| Service | Package / config | Use | Failure mode |
|---|---|---|---|
| **Supabase** | `@supabase/ssr`, `@supabase/supabase-js` | Auth, Postgres, Storage | Core dependency; readiness route checks it |
| **OpenAI** | `openai` ^6 | Bridgey chat only | 503 `serviceUnavailable` if key unset/unavailable; rest of app fine |
| **Twilio Verify** | `twilio` ^6 (`src/lib/otp/twilio-verify.ts`) | Patient status OTP | Verify send/check; test isolation fixed in CI (`git log` 6efbec8); `tests/twilio-verify.test.ts` |
| **Sentry** | `@sentry/nextjs` ^10 | Error monitoring | `src/sentry.*.config.ts`, `instrumentation*.ts`, PII scrubbing (`sentry-privacy.ts`, tested) |
| **Vercel** | `@vercel/analytics`, `@vercel/speed-insights`, `vercel.json` | Host, cron, web analytics/vitals | Cron drives file cleanup |
| **sharp / libvips** | `sharp` 0.34.5 | Image sanitization (re-encode) | **5 high-severity CVEs today** (see `09`) — decodes untrusted patient images |

## Secrets for external services (VERIFIED — key names only, no values)

Server-only: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_*` (4 keys), `SENTRY_AUTH_TOKEN`, `FILE_TICKET_SECRET`, `RATE_LIMIT_HMAC_SECRET`, `CRON_SECRET`. Client-visible: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PATIENT_UPLOADS_ENABLED`, `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL`. See `09`.

## Fallback / degradation summary (VERIFIED)

- OpenAI down → chat 503; platform otherwise operational.
- Twilio down → OTP send/verify fails; patient status lookup unavailable (INFERENCE — no alternate channel found).
- Sentry down → local structured logging (`src/lib/observability/logger.ts`) still records; app unaffected.
