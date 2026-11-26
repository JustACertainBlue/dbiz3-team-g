import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { detectLeak, hasAffirmativeBookingClaim, postCheckReply, SAFE_REPLY } from '@/lib/ai/postcheck'
import * as sessionsRoute from '@/app/api/ait/sessions/route'
import * as messagesRoute from '@/app/api/ait/sessions/[id]/messages/route'
import { installFakeModel, restoreRealClients } from '../helpers/ait-fake-clients'

describe('detectLeak', () => {
  it.each([
    ['email', 'Liên hệ anh.nguyen@example.com nhé'],
    ['phone', 'Gọi 0912 345 678 để chốt'],
    ['secret', 'key là sk-abcdefghijklmnopqrstuvwxyz123'],
    ['internal_url', 'xem /api/ait/sessions/abc'],
  ])('finds a %s', (kind, text) => {
    expect(detectLeak(text)).toContain(kind)
  })

  it('a price is not a phone number', () => {
    expect(detectLeak('Giá 300.000đ mỗi khách, nhóm 10 người')).toEqual([])
  })
})

describe('hasAffirmativeBookingClaim', () => {
  it.each(['Tour của bạn đã được đặt thành công.', 'Lịch đã được xác nhận cho ngày 10/12.', 'Your tour is confirmed.'])('flags: %s', text => {
    expect(hasAffirmativeBookingClaim(text)).toBe(true)
  })

  it.each(['Bạn có thể gửi Yêu cầu báo giá để chốt lịch.', 'Xưởng chưa xác nhận lịch, bạn hãy chat với xưởng.'])('allows: %s', text => {
    expect(hasAffirmativeBookingClaim(text)).toBe(false)
  })
})

describe('postCheckReply', () => {
  it('keeps a clean reply', () => {
    expect(postCheckReply('Mình đã ghi nhận đoàn 10 khách.')).toEqual({ ok: true, message: 'Mình đã ghi nhận đoàn 10 khách.', violations: [] })
  })

  it('replaces a reply that claims a booking or leaks data, and names the violations only', () => {
    const result = postCheckReply('Tour đã được đặt. Gọi 0912345678.')
    expect(result.ok).toBe(false)
    expect(result.message).toBe(SAFE_REPLY)
    expect(result.violations.sort()).toEqual(['booking_claim', 'leak'])
  })
})

type Handler = (request: never, context?: never) => Promise<Response>
const POST_SESSIONS = (sessionsRoute as unknown as { POST: Handler }).POST
const POST_MESSAGES = (messagesRoute as unknown as { POST: Handler }).POST

describe('the reply of the model is checked before it is shown', () => {
  beforeEach(() => demoRepository().reset())
  afterEach(() => { vi.restoreAllMocks(); restoreRealClients() })

  it('a booking claim from the model never reaches the screen and nothing is logged about it', async () => {
    const call = async (handler: Handler, path: string, body: unknown, params?: Record<string, string>) => {
      const request = new Request(`http://localhost:3000${path}`, { method: 'POST', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const response = await handler(request as never, (params ? { params } : undefined) as never)
      return response.json() as Promise<Record<string, any>>
    }
    const { session_id: id } = await call(POST_SESSIONS, '/api/ait/sessions', {})
    installFakeModel({ conversational_reply: 'Tour của bạn đã được đặt thành công, gọi 0912345678.', extracted_context: { group_size: 10 } })
    const lines: string[] = []
    for (const level of ['log', 'info', 'warn', 'error'] as const) {
      vi.spyOn(console, level).mockImplementation((...args) => { lines.push(args.map(String).join(' ')) })
    }
    const result = await call(POST_MESSAGES, `/api/ait/sessions/${id}/messages`, { sender: 'Agency', text: 'Đoàn 10 khách' }, { id })
    expect(result.extraction.conversational_reply).toBe(SAFE_REPLY)
    expect(lines.join(' ')).not.toMatch(/0912345678|đã được đặt/)
  })
})
