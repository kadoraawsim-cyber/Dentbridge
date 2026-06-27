import { createHash } from 'node:crypto'
import OpenAI, { APIError } from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildPatientSiteContextPrompt,
  PUBLIC_PATIENT_PAGE_IDS,
  type PatientChatPageContext,
} from '@/lib/chat/patient-site-context'
import {
  classifyPatientChatIntent,
  detectPatientChatResponseLocale,
  getPatientChatEmergencyResponse,
  getPatientChatIntentGuidance,
  type PatientChatIntent,
} from '@/lib/chat/patient-intent-router'

export const runtime = 'nodejs'

const OPENAI_MODEL = 'gpt-4.1-mini'
const MAX_MESSAGE_LENGTH = 2000
const MAX_HISTORY_MESSAGES = 5
const MAX_HISTORY_MESSAGE_LENGTH = 800
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

type RequestBody = {
  message?: unknown
  messages?: unknown
  locale?: unknown
  pageContext?: unknown
}

type ChatHistoryMessage = {
  role: 'assistant' | 'user'
  content: string
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

function getHeaderLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get('accept-language') || ''
  return acceptLanguage.toLowerCase().includes('tr') ? 'tr' : 'en'
}

function normalizeLocale(value: unknown): Locale | null {
  return value === 'en' || value === 'tr' ? value : null
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

function normalizePageContext(value: unknown): PatientChatPageContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const page = 'page' in value ? value.page : null
  if (typeof page !== 'string' || !PUBLIC_PATIENT_PAGE_IDS.includes(page as (typeof PUBLIC_PATIENT_PAGE_IDS)[number])) {
    return null
  }

  const rawVisibleActions = 'visibleActions' in value ? value.visibleActions : []
  const visibleActions = Array.isArray(rawVisibleActions)
    ? rawVisibleActions
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && item.length <= 80)
        .slice(0, 4)
    : []

  return {
    page: page as PatientChatPageContext['page'],
    visibleActions,
  }
}

function normalizeHistoryMessages(value: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => {
      return Boolean(item) && typeof item === 'object' && !Array.isArray(item)
    })
    .map((item) => {
      const role = item.role === 'assistant' || item.role === 'user' ? item.role : null
      const content = typeof item.content === 'string' ? item.content.trim() : ''

      if (!role || !content || content.length > MAX_HISTORY_MESSAGE_LENGTH) {
        return null
      }

      return { role, content }
    })
    .filter((item): item is ChatHistoryMessage => Boolean(item))
    .slice(-MAX_HISTORY_MESSAGES)
}

function buildChatInput(message: string, historyMessages: ChatHistoryMessage[]) {
  if (historyMessages.length === 0) {
    return message
  }

  const history = historyMessages
    .map((item) => `${item.role === 'user' ? 'User' : 'Bridgey'}: ${item.content}`)
    .join('\n')

  return [
    'Recent short-term conversation context from this browser session only:',
    history,
    'Current user message:',
    message,
  ].join('\n')
}

function buildInstructions(
  pageContext: PatientChatPageContext | null,
  pageLocale: Locale,
  detectedIntent: PatientChatIntent
) {
  return [
    'You are the DentBridge public patient support assistant.',
    'You are part of the DentBridge website UI and should speak like a helpful guide on this page.',
    'This assistant is for patients using the public request flow.',
    'Your tone must always be warm, calm, human, concise, reassuring, easy to understand, and professional.',
    'Sound like a small helpful DentBridge guide, not a generic AI bot and not a legal document.',
    'Support only Turkish and English.',
    `The current page locale is ${pageLocale}.`,
    'If the user writes Turkish, reply in Turkish.',
    'If the user writes English, reply in English.',
    'If the user message is ambiguous, reply using the current page locale.',
    'Do not mix English and Turkish unless the user asks for translation or uses both languages.',
    'Use the website context below to answer based on the real public DentBridge flow, visible actions, and current page context.',
    buildPatientSiteContextPrompt(pageContext),
    `Detected intent: ${detectedIntent}. This label was set by a deterministic safety router before generation. Treat it as strict routing context.`,
    `Detected intent behavior guidance: ${getPatientChatIntentGuidance(detectedIntent)}`,
    'Keep every answer short, helpful, and direct, usually within 2 to 4 sentences.',
    'Always prioritize clarity over completeness.',
    'Answer directly first, then suggest a relevant public route such as /patient/request, /patient/status, /faq, /privacy, /terms, or /personal-data-protection-law when useful.',
    'Do not present route suggestions as buttons.',
    'Use careful wording: may be reviewed, may be coordinated, if suitable, under faculty supervision, and does not guarantee.',
    'Answer according to the detected intent only.',
    'Do not mix multiple intents in one answer.',
    'Only help with public DentBridge patient guidance, current FAQ topics, public route suggestions, and high-level public student workspace information.',
    'Do not claim you can check live request status yourself.',
    'Stay aligned with the existing public site FAQ and request flow.',
    'Do not invent extra policies, pricing, timelines, guarantees, or clinical claims.',
    'Never say within a few business days or invent a fixed response time.',
    'If the patient seems unsure or nervous, reassure them briefly and help them move forward easily.',
    'Use simple and natural phrases such as "It is very simple" or "It is okay if you are not sure" when helpful.',
    'Avoid repetitive robotic phrases and generic assistant disclaimers unless they are necessary for safety.',
    'Do not provide medical advice.',
    'Do not diagnose.',
    'Do not recommend treatment.',
    'Do not suggest medicines, procedures, urgency decisions, or clinical next steps.',
    'Do not pretend to be a doctor, dentist, faculty member, or clinical decision-maker.',
    'Do not use external medical knowledge.',
    'Do not claim to access live records, internal systems, dashboards, request records, Supabase data, or case status.',
    'Do not claim DentBridge is a clinic, hospital, certified, officially approved, KVKK compliant, GDPR compliant, HIPAA compliant, or fully secure.',
    'Use the recent short-term conversation context only to understand immediate follow-up references. Do not treat it as stored memory.',
    'Do not use markdown, bold formatting, or long lists in replies.',
    'Keep every answer concise and UI-friendly.',
  ].join(' ')
}

function finalizeReply(reply: string, detectedIntent: PatientChatIntent, responseLocale: Locale) {
  if (
    detectedIntent !== 'privacy_or_data_access' ||
    (reply.includes('/privacy') && reply.includes('/personal-data-protection-law'))
  ) {
    return reply
  }

  const routeSentence =
    responseLocale === 'tr'
      ? 'Ayrıntılar için /privacy ve /personal-data-protection-law sayfalarına bakabilirsiniz.'
      : 'For details, see /privacy and /personal-data-protection-law.'

  return `${reply} ${routeSentence}`
}

function createSafetyIdentifier(request: NextRequest) {
  return createHash('sha256').update(getRateLimitIdentifier(request)).digest('hex')
}

export async function POST(request: NextRequest) {
  const headerLocale = getHeaderLocale(request)

  if (!isAllowedBrowserOrigin(request)) {
    return jsonResponse({ error: getMessage(headerLocale, 'invalidOrigin') }, 403)
  }

  const rateLimit = takeRateLimit(getRateLimitIdentifier(request))
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: getMessage(headerLocale, 'rateLimited') },
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
    return jsonResponse({ error: getMessage(headerLocale, 'invalidContentType') }, 415)
  }

  let body: RequestBody

  try {
    const parsed = (await request.json()) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonResponse({ error: getMessage(headerLocale, 'invalidBody') }, 400)
    }

    body = parsed as RequestBody
  } catch {
    return jsonResponse({ error: getMessage(headerLocale, 'invalidBody') }, 400)
  }

  const pageLocale = normalizeLocale(body.locale) ?? headerLocale
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const historyMessages = normalizeHistoryMessages(body.messages)
  const pageContext = normalizePageContext(body.pageContext)

  if (!message) {
    return jsonResponse({ error: getMessage(pageLocale, 'messageRequired') }, 400)
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse({ error: getMessage(pageLocale, 'messageTooLong') }, 400)
  }

  const responseLocale = detectPatientChatResponseLocale(message, pageLocale)
  const detectedIntent = classifyPatientChatIntent(message)

  if (detectedIntent === 'emergency') {
    return jsonResponse({ reply: getPatientChatEmergencyResponse(responseLocale) })
  }

  const openai = getOpenAIClient()
  if (!openai) {
    return jsonResponse({ error: getMessage(pageLocale, 'serviceUnavailable') }, 503)
  }

  try {
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      instructions: buildInstructions(pageContext, pageLocale, detectedIntent),
      input: buildChatInput(message, historyMessages),
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
      return jsonResponse({ error: getMessage(pageLocale, 'generationFailed') }, 502)
    }

    return jsonResponse({ reply: finalizeReply(reply, detectedIntent, responseLocale) })
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Patient chat OpenAI API error', {
        status: error.status,
        message: error.message,
      })

      const status = error.status === 429 ? 429 : error.status && error.status < 500 ? 502 : 503
      const messageKey = error.status === 429 ? 'rateLimited' : 'generationFailed'

      return jsonResponse({ error: getMessage(pageLocale, messageKey) }, status)
    }

    console.error('Patient chat unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return jsonResponse({ error: getMessage(pageLocale, 'serviceUnavailable') }, 500)
  }
}
