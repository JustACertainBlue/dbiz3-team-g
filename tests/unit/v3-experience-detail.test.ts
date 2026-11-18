/**
 * UI v3 Đợt 1, screens 04 (Tour Agency) and 23 (Guest) on /explore/experiences/[id] (human decisions 2026-11-18
 * #3, #4, #5, #9): view model of the detail page.
 */
import { describe, expect, it } from 'vitest'
import type { ExploreSeed } from '@/lib/explore/catalog'
import { aboutParagraphs, cancellationRows, detailView, slotRows, weekNote } from '@/lib/explore/v3-detail'

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
const SLOTS = [
  { slot_id: 's2', experience_id: 'e1', label: 'Ca chiều', start_time: '14:00:00', end_time: '15:00:00', weekdays: '[1,2,3,4,5]' },
  { slot_id: 's1', experience_id: 'e1', label: 'Ca sáng', start_time: '08:30:00', end_time: '09:30:00', weekdays: '[1,2,3,4,5]' },
  { slot_id: 's3', experience_id: 'e1', label: 'Ca tối', start_time: '18:00:00', end_time: '19:00:00', weekdays: '[6]' },
]
const agency = { kind: 'agency' as const, agencyId: 'ag' }
const guest = { kind: 'guest' as const }

describe('aboutParagraphs', () => {
  it('splits on blank lines and bolds a short "Title:" prefix', () => {
    expect(aboutParagraphs('Tự tay làm: khách ngồi.\n\nKhông có tiêu đề ở đây, chỉ là câu dài hơn bốn mươi ký tự: thật vậy.'))
      .toEqual([{ lead: 'Tự tay làm:', text: ' khách ngồi.' }, { lead: '', text: 'Không có tiêu đề ở đây, chỉ là câu dài hơn bốn mươi ký tự: thật vậy.' }])
  })
})

describe('cancellationRows', () => {
  it('turns fee rules into refund rows', () => {
    expect(cancellationRows('{"rules":[{"threshold_hours":24,"fee_percentage":20}]}')).toEqual([{ when: 'Báo huỷ trước 24 giờ', what: 'Hoàn 80% số tiền đã trả.', short: 'Huỷ trước 24 giờ: hoàn 80% số tiền' }])
    expect(cancellationRows('')).toEqual([])
  })
})

describe('slotRows', () => {
  it('lists the free slots of that weekday, earliest first, with the fit note', () => {
    const rows = slotRows(seed(), SLOTS, 'e1', '2026-11-24', 10)
    expect(rows.map(row => [row.label, row.time])).toEqual([['Ca sáng', '08:30 – 09:30']])
    expect(rows[0].fit).toBe('Vừa cho đoàn 10 khách trong một ca')
  })
  it('a group larger than max_participants gets the split note', () => {
    expect(slotRows(seed(), SLOTS, 'e1', '2026-11-24', 20)[0].fit).toBe('Đoàn 20 khách cần chia thành nhiều ca')
  })
})

describe('weekNote', () => {
  it('names the held, full and closed days of that week', () => {
    expect(weekNote(seed(), 'p1', '2026-11-24')).toBe('Thứ Tư đã có đoàn giữ chỗ, Thứ Năm đã kín lịch. Xưởng nghỉ Thứ Bảy và Chủ nhật.')
  })
})

describe('detailView', () => {
  it('Agency: header, owner with phone, highlights, group box with discount, inclusions, policies', () => {
    const view = detailView(seed(), 'e1', agency, { date: '2026-11-24', guests: 10 }, SLOTS, false)!
    expect(view.eyebrow).toBe('GỐM SỨ · LÀNG BÁT TRÀNG')
    expect(view.providerLine).toBe('Xưởng thủ công Bát Tràng · Bát Tràng, Gia Lâm, Hà Nội')
    expect(view.owner).toEqual({ initials: 'AT', name: 'Kiều Anh Thư', title: 'Chủ Xưởng thủ công Bát Tràng', phone: '+84 912 000 101' })
    expect(view.highlights).toEqual([{ title: 'Tự tay làm trên bàn xoay', sub: 'Nghệ nhân kèm từng bước' }, { title: 'Mang sản phẩm về', sub: 'Mỗi khách một bát' }])
    expect(view.group.price).toEqual({ kind: 'group', guests: 10, total: 1425000, old: 1500000, note: 'Giảm 5% giá đoàn' })
    expect(view.group.perGuest).toEqual(['1 chỗ bàn xoay', 'Đất sét'])
    expect(view.group.cancel).toBe('Huỷ trước 24 giờ: hoàn 80% số tiền')
    expect(view.suitableFor).toEqual(['Đoàn học sinh', 'Tour nửa ngày'])
    expect(view.halfDay).toEqual({ lines: ['60 phút tại xưởng, đoàn vẫn kịp ghép thêm một điểm tham quan', 'Nhận đoàn Thứ 2 đến Thứ 6, từ 08:00 đến 17:00'], extras: ['Sản phẩm mang về cho từng khách', 'Bàn xoay riêng'] })
    expect(view.includes.map(group => group.title)).toEqual(['Đã gồm trong giá', 'Sản phẩm mang về', 'Lưu ý cho đoàn', 'Ngôn ngữ hướng dẫn', 'Thời lượng & số khách', 'Trong buổi trải nghiệm', 'Chụp ảnh, quay phim'])
    expect(view.policies.map(row => row.title)).toEqual(['Đặt trước', 'Giữ chỗ', 'Huỷ đặt chỗ', 'Số khách', 'Trẻ em'])
    expect(view.faq.map(item => item.q)).toEqual(['Giá đã niêm yết, sao còn phải gửi yêu cầu?', 'Tôi muốn đổi ngày hoặc số khách?', 'Đoàn đông hơn 12 khách thì sao?', 'Xưởng cách trung tâm Hà Nội bao xa?'])
    expect(view.faq[3].a).toBe('Khoảng 13 km. Bãi đỗ xe 45 chỗ cách xưởng 3 phút đi bộ.')
  })
  it('payment rows and FAQ only with PAYMENTS_ENABLED', () => {
    const view = detailView(seed(), 'e1', agency, { date: '', guests: null }, [], true)!
    expect(view.policies.map(row => row.title)).toContain('Hình thức thanh toán')
    expect(view.faq.map(item => item.q)).toContain('Khi nào tôi phải thanh toán?')
    expect(view.faq.map(item => item.q)).toContain('Đã thanh toán mà xưởng chưa xác nhận thì sao?')
  })
  it('Guest: no phone, group price locked', () => {
    const view = detailView(seed(), 'e1', guest, { date: '2026-11-24', guests: 10 }, SLOTS, false)!
    expect(view.owner.phone).toBeNull()
    expect(view.group.price).toEqual({ kind: 'locked', perPerson: 150000 })
  })
  it('returns null for an unknown experience', () => {
    expect(detailView(seed(), 'nope', guest, { date: '', guests: null }, [], false)).toBeNull()
  })
})
