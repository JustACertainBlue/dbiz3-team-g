import { loadExperienceSlots, loadExploreRuntime } from '../explore/seed-repository'
import { slotRows } from '../explore/v3-detail'

export interface FreeSlot { start: string; end: string; label: string }

// Free fixed slots of an experience on a date (Hanoi day, YYYY-MM-DD): the slots of that weekday that the Provider's
// operating hours and existing On hold / Booked bookings leave free. Same rule as the table of screen 04 ("slotRows").
// The request form of 04/24 offers exactly these, and the server accepts a request only for one of them.
export async function freeSlotsOn(experienceId: string, date: string): Promise<FreeSlot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
  const [seed, slotData] = await Promise.all([loadExploreRuntime(), loadExperienceSlots()])
  return slotRows(seed, slotData, experienceId, date, null).map(row => {
    const [start, end] = row.time.split(' – ')
    return { start, end, label: row.label }
  })
}
