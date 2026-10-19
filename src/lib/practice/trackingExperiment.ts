import type { ExperimentDef, ReadoutItem } from '../types';
import { formatNumber } from '../trace/values';
import { makeDeliveries, type Delivery } from './deliveries';
import { pyJson, type PyValue } from './pyFormat';
import { mean, stdev } from './stats';
import { trainRun, type RunConfig, type RunResult } from './sgdRun';

/** Inputs of the experiment-tracking lesson: config A (the run the code prints) and config B to compare. */
export interface TrackingState {
  lr: number;
  epochs: number;
  batchSize: number;
  seed: number;
  /** Config B differs from A only in its learning rate. */
  lrB: number;
  /** Seeds 0 … seeds − 1 are run for both configs. */
  seeds: number;
}

export interface SeedPair {
  seed: number;
  a: RunResult;
  b: RunResult;
}

export interface SweepSummary {
  /** Validation MSE of each finished run; diverged runs are counted separately. */
  values: number[];
  diverged: number;
  mean?: number;
  stdev?: number;
}

export interface TrackingResult {
  run: RunResult;
  /** The record exactly as the lesson's `print(json.dumps(record))` writes it. */
  record: string;
  /** Re-running from the record gave the identical result (always true: the run is seeded). */
  reproduced: boolean;
  pairs: SeedPair[];
  summaryA: SweepSummary;
  summaryB: SweepSummary;
  /** Seeds on which B finished with a lower validation MSE than A. */
  bWins: number;
}

export const MAX_SEEDS = 10;
const BATCH_SIZES = [1, 4, 8, 15, 45];

const configA = (s: TrackingState): RunConfig => ({ lr: s.lr, epochs: s.epochs, batchSize: s.batchSize });
const configB = (s: TrackingState): RunConfig => ({ ...configA(s), lr: s.lrB });

/** The record the Python prints: config, seed, data recipe and metrics, in that key order. */
export function runRecord(config: RunConfig, seed: number, run: RunResult): string {
  const m = run.metrics;
  const metrics: PyValue =
    m.status === 'ok'
      ? { status: 'ok', w: m.w, b: m.b, val_mse: m.valMse }
      : { status: 'diverged', epoch: { int: m.epoch } };
  return pyJson({
    config: { lr: config.lr, epochs: { int: config.epochs }, batch_size: { int: config.batchSize } },
    seed: { int: seed },
    data: 'make_deliveries(60, seed=2024)',
    metrics,
  });
}

const valOf = (r: RunResult) => (r.metrics.status === 'ok' ? r.metrics.valMse : undefined);

function summarize(runs: RunResult[]): SweepSummary {
  const values = runs.map(valOf).filter((v): v is number => v !== undefined);
  return {
    values,
    diverged: runs.length - values.length,
    ...(values.length > 0 && { mean: mean(values), stdev: stdev(values) }),
  };
}

export function computeTracking(s: TrackingState, rows: Delivery[]): TrackingResult {
  const run = trainRun(configA(s), s.seed, rows);
  const again = trainRun(configA(s), s.seed, rows);
  const pairs = Array.from({ length: s.seeds }, (_, seed) => ({
    seed,
    a: trainRun(configA(s), seed, rows),
    b: trainRun(configB(s), seed, rows),
  }));
  const bWins = pairs.filter((p) => {
    const a = valOf(p.a);
    const b = valOf(p.b);
    return b !== undefined && (a === undefined || b < a);
  }).length;
  return {
    run,
    record: runRecord(configA(s), s.seed, run),
    reproduced: JSON.stringify(run) === JSON.stringify(again),
    pairs,
    summaryA: summarize(pairs.map((p) => p.a)),
    summaryB: summarize(pairs.map((p) => p.b)),
    bWins,
  };
}

export const describeSummary = (x: SweepSummary) =>
  x.mean === undefined
    ? `all ${x.diverged} runs diverged`
    : `${formatNumber(x.mean)} ± ${formatNumber(x.stdev!)}` +
      (x.diverged ? `, plus ${x.diverged} diverged` : '');

function readout(s: TrackingState, r: TrackingResult): ReadoutItem[] {
  return [
    { label: 'Printed record', value: r.record, status: r.run.metrics.status === 'ok' ? 'ok' : 'diverged' },
    {
      label: 'Re-run from the record',
      value: r.reproduced ? 'identical metrics ✓' : 'different metrics ✗',
      status: r.reproduced ? 'ok' : 'error',
    },
    { label: `A (lr ${s.lr}) over ${s.seeds} seeds, val MSE mean ± std`, value: describeSummary(r.summaryA) },
    {
      label: `B (lr ${s.lrB}) over ${s.seeds} seeds, val MSE mean ± std`,
      value: describeSummary(r.summaryB),
    },
    { label: 'Seeds where B beats A', value: `${r.bWins} of ${s.seeds}` },
  ];
}

export function trackingExperiment(
  id: string,
  initial: TrackingState,
): ExperimentDef<TrackingState, TrackingResult> {
  const rows = makeDeliveries();
  const lrControl = (key: 'lr' | 'lrB', label: string) =>
    ({
      kind: 'slider',
      id: key,
      label,
      min: 0.001,
      max: 0.02,
      step: 0.001,
      get: (s: TrackingState) => s[key],
      set: (s: TrackingState, v: number) => ({ ...s, [key]: Number(v.toFixed(3)) }),
    }) as const;
  return {
    id,
    initial,
    controls: [
      lrControl('lr', 'A: learning rate'),
      lrControl('lrB', 'B: learning rate'),
      {
        kind: 'slider',
        id: 'epochs',
        label: 'Epochs (both)',
        min: 1,
        max: 40,
        get: (s) => s.epochs,
        set: (s, epochs) => ({ ...s, epochs }),
      },
      {
        kind: 'select',
        id: 'batch',
        label: 'Batch size (both)',
        options: BATCH_SIZES.map((b) => ({ value: String(b), label: String(b) })),
        get: (s) => String(s.batchSize),
        set: (s, v) => ({ ...s, batchSize: Number(v) }),
      },
      {
        kind: 'slider',
        id: 'seed',
        label: 'Seed of the printed run',
        min: 0,
        max: MAX_SEEDS - 1,
        get: (s) => s.seed,
        set: (s, seed) => ({ ...s, seed }),
      },
      {
        kind: 'slider',
        id: 'seeds',
        label: 'Seeds to compare',
        min: 1,
        max: MAX_SEEDS,
        get: (s) => s.seeds,
        set: (s, seeds) => ({ ...s, seeds }),
      },
    ],
    compute: (s) => computeTracking(s, rows),
    readout,
  };
}
