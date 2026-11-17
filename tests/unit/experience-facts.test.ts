import { describe, expect, it } from 'vitest'
import { formatExperienceCapacity, formatExperienceDuration } from '@/lib/experience-facts'

describe('experience facts display', () => {
  it('shows missing capacity and duration explicitly', () => {
    expect(formatExperienceCapacity(null)).toBe('Chưa có dữ liệu')
    expect(formatExperienceDuration(null)).toBe('Chưa có dữ liệu')
  })

  it('formats known capacity and duration', () => {
    expect(formatExperienceCapacity(16)).toBe('Tối đa 16 khách')
    expect(formatExperienceDuration(90)).toBe('1 giờ 30 phút')
  })
})
