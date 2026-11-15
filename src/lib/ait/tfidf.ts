function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

function tokenize(text: string): string[] {
  const clean = removeVietnameseAccents(text.toLowerCase());
  return clean.match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function rankByTfidf(
  query: string,
  docs: { id: string; text: string }[]
): { id: string; score: number }[] {
  if (!docs || docs.length === 0) return [];

  const qTokens = tokenize(query);
  if (qTokens.length === 0) {
    return [...docs]
      .map((d) => ({ id: d.id, score: 0 }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  const N = docs.length;

  // Pre-tokenize docs
  const docTokensMap = new Map<string, string[]>();
  const docWordCountMap = new Map<string, Map<string, number>>();

  for (const d of docs) {
    const tokens = tokenize(d.text);
    docTokensMap.set(d.id, tokens);

    const counts = new Map<string, number>();
    for (const t of tokens) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    docWordCountMap.set(d.id, counts);
  }

  // Compute DF and IDF for each unique token in query
  const uniqueQueryTokens = Array.from(new Set(qTokens));
  const idfMap = new Map<string, number>();

  for (const token of uniqueQueryTokens) {
    let df = 0;
    for (const d of docs) {
      if (docWordCountMap.get(d.id)!.has(token)) {
        df++;
      }
    }
    if (df > 0) {
      // Smoothed IDF: rarer words have higher IDF
      idfMap.set(token, Math.log(1 + N / df) + 1);
    } else {
      idfMap.set(token, 0);
    }
  }

  // Compute raw score for each document
  const rawScores = new Map<string, number>();
  let maxRaw = 0;

  for (const d of docs) {
    const counts = docWordCountMap.get(d.id)!;
    let score = 0;
    for (const token of qTokens) {
      const tf = counts.get(token) ?? 0;
      const idf = idfMap.get(token) ?? 0;
      score += tf * idf;
    }
    rawScores.set(d.id, score);
    if (score > maxRaw) {
      maxRaw = score;
    }
  }

  // Normalize scores to [0, 1]
  const results = docs.map((d) => {
    const raw = rawScores.get(d.id) ?? 0;
    const normalized = maxRaw > 0 ? raw / maxRaw : 0;
    return {
      id: d.id,
      score: Math.round(normalized * 1e6) / 1e6,
    };
  });

  // Sort descending by score, tie-break by id ascending
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.id.localeCompare(b.id);
  });

  return results;
}
