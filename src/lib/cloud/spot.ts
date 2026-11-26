// Spot (AWS) and Spot/preemptible (Google Cloud) capacity is much cheaper but can be taken back. This module
// estimates how long a training job takes when it is interrupted at random, with and without checkpoints, and draws
// one seeded example run. Interruptions are modelled as a Poisson process (a constant rate, memoryless): a
// simplification, since real interruption rates vary by instance type, zone and hour.

import { mulberry32 } from '../automation/retry';

export interface SpotInput {
  /** Hours of useful training work the job needs. */
  workHours: number;
  /** Minutes of work between checkpoints (0 = never checkpoint). */
  intervalMin: number;
  /** Minutes the job pauses to write one checkpoint. */
  checkpointMin: number;
  /** Minutes to get a new instance, load the container and the last checkpoint after an interruption. */
  restartMin: number;
  /** Average interruptions per hour of running. */
  ratePerHour: number;
  spotPrice: number;
  onDemandPrice: number;
}

export interface SpotEstimate {
  /** Expected wall-clock hours on spot. Infinity when the job is expected never to finish. */
  hours: number;
  expectedInterruptions: number;
  /** Fraction of the paid time spent on useful work. */
  efficiency: number;
  spotCost: number;
  /** On-demand: no interruptions, but the same checkpoint pauses. */
  onDemandCost: number;
  onDemandHours: number;
  /** Young's approximation of the best checkpoint interval: sqrt(2 × checkpoint cost × mean time between interruptions). */
  bestIntervalMin: number;
}

const H = 60;

/**
 * With checkpoints every τ hours of work costing C hours each, the job runs W(1 + C/τ) hours without interruptions.
 * Each interruption wastes on average half a segment, (τ + C)/2, plus the restart R. Interruptions arrive at λ per
 * hour, so T = W(1 + C/τ) + λT((τ + C)/2 + R), which gives T = W(1 + C/τ) / (1 − λ((τ + C)/2 + R)).
 * Without checkpoints a job must run W hours in one go: E[T] = (1/λ + R)(e^(λW) − 1).
 */
export function spotEstimate(x: SpotInput): SpotEstimate {
  const W = x.workHours;
  const lam = x.ratePerHour;
  const C = x.checkpointMin / H;
  const R = x.restartMin / H;
  const tau = x.intervalMin / H;
  const onDemandHours = tau > 0 ? W * (1 + C / tau) : W;
  let hours: number;
  if (lam === 0) hours = onDemandHours;
  else if (tau <= 0) hours = (1 / lam + R) * Math.expm1(lam * W);
  else {
    const waste = lam * ((tau + C) / 2 + R);
    hours = waste >= 1 ? Infinity : onDemandHours / (1 - waste);
  }
  const bestIntervalMin = lam > 0 && C > 0 ? Math.sqrt((2 * C) / lam) * H : 0;
  return {
    hours,
    expectedInterruptions: Number.isFinite(hours) ? lam * hours : Infinity,
    efficiency: Number.isFinite(hours) ? W / hours : 0,
    spotCost: hours * x.spotPrice,
    onDemandCost: onDemandHours * x.onDemandPrice,
    onDemandHours,
    bestIntervalMin,
  };
}

export type SegmentKind = 'work' | 'checkpoint' | 'lost' | 'restart';
export interface Segment {
  kind: SegmentKind;
  start: number;
  end: number;
}

export interface SpotRun {
  segments: Segment[];
  hours: number;
  interruptions: number;
  /** Hours of work that had to be redone. */
  lostHours: number;
  finished: boolean;
}

/** One example run with interruption gaps drawn from an exponential distribution (seeded). */
export function simulateSpot(x: SpotInput, seed: number, maxHours = 1000): SpotRun {
  const rand = mulberry32(seed);
  const nextGap = () => (x.ratePerHour > 0 ? -Math.log(1 - rand()) / x.ratePerHour : Infinity);
  const C = x.checkpointMin / H;
  const R = x.restartMin / H;
  const tau = x.intervalMin > 0 ? x.intervalMin / H : Infinity;
  const segments: Segment[] = [];
  let t = 0;
  let saved = 0; // work hours safely in a checkpoint
  let interruptions = 0;
  let lostHours = 0;
  let nextInterrupt = nextGap();
  const push = (kind: SegmentKind, start: number, end: number) => {
    const last = segments[segments.length - 1];
    if (last && last.kind === kind && Math.abs(last.end - start) < 1e-9) last.end = end;
    else if (end > start) segments.push({ kind, start, end });
  };
  while (saved < x.workHours - 1e-9 && t < maxHours) {
    const chunk = Math.min(tau, x.workHours - saved);
    const isLast = saved + chunk >= x.workHours - 1e-9;
    const need = chunk + (isLast ? 0 : C);
    if (t + need <= nextInterrupt) {
      push('work', t, t + chunk);
      if (!isLast) push('checkpoint', t + chunk, t + need);
      t += need;
      saved += chunk;
      continue;
    }
    const ran = nextInterrupt - t;
    push('lost', t, nextInterrupt);
    lostHours += Math.min(ran, chunk);
    interruptions += 1;
    t = nextInterrupt;
    push('restart', t, t + R);
    t += R;
    nextInterrupt = t + nextGap();
  }
  return { segments, hours: t, interruptions, lostHours, finished: saved >= x.workHours - 1e-9 };
}
