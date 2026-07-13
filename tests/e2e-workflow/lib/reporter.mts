import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { percentile } from './data.mts'

export interface StepTiming {
  workflow: number
  step: string
  durationMs: number
}

export interface HttpObservation {
  workflow: number | null
  step: string
  method: string
  path: string
  status: number
}

export interface WorkflowFailure {
  workflow: number | null
  step: string
  message: string
}

export interface WorkflowSummary {
  workflow: number
  patientRequestId: string | null
  fileId: string | null
  studentRequestId: string | null
  assignedStudent: string
  triageFaculty: string
  approvalFaculty: string
  finalFaculty: string
  finalStatus: string | null
  wrongStudentSawAssignedCase: boolean
}

export interface FinalReport {
  runId: string
  attempted: number
  completed: number
  totalDurationMs: number
  stepDurations: Record<string, { p50Ms: number; p95Ms: number; maxMs: number }>
  httpStatusDistribution: Record<string, number>
  errorResponses: HttpObservation[]
  failuresByStep: Record<string, WorkflowFailure[]>
  workflows: WorkflowSummary[]
  createdPatientRequestIds: string[]
  createdFileIds: string[]
  createdStudentRequestIds: string[]
  consistencyFailures: string[]
  crossAccountAuthorizationFailures: string[]
  anyStudentSawAnotherAssignedCase: boolean
  duplicateRecordsDetected: boolean
  orphanFilesDetected: boolean
  stagesConcurrencyNote: string
}

export class WorkflowReporter {
  private timings: StepTiming[] = []
  private http: HttpObservation[] = []
  private failures: WorkflowFailure[] = []

  async step<T>(workflow: number, name: string, fn: () => Promise<T>): Promise<T> {
    const started = performance.now()
    try {
      return await fn()
    } catch (error) {
      this.addFailure(workflow, name, error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      this.timings.push({
        workflow,
        step: name,
        durationMs: Math.round(performance.now() - started),
      })
    }
  }

  observeHttp(observation: HttpObservation): void {
    this.http.push(observation)
  }

  addFailure(workflow: number | null, step: string, message: string): void {
    this.failures.push({ workflow, step, message })
  }

  buildReport(input: {
    runId: string
    attempted: number
    totalDurationMs: number
    workflows: WorkflowSummary[]
    consistencyFailures: string[]
    crossAccountAuthorizationFailures: string[]
    duplicateRecordsDetected: boolean
    orphanFilesDetected: boolean
  }): FinalReport {
    const stepDurations: FinalReport['stepDurations'] = {}
    const durationsByStep = new Map<string, number[]>()
    for (const timing of this.timings) {
      const existing = durationsByStep.get(timing.step) ?? []
      existing.push(timing.durationMs)
      durationsByStep.set(timing.step, existing)
    }

    for (const [step, values] of durationsByStep.entries()) {
      stepDurations[step] = {
        p50Ms: percentile(values, 50),
        p95Ms: percentile(values, 95),
        maxMs: Math.max(...values),
      }
    }

    const httpStatusDistribution: Record<string, number> = {}
    for (const observation of this.http) {
      const key = String(observation.status)
      httpStatusDistribution[key] = (httpStatusDistribution[key] ?? 0) + 1
    }

    const failuresByStep: Record<string, WorkflowFailure[]> = {}
    for (const failure of this.failures) {
      failuresByStep[failure.step] = [...(failuresByStep[failure.step] ?? []), failure]
    }

    const errorResponses = this.http.filter((entry) => entry.status >= 400)
    const completed = input.workflows.filter((workflow) => workflow.finalStatus === 'completed').length

    return {
      runId: input.runId,
      attempted: input.attempted,
      completed,
      totalDurationMs: input.totalDurationMs,
      stepDurations,
      httpStatusDistribution,
      errorResponses,
      failuresByStep,
      workflows: input.workflows,
      createdPatientRequestIds: input.workflows
        .map((workflow) => workflow.patientRequestId)
        .filter((id): id is string => Boolean(id)),
      createdFileIds: input.workflows
        .map((workflow) => workflow.fileId)
        .filter((id): id is string => Boolean(id)),
      createdStudentRequestIds: input.workflows
        .map((workflow) => workflow.studentRequestId)
        .filter((id): id is string => Boolean(id)),
      consistencyFailures: input.consistencyFailures,
      crossAccountAuthorizationFailures: input.crossAccountAuthorizationFailures,
      anyStudentSawAnotherAssignedCase: input.workflows.some(
        (workflow) => workflow.wrongStudentSawAssignedCase
      ),
      duplicateRecordsDetected: input.duplicateRecordsDetected,
      orphanFilesDetected: input.orphanFilesDetected,
      stagesConcurrencyNote:
        'Patient intake stages run with bounded concurrency; shared faculty transitions are alternated and serialized per actor to avoid cross-workflow session noise.',
    }
  }

  writeReport(report: FinalReport): string {
    const reportPath = resolve(process.cwd(), 'tests/e2e-workflow/reports', `${report.runId}.json`)
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    return reportPath
  }
}
