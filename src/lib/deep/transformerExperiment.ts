import { scalar, text } from '../trace/values';
import type { ExperimentDef, Trace } from '../types';
import {
  blockParams,
  configError,
  modelParams,
  shapeText,
  thousands,
  transformerStages,
  type Stage,
  type TransformerConfig,
} from './transformer';

export interface TransformerState extends TransformerConfig {
  /** The stage whose details are shown. */
  selected: string;
}

export interface TransformerResult {
  stages: Stage[];
  error?: string;
  params: ReturnType<typeof modelParams> & { parts: ReturnType<typeof blockParams> };
}

/** The parameter counter the lesson shows, steps through and runs (pure Python). */
export const PARAMS_SOURCE = `d_model, n_heads, d_ff = {{d}}, {{h}}, {{dff}}
vocab, n_ctx, n_layers = {{V}}, {{T}}, {{N}}

attn = 4 * (d_model * d_model + d_model)  # W_q, W_k, W_v, W_o and their biases
ffn = d_model * d_ff + d_ff + d_ff * d_model + d_model
norms = 2 * (2 * d_model)  # two LayerNorms, each with a scale and a shift
block = attn + ffn + norms

embed = vocab * d_model + n_ctx * d_model  # tokens + learned positions
total = embed + n_layers * block + 2 * d_model  # + final LayerNorm
print(block)
print(f"{total:,}")`;

export const paramSlots = (s: TransformerConfig): Record<string, string> => ({
  d: String(s.dModel),
  h: String(s.heads),
  dff: String(s.dFf),
  V: String(s.vocab),
  T: String(s.seq),
  N: String(s.layers),
});

export function computeTransformer(s: TransformerState): TransformerResult {
  return {
    stages: transformerStages(s),
    error: configError(s),
    params: { ...modelParams(s), parts: blockParams(s.dModel, s.dFf) },
  };
}

/** What PARAMS_SOURCE prints: the block count, then the total with thousands separators. */
export const paramsOutput = (r: TransformerResult) => `${r.params.block}\n${thousands(r.params.total)}`;

/** A computed trace of PARAMS_SOURCE with the arithmetic at every line. */
export function buildParamsTrace(s: TransformerState, r: TransformerResult = computeTransformer(s)): Trace {
  const d = s.dModel;
  const f = s.dFf;
  const p = r.params;
  const base = { d_model: scalar(d), n_heads: scalar(s.heads), d_ff: scalar(f) };
  const sizes = { ...base, vocab: scalar(s.vocab), n_ctx: scalar(s.seq), n_layers: scalar(s.layers) };
  const steps: Trace['steps'] = [
    {
      range: { line: 1 },
      vars: base,
      note: `The block's sizes: d_model = ${d}, ${s.heads} heads, d_ff = ${f}. The number of heads does not change any count: the heads share the same projection matrices, split into slices.`,
    },
    {
      range: { line: 2 },
      vars: sizes,
      note: `Vocabulary ${s.vocab}, ${s.seq} positions, ${s.layers} blocks.`,
    },
    {
      range: { line: 4 },
      vars: { ...sizes, attn: scalar(p.parts.attention) },
      note: `attn = 4 · (${d}² + ${d}) = 4 · ${d * d + d} = ${p.parts.attention}.`,
    },
  ];
  const v = { ...sizes, attn: scalar(p.parts.attention), ffn: scalar(p.parts.ffn) };
  steps.push({
    range: { line: 5 },
    vars: v,
    note: `ffn = ${d}·${f} + ${f} + ${f}·${d} + ${d} = ${p.parts.ffn}.`,
  });
  const w = { ...v, norms: scalar(p.parts.norms) };
  steps.push({ range: { line: 6 }, vars: w, note: `norms = 2 · (2 · ${d}) = ${p.parts.norms}.` });
  const x = { ...w, block: scalar(p.block) };
  steps.push({
    range: { line: 7 },
    vars: x,
    note: `block = ${p.parts.attention} + ${p.parts.ffn} + ${p.parts.norms} = ${p.block}, the same as 4·d² + 2·d·d_ff + 9·d + d_ff.`,
  });
  const y = { ...x, embed: scalar(p.tokens + p.positions) };
  steps.push({
    range: { line: 9 },
    vars: y,
    note: `embed = ${s.vocab}·${d} + ${s.seq}·${d} = ${p.tokens} + ${p.positions} = ${p.tokens + p.positions}.`,
  });
  const z = { ...y, total: scalar(p.total) };
  steps.push({
    range: { line: 10 },
    vars: z,
    note: `total = ${p.tokens + p.positions} + ${s.layers}·${p.block} + 2·${d} = ${p.total}.`,
  });
  steps.push({
    range: { line: 11 },
    vars: { ...z, output: text(String(p.block)) },
    note: `Prints the block's parameter count: ${p.block}.`,
  });
  steps.push({
    range: { line: 12 },
    vars: { ...z, output: text(thousands(p.total)) },
    note: `Prints the total with thousands separators: ${thousands(p.total)}.`,
  });
  return { source: 'computed', steps };
}

const select = (
  id: keyof TransformerConfig,
  label: string,
  values: (number | string)[],
  fmt: (v: never) => string = String,
) =>
  ({
    kind: 'select',
    id,
    label,
    options: values.map((v) => ({ value: String(v), label: fmt(v as never) })),
    get: (s: TransformerState) => String(s[id]),
    set: (s: TransformerState, v: string) => ({ ...s, [id]: typeof s[id] === 'number' ? Number(v) : v }),
  }) as const;

const slider = (id: keyof TransformerConfig, label: string, min: number, max: number, step = 1) =>
  ({
    kind: 'slider',
    id,
    label,
    min,
    max,
    step,
    get: (s: TransformerState) => s[id] as number,
    set: (s: TransformerState, v: number) => ({ ...s, [id]: v }),
  }) as const;

export const D_MODELS = [64, 128, 256, 512, 768, 1024];
export const HEADS = [1, 2, 4, 8, 12, 16];
export const VOCABS = [1000, 32000, 50257];

export function transformerExperiment(
  id: string,
  initial: TransformerState,
  traceExample?: string,
): ExperimentDef<TransformerState, TransformerResult> {
  return {
    id,
    initial,
    controls: [
      select('kind', 'Model type', ['decoder', 'encoder'], (v: string) =>
        v === 'decoder' ? 'Decoder (causal)' : 'Encoder (no mask)',
      ),
      slider('batch', 'Batch size B', 1, 32),
      slider('seq', 'Sequence length T', 1, 1024),
      select('dModel', 'd_model', D_MODELS),
      select('heads', 'Heads', HEADS),
      slider('dFf', 'd_ff (feed-forward width)', 64, 4096, 64),
      select('vocab', 'Vocabulary size V', VOCABS, (v: number) => thousands(v)),
      slider('layers', 'Blocks (layers)', 1, 24),
    ],
    compute: computeTransformer,
    trace: (s) => buildParamsTrace(s),
    traceExample,
    readout: (s, r) => {
      const p = r.params;
      const items: ReturnType<NonNullable<ExperimentDef<TransformerState, TransformerResult>['readout']>> =
        [];
      if (r.error) items.push({ label: 'Head split', value: r.error, status: 'error' });
      else
        items.push({
          label: 'Head split',
          value: `${shapeText([s.batch, s.seq, s.dModel])} → ${shapeText([s.batch, s.heads, s.seq, s.dModel / s.heads])} → ${shapeText([s.batch, s.seq, s.dModel])}`,
        });
      items.push(
        {
          label: 'Parameters per block',
          value: `4·${s.dModel}² + 2·${s.dModel}·${s.dFf} + 9·${s.dModel} + ${s.dFf} = ${thousands(p.block)}`,
        },
        {
          label: `All ${s.layers} blocks`,
          value: `${s.layers} × ${thousands(p.block)} = ${thousands(p.blocks)}`,
        },
        {
          label: 'Whole model',
          value: `${thousands(p.tokens)} + ${thousands(p.positions)} + ${thousands(p.blocks)} + ${thousands(p.finalNorm)} = ${thousands(p.total)}`,
        },
        { label: 'What the code prints', value: paramsOutput(r) },
      );
      return items;
    },
  };
}
