/**
 * UI v3 Đợt 1, screen 24 (/explore/providers/[id], DSC122 Agency / DSC123 Guest), human decisions 2026-11-18 #4,
 * #5, #9, #10: workshop highlights, "Xưởng hợp với", "Bạn và xưởng này", month calendar, info rows, FAQ.
 */
import { describe, expect, it } from 'vitest'
import type { ExploreSeed } from '@/lib/explore/catalog'
import { monthCalendar, providerView } from '@/lib/explore/v3-provider'
import { withVillageCovers } from '../helpers/village-covers'

const NOW = new Date('2026-11-18T03:00:00.000Z')
const seed = () => withVillageCovers(rawSeed())
function rawSeed(): ExploreSeed {
  return {
    villages: [
      { village_id: 'v1', name: 'Bát Tràng', district: 'Gia Lâm', city_province: 'Hà Nội', is_active: 'true', distance_km: '13' },
      { village_id: 'v2', name: 'Vạn Phúc', district: 'Hà Đông', city_province: 'Hà Nội', is_active: 'true' },
    ],
    user_accounts: [{ user_id: 'u1', account_status: 'Active', full_name: 'Kiều Anh Thư' }, { user_id: 'u2', account_status: 'Active', full_name: 'Lê Văn B' }],
    provider_profiles: [
      { provider_id: 'p1', user_id: 'u1', village_id: 'v1', verification_status: 'Verified', published_version_no: '1', founded_year: '2006', parking_note: 'Bãi đỗ xe 45 chỗ, đi bộ 3 phút đến xưởng' },
      { provider_id: 'p2', user_id: 'u2', village_id: 'v2', verification_status: 'Verified', published_version_no: '1' },
    ],
    provider_profile_versions: [
      { provider_id: 'p1', version_no: '1', version_status: 'Verified', business_name: 'Xưởng thủ công Bát Tràng', craft_type: 'Ceramics', location_address: 'Bát Tràng, Gia Lâm, Hà Nội', description: 'Xưởng gia đình ba thế hệ: chuyên gốm men lam.', contact_information: '{"phone_number":"+84 912 000 101","business_email":"x@example.invalid"}' },
      { provider_id: 'p2', version_no: '1', version_status: 'Verified', business_name: 'Xưởng gốm Vạn Phúc', craft_type: 'Ceramics', location_address: 'Vạn Phúc' },
    ],
    experiences: [
      { experience_id: 'e1', provider_id: 'p1', name: 'Nặn gốm thủ công', category: 'Workshop/Hands-on', duration_minutes: '60', max_participants: '12', price_per_person: '150000', notice_period_hours: '24', archived_at: '', guide_languages: '["Tiếng Việt","Tiếng Anh cơ bản"]', suitable_for: '["Đoàn học sinh","Tour nửa ngày"]', child_policy: 'Trẻ từ 6 tuổi tham gia được.' },
      { experience_id: 'e2', provider_id: 'p1', name: 'Vẽ men lam', category: 'Workshop/Hands-on', duration_minutes: '90', max_participants: '10', price_per_person: '180000', notice_period_hours: '24', archived_at: '', suitable_for: '["Khách quốc tế","Đoàn học sinh"]' },
      { experience_id: 'e3', provider_id: 'p2', name: 'Gốm Vạn Phúc', category: 'Workshop/Hands-on', duration_minutes: '60', max_participants: '10', price_per_person: '100000', notice_period_hours: '24', archived_at: '' },
    ],
    agency_profiles: [], agency_preference_profiles: [], profile_media: [], stored_files: [], experience_discount_rules: [],
    provider_operating_hours: [1, 2, 3, 4, 5].map(weekday => ({ operating_hour_id: `h${weekday}`, provider_id: 'p1', weekday: String(weekday), local_start: '08:00:00', local_end: '17:00:00' })),
    bookings: [
      { booking_id: 'b1', provider_id: 'p1', experience_id: 'e1', agency_id: 'ag', status: 'On hold', start_at: '2026-11-25T01:00:00.000Z', end_at: '2026-11-25T10:00:00.000Z', created_at: '2026-11-17T00:00:00.000Z', group_size: '10' },
      { booking_id: 'b2', provider_id: 'p1', experience_id: 'e2', agency_id: 'ag', status: 'Completed', start_at: '2026-10-10T01:00:00.000Z', end_at: '2026-10-10T10:00:00.000Z', created_at: '2026-10-01T00:00:00.000Z', group_size: '8' },
      { booking_id: 'b3', provider_id: 'p1', experience_id: 'e1', agency_id: 'other', status: 'Booked', start_at: '2026-11-26T01:00:00.000Z', end_at: '2026-11-26T10:00:00.000Z', created_at: '2026-11-01T00:00:00.000Z', group_size: '8' },
    ],
  }
}
const agency = { kind: 'agency' as const, agencyId: 'ag' }
const guest = { kind: 'guest' as const }

describe('providerView', () => {
  it('header, owner, contact for the Agency, highlights, suitable-for union, info rows', () => {
    const view = providerView(seed(), 'p1', agency, NOW, false)!
    expect(view).toMatchObject({ initials: 'BT', eyebrow: 'GỐM SỨ · LÀNG BÁT TRÀNG', name: 'Xưởng thủ công Bát Tràng', address: 'Bát Tràng, Gia Lâm, Hà Nội' })
    expect(view.owner).toEqual({ initials: 'AT', name: 'Kiều Anh Thư', title: 'Chủ xưởng', phone: '+84 912 000 101', email: 'x@example.invalid' })
    expect(view.highlights).toEqual([
      { title: 'Xưởng mở từ năm 2006', sub: '20 năm làm nghề' },
      { title: 'Nhận đoàn tới 12 khách/ca', sub: 'Đoàn đông hơn chia thành nhiều ca' },
      { title: 'Hướng dẫn tiếng Việt, tiếng Anh cơ bản', sub: 'Ngôn ngữ hướng dẫn' },
      { title: 'Nhận đoàn Thứ 2 – Thứ 6', sub: '08:00 – 17:00' },
    ])
    expect(view.suitableFor).toEqual(['Đoàn học sinh', 'Khách quốc tế', 'Tour nửa ngày']) // vocabulary order
    expect(view.info.map(row => row.label)).toEqual(['Địa chỉ', 'Giờ nhận đoàn', 'Sức chứa', 'Ngôn ngữ hướng dẫn', 'Đỗ xe', 'Điện thoại', 'Email'])
    expect(view.info[0].value).toBe('Bát Tràng, Gia Lâm, Hà Nội · cách trung tâm khoảng 13 km')
    expect(view.info[1].value).toBe('Thứ 2 – Thứ 6, 08:00–17:00')
    expect(view.experiences.map(card => card.id)).toEqual(['e1', 'e2'])
    expect(view.similar.map(card => card.id)).toEqual(['e3'])
  })
  it('"Bạn và xưởng này": the Agency bookings with this workshop, latest first, On hold = "đang chờ thanh toán"', () => {
    expect(providerView(seed(), 'p1', agency, NOW, false)!.together).toEqual({ count: 2, latest: 'Nặn gốm thủ công · 25/11', status: 'đang chờ thanh toán', href: '/agency/ag/bookings' })
  })
  it('Guest: no phone, email or "Bạn và xưởng này"', () => {
    const view = providerView(seed(), 'p1', guest, NOW, false)!
    expect(view.owner.phone).toBeNull()
    expect(view.together).toBeNull()
    expect(view.info.map(row => row.label)).not.toContain('Điện thoại')
  })
  it('FAQ: capacity, parking, children, contact, weekend; payment only with the flag', () => {
    expect(providerView(seed(), 'p1', agency, NOW, false)!.faq.map(item => item.q)).toEqual([
      'Xưởng nhận đoàn bao nhiêu khách?', 'Xe đoàn đỗ ở đâu?', 'Trẻ nhỏ tham gia được không?', 'Làm sao liên hệ với xưởng?', 'Xưởng có nhận đoàn cuối tuần?'])
    expect(providerView(seed(), 'p1', agency, NOW, true)!.faq.map(item => item.q)).toContain('Thanh toán cho xưởng thế nào?')
  })
  it('null for an unknown or unpublished workshop', () => {
    expect(providerView(seed(), 'nope', guest, NOW, false)).toBeNull()
  })
})

describe('monthCalendar', () => {
  it('marks past, free, held, booked and closed days of the month', () => {
    const month = monthCalendar(seed(), 'p1', '2026-11', NOW)
    const day = (n: number) => month.days.find(item => item.day === n)!
    expect(month.title).toBe('Tháng 11/2026')
    expect(month.leading).toBe(6)
    expect([day(17).state, day(18).state, day(24).state, day(25).state, day(26).state, day(28).state]).toEqual(['past', 'free', 'free', 'hold', 'busy', 'off'])
    expect(month.prev).toBe('2026-10')
    expect(month.next).toBe('2026-12')
  })
})
