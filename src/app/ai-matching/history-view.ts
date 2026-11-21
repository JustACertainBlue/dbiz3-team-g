/** Screen 22 "Gần đây" rows: first message of the group (cut short) and the date, as in the mockup. */
const MAX_TITLE = 42
const dayKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date)

export function historyTitle(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length <= MAX_TITLE ? flat : `${flat.slice(0, MAX_TITLE - 1).trimEnd()}…`
}

export function historyDate(iso: string, now: Date = new Date()): string {
  const at = new Date(iso)
  if (dayKey(at) === dayKey(now)) return 'Hôm nay'
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }).formatToParts(at)
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${part('day')}/${part('month')}`
}
