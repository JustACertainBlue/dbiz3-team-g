/**
 * Screen 22 (mockup 22): /api/ait/matching adds, per experience, the card data of screen 02 (image, craft label,
 * duration, highlights) and the group price from the existing priceFor. Only additions; ranking is untouched.
 */
import { describe, expect, it } from 'vitest'
import type { ExploreSeed } from '@/lib/explore/catalog'
import { matchingCardView, profileGuests } from '@/lib/matching/card-data'

const seed = {
  villages: [{ village_id: 'v1', name: 'Bát Tràng', district: 'Gia Lâm', city_province: 'Hà Nội', is_active: 'true', distance_km: '13' }],
  user_accounts: [{ user_id: 'u1', account_status: 'Active' }],
  provider_profiles: [{ provider_id: 'p1', user_id: 'u1', village_id: 'v1', verification_status: 'Verified', published_version_no: '1' }],
  provider_profile_versions: [{ provider_id: 'p1', version_no: '1', version_status: 'Verified', business_name: 'Xưởng thủ công Bát Tràng', craft_type: 'Ceramics' }],
  experiences: [{ experience_id: 'e1', provider_id: 'p1', name: 'Nặn gốm thủ công', category: 'Workshop/Hands-on', description: '', duration_minutes: '60', max_participants: '12',
    price_per_person: '150000', notice_period_hours: '24', archived_at: '', inclusions: '{"included":["Đất sét"],"take_home":true}', highlights: '["Tự tay nặn","Mang bát về","Đã gồm đất","Thêm"]' }],
  agency_profiles: [], agency_preference_profiles: [], profile_media: [], stored_files: [],
  experience_discount_rules: [{ rule_id: 'r1', experience_id: 'e1', rule_kind: 'Group Discount', pax_threshold: '10', discount_percentage: '5' }],
  provider_operating_hours: [], bookings: [],
} as unknown as ExploreSeed

describe('matchingCardView', () => {
  it('returns craft, duration/capacity tags and the first three highlights', () => {
    const card = matchingCardView(seed, 'e1', null)!
    expect(card.id).toBe('e1')
    expect(card.craft).not.toBe('')
    expect(card.tags).toContain('Tối đa 12 khách/ca')
    expect(card.highlights).toEqual(['Tự tay nặn', 'Mang bát về', 'Đã gồm đất'])
    expect('image' in card).toBe(true)
  })
  it('no guest count → price per person', () => {
    expect(matchingCardView(seed, 'e1', null)!.price).toEqual({ kind: 'from', perPerson: 150000 })
  })
  it('guest count known → group price with the group discount (existing priceFor)', () => {
    expect(matchingCardView(seed, 'e1', 12)!.price).toEqual({ kind: 'group', guests: 12, total: 1710000, old: 1800000, note: 'Giảm 5% giá đoàn' })
  })
  it('unknown experience → null', () => {
    expect(matchingCardView(seed, 'nope', 12)).toBeNull()
  })
})

describe('profileGuests', () => {
  it('reads the group size the AI understood', () => {
    expect(profileGuests({ hard_constraints: { group_size: 25 } })).toBe(25)
  })
  it('missing or invalid → null (price per person)', () => {
    expect(profileGuests({ hard_constraints: {} })).toBeNull()
    expect(profileGuests({})).toBeNull()
    expect(profileGuests(null)).toBeNull()
    expect(profileGuests({ hard_constraints: { group_size: 0 } })).toBeNull()
  })
})
