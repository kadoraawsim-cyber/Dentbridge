/**
 * Generic public API error mapper for patient-facing endpoints.
 *
 * These messages intentionally avoid exposing validation internals, database
 * errors, or operational details to public clients.
 */

export type ApiLocale = 'en' | 'tr'

export type PublicErrorCode =
  | 'invalid_request'
  | 'rate_limited'
  | 'service_unavailable'
  | 'server_error'

export interface PublicApiError {
  code: PublicErrorCode
  status: number
  message: string
}

export interface PublicApiErrorBody {
  error: string
  code: PublicErrorCode
}

const ERROR_DEFINITIONS: Record<
  PublicErrorCode,
  { status: number; messages: Record<ApiLocale, string> }
> = {
  invalid_request: {
    status: 400,
    messages: {
      en: 'The request is invalid. Please check your details and try again.',
      tr: 'İstek geçersiz. Lütfen bilgilerinizi kontrol edip tekrar deneyin.',
    },
  },
  rate_limited: {
    status: 429,
    messages: {
      en: 'Too many requests. Please wait a moment and try again.',
      tr: 'Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.',
    },
  },
  service_unavailable: {
    status: 503,
    messages: {
      en: 'This service is temporarily unavailable. Please try again later.',
      tr: 'Bu hizmet şu anda geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    },
  },
  server_error: {
    status: 500,
    messages: {
      en: 'Something went wrong. Please try again.',
      tr: 'Bir şeyler ters gitti. Lütfen tekrar deneyin.',
    },
  },
}

export function getPublicApiError(
  code: PublicErrorCode,
  locale: ApiLocale = 'en'
): PublicApiError {
  const definition = ERROR_DEFINITIONS[code]
  return {
    code,
    status: definition.status,
    message: definition.messages[locale],
  }
}

export function toPublicErrorBody(
  code: PublicErrorCode,
  locale: ApiLocale = 'en'
): PublicApiErrorBody {
  return { error: getPublicApiError(code, locale).message, code }
}
