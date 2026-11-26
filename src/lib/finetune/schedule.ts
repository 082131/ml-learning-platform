// Learning-rate schedules and batch arithmetic. The cosine schedule follows the shape of Hugging Face Transformers'
// get_cosine_schedule_with_warmup (linear warmup from 0, then half a cosine wave), extended with a floor (min_lr), as
// in most pretraining recipes. WSD is warmup-stable-decay: hold the peak, then decay linearly in the last part.

export type ScheduleKind = 'constant' | 'linear' | 'cosine' | 'wsd';

export interface ScheduleInput {
  kind: ScheduleKind;
  peak: number;
  warmupSteps: number;
  totalSteps: number;
  /** The floor as a fraction of the peak (0.1 → decays to 10% of peak). Ignored by 'constant'. */
  minRatio: number;
  /** WSD only: the share of steps spent decaying at the end. */
  decayFraction?: number;
}

/** The learning rate at a step (0-based). Steps past the end keep the final value. */
export function lrAt(step: number, x: ScheduleInput): number {
  const { peak, warmupSteps: w, totalSteps: T } = x;
  const floor = peak * x.minRatio;
  if (w > 0 && step < w) return (peak * step) / w;
  if (x.kind === 'constant') return peak;
  const t = Math.min(step, T);
  if (x.kind === 'wsd') {
    const decayStart = Math.round(T * (1 - (x.decayFraction ?? 0.2)));
    if (t < decayStart) return peak;
    const frac = T === decayStart ? 1 : (t - decayStart) / (T - decayStart);
    return peak + (floor - peak) * frac;
  }
  const progress = T === w ? 1 : (t - w) / (T - w);
  if (x.kind === 'linear') return peak + (floor - peak) * progress;
  return floor + (peak - floor) * 0.5 * (1 + Math.cos(Math.PI * progress));
}

/** Points for a chart: [step, lr]. */
export function scheduleCurve(x: ScheduleInput, points = 120): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k <= points; k++) {
    const step = Math.round((k / points) * x.totalSteps);
    out.push([step, lrAt(step, x)]);
  }
  return out;
}

export interface BatchInput {
  /** Sequences per GPU per forward pass. */
  microBatch: number;
  /** Forward/backward passes whose gradients are summed before one optimizer step. */
  gradAccum: number;
  gpus: number;
  /** Tokens per sequence (after packing, every sequence is this long). */
  seqLen: number;
  /** Tokens in the training set. */
  datasetTokens: number;
  epochs: number;
}

export interface BatchResult {
  /** Sequences per optimizer step: micro batch × accumulation × GPUs. */
  sequencesPerStep: number;
  tokensPerStep: number;
  stepsPerEpoch: number;
  totalSteps: number;
}

export function batchMath(x: BatchInput): BatchResult {
  const sequencesPerStep = x.microBatch * x.gradAccum * x.gpus;
  const tokensPerStep = sequencesPerStep * x.seqLen;
  const stepsPerEpoch = Math.ceil(x.datasetTokens / tokensPerStep);
  return { sequencesPerStep, tokensPerStep, stepsPerEpoch, totalSteps: stepsPerEpoch * x.epochs };
}

/** Gradient clipping by global norm: scale every gradient by min(1, maxNorm / norm). */
export function clipByNorm(grads: readonly number[], maxNorm: number): { clipped: number[]; norm: number; scale: number } {
  const norm = Math.sqrt(grads.reduce((a, g) => a + g * g, 0));
  const scale = norm > maxNorm ? maxNorm / norm : 1;
  return { clipped: grads.map((g) => g * scale), norm, scale };
}
