import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import { attention, describeRow, softmax } from './attention';
import {
  ATTENTION_SOURCE,
  attentionExperiment,
  attentionSlots,
  printRoundedRow,
  type AttentionState,
} from './attentionExperiment';
import { NUMPY_ATTENTION } from './attention.numpy';

/*
 * NUMPY_ATTENTION was produced with NumPy 2.5.3 by, for each case:
 *   Q = X @ W_q; K = X @ W_k; V = X @ W_v; d_k = K.shape[1]
 *   scores = Q @ K.T / np.sqrt(d_k)
 *   if causal: scores = np.where(np.tril(np.ones((n, n))) == 1, scores, -np.inf)
 *   weights = np.exp(scores - scores.max(axis=1, keepdims=True))
 *   weights = weights / weights.sum(axis=1, keepdims=True); out = weights @ V
 * and json.dumps of Q, K, V, weights and out.
 */

/** print(np.round(out[i], 3)) for i = 0..3, per case, copied from the same NumPy run. */
const NUMPY_ROW_PRINTS = [
  ['[0.884 1.33 ]', '[1.804 1.804]', '[1.33 1.67]', '[1.16 1.5 ]'],
  ['[3. 1.]', '[1.5 1.5]', '[0.993 1.503]', '[1.16 1.5 ]'],
  ['[-2.  -0.5]', '[-1.92 -0.53]', '[ 2.498 -0.   ]', '[ 1.951 -1.875]'],
];

const close = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]) =>
  a.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(b[i]![j]!, 12)));

const TOKENS = ['the', 'cat', 'sat', 'down'];
const mutable = (m: readonly (readonly number[])[]) => m.map((r) => [...r]);
const stateOf = (c: (typeof NUMPY_ATTENTION)[number], row = 0): AttentionState => ({
  tokens: TOKENS,
  X: mutable(c.X),
  Wq: mutable(c.Wq),
  Wk: mutable(c.Wk),
  Wv: mutable(c.Wv),
  causal: c.causal,
  row,
});

describe('softmax', () => {
  it('matches a hand-worked example and ignores a shift', () => {
    // exp(0) = 1, exp(ln 3) = 3: weights 1/4 and 3/4.
    const w = softmax([0, Math.log(3)]);
    expect(w[0]).toBeCloseTo(0.25, 12);
    expect(w[1]).toBeCloseTo(0.75, 12);
    expect(softmax([1000, 1000 + Math.log(3)])[1]).toBeCloseTo(0.75, 12);
  });
  it('gives masked (−∞) entries a weight of 0', () => {
    expect(softmax([2, -Infinity])).toEqual([1, 0]);
  });
});

describe('attention', () => {
  it.each(NUMPY_ATTENTION.map((c, k) => [k, c] as const))('case %i matches NumPy', (k, c) => {
    const r = attention(stateOf(c));
    close(r.Q, c.expected.Q);
    close(r.K, c.expected.K);
    close(r.V, c.expected.V);
    close(r.weights, c.expected.weights);
    close(r.out, c.expected.out);
    for (let i = 0; i < 4; i++) expect(printRoundedRow(r, i)).toBe(NUMPY_ROW_PRINTS[k]![i]);
  });

  it('works row 0 of the lesson example by hand', () => {
    // q0 = (2, -1); keys (1, 2), (2, 2), (2, 1), (1, 3) give q·k = 0, 2, 3, -1; ÷ √2.
    const r = attention(stateOf(NUMPY_ATTENTION[0]));
    expect(r.scores[0]!.map((x) => x * Math.SQRT2)).toEqual([0, 2, 3, -1].map((x) => expect.closeTo(x, 12)));
    const d = describeRow(r, 0, TOKENS);
    expect(d.scores[1]).toBe('cat: q·k = 2·2 + (-1)·2 = 2; ÷ √2 (1.4142) = 1.4142');
    expect(d.exps[0]).toBe('the: exp(0 − 2.1213) = 0.1199');
    expect(r.weights[0]!.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('masks later tokens when causal, so the first token attends only to itself', () => {
    const r = attention({ ...stateOf(NUMPY_ATTENTION[0]), causal: true });
    expect(r.weights[0]).toEqual([1, 0, 0, 0]);
    expect(r.masked[1]![2]).toBe(-Infinity);
    expect(describeRow(r, 1, TOKENS).scores[3]).toBe('down: masked (j > i) → −∞');
  });
});

describe('attentionExperiment', () => {
  const def = attentionExperiment('attn', stateOf(NUMPY_ATTENTION[0]), 'attn-code');
  it('is valid, with a trace that fits the filled source', () => {
    expect(validateExperiment(def)).toEqual([]);
    for (const causal of [false, true]) {
      const s = { ...def.initial, causal, row: 2 };
      const { source } = fillSlots(ATTENTION_SOURCE, [], attentionSlots(s));
      expect(validateTrace(def.trace!(s), source)).toEqual([]);
    }
    const { source } = fillSlots(ATTENTION_SOURCE, [], attentionSlots(def.initial));
    expect(source.split('\n')[2]).toBe('X = np.array([[1, 0, 1], [0, 2, 0], [1, 1, 0], [0, 1, 1]])');
    expect(source.split('\n').at(-1)).toBe('print(np.round(out[0], 3))');
  });
  it('writes decimals as Python literals', () => {
    const s = { ...def.initial, X: [[0.5, -0, 2]] };
    expect(attentionSlots(s).X).toBe('[[0.5, 0, 2]]');
  });
  it('reads out shapes, the selected row and what the code prints', () => {
    const items = def.readout!(def.initial, def.compute(def.initial));
    expect(items[0]!.value).toBe('X (4, 3) → Q, K (4, 2), V (4, 2) → scores (4, 4) → out (4, 2)');
    expect(items[2]!.value).toBe('1');
    expect(items[4]!.value).toBe('[0.884 1.33 ]');
  });
});
