import 'server-only'

import * as Sentry from '@sentry/nextjs'
import { setErrorMonitorProvider } from './error-monitor'

export function registerSentryErrorMonitorProvider(): void {
  setErrorMonitorProvider({
    captureException(error, context) {
      Sentry.withScope((scope) => {
        scope.setContext('dentbridge', context as Record<string, unknown>)
        Sentry.captureException(error)
      })
    },
    captureMessage(message, context) {
      Sentry.withScope((scope) => {
        scope.setContext('dentbridge', context as Record<string, unknown>)
        Sentry.captureMessage(message)
      })
    },
  })
}
