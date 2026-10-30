import { describe, expect, it, vi } from 'vitest'
import { JsonDemoRepository } from '@/lib/demo/json-repository'

// T002 (BR-019, spec #44): inserts and updates of one event are written with one persist, or not at all.
const BOOKING = '4bf17b30-9819-5c47-b745-06be7171087b' // seed Booked
const history = { history_id: 'h0000000-0000-4000-8000-000000000002', booking_id: BOOKING, from_status: 'Booked', to_status: 'Cancelled', reason: 'Group postponed' }

function persistSpy(repository: JsonDemoRepository) {
  return vi.spyOn(repository as unknown as { persist: (...args: unknown[]) => void }, 'persist')
}

describe('T002 | JsonDemoRepository.applyBatch with updates', () => {
  it('applies inserts and updates together with a single persist', () => {
    const repository = new JsonDemoRepository()
    const persist = persistSpy(repository)

    repository.applyBatch([
      { table: 'booking_status_history', row: history },
      { table: 'bookings', match: row => row.booking_id === BOOKING, changes: { status: 'Cancelled', updated_at: '2026-10-01T00:00:00+07:00' } },
    ])

    expect(persist).toHaveBeenCalledTimes(1)
    expect(repository.find('bookings', row => row.booking_id === BOOKING)).toMatchObject({ status: 'Cancelled', updated_at: '2026-10-01T00:00:00+07:00' })
    expect(repository.find('booking_status_history', row => row.history_id === history.history_id)).toMatchObject(history)
  })

  it('keeps neither the insert nor the update when the persist fails', () => {
    const repository = new JsonDemoRepository()
    const historyBefore = repository.all('booking_status_history').length
    persistSpy(repository).mockImplementation(() => { throw new Error('disk full') })

    expect(() => repository.applyBatch([
      { table: 'booking_status_history', row: history },
      { table: 'bookings', match: row => row.booking_id === BOOKING, changes: { status: 'Cancelled' } },
    ])).toThrow('disk full')

    expect(repository.find('bookings', row => row.booking_id === BOOKING)?.status).toBe('Booked')
    expect(repository.all('booking_status_history')).toHaveLength(historyBefore)
  })

  it('throws and applies nothing when an update matches no row', () => {
    const repository = new JsonDemoRepository()
    const historyBefore = repository.all('booking_status_history').length

    expect(() => repository.applyBatch([
      { table: 'booking_status_history', row: history },
      { table: 'bookings', match: row => row.booking_id === 'missing', changes: { status: 'Cancelled' } },
    ])).toThrow()

    expect(repository.all('booking_status_history')).toHaveLength(historyBefore)
  })
})
