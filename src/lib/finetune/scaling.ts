// Compute budgets for training. C ≈ 6·N·D (Kaplan et al. 2020; used by Hoffmann et al. 2022): each parameter does a
// multiply and an add (2 FLOPs) per token in the forward pass, and the backward pass costs about twice the forward.
// The compute-optimal rule of thumb from Chinchilla is about 20 training tokens per parameter.

export const FLOPS_PER_PARAM_TOKEN = 6;
export const CHINCHILLA_TOKENS_PER_PARAM = 20;

export interface Gpu {
  id: string;
  label: string;
  /** Dense BF16 tensor-core peak, FLOP/s, from the vendor data sheet (no sparsity). */
  peak: number;
}

export const GPUS: Gpu[] = [
  { id: 'a100', label: 'A100 (312 TFLOP/s BF16)', peak: 312e12 },
  { id: 'h100', label: 'H100 SXM (989 TFLOP/s BF16)', peak: 989e12 },
];

/** Training FLOPs for N parameters and D tokens. */
export const trainingFlops = (params: number, tokens: number): number => FLOPS_PER_PARAM_TOKEN * params * tokens;

/** The Chinchilla-style split of a compute budget: D = 20·N and C = 6·N·D, so N = √(C / 120). */
export function computeOptimal(flops: number): { params: number; tokens: number } {
  const params = Math.sqrt(flops / (FLOPS_PER_PARAM_TOKEN * CHINCHILLA_TOKENS_PER_PARAM));
  return { params, tokens: CHINCHILLA_TOKENS_PER_PARAM * params };
}

/** GPU-hours at a given model FLOPs utilization (the share of peak the job really achieves). */
export const gpuHours = (flops: number, peak: number, mfu: number): number => flops / (peak * mfu) / 3600;

export interface ComputeInput {
  paramsB: number;
  tokensB: number;
  gpu: string;
  mfu: number;
  gpus: number;
  dollarsPerGpuHour: number;
}

export interface ComputeResult {
  flops: number;
  tokensPerParam: number;
  gpuHours: number;
  days: number;
  cost: number;
  optimal: { params: number; tokens: number };
}

export function computeBudget(x: ComputeInput): ComputeResult {
  const gpu = GPUS.find((g) => g.id === x.gpu) ?? GPUS[1];
  const flops = trainingFlops(x.paramsB * 1e9, x.tokensB * 1e9);
  const hours = gpuHours(flops, gpu!.peak, x.mfu);
  return {
    flops,
    tokensPerParam: x.tokensB / x.paramsB,
    gpuHours: hours,
    days: hours / x.gpus / 24,
    cost: hours * x.dollarsPerGpuHour,
    optimal: computeOptimal(flops),
  };
}

/** 1.2e21 style, for readouts. */
export function sci(x: number, digits = 2): string {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  return `${m.toFixed(digits)}e${e}`;
}

/** 1.5 B, 820 M, 12 k. */
export function human(x: number, digits = 1): string {
  const a = Math.abs(x);
  if (a >= 1e12) return `${(x / 1e12).toFixed(digits)} T`;
  if (a >= 1e9) return `${(x / 1e9).toFixed(digits)} B`;
  if (a >= 1e6) return `${(x / 1e6).toFixed(digits)} M`;
  if (a >= 1e3) return `${(x / 1e3).toFixed(digits)} k`;
  return x.toFixed(digits === 1 ? 0 : digits);
}
