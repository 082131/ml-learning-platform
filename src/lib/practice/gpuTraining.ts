import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed } from './pyFormat';

/**
 * The GPU-training lesson's estimator: memory (optimizer states, activations, logits) and step time
 * (compute from 6·P·tokens FLOPs at an assumed utilization, and data loading) for GPT-2-sized models
 * on datasheet GPUs. Everything here is an estimate; the lesson prints its formulas. Mirrors the
 * lesson's Python operation for operation, so the printed lines match.
 */
export const GPUS = {
  T4: { memoryGb: 16, fp32: 8.1, mixed: 65, mixedDtype: 'float16' },
  L4: { memoryGb: 24, fp32: 30.3, mixed: 121, mixedDtype: 'bfloat16' },
  'A100 80GB': { memoryGb: 80, fp32: 19.5, mixed: 312, mixedDtype: 'bfloat16' },
  'H100 SXM': { memoryGb: 80, fp32: 67, mixed: 989.5, mixedDtype: 'bfloat16' },
} as const;
export type Gpu = keyof typeof GPUS;

export const MODELS = {
  'GPT-2 small': [12, 768, 12],
  'GPT-2 medium': [24, 1024, 16],
  'GPT-2 large': [36, 1280, 20],
  'GPT-2 XL': [48, 1600, 25],
} as const;
export type Model = keyof typeof MODELS;

export const VOCAB = 50257;
export const SEQ = 1024;

export interface GpuState {
  gpu: Gpu;
  model: Model;
  precision: 'fp32' | 'mixed';
  batch: number;
  checkpointing: boolean;
  fusedAttention: boolean;
  utilization: number;
  loaderSamplesPerS: number;
  overlap: boolean;
  tokensB: number;
}

export const parameters = (layers: number, h: number) =>
  12 * layers * h * h + 13 * layers * h + (VOCAB + SEQ) * h + 2 * h;

export function activationBytes(
  layers: number,
  h: number,
  heads: number,
  batch: number,
  fusedAttention: boolean,
  checkpointing: boolean,
): number {
  const scores = fusedAttention ? 0 : (5 * heads * SEQ) / h;
  const perLayer = SEQ * batch * h * (34 + scores);
  if (checkpointing) return layers * 2 * SEQ * batch * h + perLayer;
  return layers * perLayer;
}

export interface GpuEstimate {
  params: number;
  states: number;
  activations: number;
  logits: number;
  total: number;
  capacity: number;
  fits: boolean;
  compute: number;
  loading: number;
  step: number;
  tokensPerS: number;
  hours: number;
  peak: number;
  dtype: string;
}

export function estimate(s: GpuState): GpuEstimate {
  const spec = GPUS[s.gpu];
  const [layers, h, heads] = MODELS[s.model];
  const params = parameters(layers, h);
  const mixed = s.precision === 'mixed';
  const states = 16 * params;
  const acts = activationBytes(layers, h, heads, s.batch, s.fusedAttention, s.checkpointing);
  const activations = mixed ? acts : 2 * acts;
  const logits = 4 * s.batch * SEQ * VOCAB;
  const total = states + activations + logits;
  const capacity = spec.memoryGb * 1e9;

  const flops = (s.checkpointing ? 8 : 6) * params * s.batch * SEQ;
  const peak = mixed ? spec.mixed : spec.fp32;
  const compute = flops / (peak * 1e12 * s.utilization);
  const loading = s.batch / s.loaderSamplesPerS;
  const step = s.overlap ? Math.max(compute, loading) : compute + loading;
  const tokensPerS = (s.batch * SEQ) / step;
  const hours = (s.tokensB * 1e9) / tokensPerS / 3600;
  return {
    params,
    states,
    activations,
    logits,
    total,
    capacity,
    fits: total <= capacity,
    compute,
    loading,
    step,
    tokensPerS,
    hours,
    peak,
    dtype: mixed ? spec.mixedDtype : 'float32',
  };
}

/** Python's `,` thousands separator on an already formatted number. */
export function withCommas(text: string): string {
  const [whole, frac] = text.split('.');
  const sign = whole!.startsWith('-') ? '-' : '';
  const digits = whole!.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${digits}${frac === undefined ? '' : `.${frac}`}`;
}

const gb = (bytes: number) => pyFixed(bytes / 1e9, 2);

/** The five lines the lesson's Python prints. */
export function printedLines(s: GpuState, e: GpuEstimate): string[] {
  return [
    `model      ${s.model}, ${withCommas(String(e.params))} parameters`,
    `memory     states ${gb(e.states)} GB + activations ${gb(e.activations)} GB + logits ${gb(e.logits)} GB = ${gb(e.total)} GB of ${GPUS[s.gpu].memoryGb} GB: ${e.fits ? 'fits' : 'does NOT fit'}`,
    `step       compute ${pyFixed(e.compute, 3)} s, loading ${pyFixed(e.loading, 3)} s, step ${pyFixed(e.step, 3)} s (${s.overlap ? 'overlapped' : 'one after the other'})`,
    `throughput ${withCommas(pyFixed(e.tokensPerS, 0))} tokens/s, GPU busy ${pyFixed((100 * e.compute) / e.step, 0)}% of the step`,
    `time       ${withCommas(pyFixed(e.hours, 1))} h for ${s.tokensB} B tokens (at ${pyFixed(s.utilization * 100, 0)}% of ${e.peak} TFLOPS ${e.dtype})`,
  ];
}

function readout(s: GpuState, e: GpuEstimate): ReadoutItem[] {
  const bottleneck = e.loading > e.compute ? 'data loading' : 'compute';
  return [
    {
      label: 'Memory (estimate)',
      value: `${gb(e.total)} of ${GPUS[s.gpu].memoryGb} GB: ${e.fits ? 'fits' : 'does NOT fit'}`,
      status: e.fits ? 'ok' : 'error',
    },
    { label: 'Throughput (estimate)', value: `${withCommas(pyFixed(e.tokensPerS, 0))} tokens/s` },
    {
      label: 'Bottleneck',
      value: `${bottleneck}; GPU busy ${pyFixed((100 * e.compute) / e.step, 0)}% of the step`,
    },
    { label: `Time for ${s.tokensB} B tokens`, value: `${withCommas(pyFixed(e.hours, 1))} h` },
  ];
}

const onOff = (on: string, off: string) => [
  { value: 'on', label: on },
  { value: 'off', label: off },
];

export function gpuExperiment(id: string, initial: GpuState): ExperimentDef<GpuState, GpuEstimate> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'gpu',
        label: 'GPU',
        options: (Object.keys(GPUS) as Gpu[]).map((g) => ({
          value: g,
          label: `${g} (${GPUS[g].memoryGb} GB)`,
        })),
        get: (s) => s.gpu,
        set: (s, v) => ({ ...s, gpu: v as Gpu }),
      },
      {
        kind: 'select',
        id: 'model',
        label: 'Model',
        options: (Object.keys(MODELS) as Model[]).map((m) => ({ value: m, label: m })),
        get: (s) => s.model,
        set: (s, v) => ({ ...s, model: v as Model }),
      },
      {
        kind: 'select',
        id: 'precision',
        label: 'Precision',
        options: [
          { value: 'mixed', label: 'mixed (autocast)' },
          { value: 'fp32', label: 'float32' },
        ],
        get: (s) => s.precision,
        set: (s, v) => ({ ...s, precision: v as GpuState['precision'] }),
      },
      {
        kind: 'slider',
        id: 'batch',
        label: 'Batch size (sequences of 1024 tokens)',
        min: 1,
        max: 64,
        get: (s) => s.batch,
        set: (s, batch) => ({ ...s, batch }),
      },
      {
        kind: 'select',
        id: 'checkpointing',
        label: 'Activation checkpointing',
        options: onOff('on', 'off'),
        get: (s) => (s.checkpointing ? 'on' : 'off'),
        set: (s, v) => ({ ...s, checkpointing: v === 'on' }),
      },
      {
        kind: 'select',
        id: 'attention',
        label: 'Attention kernel',
        options: [
          { value: 'on', label: 'fused (scores not stored)' },
          { value: 'off', label: 'naive (scores stored)' },
        ],
        get: (s) => (s.fusedAttention ? 'on' : 'off'),
        set: (s, v) => ({ ...s, fusedAttention: v === 'on' }),
      },
      {
        kind: 'slider',
        id: 'utilization',
        label: 'Assumed utilization of peak',
        min: 0.1,
        max: 0.7,
        step: 0.05,
        get: (s) => s.utilization,
        set: (s, v) => ({ ...s, utilization: Math.round(v * 100) / 100 }),
        format: (v) => `${Math.round(v * 100)}%`,
      },
      {
        kind: 'slider',
        id: 'loader',
        label: 'Data loader (samples/s)',
        min: 25,
        max: 2000,
        step: 25,
        get: (s) => s.loaderSamplesPerS,
        set: (s, loaderSamplesPerS) => ({ ...s, loaderSamplesPerS }),
      },
      {
        kind: 'select',
        id: 'overlap',
        label: 'Loading overlaps compute',
        options: onOff('yes (workers prefetch)', 'no (load, then compute)'),
        get: (s) => (s.overlap ? 'on' : 'off'),
        set: (s, v) => ({ ...s, overlap: v === 'on' }),
      },
      {
        kind: 'slider',
        id: 'tokens',
        label: 'Training tokens (billions)',
        min: 1,
        max: 100,
        get: (s) => s.tokensB,
        set: (s, tokensB) => ({ ...s, tokensB }),
      },
    ],
    compute: estimate,
    readout,
  };
}
