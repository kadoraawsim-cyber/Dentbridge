/**
 * Normalize a client-supplied phone number to the canonical stored form
 * (`+` followed by digits only), matching how `patient_requests.phone` is stored
 * (`${countryCode}${nationalDigits}`). Returns null when the number is not a
 * plausible E.164-length number.
 */
export function normalizePatientStatusPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null
  }
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) {
    return null
  }
  return `+${digits}`
}
