# 00 — Executive Summary

- **Repository:** `dental-match` (product name **DentBridge**; git remote `github.com/kadoraawsim-cyber/Dentbridge.git`)
- **Purpose of this document:** one-page orientation to what DentBridge actually is and its current maturity, grounded only in repository evidence.
- **Status:** Baseline (v2), independent audit. Supersedes nothing; the earlier first-pass set lives untouched in `docs/engineering-baseline/`.
- **Scope:** the whole repository at branch `main`, HEAD `ab36262`.
- **Last reviewed:** 2026-07-27
- **Evidence labels used throughout:** **VERIFIED** (read directly in source/config/git), **INFERENCE** (reasoned from verified evidence), **NOT VERIFIED** (could not confirm from the repo), **RECOMMENDATION** (auditor judgment).

> Repository evidence is authoritative. Conversation history and AI memory are not. Every load-bearing claim below cites a path.

## What DentBridge is (VERIFIED)

DentBridge is a **faculty-supervised clinical case-coordination platform** for academic dentistry, built on Next.js 16 App Router + React 19 + TypeScript + Tailwind v4, backed by Supabase (Auth, Postgres, Storage, SSR) and deployed on Vercel (`package.json`, `README.md`, `next.config.ts`, `vercel.json`). It connects four actor types across one codebase:

- **Public patients** submit a treatment request (`src/app/patient/request`, `src/app/api/v1/patient/requests/route.ts`) and later check status by phone + OTP (`src/app/patient/status`, `src/app/api/v1/patient/status/*`, Twilio Verify via `src/lib/otp/twilio-verify.ts`).
- **Students** browse a supervised case pool, request cases, track progress, use a clinical planner and clinical calculators (`src/app/student/*`, `src/app/api/student/*`).
- **Faculty** triage, route, and make case decisions (`src/app/admin/*` with a faculty/admin role split, `src/lib/roles.ts`).
- **Admins** manage invitations and the full case lifecycle (`src/app/api/admin/*`).

A public marketing surface (about, FAQ, privacy, KVKK/personal-data-protection-law, terms) and a bilingual (EN/TR) public patient chat assistant named **"Bridgey"** (`src/app/api/chat/patient/route.ts`, OpenAI `gpt-4.1-mini`) round out the product.

## Current maturity (VERIFIED / INFERENCE)

DentBridge is the **most production-advanced repository in this workspace**. It has a self-documented July-2026 production release process (`docs/PRODUCTION_RELEASE_REPORT_2026-07-12.md`, `docs/PRODUCTION_RELEASE_GATES_2026-07-11.md`), a `.vercel/` link, a linked Supabase project (`supabase/.temp/`), 45 ordered SQL migrations with real RLS and atomic `SECURITY DEFINER` RPCs, Sentry wiring (server/edge/client + PII scrubbing), a cron-driven file-cleanup worker, and **292 passing automated tests across 44 files (VERIFIED — run first-hand, 12.2s)**. Release tags exist (`release-final-backup-2026-07-13`, `pre-release-validation-2026-07-10`, `codex-handoff-2026-07-11`).

## Major capabilities (VERIFIED)

- End-to-end **patient → faculty triage → student request → case lifecycle** state machine, with decisions committed through atomic, row-locked Postgres RPCs (`supabase/migrations/2026071103*_release_atomic_*.sql`, `src/lib/cases/*`).
- **Sanitized patient image uploads** with a private-quarantine + Sharp/libvips re-encode pipeline, magic-byte checks, signed URLs, ticketed prepare-upload, and hourly orphan cleanup (`src/lib/files/*`, `src/app/api/v1/files/*`, `vercel.json` cron).
- **Audit logging and consent records** as first-class, hardened tables (`src/lib/audit/audit.service.ts`, `supabase/migrations/2026070803*_phase4_*`).
- **Phone + OTP patient status lookup** (Twilio Verify) with anon-insert lockdown.
- **Bridgey public chat** with deterministic emergency short-circuit safety logic before any model call.
- **Clinical calculators** (BMI, local-anesthesia max-dose) and a **student planner** linked to cases.
- Full **bilingual EN/TR** i18n and a **PWA-capable** shell (`public/manifest.json`, `InstallBanner`, viewport `viewportFit: cover`).

## Major limitations (VERIFIED)

- **5 high-severity `npm audit` advisories today** (PostCSS path traversal; `sharp`/libvips CVEs) — against pinned versions, and `sharp` decodes untrusted patient images. The committed release report claims 0 vulnerabilities; that is now stale (see `09`, `13`).
- **Coverage 50.3% statements / 50.9% lines** (VERIFIED, run first-hand). The **AI safety classifier (`src/lib/chat/patient-intent-router.ts`, 0% covered) and the planner service (`src/lib/planner/student-planner.service.ts`, 0% covered)** have no automated tests.
- **Two "monster" client components** (`src/app/admin/requests/requests-client.tsx` 1,188 lines; `src/app/admin/requests/[id]/detail-client.tsx` 1,059 lines).
- **The real-browser Playwright e2e spec has never been runnable here** — `@playwright/test` is not installed (`tests/e2e-workflow/README.md`).
- **"Clinical Compass" appears only as an "in development" placeholder** in DentBridge UI/copy — there is **no code integration** with the sibling repo (see `18`).

## Production readiness (RECOMMENDATION, grounded below)

DentBridge is at a **"Conditional GO"** posture consistent with its own release report: the core web workflow is architected, secured, and tested well enough for a controlled production/pilot, **conditioned on** patching the 5 high-severity advisories, adding coverage to the two 0%-covered safety/planner modules, and executing the browser e2e that has never run here. It is **not** a mobile app and is explicitly not being rebuilt as one yet (`docs/PLATFORM_HARDENING_ROADMAP.md`). See `12` and `16`.
