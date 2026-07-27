# 17 — Baseline Review (Independent QA)

- **Repository:** `dental-match` (DentBridge)
- **Purpose:** independent QA of baseline documents `00`–`16`, as if authored by another engineer, before they become the reference.
- **Status:** QA review. **Scope:** `docs/engineering-baseline-v2/00`–`16`, re-checked against source at `main` / `ab36262`. **Last reviewed:** 2026-07-27.
- Method: sampled and re-verified 22 load-bearing claims directly against the repository (commands re-run against HEAD). Verdict at the end.

## 1. Verification sample (22 claims re-checked)

| # | Claim | Source doc | Re-check result |
|---|---|---|---|
| 1 | 22 API routes | 05 | ✅ `find … route.ts` = 22 |
| 2 | 45 migrations | 01/06 | ✅ 45 |
| 3 | 17 RLS / 36 policies / 25 SECURITY DEFINER | 06/09 | ✅ (case-insensitive grep) |
| 4 | 292 tests / 44 files pass | 00/08 | ✅ ran `vitest run` first-hand |
| 5 | Coverage 50.32% stmts / 50.85% lines | 08 | ✅ ran `--coverage` |
| 6 | `npm audit` = 5 high | 09 | ✅ ran first-hand |
| 7 | `patient-intent-router.ts` 0% (LF60/LH0) | 07/08 | ✅ lcov |
| 8 | `student-planner.service.ts` 0% (LF162/LH0) | 08 | ✅ lcov |
| 9 | Emergency intent short-circuits before OpenAI | 03/07 | ✅ `route.ts:420-424` |
| 10 | Monster files 1,188 / 1,059 | 04/11 | ✅ `wc -l` |
| 11 | No `src/middleware.ts` | 02 | ✅ absent |
| 12 | No global state lib | 06 | ✅ none in `package.json` |
| 13 | Bridgey model `gpt-4.1-mini` | 07 | ✅ route const |
| 14 | Clinical Compass = "in development" placeholder, no integration | 07/18 | ✅ `developmentFeatureKeys` + i18n only |
| 15 | No PerioFlow refs | 02 | ✅ grep empty |
| 16 | Release report claims 0 vulnerabilities | 09 | ✅ appears 2× |
| 17 | Chat caps 5/800/400 msgs/tokens, 8 req/60s | 03/07 | ✅ route consts |
| 18 | Atomic decision RPC: role re-check + `FOR UPDATE` + state validation | 02/03/06 | ✅ read `admin_set_student_request_decision` |
| 19 | 23 env keys in `.env.example` | 09 | ✅ 23 |
| 20 | PWA manifest + `viewportFit: cover` | 10 | ✅ present |
| 21 | "DentiBridge" spelling in intent-router | 07/11 | ✅ 10 occurrences |
| 22 | `revoke_phone_status_rpc` migration exists | 03 | ✅ file present |

**Result: 22/22 confirmed.** Two claims required refinement (below); none were false.

## 2. Confidence level

**High.** Every load-bearing quantitative claim was reproduced first-hand at HEAD `ab36262` (tests, coverage, audit, RLS/RPC counts, route/method inventory, line counts). Residual uncertainty is confined to items explicitly labeled NOT VERIFIED in the baseline (CI workflow internals, live production metrics, data-retention automation).

## 3. Documents that are production quality (accept as-is)

`00`, `01`, `02`, `03`, `06`, `07`, `08`, `09`, `12`, `13`, `14`, `15`, `16` — accurate, evidence-cited, appropriately labeled.

## 4. Documents requiring minor revision

- **`05_API_INVENTORY.md`** — the `admin/invitations/route.ts` entry is now **out of date**: it actually does `export { POST } from './students/route'` (VERIFIED this pass). It is a **live, `isAdminRole`-guarded endpoint** aliasing the students-invite handler — not a "possibly unguarded module to confirm." Revise the row and drop the uncertainty caveat.
- **`10_PERFORMANCE_AND_MOBILE_REVIEW.md`** — under-claims: Vercel Analytics **and** Speed Insights are **mounted in `src/app/layout.tsx`** (VERIFIED this pass), so "INFERENCE: assuming the components are mounted" should be upgraded to VERIFIED.
- **`11_TECHNICAL_DEBT.md`** — item 9 (`admin/invitations` "no detected HTTP export") should be closed as resolved: it re-exports a guarded POST; not debt.

## 5. Critical inaccuracies

**None.** No claim was contradicted by source. The two refinements above both *reduce* stated risk (an endpoint the baseline flagged as uncertain is in fact guarded; an instrumentation feature is in fact present).

## 6. Missing topics (genuine gaps)

1. **No consolidated data-model / ERD reference.** `06` lists domains from migration filenames, but there is no field-level schema/relationship view for the case/patient/file/audit tables — the highest-value onboarding artifact for a new backend engineer. (RECOMMENDATION: add one, or point to `docs/DATABASE.md` if it already covers it — that pre-existing doc was not fully audited here.)
2. **CI workflow contents not documented.** `08`/`12` correctly mark CI internals NOT VERIFIED, but a baseline should eventually inspect `.github/workflows/*` and state exactly what gates run.
3. **No explicit environment/run quickstart** in the baseline (deferred to `docs/ENVIRONMENT.md`, which exists but wasn't cross-linked).

## 7. Duplicate sections

The **"5 high advisories / sharp"** finding and the **"0% coverage on intent-router/planner"** finding each recur across `00`, `08/09`, `11`, `12`, `13`, `14`, `15`, `16`. This is defensible (each from its own lens, all cross-referenced) but heavy; `00` and `16` restate them at length. RECOMMENDATION: compress the summary-doc restatements to a line + cross-reference. No contradictory duplication found.

## 8. Contradictions

**None internal to the baseline.** The one contradiction the baseline *reports* — release report "0 vulnerabilities" vs. today's 5 high — is a real repo-vs-repo discrepancy, correctly flagged as stale-doc drift (`09`, `13.6`), not a baseline error.

## 9. Unsupported conclusions

- `10`'s native-readiness "favorable/blocker" analysis is RECOMMENDATION-level (correctly labeled) and rests on INFERENCE about future consumers — acceptable, but should not harden into fact without a real native spike.
- `10`'s "large client bundles" is inferred from LOC, not measured bundle size (correctly labeled INFERENCE). A real bundle-analyzer run would firm it up.
- The maturity weights in `16` are disclosed and arithmetic-checked; the +2 adjustment (69.7→72) is a judgment call, transparently stated.

## 10. Top improvements before adoption

1. Fix the `admin/invitations` entry in `05` (and close `11.9`) — the only stale factual item.
2. Upgrade the Vercel-analytics claim in `10` to VERIFIED.
3. Add a data-model/ERD reference (or cross-link `docs/DATABASE.md`).
4. Inspect and document `.github/workflows/*` (CI gates).
5. Compress the two most-repeated findings in `00`/`16` to cross-references.
6. Cross-link the pre-existing `docs/ENVIRONMENT.md` as the run/setup source.
7. Add a one-line currency note distinguishing this `engineering-baseline-v2/` from the earlier `engineering-baseline/`.

---

## Final verdict

# APPROVE WITH MINOR REVISIONS

**Rationale.** All 22 sampled load-bearing claims verified against source; there are **no critical inaccuracies and no internal contradictions**. The baseline is accurate, evidence-anchored, and honest about its NOT-VERIFIED edges. The required revisions are small and additive: correct one now-stale endpoint description (`05`/`11.9`), upgrade one under-claimed instrumentation note (`10`), add a data-model reference and CI-gate documentation, and trim repeated findings in the summary docs. None require rewriting a document or re-running the analysis. Adopt now; fold the fixes into one pass.
