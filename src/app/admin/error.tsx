'use client'

import { DataLoadErrorState } from '@/components/DataLoadErrorState'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset(): void }) {
  return <DataLoadErrorState reset={reset} reference={error.digest} />
}
