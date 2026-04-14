import { redirect } from 'next/navigation'

/**
 * /login is no longer in use.
 *
 * Staff login entry points:
 *   /admin/login   — faculty administrators
 *   /student/login — clinical students
 *
 * Patients do not need an account:
 *   /patient/request  — submit a treatment request
 *   /patient/status   — check request status
 */
export default function LoginRedirectPage() {
  redirect('/')
}
