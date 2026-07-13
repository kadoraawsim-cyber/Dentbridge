import 'server-only'

import { captureException } from '@/lib/observability/error-monitor'

export class DataLoadError extends Error {
  constructor(area: string) {
    super(`Unable to load ${area}.`)
    this.name = 'DataLoadError'
  }
}

export function failDataLoad(area: string): never {
  void captureException(new DataLoadError(area), {
    actorType: 'service',
    route: area,
    metadata: { error_code: 'data_load_failed' },
  })
  throw new DataLoadError(area)
}

export function assertQuerySucceeded(error: unknown, area: string): void {
  if (error) failDataLoad(area)
}
