export type ExploreAction = 'click_card' | 'expand_preview' | 'view_detail' | 'apply_filter' | 'scroll' | 'request_quote' | 'open_chat';
export interface ExploreEvent {
  action_type: ExploreAction;
  occurred_at: string;
  experience_id?: string;
  provider_id?: string;
  filter_values?: Record<string, string>;
  duration_seconds?: number;
}
export interface RankableExperience { id: string; provider_id: string; type: string; price: number | null; name: string }
export type PreferenceSignal = { key: string; kind: 'explicit' | 'implicit' | 'strong' };

export function analyzeSession(events: ExploreEvent[], catalog: RankableExperience[]) {
  const byId = new Map(catalog.map(item => [item.id, item]));
  const viewed = events.filter(item => ['click_card', 'view_detail'].includes(item.action_type) && item.experience_id)
    .map(item => byId.get(item.experience_id!)).filter((item): item is RankableExperience => Boolean(item));
  const categoryCounts = new Map<string, number>();
  const providerCounts = new Map<string, number>();
  const categoryExperiences = new Map<string, Set<string>>();
  const longDetailExperiences = new Map<string, Set<string>>();
  for (const event of events) {
    if (event.action_type !== 'view_detail' || (event.duration_seconds ?? 0) < 60 || !event.experience_id) continue;
    const experience = byId.get(event.experience_id);
    if (!experience) continue;
    if (!longDetailExperiences.has(experience.type)) longDetailExperiences.set(experience.type, new Set());
    longDetailExperiences.get(experience.type)!.add(experience.id);
  }
  for (const item of viewed) {
    categoryCounts.set(item.type, (categoryCounts.get(item.type) ?? 0) + 1);
    providerCounts.set(item.provider_id, (providerCounts.get(item.provider_id) ?? 0) + 1);
    if (!categoryExperiences.has(item.type)) categoryExperiences.set(item.type, new Set());
    categoryExperiences.get(item.type)!.add(item.id);
  }
  const signals: PreferenceSignal[] = [];
  for (const item of events) {
    if (item.action_type === 'apply_filter' && item.filter_values) {
      for (const key of ['category', 'provider_id']) {
        const value = item.filter_values[key];
        if (value) signals.push({ key: `${key === 'category' ? 'category' : 'provider'}:${value}`, kind: 'explicit' });
      }
    }
    if (['request_quote', 'open_chat'].includes(item.action_type) && item.experience_id) {
      const experience = byId.get(item.experience_id);
      if (experience) {
        signals.push({ key: `category:${experience.type}`, kind: 'strong' });
        signals.push({ key: `provider:${experience.provider_id}`, kind: 'strong' });
      }
    }
  }
  for (const [category, count] of categoryCounts) {
    if ((categoryExperiences.get(category)!.size >= 3 && count / viewed.length >= 0.5) ||
      (longDetailExperiences.get(category)?.size ?? 0) >= 2) {
      signals.push({ key: `category:${category}`, kind: 'implicit' });
    }
  }
  return {
    clicked_experience_types: Object.fromEntries(categoryCounts),
    provider_patterns: Object.fromEntries(providerCounts),
    filter_choices: events.filter(item => item.action_type === 'apply_filter').map(item => item.filter_values ?? {}),
    implicit_preferences: signals.filter(item => item.kind === 'implicit'), signals
  };
}

// Deterministic MVP rule: explicit +0.1, implicit +0.1, strong +0.2; each key is bounded [0,1].
// The existing shared profile's unrelated keys are retained for F-MATCH rather than overwritten.
export function updatePreferenceWeights(existing: Record<string, number>, signals: PreferenceSignal[]): Record<string, number> {
  const result = { ...existing };
  for (const signal of signals) result[signal.key] = Math.min(1, Math.max(0, (result[signal.key] ?? 0) + (signal.kind === 'strong' ? 0.2 : 0.1)));
  return result;
}

export interface RankingVersion { version_id: string; parameter_map: { relevance: number; quality: number } }
export function rankCatalog(catalog: RankableExperience[], preferences: Record<string, number>, qualityByExperience: Record<string, number>, version: RankingVersion) {
  const { relevance, quality } = version.parameter_map;
  if (!Number.isFinite(relevance) || !Number.isFinite(quality) || relevance < 0 || quality < 0 || Math.abs(relevance + quality - 1) > 1e-9) {
    throw new RangeError('Ranking parameter weights must be nonnegative and sum to 1');
  }
  return catalog.map(item => {
    const personal = Math.max(preferences[`category:${item.type}`] ?? 0, preferences[`provider:${item.provider_id}`] ?? 0);
    const observedQuality = Math.max(0, Math.min(1, qualityByExperience[item.id] ?? 0));
    return { experience_id: item.id, relevance_score: personal, quality_score: observedQuality,
      score: Math.round(100 * (relevance * personal + quality * observedQuality) * 100) / 100,
      name: item.name, version_id: version.version_id };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'vi') || a.experience_id.localeCompare(b.experience_id))
    .map(({ name: _name, ...item }, index) => ({ ...item, rank: index + 1 }));
}

export function assessRanking(selectedRank: number | null, clicked: boolean, strongAction: boolean) {
  const relevance = selectedRank === null ? 0 : selectedRank === 1 ? 100 : selectedRank <= 3 ? 80 : selectedRank <= 5 ? 60 : selectedRank <= 10 ? 30 : 0;
  const ranking_quality_score = 0.5 * relevance + (clicked ? 30 : 0) + (strongAction ? 20 : 0);
  return { ranking_quality_score, assessment: ranking_quality_score >= 60 ? 'Good' as const : 'Poor' as const };
}

export interface TrackedSession {
  session_id: string;
  ranked_results: Array<{ experience_id: string; rank: number }>;
  interactions: ExploreEvent[];
  duration_seconds: number;
}
export function summarizeKpis(sessions: TrackedSession[]) {
  const impressions = sessions.reduce((sum, session) => sum + session.ranked_results.length, 0);
  const clicked = sessions.flatMap(session => session.interactions.filter(event => event.action_type === 'click_card')
    .map(event => session.ranked_results.find(row => row.experience_id === event.experience_id)?.rank).filter((rank): rank is number => rank !== undefined));
  const conversions = sessions.filter(session => session.interactions.some(event => ['request_quote', 'open_chat'].includes(event.action_type) &&
    session.ranked_results.some(row => row.experience_id === event.experience_id))).length;
  const bounces = sessions.filter(session => session.interactions.length === 0).length;
  const rate = (a: number, b: number) => b ? a * 100 / b : 0;
  return {
    ctr: rate(clicked.length, impressions), conversion_rate: rate(conversions, sessions.length),
    avg_rank_selected: clicked.length ? clicked.reduce((sum, rank) => sum + rank, 0) / clicked.length : 0,
    engagement_time: sessions.reduce((sum, session) => sum + session.duration_seconds, 0),
    bounce_rate: rate(bounces, sessions.length),
    period_session_count: sessions.length
  };
}

export function aggregateExploreMetrics(sessions: TrackedSession[], catalog: RankableExperience[]) {
  const events = sessions.flatMap(session => session.interactions);
  const byId = new Map(catalog.map(item => [item.id, item]));
  const viewEvents = events.filter(item => item.action_type === 'view_detail' && item.experience_id);
  const clickEvents = events.filter(item => item.action_type === 'click_card' && item.experience_id);
  const quoteEvents = events.filter(item => item.action_type === 'request_quote');
  const chatEvents = events.filter(item => item.action_type === 'open_chat');
  const filterUsage: Record<string, number> = {};
  const typeDistribution: Record<string, number> = {};
  const popularity: Record<string, number> = {};
  for (const event of events) {
    if (event.action_type === 'apply_filter') for (const key of Object.keys(event.filter_values ?? {})) filterUsage[key] = (filterUsage[key] ?? 0) + 1;
    if (!event.experience_id) continue;
    const type = byId.get(event.experience_id)?.type;
    if (type && ['view_detail', 'click_card'].includes(event.action_type)) typeDistribution[type] = (typeDistribution[type] ?? 0) + 1;
    if (['view_detail', 'click_card', 'request_quote', 'open_chat'].includes(event.action_type)) popularity[event.experience_id] = (popularity[event.experience_id] ?? 0) + 1;
  }
  const kpi = summarizeKpis(sessions);
  return {
    experience_views: viewEvents.length,
    unique_experiences_viewed: new Set(viewEvents.map(item => item.experience_id)).size,
    experience_clicks: clickEvents.length,
    click_rate: kpi.ctr,
    activity_type_distribution: typeDistribution,
    filter_usage: filterUsage,
    quote_request_count: quoteEvents.length,
    chat_action_count: chatEvents.length,
    action_rate: sessions.length ? 100 * sessions.filter(session => session.interactions.some(event => ['request_quote', 'open_chat'].includes(event.action_type))).length / sessions.length : 0,
    avg_session_duration: sessions.length ? sessions.reduce((sum, session) => sum + session.duration_seconds, 0) / sessions.length : 0,
    bounce_rate: kpi.bounce_rate,
    top_experiences: Object.entries(popularity).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id)
  };
}

export function evaluateCandidate(active: Record<string, number>, candidate: Record<string, number>, eligibleSessionCount: number, replayGain: number) {
  if (eligibleSessionCount < 30) return { promote: false, reason: 'Insufficient eligible sessions' };
  const keys = [...new Set([...Object.keys(active), ...Object.keys(candidate)])];
  if (keys.some(key => !Number.isFinite(candidate[key]) || candidate[key] < 0 || candidate[key] > 1 || Math.abs((candidate[key] ?? 0) - (active[key] ?? 0)) > 0.100000001)) {
    return { promote: false, reason: 'Invalid or unbounded parameter change' };
  }
  if (Math.abs(Object.values(candidate).reduce((sum, value) => sum + value, 0) - 1) > 1e-9) return { promote: false, reason: 'Weights must sum to 1' };
  if (replayGain < 5) return { promote: false, reason: 'Offline replay gain below five points' };
  return { promote: true, reason: 'All BR-015 gates passed' };
}

export interface ReplaySession {
  ranked_results: Array<{ experience_id: string; rank: number; relevance_score: number; quality_score: number }>;
  selected_experience_id: string | null;
  clicked: boolean;
  strong_action: boolean;
}
export function replayRanking(sessions: ReplaySession[], active: { relevance: number; quality: number }, candidate: { relevance: number; quality: number }) {
  const scores = sessions.map(session => {
    const oldRank = session.ranked_results.find(row => row.experience_id === session.selected_experience_id)?.rank ?? null;
    const reranked = [...session.ranked_results].sort((a, b) =>
      candidate.relevance * b.relevance_score + candidate.quality * b.quality_score -
      candidate.relevance * a.relevance_score - candidate.quality * a.quality_score || a.rank - b.rank);
    const selectedIndex = reranked.findIndex(row => row.experience_id === session.selected_experience_id);
    const newRank = selectedIndex < 0 ? null : selectedIndex + 1;
    return { before: assessRanking(oldRank, session.clicked, session.strong_action).ranking_quality_score,
      after: assessRanking(newRank, session.clicked, session.strong_action).ranking_quality_score };
  });
  const old_mean_quality = scores.length ? scores.reduce((sum, item) => sum + item.before, 0) / scores.length : 0;
  const new_mean_quality = scores.length ? scores.reduce((sum, item) => sum + item.after, 0) / scores.length : 0;
  return { old_mean_quality, new_mean_quality, gain: new_mean_quality - old_mean_quality,
    eligible_session_count: sessions.length, active_parameters: active, candidate_parameters: candidate };
}

export function shouldRollback(eligibleSessionCount: number, prePromotionBaseline: number, newLiveMeanQuality: number): boolean {
  return eligibleSessionCount >= 30 && prePromotionBaseline - newLiveMeanQuality >= 5;
}

export function weeklyOptimizationDecision(sessions: ReplaySession[], active: { relevance: number; quality: number }) {
  const bounded = (value: number) => Math.round(value * 100) / 100;
  const candidates = [-0.05, 0.05].filter(delta => active.relevance + delta >= 0 && active.relevance + delta <= 1)
    .map(delta => ({ relevance: bounded(active.relevance + delta), quality: bounded(active.quality - delta) }));
  const ranked = candidates.map(parameters => ({ parameters, replay: replayRanking(sessions, active, parameters) }))
    .sort((a, b) => b.replay.gain - a.replay.gain || b.parameters.relevance - a.parameters.relevance);
  const best = ranked[0];
  if (!best) return { draft_parameters: null, promote: false, replay_gain: 0, reason: 'No valid bounded candidate' };
  const gate = evaluateCandidate(active, best.parameters, sessions.length, best.replay.gain);
  return { draft_parameters: best.parameters, promote: gate.promote, replay_gain: best.replay.gain, reason: gate.reason,
    baseline_quality: best.replay.old_mean_quality, candidate_proxy_quality: best.replay.new_mean_quality };
}
