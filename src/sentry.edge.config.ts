import * as Sentry from '@sentry/nextjs'
import { scrubSentryEvent } from '@/lib/observability/sentry-privacy'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  tracesSampleRate: 0.02,
  beforeSend: (event) => scrubSentryEvent(event),
})
