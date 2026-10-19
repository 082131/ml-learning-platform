/**
 * A 32-bit linear congruential generator (the "Numerical Recipes" constants). Lessons in ml/practice
 * use it instead of Math.random so that every run is reproducible from its seed, and so the Python
 * shown beside a visual (class LCG in the lesson code) produces bit-identical numbers: every step is
 * an exact integer operation below 2^53, then a division by a power of two.
 */
const MULTIPLIER = 1664525;
const INCREMENT = 1013904223;
const MODULUS = 2 ** 32;

export class LCG {
  private state: number;

  constructor(seed: number) {
    this.state = ((Math.trunc(seed) % MODULUS) + MODULUS) % MODULUS;
  }

  /** A number in [0, 1), as Python's `LCG.random()` in the lesson code. */
  random(): number {
    this.state = (MULTIPLIER * this.state + INCREMENT) % MODULUS;
    return this.state / MODULUS;
  }

  /** In-place Fisher–Yates shuffle, walking from the end, as `LCG.shuffle` in the lesson code. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    return items;
  }
}
