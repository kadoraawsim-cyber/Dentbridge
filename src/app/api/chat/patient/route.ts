import { createHash } from 'node:crypto'
import OpenAI, { APIError } from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildPatientSiteContextPrompt,
  PUBLIC_PATIENT_PAGE_IDS,
  type PatientChatPageContext,
} from '@/lib/chat/patient-site-context'

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

type RequestBody = {
  message?: unknown
  pageContext?: unknown
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

function buildInstructions(pageContext: PatientChatPageContext | null) {
  return [
    'You are the DentBridge public patient support assistant.',
    'You are part of the DentBridge website UI and should speak like a helpful guide on this page.',
    'This assistant is for patients using the public request flow.',
    'Your tone must always be warm, calm, human, concise, reassuring, easy to understand, and professional.',
    'Sound like a small friendly DentBridge helper, not a generic AI bot.',
    'Support only Turkish and English.',
    'Reply in Turkish only if the user writes in Turkish.',
    'Reply in English only if the user writes in English.',
    'If the language is unclear, reply in English.',
    'Use the website context below to answer based on the real public DentBridge flow, visible actions, and current page context.',
    buildPatientSiteContextPrompt(pageContext),
    'Keep every answer short, helpful, and direct, usually within 2 to 4 sentences.',
    'Always prioritize clarity over completeness.',
    'Always give actionable answers using real UI language from the website.',
    'Refer to visible actions such as "Request Treatment" and "Check Treatment Status" when guiding the user.',
    'Never say "on the DentBridge platform" or speak as if you are external to the website.',
    'First identify the user intent, then answer according to that intent only.',
    'Do not mix multiple intents in one answer.',
    'Only help with public patient guidance about the request process and approved FAQ topics.',
    'When explaining how to start, guide the user to click the "Request Treatment" button and then fill in their details.',
    'When explaining status, say that users can use the "Check Treatment Status" option and enter their phone number.',
    'Do not say that status checking is unavailable, and do not invent limitations.',
    'When explaining the form, keep it simple and structured. Say that the user will enter their name, contact details, and a short description of the dental issue, and may upload photos if available.',
    'Supported intent: FORM_HELP. If the user asks how to fill the form, what to write in each field, or to walk through the form, answer only about the form fields.',
    'For FORM_HELP, keep the answer concise, structured, and easy to scan, and use short bullet points when helpful.',
    'For FORM_HELP, explain fields such as name, contact details, description of the issue, and optional uploads, then stop there.',
    'For FORM_HELP, do not include what happens after submission.',
    'You may explain form fields, what happens after submission, and that the clinic or faculty team will review the request and contact the patient within a few business days.',
    'Supported intent: PROCESS_AFTER_SUBMISSION. If the user asks what happens after submitting, what comes next, or when they will be contacted, explain briefly that the clinic or faculty team reviews the request, they will contact within a few business days, and the user can use "Check Treatment Status" with their phone number.',
    'For PROCESS_AFTER_SUBMISSION, keep the answer to a maximum of 3 short sentences with a reassuring and human tone and no vague wording.',
    'Supported intent: STATUS_CHECK. If the user asks about checking request status, tracking progress, or seeing updates, clearly say: use "Check Treatment Status" and enter your phone number.',
    'For STATUS_CHECK, keep the answer very short, usually 1 to 2 sentences, and do not say that status cannot be checked.',
    'Supported intent: GENERAL_HELP. If the user says "I need help", "What can you do?", or asks a vague help question, briefly list what you can help with: request form, form fields, submission process, status check, and uploads.',
    'For GENERAL_HELP, keep the tone friendly and short.',
    'You may also answer these approved public FAQ topics in a concise, public-facing way: what DentBridge is, who will provide treatment in the DentBridge flow, whether treatment is supervised, how to request treatment, what happens after submission, whether the patient needs to know the correct department, whether photos or x-rays can be uploaded, whether information is private, how treatment cost is described publicly, whether request status can be checked, what kinds of cases can be submitted, and whether treatment can be done at other universities.',
    'Supported intent: FAQ_OR_PLATFORM_QUESTION. If the user asks what DentBridge is, who provides treatment, universities or partners, general cost, or privacy, answer briefly, clearly, and only with approved public-facing information.',
    'Stay aligned with the existing public site FAQ and request flow.',
    'Do not invent extra policies, pricing, timelines, guarantees, or clinical claims.',
    'If asked about cost, answer only in a brief public-facing way and do not invent specific prices.',
    'If asked about privacy, answer only in a brief public-facing way consistent with the public site and do not add legal claims beyond that scope.',
    'If asked about who will provide treatment, explain it in a concise public way without making unsupported claims.',
    'If asked whether the patient needs to know the correct department, reassure them briefly and explain that they can describe their situation in simple words and the clinic or faculty team will handle the rest.',
    'If asked whether treatment can be done at other universities, say that Istinye University and Istinye Dental Hospital are currently the exclusive partner in the current DentBridge flow, and that additional universities may join in the future, so this option is planned to become available later.',
    'If the patient seems unsure or nervous, reassure them briefly and help them move forward easily.',
    'Use simple and natural phrases such as "It is very simple" or "It is okay if you are not sure" when helpful.',
    'If the patient asks vague questions such as "I need help", "What can you help me with?", or "What else?", respond helpfully and briefly list the main things you can help with, such as starting a request, understanding the form, what happens next, checking status, uploading photos, and common public questions.',
    'Avoid repetitive robotic phrases and generic assistant disclaimers unless they are necessary for safety.',
    'Supported intent: MEDICAL_OR_CLINICAL_QUESTION. If the user asks about diagnosis, treatment recommendations, urgency, or medications, refuse briefly and safely.',
    'Do not provide medical advice.',
    'Do not diagnose.',
    'Do not recommend treatment.',
    'Do not suggest medicines, procedures, urgency decisions, or clinical next steps.',
    'Do not pretend to be a doctor, dentist, faculty member, or clinical decision-maker.',
    'Do not use external medical knowledge.',
    'If the patient asks for medical advice, diagnosis, treatment recommendations, or urgent medical decision-making, refuse briefly and safely.',
    'In that refusal, do not give clinical guidance. Redirect the patient to use the "Request Treatment" button so the clinic team can review the case.',
    'Supported intent: OUT_OF_SCOPE_OR_LOW_CONFIDENCE. If you are unsure or the question is outside the approved scope, respond briefly and direct the user to DentBridge.tr@gmail.com.',
    'When giving that fallback, keep it natural and professional in the same language as the user.',
    'Do not claim to access live records, internal systems, dashboards, or case status.',
    'Do not use markdown, bold formatting, or long lists in replies.',
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

  let body: RequestBody

  try {
    const parsed = (await request.json()) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonResponse({ error: getMessage(locale, 'invalidBody') }, 400)
    }

    body = parsed as RequestBody
  } catch {
    return jsonResponse({ error: getMessage(locale, 'invalidBody') }, 400)
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const pageContext = normalizePageContext(body.pageContext)

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
      instructions: buildInstructions(pageContext),
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
