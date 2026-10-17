import { describe, expect, it } from 'vitest';
import { ExploreRuntime } from '../../src/lib/explore/runtime';
import type { ExploreSeed } from '../../src/lib/explore/catalog';

const base: ExploreSeed = {
  experiences: [
    { experience_id: 'pottery', provider_id: 'provider', name: 'Gốm', category: 'Pottery', description: 'Làm gốm', duration_minutes: '90', price_per_person: '100000', max_participants: '10', archived_at: '' },
    { experience_id: 'silk', provider_id: 'provider', name: 'Lụa', category: 'Silk', description: 'Dệt lụa', duration_minutes: '90', price_per_person: '100000', max_participants: '10', archived_at: '' }
  ],
  provider_profiles: [{ provider_id: 'provider', user_id: 'owner', village_id: 'village', verification_status: 'Verified', published_version_no: '1' }],
  provider_profile_versions: [{ provider_id: 'provider', version_no: '1', version_status: 'Verified', business_name: 'Xưởng' }],
  villages: [{ village_id: 'village', name: 'Làng', is_active: 'true' }],
  user_accounts: [{ user_id: 'owner', account_status: 'Active' }, { user_id: 'a-user', role_code: 'Tour_Agency', account_status: 'Approved' }, { user_id: 'b-user', role_code: 'Tour_Agency', account_status: 'Approved' }],
  agency_profiles: [{ agency_id: 'a', user_id: 'a-user' }, { agency_id: 'b', user_id: 'b-user' }],
  agency_preference_profiles: [], profile_media: [], stored_files: [],
  ranking_parameter_versions: [{ version_id: 'v-active', parameter_map: '{"relevance":0.5,"quality":0.5}', version_status: 'Active' }]
};

describe('EXP runtime tracking scope', () => {
  it('rejects an ambiguous ranking baseline with two Active versions', () => {
    const invalid: ExploreSeed = {
      ...base,
      ranking_parameter_versions: [
        ...base.ranking_parameter_versions!,
        { version_id: 'v-active-2', parameter_map: '{"relevance":0.6,"quality":0.4}', version_status: 'Active' }
      ]
    };
    expect(() => new ExploreRuntime(invalid)).toThrow('Explore requires exactly one Active ranking version');
  });

  it('never stores nonessential Guest interactions without consent', () => {
    const runtime = new ExploreRuntime(base);
    const session = runtime.startSession({ kind: 'guest' }, false);
    expect(session.tracking_scope).toBe('No Non-essential Tracking');
    expect(runtime.recordEvent(session.session_id, { event_id: 'one', action_type: 'click_card', experience_id: 'pottery' }).logged).toBe(false);
    expect(runtime.eventsFor(session.session_id)).toEqual([]);
  });

  it('uses anonymous Guest sessions with consent, and deduplicates event IDs', () => {
    const runtime = new ExploreRuntime(base);
    const session = runtime.startSession({ kind: 'guest' }, true);
    expect(session.tracking_scope).toBe('Anonymous Analytics');
    expect(session.agency_id).toBeNull();
    const first = runtime.recordEvent(session.session_id, { event_id: 'one', action_type: 'click_card', experience_id: 'pottery' });
    const repeated = runtime.recordEvent(session.session_id, { event_id: 'one', action_type: 'click_card', experience_id: 'pottery' });
    expect(first.logged).toBe(true);
    expect(repeated.logged).toBe(false);
    expect(runtime.eventsFor(session.session_id)).toHaveLength(1);
  });

  it('reranks only the acting Agency and records a displayed-list snapshot with a pinned version', () => {
    const runtime = new ExploreRuntime(base);
    const a = runtime.startSession({ kind: 'agency', agencyId: 'a' }, true);
    const b = runtime.startSession({ kind: 'agency', agencyId: 'b' }, true);
    const initialB = runtime.resultsFor(b.session_id).map(row => row.experience_id);
    runtime.recordEvent(a.session_id, { event_id: 'filter-a', action_type: 'apply_filter', filter_values: { category: 'Pottery' } });
    expect(runtime.resultsFor(a.session_id)[0].experience_id).toBe('pottery');
    expect(runtime.resultsFor(b.session_id).map(row => row.experience_id)).toEqual(initialB);
    expect(runtime.sessionFor(a.session_id)?.ranked_results.length).toBe(2);
    expect(runtime.sessionFor(a.session_id)?.ranking_version_id).toBeTruthy();
  });
});
