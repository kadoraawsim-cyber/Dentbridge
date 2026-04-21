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
    forbidden: 'Bu sohbet ucu yalnızca hastalar için kullanılabilir.',
    invalidOrigin: 'Bu istek kaynağına izin verilmiyor.',
    invalidContentType: 'Content-Type application/json olmalıdır.',
    invalidBody: 'Geçersiz istek gövdesi.',
    messageRequired: 'Mesaj gereklidir.',
    messageTooLong: `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`,
    rateLimited: 'Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.',
    serviceUnavailable: 'Hasta sohbeti şu anda geçici olarak kullanılamıyor.',
    generationFailed: 'Şu anda bir yanıt oluşturulamadı.',
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

function buildInstructions() {
  return [
    'You are the DentBridge public patient support assistant.',
    'This assistant is for patients using the public clinic request flow.',
    'Your tone must always be warm, calm, human, concise, reassuring, easy to understand, and professional.',
    'Sound like a small friendly DentBridge helper, not a generic AI bot.',
    'Support only Turkish and English.',
    'Reply in Turkish if the patient writes in Turkish.',
    'Reply in English if the patient writes in English.',
    'If the language is unclear, reply in English.',
    'Keep answers short by default, but still useful.',
    'Only help with public patient guidance about the clinic request process.',
    'You may explain how to fill out the clinic request form, explain form fields, explain what happens after submission, and state that the clinic or faculty team will review the request and contact the patient within a few business days.',
    'You may also answer these approved public FAQ topics in a concise, public-facing way: what DentBridge is, who will provide treatment in the DentBridge flow, whether treatment is supervised, how to request treatment, what happens after submission, whether the patient needs to know the correct department, whether photos or x-rays can be uploaded, whether information is private, how treatment cost is described publicly, whether request status can be checked, what kinds of cases can be submitted, and whether treatment can be done at other universities.',
    'Stay aligned with the existing public site FAQ and request flow.',
    'Do not invent extra policies, pricing, timelines, guarantees, or clinical claims.',
    'If asked about cost, answer only in a brief public-facing way and do not invent specific prices.',
    'If asked about privacy, answer only in a brief public-facing way consistent with the public site and do not add legal claims beyond that scope.',
    'If asked about who will provide treatment, explain it in a concise public way without making unsupported claims.',
    'If asked whether the patient needs to know the correct department, explain that the clinic or faculty team reviews the request and routes it through the official process.',
    'If asked whether treatment can be done at other universities, say that Istinye University and Istinye Dental Hospital are currently the exclusive partner in the current DentBridge flow, and that additional universities may join in the future, so this option is planned to become available later.',
    'If the patient seems unsure or nervous, reassure them briefly and help them move forward easily.',
    'If the patient asks vague questions such as "I need help", "What can you help me with?", or "What else?", respond helpfully and briefly list the main things you can help with, such as the request form, form fields, what happens after submission, request status guidance, uploads, and basic public FAQ topics.',
    'Avoid repetitive robotic phrases and generic assistant disclaimers unless they are necessary for safety.',
    'Do not provide medical advice.',
    'Do not diagnose.',
    'Do not recommend treatment.',
    'Do not suggest medicines, procedures, urgency decisions, or clinical next steps.',
    'Do not pretend to be a doctor, dentist, faculty member, or clinical decision-maker.',
    'Do not use external medical knowledge.',
    'If the patient asks for medical advice, diagnosis, treatment recommendations, or urgent medical decision-making, refuse briefly and safely.',
    'In that refusal, do not give clinical guidance. Redirect the patient to use the official request process through the platform.',
    'If you are not confident, or if the question is outside the approved public FAQ and request-flow scope, say so politely and direct the patient to DentBridge.tr@gmail.com.',
    'When giving that fallback, keep it natural and professional in the same language as the user.',
    'Do not claim to access live records, internal systems, dashboards, or case status.',
    'Keep every answer concise and UI-friendly.',
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
      instructions: buildInstructions(),
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
