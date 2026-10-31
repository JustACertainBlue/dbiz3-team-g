import { describe, it, expect } from 'vitest'
import {
  openSessionSchema,
  sendMessageSchema,
  historyQuerySchema,
} from '@/lib/iac/validators'

describe('T005 | Chat Domain Types & Validation (Zod)', () => {
  const validUuid = '11111111-1111-1111-1111-111111111111'
  const validContextUuid = '22222222-2222-2222-2222-222222222222'

  describe('openSessionSchema', () => {
    it('accepts valid input with Explore source', () => {
      const parsed = openSessionSchema.safeParse({
        recipient_id: validUuid,
        source: 'Explore',
        experience_id: validContextUuid,
      })
      expect(parsed.success).toBe(true)
    })

    it('requires quote_request_id when source is Quote Request', () => {
      const withoutQuote = openSessionSchema.safeParse({
        recipient_id: validUuid,
        source: 'Quote Request',
      })
      expect(withoutQuote.success).toBe(false)

      const withQuote = openSessionSchema.safeParse({
        recipient_id: validUuid,
        source: 'Quote Request',
        quote_request_id: validContextUuid,
      })
      expect(withQuote.success).toBe(true)
    })

    it('requires booking_id when source is Booking', () => {
      const withoutBooking = openSessionSchema.safeParse({
        recipient_id: validUuid,
        source: 'Booking',
      })
      expect(withoutBooking.success).toBe(false)

      const withBooking = openSessionSchema.safeParse({
        recipient_id: validUuid,
        source: 'Booking',
        booking_id: validContextUuid,
      })
      expect(withBooking.success).toBe(true)
    })

    it('rejects invalid recipient UUID', () => {
      const res = openSessionSchema.safeParse({
        recipient_id: 'not-a-uuid',
        source: 'Explore',
      })
      expect(res.success).toBe(false)
    })
  })

  describe('sendMessageSchema', () => {
    it('accepts valid text', () => {
      const parsed = sendMessageSchema.safeParse({
        message_text: 'Hello, we would like to book 15 pax.',
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.message_text).toBe('Hello, we would like to book 15 pax.')
      }
    })

    it('rejects empty or whitespace-only message', () => {
      const empty = sendMessageSchema.safeParse({ message_text: '' })
      expect(empty.success).toBe(false)

      const whitespace = sendMessageSchema.safeParse({ message_text: '    ' })
      expect(whitespace.success).toBe(false)
    })

    it('rejects message exceeding 4000 characters (BR-007)', () => {
      const tooLong = sendMessageSchema.safeParse({
        message_text: 'a'.repeat(4001),
      })
      expect(tooLong.success).toBe(false)

      const exact4000 = sendMessageSchema.safeParse({
        message_text: 'a'.repeat(4000),
      })
      expect(exact4000.success).toBe(true)
    })
  })

  describe('historyQuerySchema', () => {
    it('defaults limit to 50', () => {
      const parsed = historyQuerySchema.safeParse({})
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.limit).toBe(50)
      }
    })

    it('caps limit at 50', () => {
      const over50 = historyQuerySchema.safeParse({ limit: 100 })
      expect(over50.success).toBe(false)
    })
  })
})

