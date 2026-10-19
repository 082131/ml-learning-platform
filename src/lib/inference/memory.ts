import type { ExperimentDef, ReadoutItem, Trace, TraceStep } from '../types';
import { scalar, text } from '../trace/values';
import { formatBytes, GIB, padLeft, pyFixed, pyThousands } from './format';
import { headDim, MODELS, LLAMA31_8B, paramBreakdown, type ModelConfig } from './models';
import { activationPrecision, PRECISIONS, type Precision } from './precision';

export type AttentionKernel = 'fused' | 'naive';

export interface MemoryState {
  model: string;
  weights: Precision;
  kv: Precision;
  batch: number;
  seqLen: number;
  attention: AttentionKernel;
  /** GPU memory in GiB. */
  gpu: number;
}

export interface MemoryEstimate {
  config: ModelConfig;
  params: number;
  headDim: number;
  bytes: { weights: number; kv: number; act: number };
  weights: number;
  /** KV cache bytes for one token of one sequence: 2 · layers · kv_heads · head_dim · bytes. */
  kvPerToken: number;
  kvCache: number;
  /** Values held per token at the widest point of one layer: 2·hidden + 2·intermediate (+ heads·seq). */
  actWidth: number;
  activations: number;
  total: number;
  gpuBytes: number;
  fits: boolean;
  /** Largest batch at this sequence length whose estimate fits; 0 when the weights alone don't fit. */
  maxBatch: number;
}

export const configOf = (s: MemoryState) => MODELS[s.model] ?? LLAMA31_8B;

/**
 * The estimate. Weights: params · bytes. KV cache: 2 (K and V) · layers · kv_heads · head_dim ·
 * seq_len · batch · bytes. Activations: batch · seq_len · act_width · bytes, a rough peak for one
 * layer during prefill (layers run one after another, so their activations are not all alive at once).
 */
export function estimateMemory(s: MemoryState): MemoryEstimate {
  const c = configOf(s);
  const params = paramBreakdown(c).total;
  const hd = headDim(c);
  const bytes = {
    weights: PRECISIONS[s.weights].bytes,
    kv: PRECISIONS[s.kv].bytes,
    act: PRECISIONS[activationPrecision(s.weights)].bytes,
  };
  const weights = params * bytes.weights;
  const kvPerToken = 2 * c.layers * c.kvHeads * hd * bytes.kv;
  const kvCache = kvPerToken * s.seqLen * s.batch;
  const actWidth = 2 * c.hidden + 2 * c.intermediate + (s.attention === 'naive' ? c.heads * s.seqLen : 0);
  const activations = s.batch * s.seqLen * actWidth * bytes.act;
  const total = weights + kvCache + activations;
  const gpuBytes = s.gpu * GIB;
  const perSequence = (kvCache + activations) / s.batch;
  const maxBatch = weights >= gpuBytes ? 0 : Math.floor((gpuBytes - weights) / perSequence);
  return {
    config: c,
    params,
    headDim: hd,
    bytes,
    weights,
    kvPerToken,
    kvCache,
    actWidth,
    activations,
    total,
    gpuBytes,
    fits: total <= gpuBytes,
    maxBatch,
  };
}

/** Total memory for each sequence length in `lengths`, other settings unchanged (for the chart). */
export const totalBySeqLen = (s: MemoryState, lengths: number[]) =>
  lengths.map((seqLen) => [seqLen, estimateMemory({ ...s, seqLen }).total / GIB] as const);

/** The Python code the experiment shows and steps through. Line numbers are used by the trace. */
export const MEMORY_SOURCE = `# {{label}}: shapes from its published config
layers, hidden, heads, kv_heads, intermediate = {{shape}}
head_dim = hidden // heads
params = {{params}}
batch, seq_len = {{batch}}, {{seq_len}}
w_bytes, kv_bytes, act_bytes = {{w_bytes}}, {{kv_bytes}}, {{act_bytes}}

weights = params * w_bytes
kv_cache = 2 * layers * kv_heads * head_dim * seq_len * batch * kv_bytes
act_width = 2 * hidden + 2 * intermediate{{scores}}
activations = batch * seq_len * act_width * act_bytes
total = weights + kv_cache + activations

GiB = 2 ** 30
print(f"weights     {weights / GiB:9.2f} GiB")
print(f"KV cache    {kv_cache / GiB:9.2f} GiB")
print(f"activations {activations / GiB:9.2f} GiB")
print(f"total       {total / GiB:9.2f} GiB")`;

/** Python writes 0.5 as 0.5 and 2 as 2: bytes per value as a Python literal. */
const pyNum = (n: number) => String(n);

export function memorySlots(s: MemoryState): Record<string, string> {
  const c = configOf(s);
  const e = estimateMemory(s);
  return {
    label: c.label,
    shape: [c.layers, c.hidden, c.heads, c.kvHeads, c.intermediate].join(', '),
    params: pyThousands(e.params).replaceAll(',', '_'),
    batch: String(s.batch),
    seq_len: String(s.seqLen),
    w_bytes: pyNum(e.bytes.weights),
    kv_bytes: pyNum(e.bytes.kv),
    act_bytes: pyNum(e.bytes.act),
    scores: s.attention === 'naive' ? ' + heads * seq_len' : '',
  };
}

/** Exactly what the four print lines output (checked against CPython in memory.test.ts). */
export function memoryPrintout(e: MemoryEstimate): string[] {
  const line = (name: string, bytes: number) => `${name.padEnd(12)}${padLeft(pyFixed(bytes / GIB, 2), 9)} GiB`;
  return [
    line('weights', e.weights),
    line('KV cache', e.kvCache),
    line('activations', e.activations),
    line('total', e.total),
  ];
}

const n = pyThousands;

/** A computed trace of MEMORY_SOURCE: one step per line, with the arithmetic in each note. */
export function buildMemoryTrace(s: MemoryState): Trace {
  const c = configOf(s);
  const e = estimateMemory(s);
  const vars: TraceStep['vars'] = {};
  const steps: TraceStep[] = [];
  const step = (line: number, note: string, set: Record<string, number | string> = {}) => {
    for (const [k, v] of Object.entries(set)) vars[k] = typeof v === 'number' ? scalar(v) : text(v);
    steps.push({ range: { line }, vars: { ...vars }, note });
  };
  step(
    2,
    `Copy the shapes from ${c.label}'s config: ${c.layers} layers, a hidden size of ${c.hidden}, ${c.heads} query heads, ${c.kvHeads} key/value heads and an MLP width of ${c.intermediate}.`,
    { layers: c.layers, hidden: c.hidden, heads: c.heads, kv_heads: c.kvHeads, intermediate: c.intermediate },
  );
  step(3, `Each head works on hidden / heads = ${c.hidden} / ${c.heads} = ${e.headDim} numbers.`, {
    head_dim: e.headDim,
  });
  step(4, `The parameter count, computed from the same shapes: ${n(e.params)}.`, { params: e.params });
  step(5, `${s.batch} sequence${s.batch === 1 ? '' : 's'} of ${n(s.seqLen)} tokens each.`, {
    batch: s.batch,
    seq_len: s.seqLen,
  });
  step(
    6,
    `Bytes per stored number: ${e.bytes.weights} for weights (${s.weights.toUpperCase()}), ${e.bytes.kv} for the KV cache (${s.kv.toUpperCase()}), ${e.bytes.act} for activations.`,
    { w_bytes: e.bytes.weights, kv_bytes: e.bytes.kv, act_bytes: e.bytes.act },
  );
  step(8, `weights = ${n(e.params)} · ${e.bytes.weights} = ${n(e.weights)} bytes (${formatBytes(e.weights)}).`, {
    weights: e.weights,
  });
  step(
    9,
    `kv_cache = 2 · ${c.layers} · ${c.kvHeads} · ${e.headDim} · ${n(s.seqLen)} · ${s.batch} · ${e.bytes.kv} = ${n(e.kvCache)} bytes (${formatBytes(e.kvCache)}). That is ${n(e.kvPerToken)} bytes per token.`,
    { kv_cache: e.kvCache },
  );
  step(
    10,
    s.attention === 'naive'
      ? `act_width = 2 · ${c.hidden} + 2 · ${c.intermediate} + ${c.heads} · ${n(s.seqLen)} = ${n(e.actWidth)} values per token, including one row of attention scores per head.`
      : `act_width = 2 · ${c.hidden} + 2 · ${c.intermediate} = ${n(e.actWidth)} values per token at the widest point of a layer.`,
    { act_width: e.actWidth },
  );
  step(
    11,
    `activations = ${s.batch} · ${n(s.seqLen)} · ${n(e.actWidth)} · ${e.bytes.act} = ${n(e.activations)} bytes (${formatBytes(e.activations)}).`,
    { activations: e.activations },
  );
  step(12, `total = ${n(e.weights)} + ${n(e.kvCache)} + ${n(e.activations)} = ${n(e.total)} bytes.`, {
    total: e.total,
  });
  step(14, 'One GiB is 2³⁰ = 1,073,741,824 bytes.', { GiB: GIB });
  const out = memoryPrintout(e);
  out.forEach((line, i) =>
    step(15 + i, `Prints "${line.trim().replace(/\s+/g, ' ')}".`, { output: out.slice(0, i + 1).join('\n') }),
  );
  return { source: 'computed', steps };
}

export const SEQ_LENGTHS = [128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];
export const GPU_SIZES = [
  { gib: 16, label: '16 GB (for example a T4)' },
  { gib: 24, label: '24 GB (for example an L4 or RTX 4090)' },
  { gib: 40, label: '40 GB (for example an A100 40GB)' },
  { gib: 48, label: '48 GB (for example an L40S)' },
  { gib: 80, label: '80 GB (for example an A100 80GB or H100)' },
];
export const MAX_BATCH = 64;

const precisionOptions = (ps: Precision[]) => ps.map((p) => ({ value: p, label: PRECISIONS[p].label }));

/** Memory estimator: one state for the bar chart, the slotted code, its trace and the readout. */
export function memoryExperiment(
  id: string,
  initial: MemoryState,
  traceExample?: string,
): ExperimentDef<MemoryState, MemoryEstimate> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'model',
        label: 'Model',
        options: Object.values(MODELS).map((m) => ({ value: m.id, label: m.label })),
        get: (s) => s.model,
        set: (s, model) => ({ ...s, model, seqLen: Math.min(s.seqLen, MODELS[model]!.maxContext) }),
      },
      {
        kind: 'select',
        id: 'weights',
        label: 'Weight precision',
        options: precisionOptions(['fp32', 'bf16', 'fp16', 'int8', 'int4']),
        get: (s) => s.weights,
        set: (s, w) => ({ ...s, weights: w as Precision }),
      },
      {
        kind: 'select',
        id: 'kv',
        label: 'KV cache precision',
        options: precisionOptions(['fp32', 'bf16', 'fp16', 'int8']),
        get: (s) => s.kv,
        set: (s, kv) => ({ ...s, kv: kv as Precision }),
      },
      {
        kind: 'slider',
        id: 'batch',
        label: 'Batch size (sequences)',
        min: 1,
        max: MAX_BATCH,
        get: (s) => s.batch,
        set: (s, batch) => ({ ...s, batch }),
      },
      {
        kind: 'select',
        id: 'seqLen',
        label: 'Sequence length (tokens)',
        options: SEQ_LENGTHS.map((l) => ({ value: String(l), label: n(l) })),
        get: (s) => String(s.seqLen),
        set: (s, v) => ({ ...s, seqLen: Math.min(Number(v), configOf(s).maxContext) }),
      },
      {
        kind: 'select',
        id: 'attention',
        label: 'Attention kernel',
        options: [
          { value: 'fused', label: 'Fused (scores never stored)' },
          { value: 'naive', label: 'Naive (stores the score matrix)' },
        ],
        get: (s) => s.attention,
        set: (s, a) => ({ ...s, attention: a as AttentionKernel }),
      },
      {
        kind: 'select',
        id: 'gpu',
        label: 'GPU memory',
        options: GPU_SIZES.map((g) => ({ value: String(g.gib), label: g.label })),
        get: (s) => String(s.gpu),
        set: (s, g) => ({ ...s, gpu: Number(g) }),
      },
    ],
    compute: estimateMemory,
    trace: buildMemoryTrace,
    traceExample,
    readout: memoryReadout,
  };
}

export function memoryReadout(s: MemoryState, e: MemoryEstimate): ReadoutItem[] {
  const out = memoryPrintout(e);
  const free = e.gpuBytes - e.total;
  return [
    { label: 'Python: what the code prints', value: out.join('\n') },
    {
      label: `Fits in ${s.gpu} GiB? (estimate)`,
      value: e.fits
        ? `Yes, with ${formatBytes(free)} to spare`
        : `No, ${formatBytes(-free)} over`,
    },
    {
      label: `Largest batch at ${n(s.seqLen)} tokens (estimate)`,
      value: e.maxBatch === 0 ? 'None: the weights alone do not fit' : n(e.maxBatch),
    },
    { label: 'KV cache per token', value: `${n(e.kvPerToken)} bytes` },
  ];
}
