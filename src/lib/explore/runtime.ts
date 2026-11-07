import { randomUUID } from 'node:crypto';
import type { DemoRow } from '../demo/types';
import { eligibleRows, resolveViewer, type ExploreSeed, type Viewer } from './catalog';
import { analyzeSession, rankCatalog, updatePreferenceWeights, type ExploreAction, type ExploreEvent, type RankingVersion } from './learning';

type TrackingScope = 'Personalized' | 'Anonymous Analytics' | 'No Non-essential Tracking';
type RankingRow = ReturnType<typeof rankCatalog>[number];
type Snapshot = { shown_at: string; results: RankingRow[] };
type RuntimeSession = {
  session_id: string;
  agency_id: string | null;
  tracking_scope: TrackingScope;
  analytics_consent: boolean;
  ranking_version_id: string | null;
  ranked_results: Snapshot[];
  started_at: string;
};
type RecordedEvent = ExploreEvent & { event_id: string; interaction_id: string };

function parseObject(value: string | undefined): Record<string, number> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, number> : {};
  } catch { return {}; }
}

/** Local prototype state. A process restart discards new interactions; use data/schema.sql for durable deployment. */
export class ExploreRuntime {
  private sessions = new Map<string, RuntimeSession>();
  private events = new Map<string, RecordedEvent[]>();
  private seenEventIds = new Map<string, Set<string>>();
  private agencyWeights = new Map<string, Record<string, number>>();
  private activeVersion: RankingVersion;
  private historicalQuality: Record<string, number>;

  constructor(private seed: ExploreSeed, hydrate = false) {
    const activeVersions = seed.ranking_parameter_versions?.filter(row => row.version_status === 'Active') ?? [];
    if (activeVersions.length !== 1) throw new Error('Explore requires exactly one Active ranking version');
    const version = activeVersions[0];
    this.activeVersion = { version_id: version.version_id, parameter_map: parseObject(version.parameter_map) as RankingVersion['parameter_map'] };
    for (const profile of seed.agency_preference_profiles) this.agencyWeights.set(profile.agency_id, parseObject(profile.preference_weights));
    const totals = new Map<string, number>();
    const tracked = new Set((seed.explore_sessions ?? [])
      .filter(row => row.tracking_scope === 'Personalized' || (row.tracking_scope === 'Anonymous Analytics' && row.analytics_consent === 'true'))
      .map(row => row.session_id));
    for (const row of seed.explore_interactions ?? []) {
      if (!row.experience_id || !tracked.has(row.session_id)) continue;
      const points = ['request_quote', 'open_chat'].includes(row.action_type) ? 3 : row.action_type === 'click_card' ? 2 : row.action_type === 'view_detail' ? 1 : 0;
      totals.set(row.experience_id, (totals.get(row.experience_id) ?? 0) + points);
    }
    const maximum = Math.max(1, ...totals.values());
    this.historicalQuality = Object.fromEntries([...totals].map(([id, points]) => [id, points / maximum]));
    if (hydrate) {
      for (const row of seed.explore_sessions ?? []) {
        if (row.ended_at) continue;
        const session:RuntimeSession={session_id:row.session_id,agency_id:row.agency_id||null,
          tracking_scope:row.tracking_scope as TrackingScope,analytics_consent:row.analytics_consent==='true',
          ranking_version_id:row.ranking_version_id||null,ranked_results:JSON.parse(row.ranked_results||'[]'),started_at:row.started_at};
        this.sessions.set(session.session_id,session);this.events.set(session.session_id,[]);this.seenEventIds.set(session.session_id,new Set());
      }
      for(const row of seed.explore_interactions??[]) {
        if(!this.sessions.has(row.session_id))continue;
        const event:RecordedEvent={event_id:row.client_event_id||row.interaction_id,interaction_id:row.interaction_id,
          action_type:row.action_type as ExploreAction,occurred_at:row.occurred_at,experience_id:row.experience_id||undefined,
          provider_id:row.provider_id||undefined,filter_values:row.filter_values?JSON.parse(row.filter_values):undefined,
          duration_seconds:row.duration_on_previous_screen?Number(row.duration_on_previous_screen):undefined};
        this.events.get(row.session_id)!.push(event);this.seenEventIds.get(row.session_id)!.add(event.event_id);
      }
    }
  }

  /** Called inside the store's atomic aggregate transaction, never a process-global cache. */
  persistInto(tables:Record<string,DemoRow[]>) {
    for(const session of this.sessions.values()){
      const row=tables.explore_sessions.find(row=>row.session_id===session.session_id);
      const values={session_id:session.session_id,agency_id:session.agency_id||'',anonymous_session_ref:session.agency_id?'':`anon-${session.session_id}`,
        analytics_consent:String(session.analytics_consent),tracking_scope:session.tracking_scope,started_at:session.started_at,ended_at:'',
        ranking_version_id:session.ranking_version_id||'',ranked_results:session.tracking_scope==='No Non-essential Tracking'?'':JSON.stringify(session.ranked_results)};
      if(row)Object.assign(row,values);else tables.explore_sessions.push(values);
      for(const event of this.events.get(session.session_id)??[]){
        if(tables.explore_interactions.some(row=>row.interaction_id===event.interaction_id))continue;
        tables.explore_interactions.push({interaction_id:event.interaction_id,session_id:session.session_id,client_event_id:event.event_id,
          experience_id:event.experience_id||'',provider_id:event.provider_id||'',action_type:event.action_type,occurred_at:event.occurred_at,
          duration_on_previous_screen:event.duration_seconds===undefined?'':String(event.duration_seconds),filter_values:event.filter_values?JSON.stringify(event.filter_values):''});
      }
    }
    for(const [agency_id,weights] of this.agencyWeights){
      const row=tables.agency_preference_profiles.find(row=>row.agency_id===agency_id),encoded=JSON.stringify(weights);
      if(row){if(row.preference_weights!==encoded){row.preference_weights=encoded;row.updated_at=new Date().toISOString()}}
      else tables.agency_preference_profiles.push({agency_id,preference_weights:encoded,baseline_preference_weights:'{}',updated_at:new Date().toISOString()});
    }
  }

  private catalog() {
    return eligibleRows(this.seed).map(({ experience, provider }) => ({
      id: experience.experience_id, provider_id: provider.provider_id, type: experience.category,
      price: Number(experience.price_per_person), name: experience.name
    }));
  }

  startSession(viewer: Viewer, analyticsConsent: boolean) {
    const safeViewer = viewer.kind === 'agency' ? resolveViewer(this.seed, viewer.agencyId, true) : viewer;
    const scope: TrackingScope = safeViewer.kind === 'agency' ? 'Personalized' : analyticsConsent ? 'Anonymous Analytics' : 'No Non-essential Tracking';
    const session: RuntimeSession = {
      session_id: randomUUID(), agency_id: safeViewer.kind === 'agency' ? safeViewer.agencyId : null,
      tracking_scope: scope, analytics_consent: analyticsConsent, ranking_version_id: scope === 'No Non-essential Tracking' ? null : this.activeVersion.version_id,
      ranked_results: [], started_at: new Date().toISOString()
    };
    this.sessions.set(session.session_id, session);
    this.events.set(session.session_id, []);
    this.seenEventIds.set(session.session_id, new Set());
    if (scope !== 'No Non-essential Tracking') this.snapshot(session);
    return session;
  }

  private snapshot(session: RuntimeSession): RankingRow[] {
    const ranked = rankCatalog(this.catalog(), session.agency_id ? this.agencyWeights.get(session.agency_id) ?? {} : {}, this.historicalQuality, this.activeVersion);
    if (session.tracking_scope !== 'No Non-essential Tracking') session.ranked_results.push({ shown_at: new Date().toISOString(), results: ranked });
    return ranked;
  }

  sessionFor(id: string) { return this.sessions.get(id); }
  eventsFor(id: string) { return this.events.get(id) ?? []; }
  resultsFor(id: string) {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Unknown Explore session');
    return session.ranked_results.at(-1)?.results ?? this.snapshot(session);
  }

  recordEvent(sessionId: string, input: { event_id: string; action_type: ExploreAction; experience_id?: string; provider_id?: string; filter_values?: Record<string, string>; duration_on_previous_screen?: number }) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Unknown Explore session');
    if (session.tracking_scope === 'No Non-essential Tracking') return { logged: false, interaction_log_id: null, results_refreshed_indicator: false };
    if (this.seenEventIds.get(sessionId)!.has(input.event_id)) return { logged: false, interaction_log_id: null, results_refreshed_indicator: false };
    const catalog = this.catalog();
    const selected = input.experience_id ? catalog.find(item => item.id === input.experience_id) : undefined;
    if (input.experience_id && !selected) throw new Error('Experience is not eligible for discovery');
    if (['request_quote', 'open_chat'].includes(input.action_type) && !session.agency_id) throw new Error('Protected action requires Agency permission');
    if (input.duration_on_previous_screen !== undefined && (!Number.isInteger(input.duration_on_previous_screen) || input.duration_on_previous_screen < 0)) throw new Error('Invalid duration');
    this.seenEventIds.get(sessionId)!.add(input.event_id);
    const event: RecordedEvent = {
      event_id: input.event_id, interaction_id: randomUUID(), action_type: input.action_type,
      experience_id: input.experience_id, provider_id: selected?.provider_id,
      filter_values: input.filter_values, duration_seconds: input.duration_on_previous_screen,
      occurred_at: new Date().toISOString()
    };
    this.events.get(sessionId)!.push(event);
    let refreshed = false;
    if (session.agency_id) {
      const patterns = [...this.sessions.values()].filter(item => item.agency_id === session.agency_id)
        .map(item => analyzeSession(this.events.get(item.session_id) ?? [], catalog));
      if (patterns.some(pattern => pattern.signals.length)) {
        // Recalculate from the shared initial profile plus all Agency sessions, avoiding duplicate event application.
        const initial = this.seed.agency_preference_profiles.find(row => row.agency_id === session.agency_id);
        const baseline = parseObject(initial?.baseline_preference_weights || initial?.preference_weights);
        const next = updatePreferenceWeights(baseline, patterns.flatMap(pattern => pattern.signals));
        if (JSON.stringify(next) !== JSON.stringify(this.agencyWeights.get(session.agency_id) ?? {})) {
          this.agencyWeights.set(session.agency_id, next);
          this.snapshot(session);
          refreshed = true;
        }
      }
    }
    return { logged: true, interaction_log_id: event.interaction_id, results_refreshed_indicator: refreshed };
  }
}
