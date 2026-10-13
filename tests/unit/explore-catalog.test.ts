import { describe, expect, it } from 'vitest';
import { buildExplorePage, resolveViewer, type ExploreSeed } from '../../src/lib/explore/catalog';

const providerId = 'provider-1';
const agencyId = 'agency-1';
const experience = (id: string, name: string, extra: Record<string, string> = {}) => ({
  experience_id: id, provider_id: providerId, name, category: 'Workshop/Hands-on',
  description: 'Trải nghiệm nghề truyền thống.', duration_minutes: '90',
  price_per_person: '250000.00', max_participants: '8', archived_at: '', ...extra
});

function fixture(): ExploreSeed {
  return {
    experiences: [experience('exp-1', 'Làm gốm'), experience('exp-2', 'Dệt lụa')],
    provider_profiles: [{ provider_id: providerId, user_id: 'user-provider', village_id: 'village-1', verification_status: 'Verified', published_version_no: '1' }],
    provider_profile_versions: [{ provider_id: providerId, version_no: '1', version_status: 'Verified', business_name: 'Làng nghề A' }],
    villages: [{ village_id: 'village-1', name: 'Bát Tràng', is_active: 'true' }],
    user_accounts: [
      { user_id: 'user-provider', role_code: 'Local_Provider', account_status: 'Active' },
      { user_id: 'user-agency', role_code: 'Tour_Agency', account_status: 'Approved' }
    ],
    agency_profiles: [{ agency_id: agencyId, user_id: 'user-agency' }],
    agency_preference_profiles: [],
    profile_media: [{ experience_id: 'exp-1', file_id: 'file-1', display_order: '0' }],
    stored_files: [{ file_id: 'file-1', storage_key: 'seed/image-1.jpg', media_type: 'image/jpeg' }]
  };
}

describe('EXP US-1 catalog rules', () => {
  it('BR-001 hides unverified, unpublished, archived, inactive-village and disabled-provider records', () => {
    const cases: Array<(seed: ExploreSeed) => void> = [
      s => { s.provider_profiles[0].verification_status = 'Pending Verification'; },
      s => { s.provider_profiles[0].published_version_no = ''; },
      s => { s.provider_profile_versions[0].version_status = 'Draft'; },
      s => { s.experiences[0].archived_at = '2026-09-25T08:00:00+07:00'; s.experiences[1].archived_at = '2026-09-25T08:00:00+07:00'; },
      s => { s.villages[0].is_active = 'false'; },
      s => { s.user_accounts[0].account_status = 'Disabled'; }
    ];
    expect(buildExplorePage(fixture(), { page: 1, pageSize: 12, viewer: { kind: 'guest' } }).pagination.total_count).toBe(2);
    for (const change of cases) {
      const seed = fixture(); change(seed);
      expect(buildExplorePage(seed, { page: 1, pageSize: 12, viewer: { kind: 'guest' } }).pagination.total_count).toBe(0);
    }
  });

  it('AC1/AC5 paginates with defaults, maximum and empty state', () => {
    const seed = fixture();
    expect(buildExplorePage(seed, { viewer: { kind: 'guest' } }).pagination).toEqual({ page: 1, page_size: 12, total_count: 2 });
    expect(buildExplorePage(seed, { page: 2, pageSize: 1, viewer: { kind: 'guest' } }).experience_cards).toHaveLength(1);
    expect(buildExplorePage({ ...seed, experiences: [] }, { viewer: { kind: 'guest' } }).experience_cards).toEqual([]);
    expect(() => buildExplorePage(seed, { page: 0, viewer: { kind: 'guest' } })).toThrow();
    expect(() => buildExplorePage(seed, { pageSize: 51, viewer: { kind: 'guest' } })).toThrow();
  });

  it('BR-002 locks Guest protected actions and grants Agency context only when approved', () => {
    const seed = fixture();
    expect(resolveViewer(seed, agencyId, true)).toEqual({ kind: 'agency', agencyId });
    expect(resolveViewer(seed, agencyId, false)).toEqual({ kind: 'guest' });
    seed.user_accounts[1].account_status = 'Pending Approval';
    expect(resolveViewer(seed, agencyId, true)).toEqual({ kind: 'guest' });
    seed.user_accounts[1].account_status = 'Approved';
    const guest = buildExplorePage(seed, { viewer: { kind: 'guest' } }).experience_cards[0];
    const agency = buildExplorePage(seed, { viewer: { kind: 'agency', agencyId } }).experience_cards[0];
    expect(guest.actions).toEqual({ view_details: true, request_quote: false, chat: false });
    expect(agency.actions).toEqual({ view_details: true, request_quote: true, chat: true });
  });

  it('BR-003 masks commercial price for Guest but shows it to approved Agency', () => {
    const seed = fixture();
    expect(buildExplorePage(seed, { viewer: { kind: 'guest' } }).experience_cards[0].price).toBeNull();
    expect(buildExplorePage(seed, { viewer: { kind: 'agency', agencyId } }).experience_cards[0].price).toBe(250000);
    seed.user_accounts[1].account_status = 'Disabled';
    expect(buildExplorePage(seed, { viewer: { kind: 'agency', agencyId } }).experience_cards[0].price).toBeNull();
  });

  it('FR-002 projects seeded media, provider, village and capacity 1 to max in stable order', () => {
    const cards = buildExplorePage(fixture(), { viewer: { kind: 'guest' } }).experience_cards;
    expect(cards.map(card => card.name)).toEqual(['Dệt lụa', 'Làm gốm']);
    expect(cards[1]).toMatchObject({
      id: 'exp-1', type: 'Workshop/Hands-on', provider_name: 'Làng nghề A',
      location: { village_name: 'Bát Tràng' }, duration_minutes: 90,
      capacity: { min_pax: 1, max_pax: 8 },
      images: [{ storage_key: 'seed/image-1.jpg' }]
    });
  });

  it('AC4 continues to browse when an optional Agency Preference Profile exists', () => {
    const seed = fixture();
    seed.agency_preference_profiles.push({ agency_id: agencyId, preference_weights: '{"culture":0.7,"price":0.3}' });
    expect(buildExplorePage(seed, { viewer: { kind: 'agency', agencyId } }).pagination.total_count).toBe(2);
  });
});
