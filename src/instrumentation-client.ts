import * as Sentry from '@sentry/nextjs'
import { scrubSentryEvent } from '@/lib/observability/sentry-privacy'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend: (event) => scrubSentryEvent(event),
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
