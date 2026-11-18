/**
 * UI v3 Đợt 1, screen 02 /explore/search (human decision 2026-11-18 #1): keyword without diacritics over experience
 * name, craft and village; guests → max_participants >= guests; date → lib/explore/availability.ts; filters, sort and
 * pagination as mockup 02 (7 per page: "Hiển thị 1–7 / 12 trải nghiệm").
 */
import { describe, expect, it } from 'vitest'
import type { ExploreSeed } from '@/lib/explore/catalog'
import { foldText, parseSearch, searchExperiences } from '@/lib/explore/v3-search'

function seed(): ExploreSeed {
  const village = (id: string, name: string, district: string, km = '') => ({ village_id: id, name, district, city_province: 'Hà Nội', is_active: 'true', distance_km: km })
  const exp = (id: string, provider: string, name: string, minutes: number, max: number, price: number, extra: Record<string, string> = {}) =>
    ({ experience_id: id, provider_id: provider, name, category: 'Workshop/Hands-on', description: '', duration_minutes: String(minutes), max_participants: String(max), price_per_person: String(price), notice_period_hours: '24', archived_at: '', ...extra })
  return {
    villages: [village('v1', 'Bát Tràng', 'Gia Lâm', '13'), village('v2', 'Vạn Phúc', 'Hà Đông'), village('v3', 'Đào Thục', 'Đông Anh')],
    user_accounts: ['u1', 'u2', 'u3'].map(user_id => ({ user_id, account_status: 'Active' })),
    provider_profiles: [
      { provider_id: 'p1', user_id: 'u1', village_id: 'v1', verification_status: 'Verified', published_version_no: '1' },
      { provider_id: 'p2', user_id: 'u2', village_id: 'v2', verification_status: 'Verified', published_version_no: '1' },
      { provider_id: 'p3', user_id: 'u3', village_id: 'v3', verification_status: 'Verified', published_version_no: '1' },
    ],
    provider_profile_versions: [
      { provider_id: 'p1', version_no: '1', version_status: 'Verified', business_name: 'Xưởng thủ công Bát Tràng', craft_type: 'Ceramics' },
      { provider_id: 'p2', version_no: '1', version_status: 'Verified', business_name: 'Xưởng dệt Vạn Phúc', craft_type: 'Silk/Textile' },
      { provider_id: 'p3', version_no: '1', version_status: 'Verified', business_name: 'Xưởng rối Đào Thục', craft_type: 'Other' },
    ],
    experiences: [
      exp('e1', 'p1', 'Nặn gốm thủ công', 60, 12, 150000, { inclusions: '{"included":["Đất sét"],"take_home":true}', highlights: '["Tự tay nặn","Mang bát về","Đã gồm đất","Thêm"]' }),
      exp('e2', 'p2', 'Dệt lụa truyền thống', 100, 13, 175000),
      exp('e3', 'p3', 'Học rối nước', 150, 18, 300000),
      exp('e4', 'p1', 'Vẽ men lam', 90, 8, 180000),
    ],
    agency_profiles: [], agency_preference_profiles: [], profile_media: [], stored_files: [],
    experience_discount_rules: [
      { rule_id: 'r1', experience_id: 'e1', rule_kind: 'Group Discount', pax_threshold: '10', discount_percentage: '5' },
      { rule_id: 'r3', experience_id: 'e3', rule_kind: 'Group Discount', pax_threshold: '11', discount_percentage: '11' },
    ],
    provider_operating_hours: [
      ...[1, 2, 3, 4, 5].map(weekday => ({ operating_hour_id: `h1-${weekday}`, provider_id: 'p1', weekday: String(weekday), local_start: '08:00:00', local_end: '17:00:00' })),
      ...[1, 2, 3, 4, 5].map(weekday => ({ operating_hour_id: `h2-${weekday}`, provider_id: 'p2', weekday: String(weekday), local_start: '08:00:00', local_end: '17:00:00' })),
    ],
    bookings: [
      { booking_id: 'b1', provider_id: 'p2', experience_id: 'e2', agency_id: 'a', status: 'On hold', start_at: '2026-11-24T01:00:00.000Z', end_at: '2026-11-24T10:00:00.000Z', hold_expires_at: '2026-11-30T00:00:00.000Z', group_size: '10' },
    ],
  }
}
const agency = { kind: 'agency' as const, agencyId: 'ag' }
const guest = { kind: 'guest' as const }
const run = (query: Record<string, string | string[]>, viewer: typeof agency | typeof guest = agency) => searchExperiences(seed(), parseSearch(query), viewer, true)
const ids = (query: Record<string, string | string[]>) => run(query).items.map(item => item.id)

describe('foldText', () => {
  it('removes Vietnamese diacritics and đ', () => {
    expect(foldText('Đào Thục — Nặn GỐM')).toBe('dao thuc — nan gom')
  })
})

describe('keyword, guests, filters', () => {
  it('matches the keyword without diacritics on name, craft and village', () => {
    expect(ids({ q: 'gom' }).sort()).toEqual(['e1', 'e4'])
    expect(ids({ q: 'dao thuc' })).toEqual(['e3'])
    expect(ids({ q: 'det lua' })).toEqual(['e2'])
  })
  it('keeps experiences whose max_participants >= guests', () => {
    expect(ids({ guests: '10' }).sort()).toEqual(['e1', 'e2', 'e3'])
  })
  it('filters by craft, budget, duration, capacity, village', () => {
    expect(ids({ nghe: 'Ceramics' }).sort()).toEqual(['e1', 'e4'])
    expect(ids({ tu: '160000', den: '200000' }).sort()).toEqual(['e2', 'e4'])
    expect(ids({ tg: 'duoi-90' })).toEqual(['e1'])
    expect(ids({ tg: '90-120' }).sort()).toEqual(['e2', 'e4'])
    expect(ids({ tg: 'tren-120' })).toEqual(['e3'])
    expect(ids({ suc: '15' })).toEqual(['e3'])
    expect(ids({ lang: ['v2', 'v3'] }).sort()).toEqual(['e2', 'e3'])
  })
  it('"Chỉ hiện xưởng còn trống" keeps only experiences free on the chosen date', () => {
    expect(ids({ date: '2026-11-24', trong: '1' }).sort()).toEqual(['e1', 'e4'])
  })
  it('counts options in the facets', () => {
    const facets = run({}).facets
    expect(facets.crafts).toEqual([{ value: 'Ceramics', label: 'Gốm sứ', n: 2 }, { value: 'Other', label: 'Nghề khác', n: 1 }, { value: 'Silk/Textile', label: 'Dệt lụa', n: 1 }])
    expect(facets.durations.map(item => item.n)).toEqual([1, 2, 1])
  })
})

describe('sort and pagination', () => {
  it('sorts by price and by duration', () => {
    expect(ids({ sx: 'gia' })).toEqual(['e1', 'e2', 'e4', 'e3'])
    expect(ids({ sx: 'thoi-luong' })).toEqual(['e1', 'e4', 'e2', 'e3'])
  })
  it('shows 7 per page', () => {
    const result = run({})
    expect(result.pageSize).toBe(7)
    expect(result.total).toBe(4)
  })
})

describe('result view', () => {
  it('group price with discount for the chosen guests, tags, distance and included line', () => {
    const item = run({ guests: '10', date: '2026-11-24' }).items.find(row => row.id === 'e1')!
    expect(item.price).toEqual({ kind: 'group', guests: 10, total: 1425000, old: 1500000, note: 'Giảm 5% giá đoàn' })
    expect(item.tags).toEqual(['60 phút', 'Tối đa 12 khách/ca', 'Mang sản phẩm về', 'Đặt trước 24 giờ'])
    expect(item.distance).toBe('Cách trung tâm Hà Nội khoảng 13 km')
    expect(item.included).toBe(true)
    expect(item.highlights).toEqual(['Tự tay nặn', 'Mang bát về', 'Đã gồm đất'])
    expect(item.availability).toEqual({ ok: true, text: 'Còn trống ngày 24/11 · 08:00–17:00' })
  })
  it('a discount not reached is announced, and a held day suggests the next free day', () => {
    const items = run({ guests: '10', date: '2026-11-24' }).items
    expect(items.find(row => row.id === 'e3')!.price).toEqual({ kind: 'group', guests: 10, total: 3000000, old: null, note: 'Đoàn từ 11 khách giảm 11%' })
    expect(items.find(row => row.id === 'e2')!.availability).toEqual({ ok: false, text: 'Ngày 24/11 đã có đoàn giữ chỗ. Thử ngày 25/11' })
  })
  it('Guests never see the group price; without guests everyone sees "Giá từ"', () => {
    expect(run({ guests: '10' }, guest).items.find(row => row.id === 'e1')!.price).toEqual({ kind: 'locked', perPerson: 150000 })
    expect(run({}).items.find(row => row.id === 'e1')!.price).toEqual({ kind: 'from', perPerson: 150000 })
  })
})
