import { describe, expect, it } from 'vitest'
import { postCheckMessage } from '@/lib/ait/postcheck'

describe('AIT booking-claim post-check', () => {
  it.each([
    'Tour đã đặt thành công.',
    'Mình đã xác nhận tour cho bạn.',
    'Đã chốt tour này cho đoàn.',
  ])('rejects an affirmative booking claim: %s', (message) => {
    const result = postCheckMessage({
      turnType: 'answer',
      message,
      fallback: 'Câu trả lời an toàn.',
    })

    expect(result.ok).toBe(false)
    expect(result.violations).toContain('booking_claim')
    expect(result.message).toBe('Câu trả lời an toàn.')
  })

  it('does not reject a clear statement that the AI cannot book or confirm a tour', () => {
    const result = postCheckMessage({
      turnType: 'answer',
      message: 'AI không tự đặt hoặc xác nhận tour.',
      fallback: 'Câu trả lời an toàn.',
    })

    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
  })

  it('rejects unsupported facility claims when the source cards do not verify them', () => {
    const result = postCheckMessage({
      turnType: 'answer',
      message: 'Bát Tràng có homestay. Phú Vinh sắp xếp bể bơi gần đó.',
      verifiedFacts: ['Bát Tràng có trải nghiệm làm gốm.'],
      fallback: 'Hiện chưa có dữ liệu về homestay và bể bơi.',
    })

    expect(result.ok).toBe(false)
    expect(result.violations).toContain('facility_claim')
    expect(result.message).toBe('Hiện chưa có dữ liệu về homestay và bể bơi.')
  })
})
