/**
 * k6 load test — DentBridge student portal
 *
 * Simulates concurrent student users: dashboard, case browsing, case details,
 * and (optionally) requesting a test case.
 *
 * ── Auth setup (IMPORTANT: read this before running) ───────────────────────
 *
 * Supabase Auth rate-limits repeated login/signup calls. At high VU counts,
 * running one login per VU will trigger 429 errors and skew your results.
 *
 * PREFERRED — pre-extracted session cookie:
 *   1. Log in to the student portal in Chrome.
 *   2. Open DevTools → Application → Cookies → select your domain.
 *   3. Copy the cookie whose name starts with "sb-" and ends with "-auth-token".
 *   4. Pass it as: -e TEST_SESSION_COOKIE="sb-{ref}-auth-token={value}"
 *   This cookie is used by all VUs without any additional login calls.
 *
 * FALLBACK — email/password (single login in setup, shared across VUs):
 *   -e TEST_STUDENT_EMAIL=test-student@example.com
 *   -e TEST_STUDENT_PASSWORD=...
 *   -e SUPABASE_URL=https://{ref}.supabase.co
 *   -e SUPABASE_ANON_KEY=...
 *   setup() performs ONE login call. The resulting cookie is shared with all VUs.
 *   ⚠️  Never use a real student account. Use a dedicated test account only.
 *
 * ── Optional variables ──────────────────────────────────────────────────────
 *   TEST_CASE_ID=<uuid>               UUID of a test case for detail/progress calls
 *   TEST_MUTATIONS=true               enable write steps (OFF by default)
 *   ALLOW_PRODUCTION_MUTATIONS=true   required if BASE_URL is production + mutations on
 *
 * ── Quick start ─────────────────────────────────────────────────────────────
 *   k6 run load-tests/student-portal.js \
 *     -e BASE_URL=http://localhost:3000 \
 *     -e TEST_SESSION_COOKIE="sb-xxx-auth-token=eyJ..." \
 *     --vus 25 --duration 60s
 *
 * See load-tests/README.md for staged load examples.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { mutationCheck } from './utils/safety.js';

// ── Custom metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const pageLoadMs = new Trend('page_load_ms', true);
const apiLatencyMs = new Trend('api_latency_ms', true);

// ── Thresholds ──────────────────────────────────────────────────────────────
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    error_rate: ['rate<0.01'],
  },
};

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TEST_CASE_ID = (__ENV.TEST_CASE_ID || '').trim();

// ── Setup — runs ONCE before any VU starts ──────────────────────────────────
/**
 * Returns auth data that is passed to every VU's default() call.
 * Auth happens here (not in default()) to avoid flooding Supabase Auth
 * with one login request per VU per iteration.
 */
export function setup() {
  console.log(`[student-portal] Target: ${BASE_URL}`);

  // Evaluate mutation safety before the test begins.
  const mutation = mutationCheck(BASE_URL);
  if (!mutation.allow) {
    console.log(`[student-portal] Mutation guard: ${mutation.reason}`);
  }

  // ── Auth option A: pre-extracted cookie (preferred) ──────────────────────
  if (__ENV.TEST_SESSION_COOKIE) {
    console.log('[student-portal] Auth: using pre-extracted session cookie.');
    return {
      cookieHeader: __ENV.TEST_SESSION_COOKIE,
      allowMutations: mutation.allow,
    };
  }

  // ── Auth option B: email/password → single Supabase REST login ───────────
  const email = (__ENV.TEST_STUDENT_EMAIL || '').trim();
  const password = (__ENV.TEST_STUDENT_PASSWORD || '').trim();
  const supabaseUrl = (__ENV.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseAnonKey = (__ENV.SUPABASE_ANON_KEY || '').trim();

  if (!email || !password || !supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[student-portal] No auth configured. Provide either:\n' +
        '  TEST_SESSION_COOKIE="sb-{ref}-auth-token={value}"  (recommended)\n' +
        '  or TEST_STUDENT_EMAIL + TEST_STUDENT_PASSWORD + SUPABASE_URL + SUPABASE_ANON_KEY',
    );
  }

  console.warn(
    '[student-portal] Auth: using email/password login. ' +
      'At high VU counts prefer TEST_SESSION_COOKIE to avoid Supabase Auth rate limits (429).',
  );

  const loginRes = http.post(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
    },
  );

  if (loginRes.status !== 200) {
    throw new Error(
      `[student-portal] Supabase login failed (HTTP ${loginRes.status}): ${loginRes.body}`,
    );
  }

  const session = JSON.parse(loginRes.body);

  // Extract the project ref from the Supabase URL so we can name the cookie correctly.
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error(
      '[student-portal] Could not parse Supabase project ref from SUPABASE_URL. ' +
        'Expected format: https://{ref}.supabase.co',
    );
  }

  // Build the Supabase SSR auth cookie (@supabase/ssr stores the session as
  // a base64(encodeURIComponent(JSON)) string under sb-{ref}-auth-token).
  const sessionJson = JSON.stringify({
    access_token: session.access_token,
    token_type: 'bearer',
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  });
  const cookieValue = btoa(encodeURIComponent(sessionJson));
  const cookieHeader = `sb-${projectRef}-auth-token=${cookieValue}`;

  console.log(`[student-portal] Auth: logged in as ${email}. Cookie constructed for all VUs.`);

  return {
    cookieHeader,
    allowMutations: mutation.allow,
  };
}

// ── Default function — runs once per VU per iteration ──────────────────────
export default function (data) {
  const { cookieHeader, allowMutations } = data;

  // All requests send the auth cookie so Next.js middleware grants access.
  const pageParams = {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (compatible; k6-load-test/1.0; +https://k6.io)',
      Cookie: cookieHeader,
    },
  };

  const apiParams = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: cookieHeader,
    },
  };

  // 1. Student dashboard — main entry point, triggers multiple Supabase queries
  group('dashboard', () => {
    const res = http.get(`${BASE_URL}/student/dashboard`, pageParams);
    const ok = check(res, {
      'dashboard: status 200': (r) => r.status === 200,
      'dashboard: not redirected to login': (r) =>
        !r.url.includes('/login'),
    });
    errorRate.add(!ok);
    pageLoadMs.add(res.timings.duration);
    sleep(rand(1, 3));
  });

  // 2. Student's assigned cases list
  group('my-cases', () => {
    const res = http.get(`${BASE_URL}/student/cases`, pageParams);
    const ok = check(res, {
      'my-cases: status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
    pageLoadMs.add(res.timings.duration);
    sleep(rand(1, 2));
  });

  // 3. Case exchange — pool of available cases to browse
  group('browse-exchange', () => {
    const res = http.get(`${BASE_URL}/student/exchange`, pageParams);
    const ok = check(res, {
      'browse-exchange: status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
    pageLoadMs.add(res.timings.duration);
    sleep(rand(1, 2));
  });

  // 4. Case detail and progress (read-only API calls, requires TEST_CASE_ID)
  if (TEST_CASE_ID) {
    group('case-detail', () => {
      const statusRes = http.get(
        `${BASE_URL}/api/student/cases/${TEST_CASE_ID}/status`,
        apiParams,
      );
      check(statusRes, {
        'case-status: status 200': (r) => r.status === 200,
      });
      errorRate.add(statusRes.status !== 200);
      apiLatencyMs.add(statusRes.timings.duration);
      sleep(rand(0.5, 1));

      const progressRes = http.get(
        `${BASE_URL}/api/student/cases/${TEST_CASE_ID}/progress`,
        apiParams,
      );
      check(progressRes, {
        'case-progress: status 200': (r) => r.status === 200,
      });
      errorRate.add(progressRes.status !== 200);
      apiLatencyMs.add(progressRes.timings.duration);
      sleep(rand(1, 2));
    });

    // 5. Optional mutation: request a test case
    //    Only runs when TEST_MUTATIONS=true AND the mutation safety check passed.
    //    409 (already requested) is treated as success — idempotent by design.
    if (allowMutations) {
      group('request-case [MUTATION]', () => {
        console.log(`[mutation] Requesting test case ${TEST_CASE_ID}`);
        const res = http.post(
          `${BASE_URL}/api/student/cases/${TEST_CASE_ID}/request`,
          JSON.stringify({}),
          apiParams,
        );
        const ok = check(res, {
          'request-case: accepted (200/201/409)': (r) =>
            [200, 201, 409].includes(r.status),
        });
        errorRate.add(!ok);
        apiLatencyMs.add(res.timings.duration);
        sleep(rand(2, 4));
      });
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Realistic think-time: random float in [min, max] seconds. */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}
