import { describe, expect, it } from 'vitest';
import { aggregateExploreMetrics, analyzeSession, assessRanking, evaluateCandidate, rankCatalog, replayRanking, shouldRollback, summarizeKpis, weeklyOptimizationDecision, type ExploreEvent } from '../../src/lib/explore/learning';

const catalog = [
  { id: 'pottery-1', provider_id: 'p-1', type: 'Pottery', price: 200000, name: 'Pottery A' },
  { id: 'pottery-2', provider_id: 'p-2', type: 'Pottery', price: 250000, name: 'Pottery B' },
  { id: 'pottery-3', provider_id: 'p-4', type: 'Pottery', price: 260000, name: 'Pottery C' },
  { id: 'silk-1', provider_id: 'p-3', type: 'Silk', price: 300000, name: 'Silk A' }
];
const event = (action_type: ExploreEvent['action_type'], experience_id: string): ExploreEvent =>
  ({ action_type, experience_id, occurred_at: '2026-10-13T08:00:00Z' });

describe('EXP session learning and ranking', () => {
  it('FR-008 creates explicit and strong signals immediately, but one view is not an implicit signal', () => {
    const pattern = analyzeSession([
      { action_type: 'apply_filter', filter_values: { category: 'Pottery' }, occurred_at: '2026-10-13T08:00:00Z' },
      event('view_detail', 'pottery-1'), event('request_quote', 'pottery-1')
    ], catalog);
    expect(pattern.signals).toEqual(expect.arrayContaining([
      { key: 'category:Pottery', kind: 'explicit' },
      { key: 'category:Pottery', kind: 'strong' }
    ]));
    expect(pattern.signals.some(signal => signal.kind === 'implicit')).toBe(false);
  });

  it('FR-008 requires three interactions and at least half the clicked/viewed catalog for implicit preference', () => {
    const pattern = analyzeSession([
      event('click_card', 'pottery-1'), event('view_detail', 'pottery-2'),
      event('click_card', 'pottery-3'), event('click_card', 'silk-1')
    ], catalog);
    expect(pattern.signals).toContainEqual({ key: 'category:Pottery', kind: 'implicit' });
    expect(pattern.signals).not.toContainEqual({ key: 'category:Silk', kind: 'implicit' });
  });

  it('FR-008 also accepts two distinct detail visits of at least sixty seconds on the same attribute', () => {
    const pattern = analyzeSession([
      { ...event('view_detail', 'pottery-1'), duration_seconds: 61 },
      { ...event('view_detail', 'pottery-2'), duration_seconds: 60 }
    ], catalog);
    expect(pattern.signals).toContainEqual({ key: 'category:Pottery', kind: 'implicit' });
  });

  it('FR-010 ranks only by the supplied Agency profile and pinned version', () => {
    const version = { version_id: 'active-1', parameter_map: { relevance: 0.5, quality: 0.5 } };
    const a = rankCatalog(catalog, { 'category:Pottery': 1 }, {}, version);
    const b = rankCatalog(catalog, { 'category:Silk': 1 }, {}, version);
    expect(a[0].experience_id).toBe('pottery-1');
    expect(b[0].experience_id).toBe('silk-1');
    expect(a.map(row => row.rank)).toEqual([1, 2, 3, 4]);
    expect(b[0].version_id).toBe('active-1');
  });

  it('FR-014 scores selected ranks and strong actions using the specified 50/30/20 formula', () => {
    expect(assessRanking(1, true, true)).toEqual({ ranking_quality_score: 100, assessment: 'Good' });
    expect(assessRanking(6, true, false)).toEqual({ ranking_quality_score: 45, assessment: 'Poor' });
    expect(assessRanking(null, false, false)).toEqual({ ranking_quality_score: 0, assessment: 'Poor' });
  });

  it('FR-016 computes weekly KPI denominators from displayed impressions and actions', () => {
    const kpi = summarizeKpis([
      { session_id: 's1', ranked_results: [{ experience_id: 'pottery-1', rank: 1 }, { experience_id: 'silk-1', rank: 2 }], duration_seconds: 100,
        interactions: [event('click_card', 'pottery-1'), event('request_quote', 'pottery-1')] },
      { session_id: 's2', ranked_results: [{ experience_id: 'silk-1', rank: 1 }], duration_seconds: 20, interactions: [] }
    ]);
    expect(kpi.ctr).toBeCloseTo(100 / 3);
    expect(kpi.conversion_rate).toBe(50);
    expect(kpi.avg_rank_selected).toBe(1);
    expect(kpi.bounce_rate).toBe(50);
  });

  it('FR-013 separates aggregate catalog engagement from a personal preference profile', () => {
    const aggregate = aggregateExploreMetrics([
      { session_id: 's1', ranked_results: [{ experience_id: 'pottery-1', rank: 1 }], duration_seconds: 90,
        interactions: [event('view_detail', 'pottery-1'), event('click_card', 'pottery-1'), event('request_quote', 'pottery-1')] },
      { session_id: 's2', ranked_results: [{ experience_id: 'silk-1', rank: 1 }], duration_seconds: 10, interactions: [] }
    ], catalog);
    expect(aggregate.experience_views).toBe(1);
    expect(aggregate.experience_clicks).toBe(1);
    expect(aggregate.quote_request_count).toBe(1);
    expect(aggregate.top_experiences).toEqual(['pottery-1']);
    expect(aggregate.bounce_rate).toBe(50);
    expect(aggregate.avg_session_duration).toBe(50);
  });

  it('BR-015 never promotes without thirty sessions, valid bounded weights and +5 replay points', () => {
    const active = { relevance: 0.5, quality: 0.5 };
    expect(evaluateCandidate(active, { relevance: 0.55, quality: 0.45 }, 29, 9).promote).toBe(false);
    expect(evaluateCandidate(active, { relevance: 0.7, quality: 0.3 }, 30, 9).promote).toBe(false);
    expect(evaluateCandidate(active, { relevance: 0.55, quality: 0.45 }, 30, 4).promote).toBe(false);
    expect(evaluateCandidate(active, { relevance: 0.55, quality: 0.45 }, 30, 5).promote).toBe(true);
  });

  it('FR-017 replay changes only rank relevance while preserving observed click/action facts', () => {
    const exposure = [
      { experience_id: 'a', rank: 1, relevance_score: 0.1, quality_score: 0.9 },
      { experience_id: 'b', rank: 2, relevance_score: 1, quality_score: 0.1 }
    ];
    const replay = replayRanking([{ ranked_results: exposure, selected_experience_id: 'b', clicked: true, strong_action: false }],
      { relevance: 0.4, quality: 0.6 }, { relevance: 0.5, quality: 0.5 });
    expect(replay.old_mean_quality).toBe(70);
    expect(replay.new_mean_quality).toBe(80);
    expect(replay.gain).toBe(10);
  });

  it('FR-017 rollback requires a new eligible cohort and a five-point live decline', () => {
    expect(shouldRollback(29, 80, 60)).toBe(false);
    expect(shouldRollback(30, 80, 76)).toBe(false);
    expect(shouldRollback(30, 80, 75)).toBe(true);
  });

  it('FR-017 proposes a bounded Draft and promotes only after replay clears every gate', () => {
    const sessions = Array.from({ length: 30 }, () => ({
      ranked_results: [
        { experience_id: 'a', rank: 1, relevance_score: 0.1, quality_score: 0.9 },
        { experience_id: 'b', rank: 2, relevance_score: 1, quality_score: 0.1 }
      ], selected_experience_id: 'b', clicked: true, strong_action: false
    }));
    const decision = weeklyOptimizationDecision(sessions, { relevance: 0.45, quality: 0.55 });
    expect(decision.draft_parameters).toEqual({ relevance: 0.5, quality: 0.5 });
    expect(decision.promote).toBe(true);
    expect(decision.replay_gain).toBe(10);
    expect(weeklyOptimizationDecision(sessions.slice(0, 29), { relevance: 0.45, quality: 0.55 }).promote).toBe(false);
  });
});
