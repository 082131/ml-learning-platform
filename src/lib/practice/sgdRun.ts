import type { Delivery } from './deliveries';
import { LCG } from './lcg';
import { pyRound } from './pyFormat';

/**
 * One training run of the chapter's delivery-time model, minutes ≈ w · km + b, fitted with
 * mini-batch stochastic gradient descent on the mean squared error. Mirrors `train` in the lesson
 * code operation for operation (no fused or compensated sums), so both print the same numbers.
 */
export interface RunConfig {
  lr: number;
  epochs: number;
  batchSize: number;
}

export type RunMetrics =
  | { status: 'ok'; w: number; b: number; valMse: number }
  | { status: 'diverged'; /** 1-based epoch in which |w| passed the limit. */ epoch: number };

export interface RunResult {
  metrics: RunMetrics;
  /** Validation MSE after each epoch (not printed by the Python; the chart uses it). */
  valCurve: number[];
}

/** |w| above this means the updates are blowing up: the run stops and is recorded as diverged. */
export const DIVERGENCE_LIMIT = 1e6;
/** A quarter of the rows are held out for validation. */
const VAL_FRACTION_DIVISOR = 4;

export function splitRows(rows: Delivery[], rng: LCG) {
  const order = rng.shuffle(rows.map((_, i) => i));
  const nVal = Math.floor(rows.length / VAL_FRACTION_DIVISOR);
  return { val: order.slice(0, nVal).map((i) => rows[i]!), train: order.slice(nVal).map((i) => rows[i]!) };
}

export function mse(w: number, b: number, rows: Delivery[]): number {
  let total = 0;
  for (const r of rows) total += (w * r.km + b - r.minutes) ** 2;
  return total / rows.length;
}

export function trainRun(config: RunConfig, seed: number, rows: Delivery[]): RunResult {
  const rng = new LCG(seed);
  const { val, train } = splitRows(rows, rng);
  let w = 0;
  let b = 0;
  const valCurve: number[] = [];
  for (let epoch = 0; epoch < config.epochs; epoch++) {
    rng.shuffle(train);
    for (let start = 0; start < train.length; start += config.batchSize) {
      const batch = train.slice(start, start + config.batchSize);
      let gw = 0;
      let gb = 0;
      for (const r of batch) {
        const err = w * r.km + b - r.minutes;
        gw += err * r.km;
        gb += err;
      }
      w -= (config.lr * 2 * gw) / batch.length;
      b -= (config.lr * 2 * gb) / batch.length;
      if (Math.abs(w) > DIVERGENCE_LIMIT)
        return { metrics: { status: 'diverged', epoch: epoch + 1 }, valCurve };
    }
    valCurve.push(mse(w, b, val));
  }
  return {
    metrics: { status: 'ok', w: pyRound(w), b: pyRound(b), valMse: pyRound(mse(w, b, val)) },
    valCurve,
  };
}
