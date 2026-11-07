// Issue #87, spec-BKG #31: local date and time are derived in Asia/Ho_Chi_Minh; timestamps are stored as
// timestamptz. PostgreSQL returns them as UTC ("…Z" strings through the application store, or Date values),
// while the seed and older rows use "+07:00" strings. Never cut the ISO string: format the instant here.
export const HANOI_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: HANOI_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

type TimeValue = string | Date | null | undefined

function parts(value: TimeValue): { date: string; clock: string } | null {
  if (value === null || value === undefined || value === '') return null
  const instant = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(instant.getTime())) return null
  const map = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]))
  return { date: `${map.year}-${map.month}-${map.day}`, clock: `${map.hour}:${map.minute}` }
}

/** Hanoi local date, YYYY-MM-DD; '' for an empty or invalid value. */
export const hanoiDate = (value: TimeValue) => parts(value)?.date ?? ''
/** Hanoi local time, HH:mm (00:00–23:59); '' for an empty or invalid value. */
export const hanoiClock = (value: TimeValue) => parts(value)?.clock ?? ''
/** Hanoi local date and time, "YYYY-MM-DD HH:mm"; '' for an empty or invalid value. */
export const hanoiDateTime = (value: TimeValue) => { const p = parts(value); return p ? `${p.date} ${p.clock}` : '' }
/** Value for an <input type="datetime-local"> read as Hanoi time, "YYYY-MM-DDTHH:mm". */
export const hanoiInputValue = (value: TimeValue) => { const p = parts(value); return p ? `${p.date}T${p.clock}` : '' }
