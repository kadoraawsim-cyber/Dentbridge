/** CSV escaping shared by the dashboard export and the bulk invite report. */

export function escapeCsvValue(value: string): string {
  const normalized = value.replaceAll('"', '""')
  return `"${normalized}"`
}
