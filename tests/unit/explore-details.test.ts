import { describe, expect, it } from 'vitest';
import { getExperienceDetail, getProviderDetail } from '../../src/lib/explore/details';
import type { ExploreSeed } from '../../src/lib/explore/catalog';

const agency = { kind: 'agency' as const, agencyId: 'agency-1' };
const guest = { kind: 'guest' as const };

function fixture(): ExploreSeed {
  return {
    experiences: [
      { experience_id: 'exp-1', provider_id: 'provider-1', name: 'Gốm', category: 'Workshop/Hands-on', description: 'Nặn gốm', duration_minutes: '60', max_participants: '8', price_per_person: '200000', notice_period_hours: '24', cancellation_policy: '{"before_hours":24}', archived_at: '', experience_location_address: 'Bát Tràng' },
      { experience_id: 'exp-2', provider_id: 'provider-1', name: 'Men gốm', category: 'Workshop/Hands-on', description: 'Trang trí gốm', duration_minutes: '90', max_participants: '8', price_per_person: '250000', archived_at: '' },
      { experience_id: 'exp-3', provider_id: 'provider-2', name: 'Gốm khác', category: 'Workshop/Hands-on', description: 'Làm gốm', duration_minutes: '90', max_participants: '8', price_per_person: '300000', archived_at: '' },
      { experience_id: 'exp-4', provider_id: 'provider-2', name: 'Ẩn', category: 'Workshop/Hands-on', description: 'Ẩn', duration_minutes: '90', max_participants: '8', price_per_person: '300000', archived_at: '2026-10-01T00:00:00Z' },
      { experience_id: 'exp-5', provider_id: 'provider-2', name: 'Thử lụa', category: 'Textile', description: 'Làm lụa', duration_minutes: '90', max_participants: '8', price_per_person: '300000', archived_at: '' }
    ],
    provider_profiles: [
      { provider_id: 'provider-1', user_id: 'owner-1', village_id: 'village-1', verification_status: 'Verified', published_version_no: '1' },
      { provider_id: 'provider-2', user_id: 'owner-2', village_id: 'village-2', verification_status: 'Verified', published_version_no: '1' }
    ],
    provider_profile_versions: [
      { provider_id: 'provider-1', version_no: '1', version_status: 'Verified', business_name: 'Xưởng Gốm', craft_type: 'Ceramics', description: 'Giới thiệu xưởng', location_address: 'Bát Tràng', contact_information: '{"phone_number":"0123456789","business_email":"provider@example.invalid"}', booking_conditions: '{"notice_hours":24}' },
      { provider_id: 'provider-2', version_no: '1', version_status: 'Verified', business_name: 'Xưởng Khác', craft_type: 'Ceramics', description: 'Giới thiệu', location_address: 'Làng khác', contact_information: '{}' }
    ],
    villages: [{ village_id: 'village-1', name: 'Bát Tràng', is_active: 'true' }, { village_id: 'village-2', name: 'Làng khác', is_active: 'true' }],
    user_accounts: [{ user_id: 'owner-1', account_status: 'Active' }, { user_id: 'owner-2', account_status: 'Active' }, { user_id: 'agency-user', role_code: 'Tour_Agency', account_status: 'Approved' }],
    agency_profiles: [{ agency_id: 'agency-1', user_id: 'agency-user' }],
    agency_preference_profiles: [],
    profile_media: [], stored_files: [],
    provider_operating_hours: [{ provider_id: 'provider-1', weekday: '1', local_start: '08:00:00', local_end: '17:00:00' }],
    bookings: [{ provider_id: 'provider-1', experience_id: 'exp-1', status: 'Booked', start_at: '2026-10-19T09:00:00+07:00', end_at: '2026-10-19T10:00:00+07:00', agency_id: 'agency-1', agreed_price_total: '999999' }],
    experience_discount_rules: [{ experience_id: 'exp-1', rule_kind: 'Group Discount', pax_threshold: '5', discount_percentage: '10' }],
    provider_version_media: []
  };
}

describe('EXP Provider and Experience details', () => {
  it('US-3 shows public Provider profile and eligible Experiences without private contact', () => {
    const detail = getProviderDetail(fixture(), 'provider-1', guest);
    expect(detail).toMatchObject({ provider_name: 'Xưởng Gốm', public_bio: 'Giới thiệu xưởng' });
    expect(detail?.experiences.map(item => item.id)).toEqual(['exp-1', 'exp-2']);
    expect(detail?.private_contact).toBeNull();
    expect(detail?.booking_conditions).toBeNull();
  });

  it('US-3 approved Agency may read contact but a revoked Agency cannot', () => {
    const seed = fixture();
    expect(getProviderDetail(seed, 'provider-1', agency)?.private_contact).toMatchObject({ phone: '0123456789' });
    seed.user_accounts[2].account_status = 'Disabled';
    expect(getProviderDetail(seed, 'provider-1', agency)?.private_contact).toBeNull();
  });

  it('US-4 public detail excludes sensitive pricing, contacts and Booking identity', () => {
    const detail = getExperienceDetail(fixture(), 'exp-1', guest, { from: '2026-10-01', to: '2026-10-30' });
    expect(detail?.pricing_breakdown).toBeNull();
    expect(detail?.provider_private_contact).toBeNull();
    expect(detail?.availability_summary.blocked_slots).toEqual([{ start_at: '2026-10-19T09:00:00+07:00', end_at: '2026-10-19T10:00:00+07:00', status: 'Booked' }]);
    expect(JSON.stringify(detail)).not.toContain('999999');
    expect(JSON.stringify(detail)).not.toContain('agency-1');
  });

  it('US-4 approved Agency sees price, discounts, booking terms and contact', () => {
    const detail = getExperienceDetail(fixture(), 'exp-1', agency);
    expect(detail?.pricing_breakdown).toMatchObject({ price_per_person: 200000, group_discounts: [{ pax_threshold: 5, discount_percentage: 10 }] });
    expect(detail?.operational_booking_info).toMatchObject({ booking_lead_time: 24 });
    expect(detail?.provider_private_contact).toMatchObject({ email: 'provider@example.invalid' });
  });

  it('US-4 related cards contain only eligible same-Provider or same-type Experiences', () => {
    const detail = getExperienceDetail(fixture(), 'exp-1', guest);
    expect(detail?.related_experiences.map(item => item.id)).toEqual(['exp-2', 'exp-3']);
    expect(detail?.other_craft_suggestions.map(item => item.id)).toEqual(['exp-5']);
    expect(getExperienceDetail(fixture(), 'exp-4', guest)).toBeNull();
  });
});
