export function selectTiers(
  scored: { id: string; score: number; flags?: string[] }[]
): { top: string[]; additional: string[]; dropped: string[] } {
  // Clone to avoid mutation
  const sorted = [...scored].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.id.localeCompare(b.id);
  });

  const top: string[] = [];
  const additional: string[] = [];
  const dropped: string[] = [];

  for (const item of sorted) {
    if (item.score < 40) {
      dropped.push(item.id);
    } else {
      const hasPriceUnknown = item.flags?.includes('price_unknown');
      if (!hasPriceUnknown && top.length < 5) {
        top.push(item.id);
      } else {
        additional.push(item.id);
      }
    }
  }

  return { top, additional, dropped };
}

export function applyNullPenalty(score: number, flags: string[] = []): number {
  const nullFlags = ['capacity_unknown', 'notice_unknown', 'price_unknown'];
  let count = 0;
  for (const flag of flags) {
    if (nullFlags.includes(flag)) {
      count++;
    }
  }
  return Math.max(0, score - count * 5);
}

export function tagMatchScore(
  requested: string[] = [],
  candidateTags: string[] = []
): number {
  if (!requested || requested.length === 0) return 0;

  const candidateNormalized = new Set(
    candidateTags.map((t) => t.trim().toLowerCase())
  );

  let matchCount = 0;
  for (const tag of requested) {
    if (candidateNormalized.has(tag.trim().toLowerCase())) {
      matchCount++;
    }
  }

  return matchCount / requested.length;
}

export function sortByPriceAsc<T extends { id: string; price_per_person: number | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (a.price_per_person === null && b.price_per_person === null) {
      return a.id.localeCompare(b.id);
    }
    if (a.price_per_person === null) return 1;
    if (b.price_per_person === null) return -1;
    if (a.price_per_person !== b.price_per_person) {
      return a.price_per_person - b.price_per_person;
    }
    return a.id.localeCompare(b.id);
  });
}

export function resolveDisplayGroups({
  top,
  additional,
}: {
  top: string[];
  additional: string[];
}): { primary: string[]; secondary: string[] } {
  if (top.length === 0) {
    return {
      primary: [...additional],
      secondary: [],
    };
  }
  return {
    primary: [...top],
    secondary: [...additional],
  };
}
