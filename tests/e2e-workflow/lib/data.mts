import { createHash, randomUUID } from 'node:crypto'

import type { AccountKey } from './safety.mts'
import { buildRunIdMarker } from './safety.mts'

export interface WorkflowSeed {
  caseNumber: number
  runId: string
  submissionId: string
  fullName: string
  phoneCountryCode: string
  phone: string
  syntheticEmail: string
  department: string
  urgency: string
  targetStudentLevel: string
  clinicalNotes: string
  appointmentDate: string
  appointmentTime: string
}

const CASE_WORDS = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
]

function alphaMarker(value: string): string {
  const digest = createHash('sha256').update(value).digest('hex').slice(0, 8)
  return digest
    .split('')
    .map((char) => String.fromCharCode(97 + Number.parseInt(char, 16)))
    .join('')
}

function phoneFor(runId: string, caseNumber: number): string {
  const numeric = createHash('sha256')
    .update(`${runId}:${caseNumber}`)
    .digest('hex')
    .replace(/[a-f]/g, (char) => String(char.charCodeAt(0) % 10))
    .slice(0, 7)
  return `555${numeric}`.slice(0, 10)
}

function appointmentDateFor(caseNumber: number): string {
  const date = new Date(Date.UTC(2026, 7, 3 + caseNumber))
  return date.toISOString().slice(0, 10)
}

export function buildWorkflowSeed(runId: string, caseNumber: number): WorkflowSeed {
  const word = CASE_WORDS[caseNumber - 1] ?? `Case${caseNumber}`
  const marker = alphaMarker(runId)
  const runMarker = buildRunIdMarker(runId)

  return {
    caseNumber,
    runId,
    submissionId: randomUUID(),
    fullName: `Dentbridge ${word} ${marker}`,
    phoneCountryCode: '+90',
    phone: phoneFor(runId, caseNumber),
    syntheticEmail: `dentbridge-${runId.replace(/[^a-zA-Z0-9-]/g, '-')}-${caseNumber}@example.test`,
    department: 'Restorative Dentistry',
    urgency: 'Low (Routine)',
    targetStudentLevel: 'Year 4 Clinical Student',
    clinicalNotes: `${runMarker}; workflow=${caseNumber}; synthetic E2E workflow.`,
    appointmentDate: appointmentDateFor(caseNumber),
    appointmentTime: '09:30',
  }
}

export function buildPatientPayload(seed: WorkflowSeed): Record<string, unknown> {
  const runMarker = buildRunIdMarker(seed.runId)

  return {
    submissionId: seed.submissionId,
    fullName: seed.fullName,
    phoneCountryCode: seed.phoneCountryCode,
    phone: seed.phone,
    age: '34',
    gender: 'Female',
    preferredLanguage: 'English',
    preferredUniversity: 'İstinye Dental Hospital',
    treatmentType: 'Dental Cleaning',
    complaintText: `Synthetic DentBridge workflow request. ${runMarker}; WORKFLOW=${seed.caseNumber}; EMAIL_MARKER=${seed.syntheticEmail}.`,
    preferredDays: 'Weekday Mornings',
    painScore: '2',
    symptomDuration: 'Routine / No specific start date',
    contactMethod: 'Phone Call',
    bestContactTime: 'Morning',
    medicalCondition: 'None',
    medicalConditionDetails: '',
    kvkkAcknowledgement: true,
    explicitConsent: true,
  }
}

export function accountLabel(role: 'Student' | 'Faculty', key: AccountKey): string {
  return `${role} Account ${key}`
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index] ?? 0
}
