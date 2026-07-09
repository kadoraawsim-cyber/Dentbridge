# Testing & CI

Status: IMPLEMENTED / PHASE 10.

DentBridge uses Vitest for focused unit and route-handler tests. The Phase 10
suite intentionally favors a small number of high-value tests over broad,
superficial coverage.

## Commands

```bash
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
```

`npm test` runs the committed Vitest suite once. `npm run test:watch` is
available for local development.

## Current Test Focus

- Case lifecycle transitions and actor gates.
- Patient file upload allowlists, magic-byte checks, object paths, and upload
  ticket binding.
- OTP generation, hashing, verification, and expiry primitives.
- Public API error mapping.
- Patient request route validation and the submitted-request happy path with
  mocked Supabase writes.
- Student progress service authorization, lifecycle guard, and generic server
  error behavior.
- Observability redaction, request context generation, error-monitor no-op
  behavior, and the health endpoint response shape.

These tests do not connect to Supabase. Route/service tests mock the service-role
boundary and assert the behavior DentBridge owns.

## CI

GitHub Actions runs:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build`

The workflow provides placeholder environment variables needed for build-time
configuration only. It does not require production secrets or a live database.
