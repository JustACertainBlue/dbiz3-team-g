// T006: Chat writes and Booking writes share one in-process queue (research R4, Q9).
import { describe, expect, it } from 'vitest'
import { withChatWriteLock } from '@/lib/iac/chat-lock'
import { withBookingWriteLock } from '@/lib/booking/write-lock'

describe('T006 | shared write lock', () => {
  it('a paused Chat write delays a later Booking write until it resumes', async () => {
    const order: string[] = []
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const chat = withChatWriteLock(async () => { await gate; order.push('chat') })
    const booking = withBookingWriteLock(() => { order.push('booking') })
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(order).toEqual([])
    release()
    await Promise.all([chat, booking])
    expect(order).toEqual(['chat', 'booking'])
  })
})
