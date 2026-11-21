// Previous, current and next calendar month around `today` (YYYY-MM-DD): the range the provider month calendars load.
import { addDays } from '@/lib/booking/clock'

export function monthWindow(today: string): { from: string; to: string } {
  const first = `${today.slice(0, 7)}-01`
  const from = `${addDays(first, -1).slice(0, 7)}-01`
  const afterNext = `${addDays(addDays(first, 32).slice(0, 7) + '-01', 32).slice(0, 7)}-01`
  return { from, to: addDays(afterNext, -1) }
}
