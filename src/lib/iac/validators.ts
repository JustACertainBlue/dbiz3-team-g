import { z } from 'zod'

export const chatSourceSchema = z.enum([
  'AI Matching',
  'Explore',
  'Provider Profile',
  'Quote Request',
  'Booking',
])

export const openSessionSchema = z.object({
  recipient_id: z.string().uuid({ message: 'recipient_id must be a valid UUID' }),
  source: chatSourceSchema,
  experience_id: z.string().uuid().nullable().optional(),
  quote_request_id: z.string().uuid().nullable().optional(),
  booking_id: z.string().uuid().nullable().optional(),
}).refine(
  data => {
    if (data.source === 'Quote Request') return Boolean(data.quote_request_id)
    return true
  },
  { message: 'quote_request_id is required when source is Quote Request', path: ['quote_request_id'] }
).refine(
  data => {
    if (data.source === 'Booking') return Boolean(data.booking_id)
    return true
  },
  { message: 'booking_id is required when source is Booking', path: ['booking_id'] }
)

export const sendMessageSchema = z.object({
  message_text: z
    .string({ required_error: 'message_text is required' })
    .trim()
    .min(1, { message: 'Message text cannot be empty or whitespace only' })
    .max(4000, { message: 'Message text cannot exceed 4000 characters' }),
})

export const historyQuerySchema = z.object({
  before_cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
})

