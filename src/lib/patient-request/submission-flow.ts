export interface PatientSubmissionGuard {
  current: boolean
}

export interface PatientAttachmentLike {
  name: string
  type: string
  size: number
}

interface SubmissionResponse {
  ok: boolean
  json(): Promise<unknown>
}

interface PreparedUpload {
  success: true
  fileId: string
  objectPath: string
  token: string
  ticket: string
}

export interface PatientSubmissionDependencies<TAttachment extends PatientAttachmentLike> {
  fetcher(input: string, init: RequestInit): Promise<SubmissionResponse>
  upload(input: {
    attachment: TAttachment
    objectPath: string
    token: string
  }): Promise<{ error: unknown | null }>
}

export interface RunPatientSubmissionInput<TAttachment extends PatientAttachmentLike> {
  attachment: TAttachment | null
  dependencies: PatientSubmissionDependencies<TAttachment>
  guard: PatientSubmissionGuard
  locale: string
  onFailure(): void
  onSubmitting(value: boolean): void
  onSuccess(): void
  requestPayload: Record<string, unknown>
}

export type PatientSubmissionResult = 'submitted' | 'failed' | 'in_flight'

function isPreparedUpload(value: unknown): value is PreparedUpload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prepared = value as Partial<PreparedUpload>
  return (
    prepared.success === true &&
    typeof prepared.fileId === 'string' &&
    Boolean(prepared.fileId) &&
    typeof prepared.objectPath === 'string' &&
    Boolean(prepared.objectPath) &&
    typeof prepared.token === 'string' &&
    Boolean(prepared.token) &&
    typeof prepared.ticket === 'string' &&
    Boolean(prepared.ticket)
  )
}

export async function runPatientSubmission<TAttachment extends PatientAttachmentLike>(
  input: RunPatientSubmissionInput<TAttachment>
): Promise<PatientSubmissionResult> {
  if (input.guard.current) {
    return 'in_flight'
  }

  input.guard.current = true
  input.onSubmitting(true)

  try {
    let fileId: string | null = null
    let fileTicket: string | null = null

    if (input.attachment) {
      const prepareResponse = await input.dependencies.fetcher(
        '/api/v1/files/prepare-upload',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: input.attachment.name,
            mimeType: input.attachment.type,
            sizeBytes: input.attachment.size,
            locale: input.locale,
          }),
        }
      )

      if (!prepareResponse.ok) {
        throw new Error('prepare_failed')
      }

      const preparedValue = await prepareResponse.json()
      if (!isPreparedUpload(preparedValue)) {
        throw new Error('prepare_failed')
      }

      const uploadResult = await input.dependencies.upload({
        attachment: input.attachment,
        objectPath: preparedValue.objectPath,
        token: preparedValue.token,
      })
      if (uploadResult.error) {
        throw new Error('upload_failed')
      }

      const confirmResponse = await input.dependencies.fetcher(
        `/api/v1/files/${preparedValue.fileId}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticket: preparedValue.ticket,
            locale: input.locale,
          }),
        }
      )
      if (!confirmResponse.ok) {
        throw new Error('confirm_failed')
      }

      fileId = preparedValue.fileId
      fileTicket = preparedValue.ticket
    }

    const response = await input.dependencies.fetcher('/api/v1/patient/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input.requestPayload,
        fileId,
        fileTicket,
        locale: input.locale,
      }),
    })
    if (!response.ok) {
      throw new Error('request_failed')
    }

    input.onSuccess()
    return 'submitted'
  } catch {
    input.onFailure()
    return 'failed'
  } finally {
    input.guard.current = false
    input.onSubmitting(false)
  }
}
