/**
 * Generic public API error mapper for patient-facing endpoints.
 *
 * Patient-facing endpoints (OTP request/verify, patient status, patient request)
 * must never leak internal error details, database messages, or the reason a
 * lookup failed. Every failure is mapped to one of a small set of stable, safe,
 * bilingual public messages. Callers log the real error server-side and return
 * only the public error body produced here.
 *
 * This module is framework-light: it returns plain data (status + body) so route
 * handlers wrap it in their own response (NextResponse, etc.).
 */

export type ApiLocale = 'en' | 'tr'

/**
 * Stable, public-safe error codes. These are intentionally coarse. In
 * particular, `verification_failed` is generic so that "wrong code", "expired
 * code", and "no matching request" cannot be distinguished by a caller; this
 * avoids turning the endpoint into an enumeration/oracle.
 */
export type PublicErrorCode =
  | 'invalid_request'
  | 'rate_limited'
  | 'conflict'
  | 'unsupported_image'
  | 'image_too_large'
  | 'image_unreadable'
  | 'image_processing_failed'
  | 'verification_failed'
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
  conflict: {
    status: 409,
    messages: {
      en: 'This request conflicts with a completed or in-progress operation. Please refresh and try again.',
      tr: 'Bu istek tamamlanmış veya devam eden bir işlemle çakışıyor. Lütfen sayfayı yenileyip tekrar deneyin.',
    },
  },
  unsupported_image: {
    status: 400,
    messages: {
      en: 'This file needs a separate clinical upload workflow. Please upload a photo or screenshot of the image.',
      tr: 'Bu dosya ayrı bir klinik yükleme süreci gerektirir. Lütfen görüntünün fotoğrafını veya ekran görüntüsünü yükleyin.',
    },
  },
  image_too_large: {
    status: 400,
    messages: {
      en: 'This image is too large to prepare. Please choose a smaller photo or upload a screenshot.',
      tr: 'Bu görüntü hazırlanamayacak kadar büyük. Lütfen daha küçük bir fotoğraf seçin veya ekran görüntüsü yükleyin.',
    },
  },
  image_unreadable: {
    status: 400,
    messages: {
      en: 'We could not read this image. Please take a screenshot of it and upload the screenshot.',
      tr: 'Bu görüntüyü okuyamadık. Lütfen ekran görüntüsü alıp onu yükleyin.',
    },
  },
  image_processing_failed: {
    status: 400,
    messages: {
      en: 'We could not prepare this image for faculty view. Please try again or choose another photo.',
      tr: 'Bu görüntüyü fakülte görünümü için hazırlayamadık. Lütfen tekrar deneyin veya başka bir fotoğraf seçin.',
    },
  },
  verification_failed: {
    status: 400,
    messages: {
      en: 'We could not verify the information provided. Please try again.',
      tr: 'Verilen bilgiler doğrulanamadı. Lütfen tekrar deneyin.',
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

/** Coerce arbitrary input into a supported locale, defaulting to English. */
export function normalizeApiLocale(value: unknown): ApiLocale {
  return value === 'tr' ? 'tr' : 'en'
}

/** Resolve a public error code + status + localized generic message. */
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

/** Build the JSON body to return to the client for a public error. */
export function toPublicErrorBody(
  code: PublicErrorCode,
  locale: ApiLocale = 'en'
): PublicApiErrorBody {
  return { error: getPublicApiError(code, locale).message, code }
}
