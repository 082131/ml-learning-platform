import { matmul, shapeOf, transpose } from '../math/matrix';
import { formatNumber } from '../trace/values';

/**
 * Scaled dot-product attention on small matrices, keeping every intermediate so the lesson can show
 * it: Q = X W_q, K = X W_k, V = X W_v, scores = Q Kᵀ / √d_k, an optional causal mask, a row-wise
 * softmax, and out = weights V. Checked against NumPy 2.5.3 in attention.test.ts.
 */

export interface AttentionInput {
  X: number[][];
  Wq: number[][];
  Wk: number[][];
  Wv: number[][];
  causal: boolean;
}

export interface AttentionResult {
  Q: number[][];
  K: number[][];
  V: number[][];
  dk: number;
  /** Q Kᵀ / √d_k, before masking. */
  scores: number[][];
  /** After the mask: −Infinity where position j > i when causal. */
  masked: number[][];
  /** exp(masked − row max), the softmax numerators. */
  exps: number[][];
  weights: number[][];
  out: number[][];
}

/** Softmax of one row, subtracting the row's maximum first (same result, no overflow). −∞ gives 0. */
export function softmax(row: readonly number[]): number[] {
  const max = Math.max(...row);
  const e = row.map((z) => Math.exp(z - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / sum);
}

/** Lower-triangular mask: entry (i, j) is kept when j ≤ i. */
export const causalAllowed = (i: number, j: number) => j <= i;

export function attention({ X, Wq, Wk, Wv, causal }: AttentionInput): AttentionResult {
  const Q = matmul(X, Wq);
  const K = matmul(X, Wk);
  const V = matmul(X, Wv);
  const dk = shapeOf(K)[1];
  const scale = Math.sqrt(dk);
  const scores = matmul(Q, transpose(K)).map((row) => row.map((x) => x / scale));
  const masked = scores.map((row, i) => row.map((x, j) => (!causal || causalAllowed(i, j) ? x : -Infinity)));
  const exps = masked.map((row) => {
    const max = Math.max(...row);
    return row.map((z) => Math.exp(z - max));
  });
  const weights = masked.map(softmax);
  const out = matmul(weights, V);
  return { Q, K, V, dk, scores, masked, exps, weights, out };
}

const paren = (x: number) => (x < 0 ? `(${formatNumber(x)})` : formatNumber(x));
const vec = (v: readonly number[]) => `(${v.map(formatNumber).join(', ')})`;

/** The arithmetic for query row i, one line per step, for the lesson's row panel and trace notes. */
export function describeRow(r: AttentionResult, i: number, tokens: readonly string[]) {
  const q = r.Q[i]!;
  const root = formatNumber(Math.sqrt(r.dk));
  const max = Math.max(...r.masked[i]!);
  const sum = r.exps[i]!.reduce((a, b) => a + b, 0);
  return {
    scores: r.K.map((k, j) => {
      if (r.masked[i]![j] === -Infinity) return `${tokens[j]}: masked (j > i) → −∞`;
      const dot = q.reduce((s, x, c) => s + x * k[c]!, 0);
      return `${tokens[j]}: q·k = ${q.map((x, c) => `${paren(x)}·${paren(k[c]!)}`).join(' + ')} = ${formatNumber(dot)}; ÷ √${r.dk} (${root}) = ${formatNumber(r.scores[i]![j]!)}`;
    }),
    exps: r.exps[i]!.map(
      (e, j) =>
        `${tokens[j]}: ${r.masked[i]![j] === -Infinity ? 'exp(−∞) = 0' : `exp(${formatNumber(r.masked[i]![j]!)} − ${formatNumber(max)}) = ${formatNumber(e)}`}`,
    ),
    sum: `sum = ${r.exps[i]!.map(formatNumber).join(' + ')} = ${formatNumber(sum)}`,
    weights: r.weights[i]!.map(
      (w, j) => `${tokens[j]}: ${formatNumber(r.exps[i]![j]!)} / ${formatNumber(sum)} = ${formatNumber(w)}`,
    ),
    out: r.out[i]!.map(
      (o, c) =>
        `out[${i}][${c}] = ${r.weights[i]!.map((w, j) => `${formatNumber(w)}·${paren(r.V[j]![c]!)}`).join(' + ')} = ${formatNumber(o)}`,
    ),
    outVector: vec(r.out[i]!),
  };
}
