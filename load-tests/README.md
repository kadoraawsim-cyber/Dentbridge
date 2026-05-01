# DentBridge — k6 Load Tests

Measures how many concurrent student users DentBridge can support.  
All scripts live here and are **never imported by the Next.js application**.

---

## Contents

```
load-tests/
├── public-site.js        GET-only tests: homepage, patient path, request form, status page
├── student-portal.js     Authenticated student flow: dashboard, cases, exchange, optional mutation
├── utils/
│   └── safety.js         Mutation guard — imported by student-portal.js
├── .env.example          All supported environment variables with explanations
└── README.md             This file
```

---

## Install k6

### macOS (Homebrew)
```bash
brew install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] \
  https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Windows (Chocolatey)
```bash
choco install k6
```

### Direct download
See https://grafana.com/docs/k6/latest/set-up/install-k6/

---

## Running the public site test

No auth required. Safe to run against any environment including production
(read-only GET requests only, no data written).

```bash
# 10 concurrent users, 60 seconds
k6 run load-tests/public-site.js \
  -e BASE_URL=http://localhost:3000 \
  --vus 10 --duration 60s

# 25 VUs
k6 run load-tests/public-site.js \
  -e BASE_URL=http://localhost:3000 \
  --vus 25 --duration 60s

# 50 VUs
k6 run load-tests/public-site.js \
  -e BASE_URL=http://localhost:3000 \
  --vus 50 --duration 60s

# 100 VUs
k6 run load-tests/public-site.js \
  -e BASE_URL=http://localhost:3000 \
  --vus 100 --duration 60s

# 200 VUs
k6 run load-tests/public-site.js \
  -e BASE_URL=http://localhost:3000 \
  --vus 200 --duration 60s
```

### Staged ramp-up (recommended for realistic load)

Add a `--stage` progression to avoid hammering the server instantly:

```bash
k6 run load-tests/public-site.js \
  -e BASE_URL=http://localhost:3000 \
  --stage 30s:10 \
  --stage 60s:50 \
  --stage 60s:100 \
  --stage 30s:0
```

---

## Running the student portal test

Requires a test student account. See "Auth setup" below before running.

```bash
# 10 VUs — good starting point
k6 run load-tests/student-portal.js \
  -e BASE_URL=http://localhost:3000 \
  -e TEST_SESSION_COOKIE="sb-abcdefgh-auth-token=eyJ..." \
  --vus 10 --duration 60s

# 25 VUs
k6 run load-tests/student-portal.js \
  -e BASE_URL=http://localhost:3000 \
  -e TEST_SESSION_COOKIE="sb-abcdefgh-auth-token=eyJ..." \
  --vus 25 --duration 60s

# 50 VUs
k6 run load-tests/student-portal.js \
  -e BASE_URL=http://localhost:3000 \
  -e TEST_SESSION_COOKIE="sb-abcdefgh-auth-token=eyJ..." \
  --vus 50 --duration 60s

# 100 VUs
k6 run load-tests/student-portal.js \
  -e BASE_URL=http://localhost:3000 \
  -e TEST_SESSION_COOKIE="sb-abcdefgh-auth-token=eyJ..." \
  --vus 100 --duration 60s

# 200 VUs
k6 run load-tests/student-portal.js \
  -e BASE_URL=http://localhost:3000 \
  -e TEST_SESSION_COOKIE="sb-abcdefgh-auth-token=eyJ..." \
  --vus 200 --duration 60s
```

### Include case detail calls
Supply a test case UUID (must exist in the test environment):

```bash
k6 run load-tests/student-portal.js \
  -e BASE_URL=http://localhost:3000 \
  -e TEST_SESSION_COOKIE="sb-abcdefgh-auth-token=eyJ..." \
  -e TEST_CASE_ID=00000000-0000-0000-0000-000000000001 \
  --vus 25 --duration 60s
```

### Enable write steps (mutation)
Only on staging, with a dedicated test account:

```bash
k6 run load-tests/student-portal.js \
  -e BASE_URL=http://staging.dentbridge.com \
  -e TEST_SESSION_COOKIE="sb-abcdefgh-auth-token=eyJ..." \
  -e TEST_CASE_ID=00000000-0000-0000-0000-000000000001 \
  -e TEST_MUTATIONS=true \
  --vus 10 --duration 30s
```

---

## Auth setup — student portal

### Supabase Auth rate limiting warning

> **Do not run one Supabase login per virtual user.**  
> Supabase Auth enforces rate limits on `/auth/v1/token` (and all
> signup/email flows). At 50+ VUs each doing a login in parallel, you will
> almost certainly receive `429 Too Many Requests` errors. This inflates
> your error rate and does not reflect real application behaviour.
>
> Always prefer a pre-extracted session cookie or a single shared login
> performed in `setup()` (which runs once, not once per VU).

### Option A — pre-extracted cookie (recommended for load testing)

1. Open the student portal in Chrome and log in with a **dedicated test account**.
2. Open DevTools → **Application** → **Cookies** → click your domain.
3. Find the cookie whose name matches `sb-{project-ref}-auth-token`.
4. Copy its **Value** column.
5. Pass it as an environment variable:
   ```bash
   -e TEST_SESSION_COOKIE="sb-abcdefgh-auth-token=<paste-value-here>"
   ```

This single cookie is shared across all VUs for the duration of the test.
The session expires after ~1 hour (Supabase default JWT lifetime), so
re-extract it if you run long tests.

### Option B — email/password auto-login (single login in setup)

The script calls Supabase's REST API **once** during `setup()`, then shares
the resulting cookie with every VU. Suitable for lower VU counts (< 50).

```bash
-e TEST_STUDENT_EMAIL=test-student@example.com \
-e TEST_STUDENT_PASSWORD=... \
-e SUPABASE_URL=https://abcdefgh.supabase.co \
-e SUPABASE_ANON_KEY=...
```

**Use only a dedicated test account. Never use a real student's credentials.**

### Creating a test account

1. In the Supabase dashboard → **Authentication** → **Users** → **Add user**.
2. Set email to something like `loadtest-student@internal.dentbridge.com`.
3. Assign the `student` role via `app_metadata`:
   ```json
   { "role": "student" }
   ```
4. This account should never appear in any production data flows.

---

## Metrics to check

After each run k6 prints a summary. Focus on these:

| Metric | Description |
|---|---|
| `http_req_duration` | End-to-end response time per request |
| `http_req_duration p(95)` | 95th percentile — your headline SLO metric |
| `http_req_failed` | Fraction of requests that returned a network error or 4xx/5xx |
| `error_rate` | Custom: fraction of k6 `check()` assertions that failed |
| `page_load_ms` | Custom trend for full SSR page loads |
| `api_latency_ms` | Custom trend for JSON API calls (student portal only) |
| `http_reqs` | Total request throughput (requests/second) |
| `vus` | Active virtual users at each sample point |
| `iterations` | Completed scenario iterations |

---

## Recommended thresholds

These match the thresholds coded into both scripts:

| Threshold | Target |
|---|---|
| `p(95) http_req_duration` | **< 2 000 ms** (2 seconds) |
| `http_req_failed rate` | **< 1%** |
| Custom `error_rate` | **< 1%** |

A failing threshold causes k6 to exit with a non-zero status code, which
will fail a CI step if you integrate load tests into a pipeline.

---

## Mutation safety

Write operations in `student-portal.js` are **off by default**. The safety
model requires two explicit opt-ins before any mutation runs:

### Key 1 — `TEST_MUTATIONS=true`
Must be set on the command line. Without this, all `group('... [MUTATION]')`
blocks are skipped unconditionally.

### Key 2 — `ALLOW_PRODUCTION_MUTATIONS=true`
Required when `BASE_URL` matches a known production domain
(`dentbridge.com`, `dental-match.vercel.app`). Even if `TEST_MUTATIONS=true`,
mutations are blocked against production unless this second key is also set.

**When `BASE_URL` is production and both keys are set**, the script logs a
console warning before proceeding. Only do this with a dedicated test
account that holds no real patient data.

### Domains treated as production

The list lives in `load-tests/utils/safety.js`:

```js
const PRODUCTION_DOMAINS = [
  'dentbridge.com',
  'dental-match.vercel.app',
];
```

Add any additional hostnames here if you deploy to extra domains.

---

## How to avoid touching production data

1. **Point `BASE_URL` at localhost or a staging deployment**, not production.
2. **Never submit the patient request form.** The public-site script only loads
   `/patient/request` with a GET — it never POSTs the form.
3. **Never query a real patient's request ID.** The status page check is a
   page-load only; no ID is submitted.
4. **Use only test accounts** for the student portal. The test account must
   not be associated with any real clinical cases.
5. **Leave `TEST_MUTATIONS=false`** (the default) unless you specifically need
   to benchmark write performance on a staging environment.
6. **Do not stress-test email flows.** Password resets, invitation emails, and
   auth confirmation emails are not included in these tests. Running them at
   scale risks hitting Supabase email quotas and potentially sending real
   emails to real addresses.

---

## FAQ

**Why do I get 302 redirects on `/student/dashboard`?**  
The auth cookie is invalid or expired. Re-extract it from browser DevTools
and pass the updated value via `TEST_SESSION_COOKIE`.

**Why do I see 429 errors on the student portal?**  
You are likely using Option B (email/password) at too many VUs and hitting
the Supabase Auth rate limit. Switch to Option A (pre-extracted cookie).

**Can I run both scripts simultaneously?**  
Yes. Run them in separate terminals with different `--vus` values. Use the
`-o` flag to write separate JSON summaries if you want to compare results.

**Do these tests measure database query performance?**  
Indirectly — page load times include server-side Supabase queries. For
direct query profiling use the Supabase dashboard → **Reports** → **Query
Performance**.

**How do I export results to a file?**
```bash
k6 run load-tests/public-site.js \
  -e BASE_URL=http://localhost:3000 \
  --vus 50 --duration 60s \
  --summary-export=results/public-50vus.json
```
