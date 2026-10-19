/**
 * Seeded randomness for experiments, so a given seed always gives the same split, sample or noise
 * (spec: reproducible results). Not for cryptography.
 */

/** mulberry32: a small 32-bit generator. Returns a function giving floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled copy (Fisher–Yates), driven by `rand`. */
export function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** A standard normal draw (mean 0, standard deviation 1) by the Box–Muller transform. */
export function normal(rand: () => number): number {
  const u = 1 - rand(); // in (0, 1], so log(u) is finite
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** `n` indices drawn with replacement from 0..size−1 (a bootstrap sample). */
export function bootstrapIndices(size: number, n: number, rand: () => number): number[] {
  return Array.from({ length: n }, () => Math.floor(rand() * size));
}
