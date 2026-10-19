/** A seeded random number generator, so every "random" demo is reproducible from its seed. */

/** mulberry32: a small, fast 32-bit generator. Returns numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal samples (mean 0, standard deviation 1) by the Box–Muller transform. */
export function normalSampler(rand: () => number): () => number {
  return () => {
    const u = 1 - rand(); // in (0, 1], so log(u) is finite
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

/** A shuffled copy of 0..n−1 (Fisher–Yates), driven by `rand`. */
export function permutation(n: number, rand: () => number): number[] {
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j]!, p[i]!];
  }
  return p;
}
