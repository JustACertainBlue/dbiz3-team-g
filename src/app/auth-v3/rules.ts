// UI v3 account screens: small pure helpers behind the mockup (hab-mockup-v3 png/16, png/18, png/18a–18c).
// None of these changes a rule the server enforces; the password checklist mirrors the existing 8–64 character rule.

export type PasswordCheck = { id: 'length' | 'case' | 'digit' | 'special'; label: string; ok: boolean }

/** png/16 step 3: four rules shown under the new password field. */
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { id: 'length', label: 'Ít nhất 8 ký tự', ok: password.length >= 8 && password.length <= 64 },
    { id: 'case', label: 'Có chữ hoa và chữ thường', ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { id: 'digit', label: 'Có ít nhất một chữ số', ok: /[0-9]/.test(password) },
    { id: 'special', label: 'Có ít nhất một ký tự đặc biệt (!@#…)', ok: /[^A-Za-z0-9\s]/.test(password) },
  ]
}

export type RegistrationPopupKind = 'submitted' | 'revise' | 'rejected'

/** png/18a (sent), png/18b (needs documents), png/18c (not approved): which popup an agency account status opens. */
export function registrationPopupKind(status: string | null | undefined): RegistrationPopupKind | null {
  if (status === 'Pending Approval') return 'submitted'
  if (status === 'Revision Requested') return 'revise'
  if (status === 'Rejected') return 'rejected'
  return null
}

/** png/18: "Mã hết hạn sau 04:32". */
export function otpCountdown(seconds: number): string {
  const left = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`
}

/** "09:02, 12/11/2026" in Hanoi time (UTC+7, no daylight saving). */
export function formatViDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const time = Date.parse(value)
  if (Number.isNaN(time)) return ''
  const hanoi = new Date(time + 7 * 3600 * 1000)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(hanoi.getUTCHours())}:${two(hanoi.getUTCMinutes())}, ${two(hanoi.getUTCDate())}/${two(hanoi.getUTCMonth() + 1)}/${hanoi.getUTCFullYear()}`
}

/** "12/11/2026" in Hanoi time. */
export function formatViDate(value: string | null | undefined): string {
  const full = formatViDateTime(value)
  return full ? full.split(', ')[1] : ''
}

export type AccountPanel = 'info' | 'edit' | 'password'

/** Screen 19: which panel /account shows. A forced change of a temporary password always shows the password panel. */
export function choosePanel(tab: string | null | undefined, forced: boolean): AccountPanel {
  if (forced) return 'password'
  return tab === 'password' ? 'password' : 'info'
}
