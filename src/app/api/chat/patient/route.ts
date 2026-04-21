import { createHash } from 'node:crypto'
import OpenAI, { APIError } from 'openai'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const OPENAI_MODEL = 'gpt-4.1-mini'
const MAX_MESSAGE_LENGTH = 2000
const MAX_OUTPUT_TOKENS = 400
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 8

type Locale = 'en' | 'tr'

type RouteMessageKey =
  | 'forbidden'
  | 'invalidOrigin'
  | 'invalidContentType'
  | 'invalidBody'
  | 'messageRequired'
  | 'messageTooLong'
  | 'rateLimited'
  | 'serviceUnavailable'
  | 'generationFailed'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const ROUTE_MESSAGES: Record<Locale, Record<RouteMessageKey, string>> = {
  en: {
    forbidden: 'This chat endpoint is available for patients only.',
    invalidOrigin: 'This request origin is not allowed.',
    invalidContentType: 'Content-Type must be application/json.',
    invalidBody: 'Invalid request body.',
    messageRequired: 'Message is required.',
    messageTooLong: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    rateLimited: 'Too many requests. Please wait a moment and try again.',
    serviceUnavailable: 'Patient chat is temporarily unavailable.',
    generationFailed: 'Unable to generate a reply right now.',
  },
  tr: {
    forbidden: 'Bu sohbet ucu yalnizca hastalar icin kullanilabilir.',
    invalidOrigin: 'Bu istek kaynagina izin verilmiyor.',
    invalidContentType: 'Content-Type application/json olmalidir.',
    invalidBody: 'Gecersiz istek govdesi.',
    messageRequired: 'Mesaj gereklidir.',
    messageTooLong: `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`,
    rateLimited: 'Cok fazla istek gonderildi. Lutfen kisa bir sure sonra tekrar deneyin.',
    serviceUnavailable: 'Hasta sohbeti su anda gecici olarak kullanilamiyor.',
    generationFailed: 'Su anda bir yanit olusturulamadi.',
  },
}

const globalForPatientChatRateLimit = globalThis as typeof globalThis & {
  __patientChatRateLimitStore?: Map<string, RateLimitEntry>
}

const patientChatRateLimitStore =
  globalForPatientChatRateLimit.__patientChatRateLimitStore ??
  new Map<string, RateLimitEntry>()

if (!globalForPatientChatRateLimit.__patientChatRateLimitStore) {
  globalForPatientChatRateLimit.__patientChatRateLimitStore = patientChatRateLimitStore
}

let openaiClient: OpenAI | null = null

function getLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get('accept-language') || ''
  return acceptLanguage.toLowerCase().includes('tr') ? 'tr' : 'en'
}

function getMessage(locale: Locale, key: RouteMessageKey) {
  return ROUTE_MESSAGES[locale][key]
}

function jsonResponse(body: { reply: string } | { error: string }, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function isJsonRequest(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  return contentType.split(';')[0]?.trim().toLowerCase() === 'application/json'
}

function isAllowedBrowserOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) {
    return true
  }

  return origin === request.nextUrl.origin
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function getRateLimitIdentifier(request: NextRequest) {
  return `patient-chat:${getClientIp(request)}`
}

function pruneExpiredRateLimits(now: number) {
  for (const [key, value] of patientChatRateLimitStore.entries()) {
    if (value.resetAt <= now) {
      patientChatRateLimitStore.delete(key)
    }
  }
}

function takeRateLimit(identifier: string) {
  const now = Date.now()

  if (patientChatRateLimitStore.size > 5000 || Math.random() < 0.01) {
    pruneExpiredRateLimits(now)
  }

  const existing = patientChatRateLimitStore.get(identifier)

  if (!existing || existing.resetAt <= now) {
    const nextEntry = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    }

    patientChatRateLimitStore.set(identifier, nextEntry)

    return {
      allowed: true,
      resetAt: nextEntry.resetAt,
    }
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      resetAt: existing.resetAt,
    }
  }

  existing.count += 1
  patientChatRateLimitStore.set(identifier, existing)

  return {
    allowed: true,
    resetAt: existing.resetAt,
  }
}

function getOpenAIClient() {
  if (openaiClient) {
    return openaiClient
  }

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return null
  }

  openaiClient = new OpenAI({ apiKey })
  return openaiClient
}

function buildInstructions(locale: Locale) {
  const preferredLanguage = locale === 'tr' ? 'Turkish' : 'English'

  return [
    'You are the DentBridge patient support assistant for a university dental care platform.',
    'This route is for patients only.',
    `Reply in ${preferredLanguage} unless the patient clearly writes in the other supported language.`,
    'Support only English and Turkish.',
    'Be concise, calm, and practical.',
    'Help with patient-facing topics such as general dental guidance, treatment-request preparation, and how the DentBridge process works.',
    'Do not claim to access live records, request status, hidden dashboards, or internal systems.',
    'Do not provide definitive diagnosis, prescriptions, or treatment plans.',
    'If symptoms suggest an emergency such as severe swelling, uncontrolled bleeding, difficulty breathing, high fever, or major trauma, advise urgent in-person care or local emergency services immediately.',
    'If the patient asks for student, faculty, admin, or internal workflow support, explain that this chat is only for patients.',
  ].join(' ')
}

function createSafetyIdentifier(request: NextRequest) {
  return createHash('sha256').update(getRateLimitIdentifier(request)).digest('hex')
}

export async function POST(request: NextRequest) {
  const locale = getLocale(request)

  if (!isAllowedBrowserOrigin(request)) {
    return jsonResponse({ error: getMessage(locale, 'invalidOrigin') }, 403)
  }

  const rateLimit = takeRateLimit(getRateLimitIdentifier(request))
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: getMessage(locale, 'rateLimited') },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
          'X-Content-Type-Options': 'nosniff',
        },
      }
    )
  }

  if (!isJsonRequest(request)) {
    return jsonResponse({ error: getMessage(locale, 'invalidContentType') }, 415)
  }

  let body: { message?: unknown }

  try {
    const parsed = (await request.json()) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonResponse({ error: getMessage(locale, 'invalidBody') }, 400)
    }

    body = parsed as { message?: unknown }
  } catch {
    return jsonResponse({ error: getMessage(locale, 'invalidBody') }, 400)
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!message) {
    return jsonResponse({ error: getMessage(locale, 'messageRequired') }, 400)
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse({ error: getMessage(locale, 'messageTooLong') }, 400)
  }

  const openai = getOpenAIClient()
  if (!openai) {
    return jsonResponse({ error: getMessage(locale, 'serviceUnavailable') }, 503)
  }

  try {
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      instructions: buildInstructions(locale),
      input: message,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
      safety_identifier: createSafetyIdentifier(request),
      text: {
        format: {
          type: 'text',
        },
      },
    })

    const reply = response.output_text?.trim()

    if (!reply) {
      console.error('Patient chat returned an empty response', {
        responseId: response.id,
      })
      return jsonResponse({ error: getMessage(locale, 'generationFailed') }, 502)
    }

    return jsonResponse({ reply })
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Patient chat OpenAI API error', {
        status: error.status,
        message: error.message,
      })

      const status = error.status === 429 ? 429 : error.status && error.status < 500 ? 502 : 503
      const messageKey = error.status === 429 ? 'rateLimited' : 'generationFailed'

      return jsonResponse({ error: getMessage(locale, messageKey) }, status)
    }

    console.error('Patient chat unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return jsonResponse({ error: getMessage(locale, 'serviceUnavailable') }, 500)
  }
}
