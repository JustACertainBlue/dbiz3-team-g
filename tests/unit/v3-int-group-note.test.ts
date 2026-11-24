/** UI v3 integration Step 2 item 8: the "Hoàn hảo cho…" box of 04/23 reads experiences.group_note; no hard-coded title. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { ExploreSeed } from '@/lib/explore/catalog'
import { detailView } from '@/lib/explore/v3-detail'

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
const agency = { kind: 'agency' as const, agencyId: 'ag' }
const withNote = (note: string | undefined, suitable = '["Đoàn học sinh"]') => {
  const data = seed()
  data.experiences = data.experiences.map(row => ({ ...row, suitable_for: suitable, ...(note === undefined ? {} : { group_note: note }) }))
  return detailView(data, 'e1', agency, { date: '', guests: null }, [], false)!
}

describe('perfect-for box', () => {
  it('shows the group_note as its title, whatever the chips are', () => {
    expect(withNote('Hoàn hảo cho đoàn học sinh!').perfect?.title).toBe('Hoàn hảo cho đoàn học sinh!')
    expect(withNote('  Hợp cho tour nửa ngày  ').perfect?.title).toBe('Hợp cho tour nửa ngày')
  })
  it('is hidden when group_note is missing or blank, even with the "Tour nửa ngày" chip', () => {
    expect(withNote(undefined, '["Tour nửa ngày"]').perfect).toBeNull()
    expect(withNote('   ', '["Tour nửa ngày"]').perfect).toBeNull()
  })
  it('keeps the body lines and extras', () => {
    const perfect = withNote('Ghi chú')!.perfect!
    expect(perfect.lines[0]).toContain('tại xưởng')
    expect(perfect.extras).toContain('Bàn xoay riêng')
  })
  it('04 and 23 render view.perfect and the old literal title is gone from the pages', () => {
    for (const path of ['src/app/explore/experiences/[id]/page.tsx', 'src/app/provider/[providerId]/experiences/[experienceId]/page.tsx']) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toContain('Hoàn hảo cho tour nửa ngày')
      expect(source, path).toContain('view.perfect')
    }
  })
})
