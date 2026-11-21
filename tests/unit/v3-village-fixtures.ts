// Shared fixture of tests/unit/v3-village*.test.ts (screens 03 and 03a).
import type { ExploreSeed } from '@/lib/explore/catalog'

export function seed(): ExploreSeed {
  return {
    villages: [
      { village_id: 'v1', name: 'Bát Tràng', district: 'Gia Lâm', city_province: 'Hà Nội', is_active: 'true', editorial_craft: 'Làm gốm', distance_km: '13.0',
        description: 'Làng gốm bên sông Hồng.\nNhiều gia đình làm gốm.',
        highlights: '[{"title":"Làng gốm lâu đời","sub":"Nhiều gia đình làm gốm"},{"title":"Xem nghệ nhân làm việc","sub":"Từ vuốt hình đến nung lò"},{"title":"Mua quà gốm","sub":"Chợ gốm quanh làng"}]',
        visit_notes: '{"trang_phuc":"Mặc đồ dễ giặt.","san_pham":"","gio_den":"Báo giờ đến trước một ngày."}',
        tour_suggestion_detail: '{"title":"Hợp cho tour nửa ngày!","lines":["Gần trung tâm"],"extras":["Mỗi khách mang về một sản phẩm"]}' },
      { village_id: 'v2', name: 'Vạn Phúc', district: 'Hà Đông', city_province: 'Hà Nội', is_active: 'true', editorial_craft: '', cover_image_id: 'fc' },
      { village_id: 'v3', name: 'Chuông', district: 'Thanh Oai', city_province: 'Hà Nội', is_active: 'true' },
      { village_id: 'v4', name: 'Làng cũ', district: '', city_province: 'Hà Nội', is_active: 'false', cover_image_id: 'fc' },
    ],
    user_accounts: [
      { user_id: 'u1', account_status: 'Active', full_name: 'Kiều Anh Thư' }, { user_id: 'u2', account_status: 'Active', full_name: 'Lê Văn B' },
      { user_id: 'u3', account_status: 'Active', full_name: 'Đỗ Minh Khoa' }, { user_id: 'u4', account_status: 'Active', full_name: 'Ngô C' },
    ],
    provider_profiles: [
      { provider_id: 'p1', user_id: 'u1', village_id: 'v1', verification_status: 'Verified', published_version_no: '1' },
      { provider_id: 'p2', user_id: 'u2', village_id: 'v2', verification_status: 'Verified', published_version_no: '1' },
      { provider_id: 'p3', user_id: 'u3', village_id: 'v1', verification_status: 'Verified', published_version_no: '1' },
      { provider_id: 'p4', user_id: 'u4', village_id: 'v3', verification_status: 'Verified', published_version_no: '1' },
    ],
    provider_profile_versions: [
      { provider_id: 'p1', version_no: '1', version_status: 'Verified', business_name: 'Xưởng thủ công Bát Tràng', craft_type: 'Ceramics' },
      { provider_id: 'p2', version_no: '1', version_status: 'Verified', business_name: 'Xưởng lụa Vạn Phúc', craft_type: 'Silk/Textile' },
      { provider_id: 'p3', version_no: '1', version_status: 'Verified', business_name: 'Xưởng gốm Gia Phúc', craft_type: 'Ceramics' },
      { provider_id: 'p4', version_no: '1', version_status: 'Verified', business_name: 'Xưởng nón Chuông', craft_type: 'Other' },
    ],
    experiences: [
      { experience_id: 'e1', provider_id: 'p1', name: 'Nặn gốm thủ công', category: 'Workshop/Hands-on', duration_minutes: '60', max_participants: '12', price_per_person: '150000', notice_period_hours: '24', archived_at: '', suitable_for: '["Tour nửa ngày","Đoàn học sinh"]' },
      { experience_id: 'e2', provider_id: 'p1', name: 'Vẽ men lam trên bát', category: 'Workshop/Hands-on', duration_minutes: '90', max_participants: '12', price_per_person: '180000', notice_period_hours: '24', archived_at: '', suitable_for: '["Khách quốc tế","Đoàn học sinh"]' },
      { experience_id: 'e3', provider_id: 'p3', name: 'In hoa văn lên đĩa gốm', category: 'Workshop/Hands-on', duration_minutes: '75', max_participants: '20', price_per_person: '160000', notice_period_hours: '24', archived_at: '' },
      { experience_id: 'e4', provider_id: 'p3', name: 'Nặn tượng nhỏ', category: 'Workshop/Hands-on', duration_minutes: '60', max_participants: '25', price_per_person: '120000', notice_period_hours: '24', archived_at: '' },
      { experience_id: 'e5', provider_id: 'p2', name: 'Dệt lụa', category: 'Workshop/Hands-on', duration_minutes: '120', max_participants: '16', price_per_person: '175000', notice_period_hours: '24', archived_at: '' },
      { experience_id: 'e6', provider_id: 'p4', name: 'Chằm nón', category: 'Workshop/Hands-on', duration_minutes: '90', max_participants: '10', price_per_person: '90000', notice_period_hours: '24', archived_at: '' },
    ],
    agency_profiles: [], agency_preference_profiles: [], experience_discount_rules: [], bookings: [],
    profile_media: [
      { profile_media_id: 'm2', file_id: 'f2', experience_id: 'e2', display_order: '0' },
      { profile_media_id: 'm1', file_id: 'f1', experience_id: 'e1', display_order: '0' },
      { profile_media_id: 'm3', file_id: 'f3', experience_id: 'e1', display_order: '1' },
    ],
    stored_files: [
      { file_id: 'f1', storage_key: 'prf-media/f1', media_type: 'image/jpeg' },
      { file_id: 'f2', storage_key: 'prf-media/f2', media_type: 'image/jpeg' },
      { file_id: 'f3', storage_key: 'prf-media/f3', media_type: 'image/jpeg' },
      { file_id: 'fc', storage_key: 'prf-media/fc', media_type: 'image/jpeg' },
    ],
    provider_operating_hours: [
      ...[1, 2, 3, 4, 5].map(day => ({ provider_id: 'p1', weekday: String(day), local_start: '08:00', local_end: '17:00' })),
      ...[1, 2, 3, 4, 5].map(day => ({ provider_id: 'p3', weekday: String(day), local_start: '08:00', local_end: '17:00' })),
    ],
  }
}
