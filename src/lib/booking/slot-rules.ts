import type { DemoRow } from '../demo/types'
import { hanoiClock } from '../time/hanoi-time'
import { parseSlots } from '../explore/vocabulary'
import { slotOccupancy } from './conflicts'
import { BookingError } from './create-booking'
import { isoWeekdayInHanoi } from './operating-hours'

// One check for create (35) and edit (35 "Sửa"): the start must be a time slot of the experience on that weekday
// (only when the experience has slots), and the guests already held in an overlapping slot plus this group must not
// exceed max_participants (UI v3 decision #7). Call it inside the booking write lock.
export async function assertSlotAndCapacity(
  repository: { all(table: string): Promise<DemoRow[]> | DemoRow[] },
  input: { experience: DemoRow; startAt: string; endAt: string; groupSize: number; excludeBookingId?: string; checkSlot?: boolean },
): Promise<void> {
  const { experience } = input
  if (input.checkSlot !== false) {
    let rows: DemoRow[] = []
    try { rows = (await repository.all('experience_slots')).filter(row => row.experience_id === experience.experience_id) } catch { rows = [] }
    const slots = parseSlots(rows)
    if (slots.length) {
      const clock = hanoiClock(input.startAt), weekday = isoWeekdayInHanoi(input.startAt)
      if (!slots.some(slot => slot.start === clock && slot.weekdays.includes(weekday))) {
        throw new BookingError('SLOT_UNAVAILABLE', 'Slot Unavailable: the start time is not a time slot of this Experience on that day')
      }
    }
  }
  const occupied = slotOccupancy(await repository.all('bookings'), experience.experience_id, input.startAt, input.endAt, input.excludeBookingId)
  if (occupied + input.groupSize > Number(experience.max_participants)) {
    throw new BookingError('SLOT_UNAVAILABLE', 'Slot Unavailable: the time slot is full')
  }
}
