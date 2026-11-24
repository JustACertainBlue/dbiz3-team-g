import { demoRepository } from '@/lib/demo/json-repository'

// Time slots of the demo experience for tests (the JSON fixtures have no experience_slots rows).
export const SLOT_EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
/** Ca sáng 09:00–10:00 every day, Ca chiều 14:00–15:00 on Tuesdays only. */
export function addSlots(): void {
  const repo = demoRepository()
  const providerId = repo.find('experiences', row => row.experience_id === SLOT_EXPERIENCE)?.provider_id
  if (typeof providerId !== 'string') throw new Error(`Missing test experience ${SLOT_EXPERIENCE}`)
  repo.remove('provider_operating_hours', row => row.provider_id === providerId)
  repo.insert('provider_operating_hours', {
    operating_hour_id: 'test-slots-monday-only',
    provider_id: providerId,
    weekday: '1',
    local_start: '08:00:00',
    local_end: '17:00:00',
  })
  repo.insert('experience_slots', { slot_id: 'slot-am', experience_id: SLOT_EXPERIENCE, label: 'Ca sáng', start_time: '09:00:00', end_time: '10:00:00', weekdays: '[1,2,3,4,5,6,7]' })
  repo.insert('experience_slots', { slot_id: 'slot-pm', experience_id: SLOT_EXPERIENCE, label: 'Ca chiều', start_time: '14:00:00', end_time: '15:00:00', weekdays: '[2]' })
}
