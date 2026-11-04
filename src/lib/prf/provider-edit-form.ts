// PRF128 Edit Provider Profile form helpers (slice A, US-4).
// The form shows only FR-004 inputs, filled from the API (no hard-coded demo values, decision Q1
// 2026-11-04), and Save sends only the fields the Provider changed.

export const PROVIDER_CRAFT_TYPES = ['Ceramics', 'Silk/Textile', 'Woodcarving', 'Food/Culinary', 'Metalwork', 'Paper/Painting', 'Other'] as const

/** ISO 8601 weekday labels (spec-BKG #28: 1 = Monday … 7 = Sunday). */
export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ nhật',
}

export interface OperatingHourRow {
  weekday: number
  local_start: string
  local_end: string
}

export interface ProviderEditForm {
  business_name: string
  craft_type: string
  business_registration: string
  location_address: string
  general_description: string
  /** Comma-separated in the form; sent as an array. */
  artisan_names: string
  phone_number: string
  business_email: string
  operating_hours: OperatingHourRow[]
}

/** The profile fields the form reads (owner view of GET /api/prf/provider/:id). */
export interface ProviderProfileForForm {
  provider_name?: string
  craft_type?: string
  business_registration_number?: string
  location_address?: string
  general_description?: string
  artisan_names?: string[]
  contact?: { phone_number?: string; business_email?: string }
}

/** F-SCHED-01 `operating_hours` (spec-BKG #78): ISO weekday keys, each an array of ranges. */
export type OperatingHoursByWeekday = Record<string | number, Array<{ local_start: string; local_end: string }>>

const hhmm = (value: string) => value.slice(0, 5)

export function operatingHoursToRows(hours: OperatingHoursByWeekday | null | undefined): OperatingHourRow[] {
  if (!hours) return []
  return Object.entries(hours)
    .flatMap(([weekday, ranges]) => (ranges ?? []).map(range => ({
      weekday: Number(weekday), local_start: hhmm(range.local_start), local_end: hhmm(range.local_end),
    })))
    .sort((a, b) => a.weekday - b.weekday || a.local_start.localeCompare(b.local_start))
}

export function profileToForm(profile: ProviderProfileForForm, hours: OperatingHoursByWeekday | null | undefined): ProviderEditForm {
  return {
    business_name: profile.provider_name ?? '',
    craft_type: profile.craft_type ?? '',
    business_registration: profile.business_registration_number ?? '',
    location_address: profile.location_address ?? '',
    general_description: profile.general_description ?? '',
    artisan_names: (profile.artisan_names ?? []).join(', '),
    phone_number: profile.contact?.phone_number ?? '',
    business_email: profile.contact?.business_email ?? '',
    operating_hours: operatingHoursToRows(hours),
  }
}

const splitNames = (value: string) => value.split(',').map(name => name.trim()).filter(Boolean)
const sameHours = (a: OperatingHourRow[], b: OperatingHourRow[]) =>
  a.length === b.length && a.every((row, index) =>
    row.weekday === b[index].weekday && row.local_start === b[index].local_start && row.local_end === b[index].local_end)

const TEXT_FIELDS = ['business_name', 'craft_type', 'business_registration', 'location_address', 'general_description', 'phone_number', 'business_email'] as const

/** PATCH body with only the changed fields; an unchanged form gives {}. */
export function buildProviderPatch(initial: ProviderEditForm, current: ProviderEditForm): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const field of TEXT_FIELDS) {
    if (current[field] !== initial[field]) patch[field] = current[field]
  }
  const names = splitNames(current.artisan_names)
  if (names.join('\n') !== splitNames(initial.artisan_names).join('\n')) patch.artisan_names = names
  if (!sameHours(initial.operating_hours, current.operating_hours)) {
    patch.operating_hours = current.operating_hours.map(row => ({ ...row, is_closed: false }))
  }
  return patch
}
