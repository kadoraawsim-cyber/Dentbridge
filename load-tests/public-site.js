/**
 * k6 load test — DentBridge public website
 *
 * Tests the four main public-facing pages. No auth, no mutations, no real data.
 *
 * Pages covered:
 *   GET /               homepage
 *   GET /patients       patient information / onboarding path
 *   GET /patient/request  request treatment form (page load only — no submission)
 *   GET /patient/status   check request status form (page load only — no real ID sent)
 *
 * Quick start:
 *   k6 run load-tests/public-site.js \
 *     -e BASE_URL=http://localhost:3000 \
 *     --vus 10 --duration 30s
 *
 * See load-tests/README.md for staged load examples and recommended thresholds.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const pageLoadMs = new Trend('page_load_ms', true);

// ── Thresholds ──────────────────────────────────────────────────────────────
export const options = {
  thresholds: {
    // p95 response time under 2 seconds
    http_req_duration: ['p(95)<2000'],
    // HTTP error rate under 1%
    http_req_failed: ['rate<0.01'],
    // Custom error rate (failed checks) under 1%
    error_rate: ['rate<0.01'],
  },
};

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const HTML_HEADERS = {
  headers: {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent':
      'Mozilla/5.0 (compatible; k6-load-test/1.0; +https://k6.io)',
  },
};

// ── Setup — runs once before any VU starts ──────────────────────────────────
export function setup() {
  console.log(`[public-site] Target: ${BASE_URL}`);

  // Sanity check — abort early if the server is not reachable.
  const probe = http.get(`${BASE_URL}/`, HTML_HEADERS);
  if (probe.status !== 200) {
    throw new Error(
      `[public-site] Server not reachable at ${BASE_URL} (HTTP ${probe.status}). ` +
        'Ensure the app is running and BASE_URL is correct before starting the test.',
    );
  }
  console.log('[public-site] Server reachable. Starting test.');
}

// ── Default function — runs once per VU per iteration ──────────────────────
export default function () {
  // 1. Homepage
  group('homepage', () => {
    const res = http.get(`${BASE_URL}/`, HTML_HEADERS);
    const ok = check(res, {
      'homepage: status 200': (r) => r.status === 200,
      'homepage: has body content': (r) => r.body && r.body.length > 200,
    });
    errorRate.add(!ok);
    pageLoadMs.add(res.timings.duration);
    sleep(rand(1, 2));
  });

  // 2. Patient information / onboarding page
  group('patient-info', () => {
    const res = http.get(`${BASE_URL}/patients`, HTML_HEADERS);
    const ok = check(res, {
      'patient-info: status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
    pageLoadMs.add(res.timings.duration);
    sleep(rand(1, 2));
  });

  // 3. Request treatment form (GET only — page load, no form submission)
  //    The multi-step form lives entirely in the browser (sessionStorage state).
  //    Submitting it would create real records; we never do that here.
  group('request-treatment-page', () => {
    const res = http.get(`${BASE_URL}/patient/request`, HTML_HEADERS);
    const ok = check(res, {
      'request-treatment: status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
    pageLoadMs.add(res.timings.duration);
    sleep(rand(2, 3));
  });

  // 4. Check status page (GET only — renders the status lookup form)
  //    We do NOT supply a real request ID; this only measures the page render cost.
  group('check-status-page', () => {
    const res = http.get(`${BASE_URL}/patient/status`, HTML_HEADERS);
    const ok = check(res, {
      'check-status: status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
    pageLoadMs.add(res.timings.duration);
    sleep(rand(1, 2));
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Realistic think-time: random float in [min, max] seconds. */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}
