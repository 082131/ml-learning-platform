import { seededRandom, shuffled } from './random';

/** The three roles a row can play. */
export type SplitName = 'train' | 'validation' | 'test';
export const SPLIT_NAMES: readonly SplitName[] = ['train', 'validation', 'test'];

export interface SplitCounts {
  train: number;
  validation: number;
  test: number;
}

/**
 * Row counts for a dataset of `n` rows with `validationPct` and `testPct` percent held out. Each
 * held-out count is rounded to the nearest whole row; training gets the rest. With n = 60 and
 * percentages in steps of 5 every count is exact (60 · 5 / 100 = 3).
 */
export function splitCounts(n: number, validationPct: number, testPct: number): SplitCounts {
  if (validationPct < 0 || testPct < 0 || validationPct + testPct >= 100)
    throw new Error('Validation and test percentages must be non-negative and leave rows for training');
  const validation = Math.round((n * validationPct) / 100);
  const test = Math.round((n * testPct) / 100);
  return { train: n - validation - test, validation, test };
}

/**
 * Which split each row (by position 0..n−1) goes to. The row numbers are shuffled with the seed;
 * the first `train` shuffled rows become training rows, the next `validation` rows validation, and
 * the rest test. The same seed always gives the same assignment.
 */
export function assignSplits(counts: SplitCounts, seed: number): SplitName[] {
  const n = counts.train + counts.validation + counts.test;
  const order = shuffled(
    Array.from({ length: n }, (_, i) => i),
    seededRandom(seed),
  );
  const out = Array<SplitName>(n);
  order.forEach((row, pos) => {
    out[row] = pos < counts.train ? 'train' : pos < counts.train + counts.validation ? 'validation' : 'test';
  });
  return out;
}

/** The row numbers in one split, in increasing order. */
export function rowsIn(assignment: readonly SplitName[], split: SplitName): number[] {
  return assignment.flatMap((s, i) => (s === split ? [i] : []));
}
