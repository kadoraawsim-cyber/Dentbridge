export type AppRole = 'student' | 'faculty' | 'admin'

export function getAppRole(value: unknown): AppRole | null {
  if (value === 'student' || value === 'faculty' || value === 'admin') {
    return value
  }

  return null
}

export function isStudentRole(value: unknown): value is 'student' {
  return value === 'student'
}

export function isFacultyRole(value: unknown): value is 'faculty' {
  return value === 'faculty'
}

export function isAdminRole(value: unknown): value is 'admin' {
  return value === 'admin'
}

export function isRecognizedRole(value: unknown): value is AppRole {
  return getAppRole(value) !== null
}

export function canAccessFacultyPortal(value: unknown): value is 'faculty' | 'admin' {
  return value === 'faculty' || value === 'admin'
}
