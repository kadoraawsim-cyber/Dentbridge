# 10 — Performance and Mobile Review

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** rendering, network, performance signals, and mobile/responsive/accessibility readiness (incl. future native).
- **Status:** Baseline (v2). **Scope:** static inspection + config. No Lighthouse/profiling run in this pass. **Last reviewed:** 2026-07-27.
- Labels: VERIFIED / INFERENCE / NOT VERIFIED / RECOMMENDATION.

## Performance instrumentation (VERIFIED)

- **Vercel Speed Insights + Analytics** are wired (`@vercel/speed-insights`, `@vercel/analytics` in `package.json`) — real user Web Vitals are collected in production (INFERENCE: assuming the components are mounted in the layout; presence of the deps is VERIFIED).
- **Load tests exist** (`load-tests/public-site.js`, `load-tests/student-portal.js`, safety util). Git history references "public site 100 VU load test evidence" (`fb28646`) and `release-evidence/`. Not re-run in this audit (NOT VERIFIED that numbers hold at current HEAD).

## Rendering (VERIFIED / INFERENCE)

- App Router SSR; portals hydrate client components. Several client pages are large (admin `requests-client.tsx` 1,188; `detail-client.tsx` 1,059; planner 868; chat widget 852; student dashboard 845) — large client bundles for those routes (INFERENCE from LOC; bundle sizes not measured).
- **Image handling:** `sharp` for server-side sanitization/optimization; `img-src` CSP allows `data:`/`blob:`/https. Next Image usage not audited in this pass (NOT VERIFIED).
- **No global client store** means less runtime state overhead but re-fetch-on-navigate patterns (INFERENCE).

## Network (VERIFIED)

- Durable rate limits bound abusive traffic on mutation endpoints.
- Chat caps history/tokens (5 msgs, 400 output tokens) — bounded cost/latency per turn.
- File uploads go browser→Supabase Storage directly via signed targets (not proxied through Next), which is the efficient pattern (INFERENCE from ticketed prepare-upload design).

## Mobile & responsive readiness (VERIFIED)

- **PWA-capable shell:** `public/manifest.json`, `manifest` linked in `src/app/layout.tsx`, `InstallBanner` component, `viewport` with `viewportFit: 'cover'`, `themeColor: '#0d1f54'`. This indicates deliberate mobile-web support.
- **Responsive work is active in git history:** `3f46c69 fix faculty portal mobile responsiveness`, `32a9f62 fix Bridgy mobile message bubble wrapping`, `3931e1b improve … mobile chat layout`. So mobile-web layout is being iterated (VERIFIED via commits).
- Tailwind v4 utility classes are the responsive mechanism (VERIFIED — no separate responsive framework).

## Accessibility (NOT VERIFIED)

No automated a11y tooling (axe/pa11y) and no a11y assertions found in `tests/` (VERIFIED absence). Actual screen-reader/keyboard/contrast conformance is **NOT VERIFIED**. RECOMMENDATION: add automated a11y scanning before broad public/institutional rollout.

## Readiness for future iOS/Android transformation (VERIFIED / RECOMMENDATION)

- The repository's own roadmap is explicit: *"DentBridge is not being rebuilt as a mobile app right now"* (`docs/PLATFORM_HARDENING_ROADMAP.md`). So native is a **future**, not current, objective.
- **Favorable factors (INFERENCE):** a clean API surface (`src/app/api/*` + Supabase RPCs) means a future native client could reuse the same backend contracts; auth is token/cookie-based Supabase (portable); business logic lives server-side (RPCs), not in the web UI.
- **Blockers to native (RECOMMENDATION):** UI logic is entangled in large `*-client.tsx` files (not a shared design system); no API versioning discipline beyond the `v1/` prefix on patient/file routes (student/admin routes are unversioned); no OpenAPI/typed client contract for a non-web consumer. A native effort would want (a) a stable, versioned API contract across all portals, and (b) extraction of shared domain types (already partly present in `database.types.ts`).

## Bottlenecks & opportunities (RECOMMENDATION)

| # | Item | Type |
|---|---|---|
| 1 | Large admin client bundles (1,188 / 1,059 LOC) | Rendering/bundle — decompose (see `11`) |
| 2 | No measured Lighthouse/Web-Vitals baseline in-repo (Speed Insights collects live, but no committed budget) | Observability of perf |
| 3 | No a11y automation | Accessibility |
| 4 | Unversioned student/admin APIs limit future native reuse | API contract |
| 5 | PWA shell + responsive commits + Vercel vitals already in place | Positive |
