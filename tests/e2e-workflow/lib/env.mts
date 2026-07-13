import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface TestAccount {
  key: 'A' | 'B'
  role: 'student' | 'faculty'
  label: string
  email: string
  password: string
}

export interface WorkflowEnvironment {
  supabaseUrl: string
  supabaseAnonKey: string
  serviceRoleKey: string | null
  students: [TestAccount, TestAccount]
  faculty: [TestAccount, TestAccount]
}

const REQUIRED_ACCOUNT_VARS = [
  'E2E_STUDENT_A_EMAIL',
  'E2E_STUDENT_A_PASSWORD',
  'E2E_STUDENT_B_EMAIL',
  'E2E_STUDENT_B_PASSWORD',
  'E2E_FACULTY_A_EMAIL',
  'E2E_FACULTY_A_PASSWORD',
  'E2E_FACULTY_B_EMAIL',
  'E2E_FACULTY_B_PASSWORD',
] as const

export function parseDotenv(contents: string): Record<string, string> {
  const parsed: Record<string, string> = {}

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const equalsIndex = line.indexOf('=')
    if (equalsIndex <= 0) continue

    const key = line.slice(0, equalsIndex).trim()
    let value = line.slice(equalsIndex + 1).trim()

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

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  return parseDotenv(readFileSync(path, 'utf8'))
}

function required(source: Record<string, string | undefined>, name: string): string {
  const value = source[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required in tests/e2e-workflow/.env.local or the process environment.`)
  }
  return value
}

function assertExactlyTwoAccounts(source: Record<string, string | undefined>): void {
  for (const key of REQUIRED_ACCOUNT_VARS) {
    required(source, key)
  }

  const extraAccountKeys = Object.keys(source).filter((key) =>
    /^E2E_(STUDENT|FACULTY)_[C-Z]_(EMAIL|PASSWORD)$/.test(key)
  )
  if (extraAccountKeys.length > 0) {
    throw new Error(`Exactly two student and two faculty accounts are supported. Remove: ${extraAccountKeys.join(', ')}`)
  }
}

function assertDistinctEmails(accounts: TestAccount[]): void {
  const seen = new Set<string>()
  for (const account of accounts) {
    const normalized = account.email.toLowerCase()
    if (seen.has(normalized)) {
      throw new Error('E2E account emails must be distinct.')
    }
    seen.add(normalized)
  }
}

export function loadWorkflowEnvironment(env: NodeJS.ProcessEnv = process.env): WorkflowEnvironment {
  const rootEnv = loadEnvFile(resolve(process.cwd(), '.env.local'))
  const localEnv = loadEnvFile(resolve(process.cwd(), 'tests/e2e-workflow/.env.local'))
  const merged: Record<string, string | undefined> = {
    ...rootEnv,
    ...localEnv,
    ...env,
  }

  assertExactlyTwoAccounts(merged)

  const students: [TestAccount, TestAccount] = [
    {
      key: 'A',
      role: 'student',
      label: 'Student Account A',
      email: required(merged, 'E2E_STUDENT_A_EMAIL'),
      password: required(merged, 'E2E_STUDENT_A_PASSWORD'),
    },
    {
      key: 'B',
      role: 'student',
      label: 'Student Account B',
      email: required(merged, 'E2E_STUDENT_B_EMAIL'),
      password: required(merged, 'E2E_STUDENT_B_PASSWORD'),
    },
  ]

  const faculty: [TestAccount, TestAccount] = [
    {
      key: 'A',
      role: 'faculty',
      label: 'Faculty Account A',
      email: required(merged, 'E2E_FACULTY_A_EMAIL'),
      password: required(merged, 'E2E_FACULTY_A_PASSWORD'),
    },
    {
      key: 'B',
      role: 'faculty',
      label: 'Faculty Account B',
      email: required(merged, 'E2E_FACULTY_B_EMAIL'),
      password: required(merged, 'E2E_FACULTY_B_PASSWORD'),
    },
  ]

  assertDistinctEmails([...students, ...faculty])

  return {
    supabaseUrl: required(merged, 'NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: required(merged, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey:
      merged.E2E_VERIFICATION_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      merged.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      null,
    students,
    faculty,
  }
}
