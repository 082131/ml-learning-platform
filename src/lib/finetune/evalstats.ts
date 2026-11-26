// Statistics for evaluating a fine-tune: pairwise win rate with a Wilson interval, the sample size a margin needs,
// order-swapped judging, and a regression gate over a benchmark suite.

/** z for a two-sided 95% interval. */
export const Z95 = 1.959964;

export interface WinRate {
  n: number;
  /** (wins + ties / 2) / n: ties count as half a win, as in most pairwise leaderboards. */
  rate: number;
  low: number;
  high: number;
  verdict: 'better' | 'worse' | 'unclear';
}

/**
 * Wilson score interval for a proportion: center (p̂ + z²/2n) / (1 + z²/n), half-width
 * z·√(p̂(1−p̂)/n + z²/4n²) / (1 + z²/n). Better than p̂ ± z·√(p̂(1−p̂)/n) for small n or rates near 0 or 1.
 * Treating a tie as half a success is an approximation; the lesson says so.
 */
export function wilson(successes: number, n: number, z = Z95): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 1 };
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
}

export function winRate(wins: number, losses: number, ties: number): WinRate {
  const n = wins + losses + ties;
  const rate = n ? (wins + ties / 2) / n : 0;
  const { low, high } = wilson(wins + ties / 2, n);
  return { n, rate, low, high, verdict: low > 0.5 ? 'better' : high < 0.5 ? 'worse' : 'unclear' };
}

/** Comparisons needed so the 95% interval half-width is at most `margin`, at an expected rate p: z²·p(1−p)/margin². */
export const sampleSize = (margin: number, p = 0.5, z = Z95): number => Math.ceil((z * z * p * (1 - p)) / (margin * margin));

export type Verdict = 'A' | 'B' | 'tie';

/**
 * Judge each pair twice, once in each order. A verdict counts only when both orders agree; otherwise it becomes a
 * tie, because the judge was following the position rather than the content.
 */
export function swapConsistent(firstOrder: readonly Verdict[], swappedOrder: readonly Verdict[]): { final: Verdict[]; inconsistent: number } {
  let inconsistent = 0;
  const final = firstOrder.map((v, i) => {
    // in the swapped run the candidates' positions are exchanged, so "A" there means candidate B
    const back: Verdict = swappedOrder[i] === 'A' ? 'B' : swappedOrder[i] === 'B' ? 'A' : 'tie';
    if (v === back) return v;
    inconsistent++;
    return 'tie';
  });
  return { final, inconsistent };
}

export interface BenchRow {
  id: string;
  label: string;
  /** Larger is better, in percent. */
  base: number;
  candidate: number;
  /** Largest drop (percentage points) we accept. Target tasks use a required gain instead (negative tolerance). */
  tolerance: number;
}

export interface GateRow extends BenchRow {
  delta: number;
  pass: boolean;
}

export function regressionGate(rows: readonly BenchRow[]): { rows: GateRow[]; pass: boolean } {
  const out = rows.map((r) => {
    const delta = Math.round((r.candidate - r.base) * 10) / 10;
    return { ...r, delta, pass: delta >= -r.tolerance };
  });
  return { rows: out, pass: out.every((r) => r.pass) };
}
