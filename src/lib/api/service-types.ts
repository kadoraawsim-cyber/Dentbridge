/**
 * Shared service-layer contract types (Phase 9).
 *
 * These were previously duplicated verbatim across the case, progress, and
 * planner services. Service modules import them from here; the shapes are
 * unchanged.
 */

/** Plain HTTP-ish result returned by Phase 6 workflow services to their routes. */
export interface ServiceResponse {
  status: number
  body: Record<string, unknown>
}

/**
 * Authenticated student actor as passed from a route handler into a service.
 * `role` stays `unknown` on purpose: services re-validate it via the lifecycle
 * role gates instead of trusting the caller's typing.
 */
export interface StudentActor {
  userId: string
  email: string | null
  role: unknown
}

/** Authenticated faculty/admin actor as passed from a route handler into a service. */
export interface FacultyActor {
  userId: string
  email: string | null
  role: unknown
}
