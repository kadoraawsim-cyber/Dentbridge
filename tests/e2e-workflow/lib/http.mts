import { readFileSync } from 'node:fs'

import { assertNoOtpOrSmsRoute } from './safety.mts'
import type { WorkflowReporter } from './reporter.mts'

export interface SessionLike {
  cookieHeader(): string
  mergeSetCookie(headers: Headers): void
}

export interface JsonRequestInput {
  baseUrl: string
  path: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  expectedStatuses: number[]
  workflow: number | null
  step: string
  reporter: WorkflowReporter
  session?: SessionLike
}

export async function requestJson<T = unknown>(input: JsonRequestInput): Promise<T> {
  assertNoOtpOrSmsRoute(input.path)
  const url = new URL(input.path, input.baseUrl)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Origin: new URL(input.baseUrl).origin,
    Referer: new URL('/', input.baseUrl).toString(),
  }

  if (input.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const cookie = input.session?.cookieHeader()
  if (cookie) {
    headers.Cookie = cookie
  }

  const response = await fetch(url, {
    method: input.method,
    headers,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  })

  input.session?.mergeSetCookie(response.headers)
  input.reporter.observeHttp({
    workflow: input.workflow,
    step: input.step,
    method: input.method,
    path: input.path,
    status: response.status,
  })

  if (!input.expectedStatuses.includes(response.status)) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `${input.method} ${input.path} returned ${response.status}; expected ${input.expectedStatuses.join(', ')}; body=${body.slice(0, 300)}`
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function uploadJpegToSignedUrl(uploadUrl: string, imagePath: string): Promise<number> {
  const bytes = readFileSync(imagePath)
  const formData = new FormData()
  formData.append('cacheControl', '3600')
  formData.append('', new Blob([bytes], { type: 'image/jpeg' }), 'dentbridge-e2e.jpg')

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Signed upload failed with ${response.status}.`)
  }

  return response.status
}
