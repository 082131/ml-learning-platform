/** BM25 defaults used by Lucene and Elasticsearch. */
export const BM25_K1 = 1.2;
export const BM25_B = 0.75;

/** Lowercase words and codes; a hyphen inside a word keeps it whole, so "E-402" stays one term. */
export function searchTerms(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? [];
}

/**
 * BM25 keyword score of each document for the query. A term counts more when it is rare across the
 * documents (idf) and when it appears often in a short document, with diminishing returns (k1, b).
 * idf(t) = ln((N − n(t) + 0.5) / (n(t) + 0.5) + 1), the always-positive form Lucene uses.
 */
export function bm25Scores(query: string, docs: readonly string[], k1 = BM25_K1, b = BM25_B): number[] {
  const tokenized = docs.map(searchTerms);
  const n = tokenized.length;
  const avgLength = tokenized.reduce((s, d) => s + d.length, 0) / (n || 1);
  const df = new Map<string, number>();
  for (const d of tokenized) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const terms = [...new Set(searchTerms(query))].filter((t) => df.has(t));
  return tokenized.map((d) =>
    terms.reduce((score, t) => {
      const f = d.filter((x) => x === t).length;
      if (f === 0) return score;
      const dft = df.get(t)!;
      const idf = Math.log((n - dft + 0.5) / (dft + 0.5) + 1);
      return score + (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avgLength));
    }, 0),
  );
}
