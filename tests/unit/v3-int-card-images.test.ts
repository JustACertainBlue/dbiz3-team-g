/** UI v3 integration Step 2 item 11: an experience without a photo uses its village cover; a village without any image hides the experience from lists and AI results (detail pages stay reachable). */
import { describe, expect, it } from 'vitest'
import type { ExploreSeed } from '@/lib/explore/catalog'
import { cardImage, cardView, listableRows } from '@/lib/explore/v3-home'
import { searchExperiences, parseSearch } from '@/lib/explore/v3-search'
import { eligibleRows } from '@/lib/explore/catalog'

const NOW = new Date('2026-11-18T03:00:00.000Z')
function seed(): ExploreSeed {
  return {
    villages: [{ village_id: 'v1', name: 'Bát Tràng', district: 'Gia Lâm', city_province: 'Hà Nội', is_active: 'true', distance_km: '13' }],
    user_accounts: [{ user_id: 'u1', account_status: 'Active', full_name: 'Kiều Anh Thư' }],
    provider_profiles: [{ provider_id: 'p1', user_id: 'u1', village_id: 'v1', verification_status: 'Verified', published_version_no: '1', parking_note: 'Bãi đỗ xe 45 chỗ cách xưởng 3 phút đi bộ.' }],
    provider_profile_versions: [{ provider_id: 'p1', version_no: '1', version_status: 'Verified', business_name: 'Xưởng thủ công Bát Tràng', craft_type: 'Ceramics', contact_information: '{"phone_number":"+84 912 000 101","business_email":"x@example.invalid"}' }],
    experiences: [{
      experience_id: 'e1', provider_id: 'p1', name: 'Nặn gốm thủ công', category: 'Workshop/Hands-on', duration_minutes: '60', max_participants: '12', price_per_person: '150000',
      notice_period_hours: '24', archived_at: '', cancellation_policy: '{"rules":[{"threshold_hours":24,"fee_percentage":20}]}',
      description: 'Tự tay làm từ đầu đến cuối: khách ngồi vào bàn xoay.\n\nKhông cần chuẩn bị gì: xưởng có sẵn đất sét.',
      highlights: '[{"title":"Tự tay làm trên bàn xoay","sub":"Nghệ nhân kèm từng bước"},{"title":"Mang sản phẩm về","sub":"Mỗi khách một bát"}]',
      inclusions: '{"per_guest":["1 chỗ bàn xoay","Đất sét"],"included":["Bàn xoay riêng"],"take_home":true,"notes":{"trong_buoi":"Nước uống cho khách\\nNhà vệ sinh","chup_anh":"Được chụp ảnh miễn phí.","an_toan":"","luu_y":"Mặc đồ thoải mái"}}',
      guide_languages: '["Tiếng Việt","Tiếng Anh cơ bản"]', child_policy: 'Phù hợp với trẻ từ 6 tuổi.', suitable_for: '["Đoàn học sinh","Tour nửa ngày"]',
    }],
    agency_profiles: [], agency_preference_profiles: [], profile_media: [], stored_files: [],
    experience_discount_rules: [{ rule_id: 'r1', experience_id: 'e1', rule_kind: 'Group Discount', pax_threshold: '10', discount_percentage: '5' }],
    provider_operating_hours: [1, 2, 3, 4, 5].map(weekday => ({ operating_hour_id: `h${weekday}`, provider_id: 'p1', weekday: String(weekday), local_start: '08:00:00', local_end: '17:00:00' })),
    bookings: [
      { booking_id: 'b1', provider_id: 'p1', experience_id: 'e1', agency_id: 'a', status: 'On hold', start_at: '2026-11-25T01:00:00.000Z', end_at: '2026-11-25T10:00:00.000Z', group_size: '8' },
      { booking_id: 'b2', provider_id: 'p1', experience_id: 'e1', agency_id: 'a', status: 'Booked', start_at: '2026-11-26T01:00:00.000Z', end_at: '2026-11-26T10:00:00.000Z', group_size: '8' },
      { booking_id: 'b3', provider_id: 'p1', experience_id: 'e1', agency_id: 'a', status: 'Booked', start_at: '2026-11-24T07:00:00.000Z', end_at: '2026-11-24T08:00:00.000Z', group_size: '8' },
    ],
  }
}
const COVER = { file_id: 'f-cover', storage_key: 'prf-media/f-cover', media_type: 'image/webp', file_size_bytes: '1000', width_px: '1600', height_px: '900' }
const withCover = (data: ExploreSeed) => ({ ...data, villages: data.villages.map(v => ({ ...v, cover_image_id: 'f-cover' })), stored_files: [...data.stored_files, COVER] })
const viewer = { kind: 'guest' as const }
const search = (data: ExploreSeed) => searchExperiences(data, parseSearch({}), viewer)

describe('card image', () => {
  it('experience without a photo uses the village cover', () => {
    const data = withCover(seed())
    const row = eligibleRows(data)[0]
    expect(JSON.stringify(cardImage(data, row))).toContain('f-cover')
    expect(cardView(data, row, []).image).not.toBeNull()
  })
  it('a village with no image at all hides the experience from lists (home, search)', () => {
    const data = seed()
    expect(eligibleRows(data)).toHaveLength(1)           // still a live experience: detail page keeps working
    expect(listableRows(data)).toHaveLength(0)
    expect(search(data).total).toBe(0)
  })
  it('with a cover the same experience is listed', () => {
    const data = withCover(seed())
    expect(listableRows(data)).toHaveLength(1)
    expect(search(data).total).toBe(1)
  })
})
