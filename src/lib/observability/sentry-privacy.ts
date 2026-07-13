export function scrubSentryEvent<
  T extends {
    message?: string
    request?: unknown
    user?: unknown
    breadcrumbs?: unknown
    extra?: unknown
    contexts?: unknown
    exception?: unknown
    fingerprint?: unknown
    tags?: unknown
  },
>(event: T): T {
  delete event.request
  delete event.user
  delete event.breadcrumbs
  delete event.extra
  delete event.contexts
  delete event.fingerprint
  delete event.tags

  // Error messages can contain arbitrary patient form content or provider
  // responses. Keep exception type/stack for diagnostics, but replace every
  // free-text value at the final transport boundary.
  if (typeof event.message === 'string') event.message = 'DentBridge application error'
  const exception = event.exception as { values?: Array<{ value?: string }> } | undefined
  for (const value of exception?.values ?? []) {
    if (value.value) value.value = 'DentBridge application error'
  }
  return event
}
