// @ts-check
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

function parseDotenv(contents) {
  const parsed = {}
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index <= 0) continue
    const key = line.slice(0, index).trim()
    let value = line.slice(index + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    parsed[key] = value
  }
  return parsed
}

function loadEnv() {
  const root = existsSync('.env.local') ? parseDotenv(readFileSync('.env.local', 'utf8')) : {}
  const localPath = 'tests/e2e-workflow/.env.local'
  const local = existsSync(localPath) ? parseDotenv(readFileSync(localPath, 'utf8')) : {}
  return { ...root, ...local, ...process.env }
}

function assertSafeTarget(rawUrl, allowProduction) {
  const url = new URL(rawUrl)
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
  if (!local && !allowProduction) {
    throw new Error(`Refusing non-local browser E2E target ${url.origin}.`)
  }
  if (!local && url.protocol !== 'https:') {
    throw new Error('Non-local browser E2E targets must use HTTPS.')
  }
}

function requireEnv(env, key) {
  const value = env[key]?.trim()
  if (!value) throw new Error(`${key} is required.`)
  return value
}

function validateRunId(runId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{5,79}$/.test(runId)) {
    throw new Error('RUN_ID must be 6-80 characters using only letters, numbers, and hyphens.')
  }
  return runId
}

function runMarkerFor(runId) {
  return `RUN_ID=[${validateRunId(runId)}]`
}

async function login(page, portal, email, password) {
  await page.goto(portal === 'faculty' ? '/admin/login' : '/student/login')
  await page.getByPlaceholder(portal === 'faculty' ? 'admin@university.edu' : 'student@university.edu').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(portal === 'faculty' ? /\/admin/ : /\/student\/dashboard/)
}

async function patchJson(page, path, body, expectedStatus = 200) {
  const response = await page.request.patch(path, {
    data: body,
    headers: { 'Content-Type': 'application/json' },
  })
  expect(response.status(), `${path} status`).toBe(expectedStatus)
  return response.json()
}

test('single patient-to-completion workflow', async ({ browser, page }) => {
  const env = loadEnv()
  const baseUrl = env.E2E_BASE_URL || 'http://localhost:3000'
  assertSafeTarget(baseUrl, env.ALLOW_PRODUCTION_E2E === 'true')

  const runId = validateRunId(env.E2E_RUN_ID || `browser-${Date.now()}`)
  const runMarker = runMarkerFor(runId)
  const patientName = `Dentbridge Browser ${runId.replace(/[^a-zA-Z]/g, '').slice(0, 10) || 'Case'}`
  const phone = `555${String(Date.now()).slice(-7)}`
  const imagePath = resolve('public/isu 2026 logo.jpg')
  const facultyEmail = requireEnv(env, 'E2E_FACULTY_A_EMAIL')
  const facultyPassword = requireEnv(env, 'E2E_FACULTY_A_PASSWORD')
  const studentEmail = requireEnv(env, 'E2E_STUDENT_A_EMAIL')
  const studentPassword = requireEnv(env, 'E2E_STUDENT_A_PASSWORD')
  const serviceRoleKey =
    env.E2E_VERIFICATION_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) throw new Error('Service-role key is required for browser test ID lookup.')

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let submittedPayload = null
  page.on('request', (request) => {
    if (request.url().endsWith('/api/v1/patient/requests') && request.method() === 'POST') {
      submittedPayload = request.postDataJSON()
    }
  })

  await page.goto('/patient/request')
  await page.getByPlaceholder('Enter your full name').fill(patientName)
  await page.getByPlaceholder('Enter phone number').fill(phone)
  await page.getByPlaceholder('Your age').fill('34')
  await page.locator('select').nth(1).selectOption('İstinye Dental Hospital')
  await page.locator('select').nth(2).selectOption('Female')
  await page.getByRole('button', { name: 'Dental Cleaning' }).click()
  await page.getByPlaceholder('Describe your symptoms, pain, or dental needs in detail…').fill(
    `Browser workflow submission. ${runMarker}.`
  )
  await page.locator('select').nth(3).selectOption('2')
  await page.locator('select').nth(4).selectOption('Routine / No specific start date')
  await page.locator('select').nth(5).selectOption('None')
  await page.locator('input[type="file"]').setInputFiles(imagePath)
  await expect(page.getByText('Image ready. Please check the preview.')).toBeVisible()
  await page.locator('input[type="checkbox"]').nth(0).check()
  await page.locator('input[type="checkbox"]').nth(1).check()
  await page.getByRole('button', { name: 'Submit Treatment Request' }).click()
  await expect(page.getByRole('heading', { name: 'Request Submitted' })).toBeVisible()
  expect(submittedPayload?.submissionId).toBeTruthy()

  const { data: patient, error: patientError } = await service
    .from('patient_requests')
    .select('id')
    .eq('submission_id', submittedPayload.submissionId)
    .single()
  if (patientError || !patient) throw new Error('Unable to look up browser workflow patient request.')

  await login(page, 'faculty', facultyEmail, facultyPassword)
  await page.goto(`/admin/requests/${patient.id}`)
  await expect(page).toHaveURL(new RegExp(`/admin/requests/${patient.id}`))
  await patchJson(page, `/api/admin/cases/${patient.id}`, {
    action: 'update_triage',
    assigned_department: 'Restorative Dentistry',
    urgency: 'Low (Routine)',
    target_student_level: 'Year 4 Clinical Student',
    clinical_notes: `${runMarker}; browser workflow triage.`,
    reason: `${runMarker}; browser triage.`,
  })
  await patchJson(page, `/api/admin/cases/${patient.id}`, {
    action: 'approve',
    assigned_department: 'Restorative Dentistry',
    urgency: 'Low (Routine)',
    target_student_level: 'Year 4 Clinical Student',
    clinical_notes: `${runMarker}; browser workflow release.`,
  })

  const studentContext = await browser.newContext({ baseURL: baseUrl })
  const studentPage = await studentContext.newPage()
  await login(studentPage, 'student', studentEmail, studentPassword)
  await studentPage.goto('/student/cases')
  await expect(studentPage.getByText(patient.id.slice(0, 8).toUpperCase()).or(studentPage.getByText(patient.id.slice(0, 8)))).toBeVisible()
  const requestResponse = await studentPage.request.post(`/api/student/cases/${patient.id}/request`)
  expect(requestResponse.status()).toBe(201)
  const requestBody = await requestResponse.json()
  const studentRequestId = requestBody.data.id

  await patchJson(page, `/api/admin/cases/${patient.id}`, {
    action: 'approve_student_request',
    request_id: studentRequestId,
  })
  await patchJson(studentPage, `/api/student/cases/${patient.id}/status`, { action: 'mark_contacted' })
  await patchJson(studentPage, `/api/student/cases/${patient.id}/status`, {
    action: 'mark_appointment_scheduled',
    appointment_date: '2026-08-20',
    appointment_time: '09:30',
    note: `${runMarker}; browser appointment.`,
  })
  await patchJson(studentPage, `/api/student/cases/${patient.id}/status`, {
    action: 'mark_in_treatment',
    note: `${runMarker}; browser treatment start.`,
  })
  const progressResponse = await studentPage.request.post(`/api/student/cases/${patient.id}/progress`, {
    data: {
      note: `${runMarker}; browser progress.`,
      what_was_done: 'Browser workflow progress entry.',
      next_step: 'Final faculty review.',
    },
  })
  expect(progressResponse.status()).toBe(200)
  await patchJson(studentPage, `/api/student/cases/${patient.id}/status`, {
    action: 'submit_stage_for_review',
  })
  await patchJson(page, `/api/admin/cases/${patient.id}`, {
    action: 'mark_completed',
    reason: `${runMarker}; browser final approval.`,
  })

  const { data: finalCase, error: finalError } = await service
    .from('patient_requests')
    .select('status')
    .eq('id', patient.id)
    .single()
  if (finalError || finalCase?.status !== 'completed') {
    throw new Error('Browser workflow did not finish with completed status.')
  }
})
