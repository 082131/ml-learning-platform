// Code for the attention lesson. The TypeScript computation is checked against NumPy 2.5.3
// (CPython 3.13.16) in src/lib/deep/attention.test.ts, including what the last line prints.
import {
  ATTENTION_SOURCE,
  attentionExperiment,
  attentionSlots,
  type AttentionState,
} from '@/lib/deep/attentionExperiment';
import type { CodeExample } from '@/lib/types';

export const TOKENS = ['the', 'cat', 'sat', 'down'];

/** Token vectors (4 tokens, d_model = 3) and projection matrices (3 → d_k = 2), small whole numbers. */
export const X = [
  [1, 0, 1],
  [0, 2, 0],
  [1, 1, 0],
  [0, 1, 1],
];
export const WQ = [
  [1, 0],
  [0, 1],
  [1, -1],
];
export const WK = [
  [1, 0],
  [1, 1],
  [0, 2],
];
export const WV = [
  [1, 0],
  [0, 1],
  [2, 1],
];

const CODE_ID = 'attn-code';

/** One state for the inputs, heatmap, row arithmetic, code, step-through and readout. */
export const experiment = attentionExperiment(
  'attn',
  { tokens: TOKENS, X, Wq: WQ, Wk: WK, Wv: WV, causal: false, row: 0 },
  CODE_ID,
);

const slot = (name: string) => (s: unknown) => attentionSlots(s as AttentionState)[name]!;

export const attentionCode: CodeExample = {
  id: CODE_ID,
  language: 'python',
  source: ATTENTION_SOURCE,
  slots: Object.fromEntries(['X', 'Wq', 'Wk', 'Wv', 'mask', 'row'].map((k) => [k, slot(k)])),
  annotations: [
    {
      id: 'X',
      range: { line: 3, startCol: 13, endCol: 18 },
      match: '{{X}}',
      kind: 'parameter',
      title: 'X: the token vectors',
      what: 'One row per token, here 4 tokens with 3 numbers each, filled from the experiment.',
      why: 'In a transformer these rows are the embeddings (plus position information) coming into the layer.',
      output: 'shape (seq, d_model) = (4, 3)',
    },
    {
      id: 'Wq',
      range: { line: 4, startCol: 15, endCol: 21 },
      match: '{{Wq}}',
      kind: 'parameter',
      title: 'W_q, W_k, W_v: learned projections',
      what: 'Three weight matrices of shape (d_model, d_k) = (3, 2).',
      why: 'They are parameters: training adjusts them so that useful queries match useful keys. Here you type them in.',
    },
    {
      id: 'Q',
      range: { line: 8, startCol: 4, endCol: 11 },
      match: 'X @ W_q',
      kind: 'math',
      title: 'Q = X @ W_q',
      what: 'Every token’s vector times W_q: one query per token.',
      why: 'The same matrix is used for every position, so this is one matrix multiplication for the whole sequence.',
      inputs: 'X (4, 3), W_q (3, 2)',
      output: 'Q (4, 2). K and V are made the same way',
    },
    {
      id: 'dk',
      range: { line: 11, startCol: 6, endCol: 16 },
      match: 'K.shape[1]',
      kind: 'framework',
      title: 'd_k',
      what: 'The length of each key (and query): the number of columns of K.',
      why: 'It sets the scaling factor √d_k.',
    },
    {
      id: 'QK',
      range: { line: 12, startCol: 9, endCol: 16 },
      match: 'Q @ K.T',
      kind: 'math',
      title: 'Q @ K.T',
      what: 'Entry (i, j) is the dot product of query i with key j: how well token j matches what token i is looking for.',
      why: 'All pairs at once: (4, 2) @ (2, 4) → (4, 4).',
      output: 'shape (seq, seq)',
    },
    {
      id: 'sqrt',
      range: { line: 12, startCol: 19, endCol: 31 },
      match: 'np.sqrt(d_k)',
      kind: 'math',
      title: '÷ √d_k',
      what: 'Divides every score by the square root of the key length.',
      why: 'A dot product of d_k terms grows with d_k. Without the scaling, large scores make the softmax put almost all weight on one token, which slows learning (Vaswani et al., 2017, section 3.2.1).',
    },
    {
      id: 'mask',
      range: { line: 13 },
      kind: 'syntax',
      title: 'The optional causal mask',
      what: 'With the causal mask, np.tril keeps the lower triangle (j ≤ i) and np.where sets every other score to −inf.',
      why: 'exp(−inf) = 0, so a token gets zero weight on tokens after it. Decoders (GPT-style) need this to predict the next token without seeing it.',
    },
    {
      id: 'exp',
      range: { line: 14, startCol: 10, endCol: 16 },
      match: 'np.exp',
      kind: 'framework',
      title: 'np.exp',
      what: 'e to the power of each entry: positive for every finite score, 0 for −inf.',
      why: 'Softmax step 1: make every score positive while keeping their order.',
    },
    {
      id: 'max',
      range: { line: 14, startCol: 26, endCol: 59 },
      match: 'scores.max(axis=1, keepdims=True)',
      kind: 'framework',
      title: 'Subtract the row maximum',
      what: 'The largest score of each row, shape (4, 1); keepdims lets it broadcast across the row.',
      why: 'exp(z − max) / Σ exp(z − max) equals exp(z) / Σ exp(z), but never overflows: the largest exponent is exp(0) = 1.',
    },
    {
      id: 'sum',
      range: { line: 15, startCol: 20, endCol: 54 },
      match: 'weights.sum(axis=1, keepdims=True)',
      kind: 'framework',
      title: 'Normalize each row',
      what: 'Divides each row by its own sum.',
      why: 'Softmax step 2: each row now adds up to 1, so it can be used as weights for an average.',
    },
    {
      id: 'out',
      range: { line: 16, startCol: 6, endCol: 17 },
      match: 'weights @ V',
      kind: 'math',
      title: 'weights @ V',
      what: 'Row i of the output is Σ_j weights[i, j] · V[j]: a weighted average of the value vectors.',
      why: 'This is the result of attention: each token’s new vector mixes in information from the tokens it attends to.',
      inputs: 'weights (4, 4), V (4, 2)',
      output: 'out (4, 2)',
    },
    {
      id: 'round',
      range: { line: 18, startCol: 6, endCol: 14 },
      match: 'np.round',
      kind: 'framework',
      title: 'np.round(out[row], 3)',
      what: 'The output row of the selected token, rounded to 3 decimals for printing.',
      why: 'The readout shows exactly what this prints; the selected token comes from the heatmap.',
    },
  ],
};
