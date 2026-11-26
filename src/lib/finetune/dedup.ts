// Near-duplicate detection and contamination checks for training data. Exact Jaccard similarity on word n-gram
// "shingles", and a MinHash estimate of it (the trick that makes deduplication of billions of documents feasible,
// as in Lee et al. 2022, "Deduplicating Training Data Makes Language Models Better").

/** Lowercase, drop punctuation, collapse spaces: so "Reset your password!" and "reset your password" match. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The set of n consecutive words. A text shorter than n words gives one shingle: the whole text. */
export function shingles(text: string, n: number): Set<string> {
  const words = normalize(text).split(' ').filter(Boolean);
  const out = new Set<string>();
  if (words.length === 0) return out;
  if (words.length < n) {
    out.add(words.join(' '));
    return out;
  }
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return out;
}

/** |A ∩ B| / |A ∪ B|: 1 for identical sets, 0 for sets with nothing in common. */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** 32-bit FNV-1a with a seed mixed in: a fast, deterministic hash so results are reproducible. */
export function hash32(text: string, seed: number): number {
  let h = (0x811c9dc5 ^ Math.imul(seed + 1, 0x9e3779b1)) >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // final avalanche (murmur3 fmix32) so nearby seeds give unrelated hash functions
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** One minimum per hash function. Two sets agree on a position with probability equal to their Jaccard similarity. */
export function minhash(set: ReadonlySet<string>, numHashes: number): number[] {
  const sig: number[] = new Array(numHashes).fill(0xffffffff);
  for (const s of set)
    for (let k = 0; k < numHashes; k++) {
      const h = hash32(s, k);
      if (h < sig[k]!) sig[k] = h;
    }
  return sig;
}

/** The share of signature positions that agree: the MinHash estimate of Jaccard similarity. */
export function minhashSimilarity(a: readonly number[], b: readonly number[]): number {
  let same = 0;
  for (let k = 0; k < a.length; k++) if (a[k] === b[k]) same++;
  return same / a.length;
}

export interface DupPair {
  a: number;
  b: number;
  jaccard: number;
  estimate: number;
}

export interface DedupResult {
  pairs: DupPair[];
  /** Every pair at or above the threshold (by exact Jaccard). */
  flagged: DupPair[];
  /** Index of the first document of each cluster that is kept. */
  kept: number[];
  removed: number[];
}

/**
 * Compare every pair, flag pairs whose Jaccard similarity is at least `threshold`, group flagged pairs into clusters
 * (if A≈B and B≈C, all three are one cluster) and keep the first document of each cluster.
 */
export function dedup(texts: readonly string[], n: number, threshold: number, numHashes = 64): DedupResult {
  const sets = texts.map((t) => shingles(t, n));
  const sigs = sets.map((s) => minhash(s, numHashes));
  const pairs: DupPair[] = [];
  for (let a = 0; a < texts.length; a++)
    for (let b = a + 1; b < texts.length; b++)
      pairs.push({ a, b, jaccard: jaccard(sets[a]!, sets[b]!), estimate: minhashSimilarity(sigs[a]!, sigs[b]!) });
  const flagged = pairs.filter((p) => p.jaccard >= threshold);
  const parent = texts.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (const p of flagged) {
    const ra = find(p.a);
    const rb = find(p.b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  }
  const kept: number[] = [];
  const removed: number[] = [];
  texts.forEach((_, i) => (find(i) === i ? kept : removed).push(i));
  return { pairs, flagged, kept, removed };
}

/**
 * Contamination: which test items share at least one n-gram with any training text. GPT-3 (Brown et al. 2020)
 * used 13-gram overlap; short examples need a smaller n.
 */
export function contaminated(train: readonly string[], test: readonly string[], n: number): number[] {
  const trainGrams = new Set<string>();
  for (const t of train) for (const g of shingles(t, n)) trainGrams.add(g);
  const out: number[] = [];
  test.forEach((t, i) => {
    for (const g of shingles(t, n))
      if (trainGrams.has(g)) {
        out.push(i);
        break;
      }
  });
  return out;
}
