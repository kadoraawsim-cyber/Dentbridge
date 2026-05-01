/**
 * Mutation safety guards for DentBridge k6 load tests.
 *
 * Import this module in any script that contains write (mutation) steps.
 * It enforces a two-key safety model:
 *
 *   Key 1 — TEST_MUTATIONS=true
 *     Must be explicitly set. Mutations are OFF by default.
 *
 *   Key 2 — ALLOW_PRODUCTION_MUTATIONS=true
 *     Required only when BASE_URL matches a known production domain.
 *     Prevents accidental writes to production even when TEST_MUTATIONS=true.
 *
 * Usage:
 *   import { mutationCheck } from './utils/safety.js';
 *
 *   export function setup() {
 *     const mutation = mutationCheck(__ENV.BASE_URL || 'http://localhost:3000');
 *     if (!mutation.allow) console.log(`[SAFETY] ${mutation.reason}`);
 *     return { allowMutations: mutation.allow };
 *   }
 *
 *   export default function (data) {
 *     if (data.allowMutations) {
 *       // ... write step ...
 *     }
 *   }
 */

const PRODUCTION_DOMAINS = [
  'dentbridgetr.com',
  'www.dentbridgetr.com',
  'dentbridge.com',
  'dental-match.vercel.app',
];

/**
 * Returns true if the URL appears to belong to a known production environment.
 * Extend PRODUCTION_DOMAINS above if you add new production hostnames.
 */
export function isProduction(baseUrl) {
  const lower = (baseUrl || '').toLowerCase();
  return PRODUCTION_DOMAINS.some((d) => lower.includes(d));
}

/**
 * Checks whether write operations are permitted for this test run.
 *
 * @param {string} baseUrl  The BASE_URL being tested (e.g. from __ENV.BASE_URL).
 * @returns {{ allow: boolean, reason: string | null }}
 *   allow  — true when mutations may proceed, false when they must be skipped.
 *   reason — human-readable explanation when allow is false, null otherwise.
 */
export function mutationCheck(baseUrl) {
  if (__ENV.TEST_MUTATIONS !== 'true') {
    return {
      allow: false,
      reason:
        'TEST_MUTATIONS is not set to "true" — all write steps are skipped. ' +
        'This is the safe default. Add -e TEST_MUTATIONS=true only on non-production targets.',
    };
  }

  if (isProduction(baseUrl) && __ENV.ALLOW_PRODUCTION_MUTATIONS !== 'true') {
    return {
      allow: false,
      reason:
        `BASE_URL (${baseUrl}) matches a known production domain. ` +
        'Set ALLOW_PRODUCTION_MUTATIONS=true to permit writes — but only when using ' +
        'a dedicated test account that contains no real patient data.',
    };
  }

  if (isProduction(baseUrl)) {
    console.warn(
      `[SAFETY] ⚠️  Mutations enabled against PRODUCTION (${baseUrl}). ` +
        'Verify this account holds no real patient data before proceeding.',
    );
  }

  return { allow: true, reason: null };
}
