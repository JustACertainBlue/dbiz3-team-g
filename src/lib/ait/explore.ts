const DAY_MS = 86400000;

export function decayWeight(ageDays: number): number {
  if (ageDays < 0) return 1;
  if (ageDays > 7) return 0;
  return Math.pow(0.5, ageDays / 3.5);
}

export function computeConfidence({
  signalCount,
  sessionsCount,
  maxSessionShare,
}: {
  signalCount: number;
  sessionsCount: number;
  maxSessionShare: number;
}): number {
  return Math.min(1, signalCount / 40) * (maxSessionShare > 0.8 ? 0.5 : 1);
}

export function lambdaFor({
  confidence,
  signalCount,
  enabled,
}: {
  confidence: number;
  signalCount: number;
  enabled: boolean;
}): number {
  if (!enabled || signalCount < 10 || isNaN(confidence)) return 0;
  const c = Math.min(1, confidence);
  if (c < 0.4) return 0;
  if (c < 0.7) return 0.25;
  return 0.4;
}

export function finalScore(
  filterScore: number,
  prefScore: number,
  lambda: number
): number {
  return (1 - lambda) * filterScore + lambda * prefScore;
}

export function aggregateDimension(
  events: { value: string; weight: number; ts: number }[],
  nowMs: number
): { scores: { value: string; score: number }[]; exclusions: string[] } {
  const totals = new Map<string, number>();

  for (const ev of events) {
    const ageDays = (nowMs - ev.ts) / DAY_MS;
    if (ageDays > 7) continue;

    const decayed = ev.weight * decayWeight(ageDays);
    totals.set(ev.value, (totals.get(ev.value) ?? 0) + decayed);
  }

  const positive: { value: string; total: number }[] = [];
  const exclusions: string[] = [];

  for (const [value, net] of totals.entries()) {
    if (net > 0) {
      positive.push({ value, total: net });
    } else if (net < 0) {
      exclusions.push(value);
    }
  }

  const sumPositive = positive.reduce((acc, p) => acc + p.total, 0);
  const scores = positive
    .map((p) => ({
      value: p.value,
      score: sumPositive > 0 ? p.total / sumPositive : 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.value.localeCompare(b.value);
    });

  return { scores, exclusions };
}

export function personalizedSort({
  items,
  lambda,
  excludedIds = [],
}: {
  items: { id: string; filterScore: number; prefScore: number }[];
  lambda: number;
  excludedIds?: string[];
}): { ordered: string[]; boosted: string[] } {
  // 1. Compute baseline rank (pure filter sort with lambda = 0)
  const baseline = [...items].sort((a, b) => {
    if (b.filterScore !== a.filterScore) return b.filterScore - a.filterScore;
    return a.id.localeCompare(b.id);
  });
  const baselineRanks = new Map<string, number>();
  baseline.forEach((item, idx) => baselineRanks.set(item.id, idx));

  // 2. Score items with personalization
  const scoredItems = items.map((item) => {
    const effectivePref = excludedIds.includes(item.id) ? 0 : item.prefScore;
    const raw = (1 - lambda) * item.filterScore + lambda * effectivePref;
    const rounded = Math.round(raw * 1e6) / 1e6;
    return {
      id: item.id,
      score: rounded,
      filterScore: item.filterScore,
      prefScore: item.prefScore,
    };
  });

  // 3. Sort items
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.filterScore !== a.filterScore) return b.filterScore - a.filterScore;
    return a.id.localeCompare(b.id);
  });

  const ordered = scoredItems.map((item) => item.id);
  const boosted: string[] = [];

  if (lambda > 0) {
    for (let currentRank = 0; currentRank < ordered.length; currentRank++) {
      const id = ordered[currentRank];
      const orig = items.find((i) => i.id === id)!;
      const baseRank = baselineRanks.get(id)!;
      if (
        currentRank < baseRank &&
        orig.prefScore > 0 &&
        !excludedIds.includes(id)
      ) {
        boosted.push(id);
      }
    }
  }

  return { ordered, boosted };
}

export function buildSignalEvents(
  {
    filters,
    keywordAttrs,
  }: {
    filters?: Record<string, any>;
    keywordAttrs?: { dimension: string; value: string }[];
    groupSize?: any;
    dateRange?: any;
    rawQuery?: any;
  },
  nowMs: number
): { dimension: string; value: string; weight: number; ts: number }[] {
  const events: {
    dimension: string;
    value: string;
    weight: number;
    ts: number;
  }[] = [];

  if (filters && typeof filters === 'object') {
    for (const [dimension, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        events.push({
          dimension,
          value: String(val),
          weight: 2,
          ts: nowMs,
        });
      }
    }
  }

  if (Array.isArray(keywordAttrs)) {
    for (const attr of keywordAttrs) {
      if (attr && attr.dimension && attr.value) {
        events.push({
          dimension: attr.dimension,
          value: attr.value,
          weight: 2,
          ts: nowMs,
        });
      }
    }
  }

  return events;
}
