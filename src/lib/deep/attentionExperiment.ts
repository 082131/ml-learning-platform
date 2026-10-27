import { formatShape, shapeOf, withEntry } from '../math/matrix';
import { numpyVector, pyListLiteral } from '../linalg/pyFormat';
import { array, formatNumber, scalar, text } from '../trace/values';
import type { ExperimentDef, Trace, TraceStep } from '../types';
import { attention, describeRow, type AttentionInput, type AttentionResult } from './attention';

export interface AttentionState extends AttentionInput {
  tokens: string[];
  /** The query row (token) being explained. */
  row: number;
}

/** Matrix cells accept numbers in this range (decimals allowed). */
export const ATTN_LIMITS = { min: -5, max: 5 } as const;

const NO_MASK = '# no mask: every token attends to every token';
const CAUSAL_MASK = 'scores = np.where(np.tril(np.ones(scores.shape)) == 1, scores, -np.inf)';

/** The NumPy program the attention lesson shows and steps through. */
export const ATTENTION_SOURCE = `import numpy as np

X = np.array({{X}})
W_q = np.array({{Wq}})
W_k = np.array({{Wk}})
W_v = np.array({{Wv}})

Q = X @ W_q
K = X @ W_k
V = X @ W_v
d_k = K.shape[1]
scores = Q @ K.T / np.sqrt(d_k)
{{mask}}
weights = np.exp(scores - scores.max(axis=1, keepdims=True))
weights = weights / weights.sum(axis=1, keepdims=True)
out = weights @ V
print(out.shape)
print(np.round(out[{{row}}], 3))`;

const LINE = {
  X: 3,
  Wq: 4,
  Wk: 5,
  Wv: 6,
  Q: 8,
  K: 9,
  V: 10,
  dk: 11,
  scores: 12,
  mask: 13,
  exp: 14,
  norm: 15,
  out: 16,
  shape: 17,
  row: 18,
};

/** A matrix as a Python list literal (−0 folded to 0, floats written as Python writes them). */
const literal = (m: number[][]) => `[${m.map((r) => pyListLiteral(r.map((x) => x + 0))).join(', ')}]`;

export const attentionSlots = (s: AttentionState): Record<string, string> => ({
  X: literal(s.X),
  Wq: literal(s.Wq),
  Wk: literal(s.Wk),
  Wv: literal(s.Wv),
  mask: s.causal ? CAUSAL_MASK : NO_MASK,
  row: String(s.row),
});

/** Python's round-half-even to `d` decimals, as np.round does on float64 values (to within one ulp). */
const npRound = (x: number, d: number) => {
  const f = 10 ** d;
  const y = x * f;
  const r = Math.round(y);
  const half = Math.abs(y - Math.trunc(y)) === 0.5;
  // Keep the sign of zero: NumPy prints np.round(-0.0001, 3) as -0.
  return (half && r % 2 !== 0 ? r - 1 : r) / f;
};

/**
 * What `print(np.round(out[row], 3))` prints. NumPy switches to scientific notation for some value
 * ranges; numpyVector throws there, and the readout says so instead of guessing.
 */
export function printRoundedRow(r: AttentionResult, row: number): string {
  try {
    return numpyVector(
      r.out[row]!.map((x) => npRound(x, 3)),
      true,
    );
  } catch {
    return 'NumPy would print this row in scientific notation; see the table instead';
  }
}

const shapeText = (m: number[][]) => formatShape(shapeOf(m));

/** A computed trace of ATTENTION_SOURCE, with the selected query row highlighted. */
export function buildAttentionTrace(s: AttentionState, r: AttentionResult = attention(s)): Trace {
  const i = s.row;
  const tok = s.tokens[i]!;
  const n = s.X.length;
  const row = (cols: number) => Array.from({ length: cols }, (_, c) => [i, c]);
  const d = describeRow(r, i, s.tokens);
  const vars: Record<string, ReturnType<typeof array>> = {};
  const steps: TraceStep[] = [];
  const push = (
    line: number,
    name: string | undefined,
    value: number[][] | undefined,
    note: string,
    hl = true,
  ) => {
    if (name && value) vars[name] = array(value);
    steps.push({
      range: { line },
      vars: { ...vars },
      note,
      highlight: hl && name && value ? { [name]: row(value[0]!.length) } : undefined,
    });
  };
  push(
    LINE.X,
    'X',
    s.X,
    `X holds one row per token (${s.tokens.join(', ')}): shape ${shapeText(s.X)}. Row ${i} is "${tok}".`,
  );
  push(
    LINE.Wq,
    'W_q',
    s.Wq,
    `W_q turns each token's ${s.X[0]!.length} numbers into a query of ${s.Wq[0]!.length}: shape ${shapeText(s.Wq)}.`,
    false,
  );
  push(LINE.Wk, 'W_k', s.Wk, `W_k makes keys: shape ${shapeText(s.Wk)}.`, false);
  push(LINE.Wv, 'W_v', s.Wv, `W_v makes values: shape ${shapeText(s.Wv)}.`, false);
  push(
    LINE.Q,
    'Q',
    r.Q,
    `Q = X @ W_q: ${shapeText(s.X)} @ ${shapeText(s.Wq)} → ${shapeText(r.Q)}. The query of "${tok}" is (${r.Q[i]!.map(formatNumber).join(', ')}).`,
  );
  push(LINE.K, 'K', r.K, `K = X @ W_k: ${shapeText(r.K)}. One key per token.`, false);
  push(LINE.V, 'V', r.V, `V = X @ W_v: ${shapeText(r.V)}. One value per token.`, false);
  steps.push({
    range: { line: LINE.dk },
    vars: { ...vars, d_k: scalar(r.dk) },
    note: `d_k = ${r.dk}, the length of each key. Scores are divided by √${r.dk} = ${formatNumber(Math.sqrt(r.dk))}.`,
  });
  const withDk = () => ({ ...vars, d_k: scalar(r.dk) });
  vars.scores = array(r.scores);
  steps.push({
    range: { line: LINE.scores },
    vars: withDk(),
    note: `scores = Q @ K.T / √d_k: ${shapeText(r.Q)} @ (${r.dk}, ${n}) → (${n}, ${n}). Row ${i}: ${d.scores.join('; ')}.`,
    highlight: { scores: row(n) },
  });
  if (s.causal) vars.scores = array(r.masked);
  steps.push({
    range: { line: LINE.mask },
    vars: withDk(),
    note: s.causal
      ? `Causal mask: entries above the diagonal (a token looking at later tokens) become −∞. Row ${i} keeps columns 0 to ${i}.`
      : 'No mask: every token may attend to every token, including later ones (encoder-style).',
    highlight: { scores: row(n) },
  });
  vars.weights = array(r.exps);
  steps.push({
    range: { line: LINE.exp },
    vars: withDk(),
    note: `Subtract each row's maximum, then exponentiate. Row ${i}: ${d.exps.join('; ')}.`,
    highlight: { weights: row(n) },
  });
  vars.weights = array(r.weights);
  steps.push({
    range: { line: LINE.norm },
    vars: withDk(),
    note: `Divide by the row sum so each row adds up to 1. Row ${i}: ${d.sum}; ${d.weights.join('; ')}.`,
    highlight: { weights: row(n) },
  });
  vars.out = array(r.out);
  steps.push({
    range: { line: LINE.out },
    vars: withDk(),
    note: `out = weights @ V: (${n}, ${n}) @ ${shapeText(r.V)} → ${shapeText(r.out)}. ${d.out.join('; ')}.`,
    highlight: { out: row(r.out[0]!.length) },
  });
  steps.push({
    range: { line: LINE.shape },
    vars: { ...withDk(), output: text(`(${n}, ${r.out[0]!.length})`) },
    note: `One output vector per token, the same shape as V: (${n}, ${r.out[0]!.length}).`,
  });
  steps.push({
    range: { line: LINE.row },
    vars: { ...withDk(), output: text(printRoundedRow(r, i)) },
    note: `The output for "${tok}", rounded to 3 decimals: a mix of the value rows, weighted by row ${i} of weights.`,
    highlight: { out: row(r.out[0]!.length) },
  });
  return { source: 'computed', steps };
}

type MatrixKey = 'X' | 'Wq' | 'Wk' | 'Wv';

export function attentionExperiment(
  id: string,
  initial: AttentionState,
  traceExample?: string,
): ExperimentDef<AttentionState, AttentionResult> {
  const cells = (key: MatrixKey, label: string) =>
    ({
      kind: 'matrix-cell',
      id: key,
      label,
      ...ATTN_LIMITS,
      get: (s: AttentionState) => s[key],
      set: (s: AttentionState, i: number, j: number, v: number) => ({
        ...s,
        [key]: withEntry(s[key], i, j, v),
      }),
      highlight: key === 'X' ? (s: AttentionState) => ({ rows: [s.row] }) : undefined,
    }) as const;
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'mask',
        label: 'Mask',
        options: [
          { value: 'none', label: 'None (encoder)' },
          { value: 'causal', label: 'Causal (decoder)' },
        ],
        get: (s) => (s.causal ? 'causal' : 'none'),
        set: (s, v) => ({ ...s, causal: v === 'causal' }),
      },
      cells('X', 'X'),
      cells('Wq', 'W_q'),
      cells('Wk', 'W_k'),
      cells('Wv', 'W_v'),
    ],
    compute: attention,
    trace: (s) => buildAttentionTrace(s),
    traceExample,
    readout: (s, r) => {
      const n = s.X.length;
      const [, d] = shapeOf(s.X);
      const dk = r.dk;
      const dv = r.V[0]!.length;
      return [
        {
          label: 'Shapes',
          value: `X (${n}, ${d}) → Q, K (${n}, ${dk}), V (${n}, ${dv}) → scores (${n}, ${n}) → out (${n}, ${dv})`,
        },
        {
          label: `Weights of "${s.tokens[s.row]}" (row ${s.row})`,
          value: r.weights[s.row]!.map((w, j) => `${s.tokens[j]} ${formatNumber(w)}`).join(', '),
        },
        { label: 'Row sum', value: formatNumber(r.weights[s.row]!.reduce((a, b) => a + b, 0)) },
        { label: 'print(out.shape)', value: `(${n}, ${dv})` },
        { label: `print(np.round(out[${s.row}], 3))`, value: printRoundedRow(r, s.row) },
      ];
    },
  };
}
