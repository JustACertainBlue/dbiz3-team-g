/**
 * UI v3 Đợt 1, screens 01 (Guest) and 21 (Tour Agency) on /explore: quick filters, card view, village grid,
 * hold banner and "Gợi ý vì" (human decisions 2026-11-18 #1, #4, #5, #7, #9).
 */
import { describe, expect, it } from 'vitest'
import type { ExploreSeed } from '@/lib/explore/catalog'
import { eligibleRows } from '@/lib/explore/catalog'
import { applyQuickFilter, cardView, holdBanner, villageTiles, whyLine } from '@/lib/explore/v3-home'

const NOW = new Date('2026-11-16T03:00:00.000Z')
function seed(): ExploreSeed {
  return {
    villages: [
      { village_id: 'v1', name: 'Bát Tràng', district: 'Gia Lâm', city_province: 'Hà Nội', is_active: 'true', editorial_craft: 'Làm gốm' },
      { village_id: 'v2', name: 'Vạn Phúc', district: 'Hà Đông', city_province: 'Hà Nội', is_active: 'true', editorial_craft: '' },
      { village_id: 'v3', name: 'Chuông', district: 'Thanh Oai', city_province: 'Hà Nội', is_active: 'true' },
    ],
    user_accounts: [
      { user_id: 'u1', account_status: 'Active', role_code: 'Local_Provider' },
      { user_id: 'u2', account_status: 'Active', role_code: 'Local_Provider' },
      { user_id: 'u3', account_status: 'Active', role_code: 'Local_Provider' },
      { user_id: 'ua', account_status: 'Approved', role_code: 'Tour_Agency', full_name: 'Lý Gia Hân' },
    ],
    provider_profiles: [
      { provider_id: 'p1', user_id: 'u1', village_id: 'v1', verification_status: 'Verified', published_version_no: '1' },
      { provider_id: 'p2', user_id: 'u2', village_id: 'v2', verification_status: 'Verified', published_version_no: '1' },
      { provider_id: 'p3', user_id: 'u3', village_id: 'v1', verification_status: 'Verified', published_version_no: '1' },
    ],
    provider_profile_versions: [
      { provider_id: 'p1', version_no: '1', version_status: 'Verified', business_name: 'Xưởng A', craft_type: 'Ceramics' },
      { provider_id: 'p2', version_no: '1', version_status: 'Verified', business_name: 'Xưởng B', craft_type: 'Silk/Textile' },
      { provider_id: 'p3', version_no: '1', version_status: 'Verified', business_name: 'Xưởng C', craft_type: 'Ceramics' },
    ],
    experiences: [
      { experience_id: 'e1', provider_id: 'p1', name: 'Nặn gốm', category: 'Workshop/Hands-on', description: 'x', duration_minutes: '60', max_participants: '12', price_per_person: '150000', archived_at: '',
        highlights: '[{"title":"Tự tay nặn","sub":"a"},{"title":"Mang bát về","sub":"b"},{"title":"Đã gồm đất","sub":"c"},{"title":"Gọn 60 phút","sub":"d"}]', suitable_for: '["Đoàn học sinh","Tour văn hoá – di sản"]' },
      { experience_id: 'e2', provider_id: 'p2', name: 'Dệt lụa', category: 'Workshop/Hands-on', description: 'y', duration_minutes: '120', max_participants: '16', price_per_person: '175000', archived_at: '', highlights: '["Ngồi khung dệt","Mang lụa về"]' },
      { experience_id: 'e3', provider_id: 'p3', name: 'Vẽ men', category: 'Workshop/Hands-on', description: 'z', duration_minutes: '90', max_participants: '10', price_per_person: '180000', archived_at: '' },
    ],
    agency_profiles: [{ agency_id: 'ag1', user_id: 'ua', company_name: 'Công ty Du lịch Tràng An' }],
    agency_preference_profiles: [{ agency_id: 'ag1', preference_weights: '{"Tour văn hoá – di sản":0.7,"price":0.3}' }],
    profile_media: [
      { profile_media_id: 'm1', file_id: 'f1', experience_id: 'e1', display_order: '0' },
      { profile_media_id: 'm2', file_id: 'f2', experience_id: 'e2', display_order: '0' },
    ],
    stored_files: [
      { file_id: 'f1', storage_key: 'prf-media/f1', media_type: 'image/jpeg' },
      { file_id: 'f2', storage_key: 'seed/b.jpg', media_type: 'image/jpeg' },
    ],
    bookings: [
      { booking_id: 'b1', agency_id: 'ag1', experience_id: 'e1', provider_id: 'p1', status: 'On hold', start_at: '2026-11-24T02:00:00.000Z', group_size: '10', hold_expires_at: '2026-11-17T07:00:00.000Z' },
      { booking_id: 'b2', agency_id: 'ag1', experience_id: 'e2', provider_id: 'p2', status: 'Booked', start_at: '2026-11-25T02:00:00.000Z', group_size: '8', hold_expires_at: '' },
    ],
  }
}

describe('applyQuickFilter (Tất cả · Dưới 90 phút · Từ 90 phút trở lên · Ca từ 15 khách)', () => {
  const rows = eligibleRows(seed())
  const ids = (key: string | undefined) => applyQuickFilter(rows, key).map(row => row.experience.experience_id).sort()
  it('filters by duration and capacity', () => {
    expect(ids(undefined)).toEqual(['e1', 'e2', 'e3'])
    expect(ids('duoi-90')).toEqual(['e1'])
    expect(ids('tu-90')).toEqual(['e2', 'e3'])
    expect(ids('tu-15-khach')).toEqual(['e2'])
    expect(ids('unknown')).toEqual(['e1', 'e2', 'e3'])
  })
})

describe('cardView', () => {
  const data = seed()
  const rows = eligibleRows(data)
  const row = (id: string) => rows.find(item => item.experience.experience_id === id)!
  it('shows craft label, full location, duration/capacity, the first 3 highlight titles and "Giá từ" for everyone', () => {
    const card = cardView(data, row('e1'), [])
    expect(card).toMatchObject({ id: 'e1', craft: 'Gốm sứ', location: 'Bát Tràng, Gia Lâm, Hà Nội', meta: '60 phút · Tối đa 12 khách/ca', priceFrom: 150000, image: '/api/prf/media/f1' })
    expect(card.highlights).toEqual(['Tự tay nặn', 'Mang bát về', 'Đã gồm đất'])
  })
  it('reads the old highlights shape and formats hours', () => {
    expect(cardView(data, row('e2'), []).highlights).toEqual(['Ngồi khung dệt', 'Mang lụa về'])
    expect(cardView(data, row('e2'), []).meta).toBe('2 giờ · Tối đa 16 khách/ca')
  })
  it('has no image when the experience has none, or only a non-servable seed key', () => {
    expect(cardView(data, row('e3'), []).image).toBeNull()
    expect(cardView(data, row('e2'), []).image).toBeNull()
  })
})

describe('whyLine ("Gợi ý vì: Hợp …")', () => {
  it('lists the suitable_for terms that are also Agency preferences', () => {
    expect(whyLine('["Đoàn học sinh","Tour văn hoá – di sản"]', ['Tour văn hoá – di sản', 'price'])).toBe('Gợi ý vì: Hợp tour văn hoá – di sản')
  })
  it('maps the preference key "culture" to "Tour văn hoá – di sản" (explicit table, decision 2026-11-18 #2)', () => {
    expect(whyLine('["Tour văn hoá – di sản","Đoàn học sinh"]', ['culture', 'price'])).toBe('Gợi ý vì: Hợp tour văn hoá – di sản')
  })
  it('does not map price, category:* or provider:* keys', () => {
    expect(whyLine('["Tour văn hoá – di sản","Đoàn học sinh","Team building"]', ['price', 'category:Workshop/Hands-on', 'provider:p1'])).toBeNull()
  })
  it('is hidden (null) when nothing matches or a side is empty', () => {
    expect(whyLine('["Đoàn học sinh"]', ['culture', 'price'])).toBeNull()
    expect(whyLine('', ['Tour văn hoá – di sản'])).toBeNull()
  })
})

describe('villageTiles', () => {
  it('lists only villages with an image, most workshops first, with craft and area', () => {
    const tiles = villageTiles(seed())
    expect(tiles.map(tile => tile.village_id)).toEqual(['v1'])
    expect(tiles[0]).toMatchObject({ name: 'Bát Tràng', craft: 'Làm gốm', area: 'Gia Lâm, Hà Nội', providers: 2, image: '/api/prf/media/f1' })
  })
})

describe('holdBanner', () => {
  it('shows the Agency On hold booking that is still held, linking to its detail page', () => {
    expect(holdBanner(seed(), 'ag1', NOW)).toEqual({
      bookingId: 'b1', href: '/agency/ag1/bookings/b1', title: 'Nặn gốm · 24/11 · 10 khách',
      note: 'Xưởng đang giữ chỗ đến 14:00, 17/11. Thanh toán để chốt lịch cho đoàn.', image: '/api/prf/media/f1',
    })
  })
  it('is null without an active hold', () => {
    expect(holdBanner(seed(), 'ag1', new Date('2026-11-18T00:00:00.000Z'))).toBeNull()
    expect(holdBanner(seed(), 'other', NOW)).toBeNull()
  })
})
