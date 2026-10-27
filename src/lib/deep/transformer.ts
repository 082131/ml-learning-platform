/**
 * Shapes and parameter counts for a GPT-2-style (pre-LayerNorm) transformer, driven by the
 * controls of the transformers lesson. Pure arithmetic: nothing here runs a model.
 */

export interface TransformerConfig {
  batch: number;
  seq: number;
  dModel: number;
  heads: number;
  dFf: number;
  vocab: number;
  layers: number;
  kind: 'decoder' | 'encoder';
}

export interface Stage {
  id: string;
  label: string;
  /** The output shape, as a tuple. */
  shape: number[];
  /** Symbolic shape, for example "(B, T, d_model)". */
  symbols: string;
  /** Learned parameters in this stage, with its formula; 0 for reshapes and additions. */
  params: number;
  paramFormula: string;
  /** What the stage computes. */
  op: string;
  note: string;
  /** Inside the repeated block (counted once per layer). */
  inBlock: boolean;
  /** 'left' stages carry the residual stream, 'right' stages are sub-layers. */
  column: 'left' | 'right';
}

export const shapeText = (shape: readonly number[]) => `(${shape.join(', ')})`;
export const thousands = (n: number) => n.toLocaleString('en-US');

/** d_model must split evenly into heads; returns the problem in words, or undefined. */
export function configError(c: TransformerConfig): string | undefined {
  if (c.dModel % c.heads !== 0)
    return `d_model = ${c.dModel} is not divisible by ${c.heads} heads, so the vectors can't be split evenly (${c.dModel} / ${c.heads} = ${(c.dModel / c.heads).toFixed(2)}).`;
  return undefined;
}

/** Parameters of one block: 4·d² + 2·d·d_ff + 9·d + d_ff (all projections with biases). */
export function blockParams(d: number, dFf: number) {
  const attention = 4 * (d * d + d);
  const ffn = d * dFf + dFf + dFf * d + d;
  const norms = 2 * (2 * d);
  return { attention, ffn, norms, total: attention + ffn + norms };
}

/**
 * Whole-model parameters: token table (V·d) + learned positions (T·d, with T as the context length)
 * + layers · block + the final LayerNorm (2·d). The output layer reuses the token table (weight
 * tying, as in GPT-2), so it adds nothing.
 */
export function modelParams(c: TransformerConfig) {
  const tokens = c.vocab * c.dModel;
  const positions = c.seq * c.dModel;
  const block = blockParams(c.dModel, c.dFf).total;
  const finalNorm = 2 * c.dModel;
  return {
    tokens,
    positions,
    block,
    blocks: c.layers * block,
    finalNorm,
    total: tokens + positions + c.layers * block + finalNorm,
  };
}

/** Every stage from token IDs to logits, with its output shape and parameters. */
export function transformerStages(c: TransformerConfig): Stage[] {
  const { batch: B, seq: T, dModel: d, heads: h, dFf: f, vocab: V } = c;
  const dh = d / h;
  const btd = [B, T, d];
  const p = blockParams(d, f);
  const mask = c.kind === 'decoder' ? ' with the causal mask' : ' (no mask: encoder)';
  const S = (
    id: string,
    label: string,
    shape: number[],
    symbols: string,
    op: string,
    note: string,
    column: Stage['column'],
    inBlock: boolean,
    params = 0,
    paramFormula = 'no parameters',
  ): Stage => ({ id, label, shape, symbols, op, note, column, inBlock, params, paramFormula });
  return [
    S(
      'ids',
      'Token IDs',
      [B, T],
      '(B, T)',
      'Integers from the tokenizer',
      `${B} sequences of ${T} token IDs.`,
      'left',
      false,
    ),
    S(
      'embed',
      'Token embedding',
      btd,
      '(B, T, d_model)',
      'E[ids]',
      'Each ID becomes its row of the embedding table.',
      'left',
      false,
      V * d,
      `V · d_model = ${thousands(V)} · ${d}`,
    ),
    S(
      'pos',
      '+ positions',
      btd,
      '(B, T, d_model)',
      'x = E[ids] + P[0:T]',
      'A learned position vector is added to each token, because attention alone ignores order.',
      'left',
      false,
      T * d,
      `T · d_model = ${T} · ${d}`,
    ),
    S(
      'ln1',
      'LayerNorm 1',
      btd,
      '(B, T, d_model)',
      'Normalize each token vector, then scale and shift',
      'Pre-LN, as in GPT-2: normalize before the sub-layer.',
      'right',
      true,
      2 * d,
      `2 · d_model = 2 · ${d}`,
    ),
    S(
      'qkv',
      'Q, K, V projections',
      btd,
      '(B, T, d_model) each',
      'Q = x W_q + b_q, and the same for K and V',
      'Three (d_model, d_model) matrices with biases.',
      'right',
      true,
      3 * (d * d + d),
      `3 · (d_model² + d_model) = 3 · (${d}² + ${d})`,
    ),
    S(
      'split',
      'Split into heads',
      [B, h, T, dh],
      '(B, heads, T, d_model / heads)',
      'reshape (B, T, h, d/h), then swap axes 1 and 2',
      `Each of the ${h} heads gets its own slice of ${Number.isInteger(dh) ? dh : dh.toFixed(2)} numbers per token. No new numbers are made.`,
      'right',
      true,
    ),
    S(
      'scores',
      'Scores',
      [B, h, T, T],
      '(B, heads, T, T)',
      `softmax(Q Kᵀ / √(d_model / heads))${mask}`,
      `${thousands(B * h * T * T)} attention weights: one (T, T) matrix per head per sequence.`,
      'right',
      true,
    ),
    S(
      'mix',
      'Weights · V',
      [B, h, T, dh],
      '(B, heads, T, d_model / heads)',
      'weights @ V, per head',
      'Each head mixes value vectors in its own slice.',
      'right',
      true,
    ),
    S(
      'merge',
      'Merge heads',
      btd,
      '(B, T, d_model)',
      'swap axes back, reshape to (B, T, h · d/h)',
      'The head outputs are placed side by side again: concatenation.',
      'right',
      true,
    ),
    S(
      'wo',
      'Output projection',
      btd,
      '(B, T, d_model)',
      'y W_o + b_o',
      'Mixes the heads’ outputs together.',
      'right',
      true,
      d * d + d,
      `d_model² + d_model = ${d}² + ${d}`,
    ),
    S(
      'add1',
      '+ residual',
      btd,
      '(B, T, d_model)',
      'x = x + attention(LN(x))',
      'The sub-layer’s output is added to its input.',
      'left',
      true,
    ),
    S(
      'ln2',
      'LayerNorm 2',
      btd,
      '(B, T, d_model)',
      'Normalize, scale and shift',
      'Before the feed-forward network.',
      'right',
      true,
      2 * d,
      `2 · d_model = 2 · ${d}`,
    ),
    S(
      'up',
      'FFN up + GELU',
      [B, T, f],
      '(B, T, d_ff)',
      'GELU(x W_1 + b_1)',
      'Each token on its own: widen to d_ff, apply a non-linear function.',
      'right',
      true,
      d * f + f,
      `d_model · d_ff + d_ff = ${d} · ${thousands(f)} + ${thousands(f)}`,
    ),
    S(
      'down',
      'FFN down',
      btd,
      '(B, T, d_model)',
      'h W_2 + b_2',
      'Back to d_model so it can be added to the residual stream.',
      'right',
      true,
      f * d + d,
      `d_ff · d_model + d_model = ${thousands(f)} · ${d} + ${d}`,
    ),
    S(
      'add2',
      '+ residual',
      btd,
      '(B, T, d_model)',
      'x = x + ffn(LN(x))',
      `End of the block: same shape as its input, so ${c.layers} blocks can be stacked. Block total: ${thousands(p.total)} parameters.`,
      'left',
      true,
    ),
    S(
      'lnf',
      'Final LayerNorm',
      btd,
      '(B, T, d_model)',
      'Normalize, scale and shift',
      `After the last of the ${c.layers} blocks.`,
      'left',
      false,
      2 * d,
      `2 · d_model = 2 · ${d}`,
    ),
    S(
      'logits',
      'Logits',
      [B, T, V],
      '(B, T, V)',
      'x Eᵀ (weights tied with the token embedding)',
      c.kind === 'decoder'
        ? 'One score per vocabulary entry for every position: what the next token might be.'
        : 'One score per vocabulary entry for every position, for example to guess masked tokens (BERT-style).',
      'left',
      false,
      0,
      'reuses E (weight tying)',
    ),
  ];
}

/** Grid positions (column, row) of each stage in the block diagram. */
const ROWS: Record<string, number> = {
  ids: 0,
  embed: 1,
  pos: 2,
  ln1: 3,
  qkv: 4,
  split: 5,
  scores: 6,
  mix: 7,
  merge: 8,
  wo: 9,
  add1: 9,
  ln2: 10,
  up: 11,
  down: 12,
  add2: 12,
  lnf: 13,
  logits: 14,
};
export const LAYOUT = { leftX: 0, rightX: 230, leftW: 170, rightW: 210, rowH: 72, nodeH: 54 } as const;

/** Edges of the diagram: the residual stream on the left, sub-layers on the right. */
export const EDGES: { from: string; to: string; label?: string; junction?: 'round' | 'square' }[] = [
  { from: 'ids', to: 'embed' },
  { from: 'embed', to: 'pos' },
  { from: 'pos', to: 'ln1' },
  { from: 'ln1', to: 'qkv' },
  { from: 'qkv', to: 'split' },
  { from: 'split', to: 'scores' },
  { from: 'scores', to: 'mix' },
  { from: 'mix', to: 'merge' },
  { from: 'merge', to: 'wo' },
  { from: 'wo', to: 'add1' },
  { from: 'pos', to: 'add1', label: 'residual', junction: 'round' },
  { from: 'add1', to: 'ln2' },
  { from: 'ln2', to: 'up' },
  { from: 'up', to: 'down' },
  { from: 'down', to: 'add2' },
  { from: 'add1', to: 'add2', label: 'residual', junction: 'round' },
  { from: 'add2', to: 'lnf' },
  { from: 'lnf', to: 'logits' },
];

/** Diagram coordinates of a stage. */
export function stagePosition(stage: Stage) {
  const left = stage.column === 'left';
  return {
    x: left ? LAYOUT.leftX : LAYOUT.rightX,
    y: ROWS[stage.id]! * LAYOUT.rowH,
    w: left ? LAYOUT.leftW : LAYOUT.rightW,
    h: LAYOUT.nodeH,
  };
}
