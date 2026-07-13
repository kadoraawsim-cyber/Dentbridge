# Observability

Status: IMPLEMENTED / PHASE 11.

DentBridge operational observability is intentionally separate from audit
logging.

- **Audit logs** are accountability records for security, consent, privacy, and
  workflow decisions. They live in `audit_logs`.
- **Operational logs** are short-lived debugging signals for request flow,
  errors, uptime, and production support. They must never become a clinical
  detail store.

## Structured Logging

Server-side operational logs go through:

- `src/lib/observability/logger.ts`
- `src/lib/observability/request-context.ts`

Logs are JSON-compatible and use stable event names:

- `api.request.start`
- `api.request.end`
- route-specific operational events such as
  `patient_request.cleanup_failed`

Common fields include:

- `request_id`
- `correlation_id`
- `route`
- `method`
- `path`
- `actor_role`
- `actor_type`
- `status_code`
- `duration_ms`
- sanitized `metadata`

`LOG_LEVEL` may be set to `debug`, `info`, `warn`, `error`, or `silent`.

## Never Log

Do not log:

- OTP codes or OTP hashes
- passwords
- bearer tokens, upload tickets, signed URLs, API keys, or service-role keys
- authorization or cookie headers
- full phone numbers
- patient full names
- complaint text
- medical condition details
- clinical notes or progress-note text
- attachment paths, object paths, original filenames, or display filenames
- raw request/response payloads from patient or clinical workflows

The logger automatically redacts known sensitive keys and phone-like values, but
callers must still pass only curated low-risk metadata.

## Request And Correlation IDs

`request-context.ts` reuses the existing audit request ID behavior:

- `x-request-id` is honored when present, otherwise a UUID is generated.
- `x-correlation-id` is honored when present, otherwise it falls back to the
  request ID.

Operational logs and audit records can therefore be correlated without mixing
the two storage models.

Client IPs are bucketed for operational logs rather than written as full IP
addresses. Audit records may retain full request IP where required for
accountability.

## Error Monitoring Seam

`src/lib/observability/error-monitor.ts` provides:

- `captureException(error, context)`
- `captureMessage(message, context)`
- `setErrorMonitorProvider(provider)`

The default provider is no-op. Future Sentry or monitoring integration should be
implemented by setting a provider here, after confirming that provider-side
scrubbing and retention meet clinical/privacy requirements.

Do not send full payloads, headers, cookies, Supabase objects, request bodies, or
patient data to external monitoring.

## Health Endpoint

`GET /api/health` returns a shallow app readiness response:

```json
{
  "status": "ok",
  "timestamp": "2026-07-09T00:00:00.000Z",
  "environment": "production",
  "version": { "commit": "abc123def456" },
  "readiness": { "app": "ok" }
}
```

It does not expose secrets, Supabase keys, database URLs, table names, error
stacks, or patient/workflow data. Database connectivity checks are intentionally
deferred until there is an agreed safe degraded-health contract.

## Production Debugging

When reviewing logs:

1. Start with `correlation_id` or `request_id`.
2. Confirm the route, status code, duration, and safe error code.
3. Use audit records only when accountability context is needed.
4. Never paste log excerpts containing patient details, full phone numbers,
   tokens, secrets, filenames, or clinical text into tickets or chats.
5. If a log contains unexpected sensitive data, treat it as a privacy incident:
   stop broad sharing, capture the minimum evidence, rotate affected secrets if
   applicable, and fix the log source.

## Deferred Work

- External Sentry/monitoring provider integration.
- Uptime provider configuration outside the repo.
- Safe, shallow Supabase degraded-health check.
- Log shipping, retention policy, alert routing, and dashboards.
- Durable cross-instance rate limiting metrics.
