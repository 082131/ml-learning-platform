// Code for the transformers lesson. The parameter counter is plain Python; its printout for several
// configurations was produced with CPython 3.13.16 and is checked in src/lib/deep/transformer.test.ts.
import {
  PARAMS_SOURCE,
  paramSlots,
  transformerExperiment,
  type TransformerState,
} from '@/lib/deep/transformerExperiment';
import type { CodeExample } from '@/lib/types';

const CODE_ID = 'tf-params';

/** A small decoder: 2 sequences of 8 tokens, d_model 64 split into 4 heads, d_ff = 4 · d_model. */
export const experiment = transformerExperiment(
  'tf',
  {
    batch: 2,
    seq: 8,
    dModel: 64,
    heads: 4,
    dFf: 256,
    vocab: 1000,
    layers: 2,
    kind: 'decoder',
    selected: 'split',
  },
  CODE_ID,
);

const slot = (name: string) => (s: unknown) => paramSlots(s as TransformerState)[name]!;

export const paramsCode: CodeExample = {
  id: CODE_ID,
  language: 'python',
  source: PARAMS_SOURCE,
  slots: Object.fromEntries(['d', 'h', 'dff', 'V', 'T', 'N'].map((k) => [k, slot(k)])),
  annotations: [
    {
      id: 'sizes',
      range: { line: 1, startCol: 25, endCol: 30 },
      match: '{{d}}',
      kind: 'parameter',
      title: 'The sizes from the controls',
      what: 'd_model, heads and d_ff, filled from the experiment.',
      why: 'The number of heads appears in no formula below: the heads split the same d_model-wide projections into slices.',
    },
    {
      id: 'attn',
      range: { line: 4, startCol: 7, endCol: 40 },
      match: '4 * (d_model * d_model + d_model)',
      kind: 'math',
      title: 'Attention parameters',
      what: 'Four (d_model, d_model) matrices, W_q, W_k, W_v and W_o, each with a bias of d_model numbers.',
      why: 'Q, K and V are computed for all heads at once with full-width matrices; W_o mixes the merged heads.',
    },
    {
      id: 'ffn',
      range: { line: 5, startCol: 6, endCol: 54 },
      match: 'd_model * d_ff + d_ff + d_ff * d_model + d_model',
      kind: 'math',
      title: 'Feed-forward parameters',
      what: 'W_1 (d_model, d_ff) and its bias, then W_2 (d_ff, d_model) and its bias.',
      why: 'With d_ff = 4 · d_model, as in the original paper and GPT-2, this is about two thirds of the block.',
    },
    {
      id: 'norms',
      range: { line: 6, startCol: 8, endCol: 25 },
      match: '2 * (2 * d_model)',
      kind: 'math',
      title: 'LayerNorm parameters',
      what: 'Each LayerNorm learns a scale and a shift per feature: 2 · d_model numbers. A block has two.',
      why: 'Tiny next to the matrices, but they are parameters and count toward the total.',
    },
    {
      id: 'positions',
      range: { line: 9, startCol: 26, endCol: 41 },
      match: 'n_ctx * d_model',
      kind: 'math',
      title: 'Learned positions',
      what: 'One learned vector per position, as in GPT-2. Here the context length n_ctx is the T slider.',
      why: 'Models with sinusoidal or rotary positions (the original paper, Llama) have no parameters here.',
    },
    {
      id: 'layers',
      range: { line: 10, startCol: 16, endCol: 32 },
      match: 'n_layers * block',
      kind: 'math',
      title: 'Stacked blocks',
      what: 'Every block has the same shapes, with its own parameters.',
      why: 'The output layer is not counted: like GPT-2, this model reuses the token embedding table for it (weight tying).',
    },
    {
      id: 'format',
      range: { line: 12, startCol: 6, endCol: 18 },
      match: 'f"{total:,}"',
      kind: 'syntax',
      title: 'f"{total:,}"',
      what: 'Formats an integer with commas between thousands.',
      why: 'Parameter counts are long numbers; the readout shows exactly this text.',
    },
  ],
};

/** The counter with GPT-2 small's sizes, to run in the browser. */
export const gpt2Runner: CodeExample = {
  id: 'tf-gpt2-runner',
  language: 'python',
  run: 'pyodide',
  source: PARAMS_SOURCE.replace('{{d}}', '768')
    .replace('{{h}}', '12')
    .replace('{{dff}}', '3072')
    .replace('{{V}}', '50257')
    .replace('{{T}}', '1024')
    .replace('{{N}}', '12'),
  annotations: [],
  expectedOutput: '7087872\n124,439,808',
};
