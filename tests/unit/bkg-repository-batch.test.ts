import { describe, expect, it, vi } from 'vitest'
import { JsonDemoRepository } from '@/lib/demo/json-repository'

// T004 (BR-019): booking + initial history are written by one persist, or not at all.
const booking = { booking_id: 'b0000000-0000-4000-8000-000000000001', provider_id: 'p', status: 'On hold' }
const history = { history_id: 'h0000000-0000-4000-8000-000000000001', booking_id: booking.booking_id, from_status: '', to_status: 'On hold' }

function persistSpy(repository: JsonDemoRepository) {
  return vi.spyOn(repository as unknown as { persist: (...args: unknown[]) => void }, 'persist')
}

describe('T004 | JsonDemoRepository.applyBatch (BR-019)', () => {
  it('inserts rows into several tables with a single persist', () => {
    const repository = new JsonDemoRepository()
    const persist = persistSpy(repository)

    repository.applyBatch([
      { table: 'bookings', row: booking },
      { table: 'booking_status_history', row: history },
    ])

    expect(persist).toHaveBeenCalledTimes(1)
    expect(repository.find('bookings', row => row.booking_id === booking.booking_id)).toMatchObject(booking)
    expect(repository.find('booking_status_history', row => row.history_id === history.history_id)).toMatchObject(history)
  })

  it('leaves neither row when the persist step fails', () => {
    const repository = new JsonDemoRepository()
    const bookingsBefore = repository.all('bookings').length
    const historyBefore = repository.all('booking_status_history').length
    persistSpy(repository).mockImplementation(() => { throw new Error('disk full') })

    expect(() => repository.applyBatch([
      { table: 'bookings', row: booking },
      { table: 'booking_status_history', row: history },
    ])).toThrow('disk full')

    expect(repository.all('bookings')).toHaveLength(bookingsBefore)
    expect(repository.all('booking_status_history')).toHaveLength(historyBefore)
  })
})
