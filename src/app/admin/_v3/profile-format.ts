// Screen 41a: text formatting of submitted profile fields (stored as strings, JSON strings or arrays).
export function readable(value: unknown, sep = ', '): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); if (parsed && typeof parsed === 'object') return readable(parsed, sep) } catch { /* plain text */ }
    return value
  }
  if (Array.isArray(value)) return value.map(v => readable(v, sep)).filter(Boolean).join(sep)
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(v => readable(v, sep)).filter(Boolean).join(sep)
  return String(value)
}

export const COMPANY_TYPE: Record<string, string> = { 'Travel Agency': 'Công ty lữ hành', 'Tour Operator': 'Nhà điều hành tour', TMC: 'Công ty quản lý du lịch (TMC)' }

export function fileSize(bytes: unknown): string {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  return n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}

const REVIEW_STATUS: Record<string, string> = { Verified: 'Đã duyệt', 'Pending Verification': 'Chờ duyệt', 'Revision Required': 'Cần bổ sung', Draft: 'Nháp' }
export const viReviewStatus = (status: string) => REVIEW_STATUS[status] ?? status

/** "Approve · v1" (reviewHistoryRows) → "Đã duyệt · phiên bản 1". */
export function viReviewHeading(heading: string): string {
  const [decision, version] = heading.split(' · ')
  const word = ({ Approve: 'Đã duyệt', 'Request Revision': 'Yêu cầu bổ sung' } as Record<string, string>)[decision] ?? decision
  return version ? `${word} · phiên bản ${version.replace(/^v/, '')}` : word
}
