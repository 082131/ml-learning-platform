import type { ExperimentDef, ReadoutItem } from '../types';
import { LCG } from './lcg';

/**
 * Hyperparameter search on a KNOWN function, so the true optimum is visible. `valLoss` stands in for
 * "train a model with these hyperparameters and measure its validation loss"; it is a formula chosen
 * for the lesson (not a trained model): the learning rate matters a lot, dropout only a little.
 * Mirrors the lesson's Python (`val_loss`, `grid_search`, `random_search`, `val_curve`, `early_stop`).
 */
export const LOG_LR_RANGE: [number, number] = [-4, -1];
export const DROPOUT_RANGE: [number, number] = [0, 0.5];
export const BEST_LOG_LR = -1.9;
export const BEST_DROPOUT = 0.2;
const FLOOR = 0.3;
const LR_WEIGHT = 0.5;
/** 2σ² of the learning-rate bowl, σ = 0.35 decades. */
const LR_WIDTH = 0.245;
const DROPOUT_WEIGHT = 0.04;
const DROPOUT_SCALE = 0.25;

export function valLoss(logLr: number, dropout: number): number {
  const lrTerm = LR_WEIGHT * (1 - Math.exp(-((logLr - BEST_LOG_LR) ** 2) / LR_WIDTH));
  const dropoutTerm = DROPOUT_WEIGHT * ((dropout - BEST_DROPOUT) / DROPOUT_SCALE) ** 2;
  return FLOOR + lrTerm + dropoutTerm;
}

export interface Trial {
  loss: number;
  logLr: number;
  dropout: number;
}

const [LR_LO, LR_HI] = LOG_LR_RANGE;
const LR_SPAN = LR_HI - LR_LO;
const DROPOUT_SPAN = DROPOUT_RANGE[1] - DROPOUT_RANGE[0];

/** k × k evenly spaced points, learning rate in the outer loop (as the Python). Needs k ≥ 2. */
export function gridSearch(k: number): Trial[] {
  const trials: Trial[] = [];
  for (let i = 0; i < k; i++)
    for (let j = 0; j < k; j++) {
      const logLr = LR_LO + (LR_SPAN * i) / (k - 1);
      const dropout = (DROPOUT_SPAN * j) / (k - 1);
      trials.push({ loss: valLoss(logLr, dropout), logLr, dropout });
    }
  return trials;
}

export function randomSearch(n: number, seed: number): Trial[] {
  const rng = new LCG(seed);
  const trials: Trial[] = [];
  for (let i = 0; i < n; i++) {
    const logLr = LR_LO + LR_SPAN * rng.random();
    const dropout = DROPOUT_SPAN * rng.random();
    trials.push({ loss: valLoss(logLr, dropout), logLr, dropout });
  }
  return trials;
}

/** Python's min() over (loss, log_lr, dropout) tuples: lowest loss, ties broken by the next fields. */
export const best = (trials: Trial[]) =>
  trials.reduce((a, t) =>
    t.loss < a.loss ||
    (t.loss === a.loss && (t.logLr < a.logLr || (t.logLr === a.logLr && t.dropout < a.dropout)))
      ? t
      : a,
  );

export const distinctLearningRates = (trials: Trial[]) => new Set(trials.map((t) => t.logLr.toFixed(6))).size;

/** Validation loss per epoch: fast improvement, slow overfitting, plus seeded noise of ±0.015. */
export function valCurve(epochs: number, seed: number): number[] {
  const rng = new LCG(seed);
  const out: number[] = [];
  for (let t = 1; t <= epochs; t++)
    out.push(0.32 + 0.8 * Math.exp(-t / 8) + 0.004 * t + 0.03 * (rng.random() - 0.5));
  return out;
}

/** Stop after `patience` epochs without a new best. Returns 1-based best and stop epochs. */
export function earlyStop(losses: number[], patience: number): { bestEpoch: number; stopped: number } {
  let bestLoss = Infinity;
  let bestEpoch = 0;
  let wait = 0;
  for (let i = 0; i < losses.length; i++) {
    if (losses[i]! < bestLoss) {
      bestLoss = losses[i]!;
      bestEpoch = i + 1;
      wait = 0;
    } else if (++wait >= patience) return { bestEpoch, stopped: i + 1 };
  }
  return { bestEpoch, stopped: losses.length };
}

export interface TuningState {
  /** Grid side: the budget is k² trials for both methods. */
  k: number;
  seed: number;
  patience: number;
}

export interface TuningResult {
  grid: Trial[];
  random: Trial[];
  bestGrid: Trial;
  bestRandom: Trial;
  curve: number[];
  stop: { bestEpoch: number; stopped: number };
  trueBestEpoch: number;
}

export const EPOCHS = 60;

export function computeTuning(s: TuningState): TuningResult {
  const grid = gridSearch(s.k);
  const random = randomSearch(s.k * s.k, s.seed);
  const curve = valCurve(EPOCHS, s.seed);
  const min = Math.min(...curve);
  return {
    grid,
    random,
    bestGrid: best(grid),
    bestRandom: best(random),
    curve,
    stop: earlyStop(curve, s.patience),
    trueBestEpoch: curve.indexOf(min) + 1,
  };
}

/** The line the lesson's Python prints for one search method. */
export const searchLine = (name: string, trials: Trial[]) => {
  const b = best(trials);
  return `${name}: best loss ${b.loss.toFixed(4)} at lr=10^${b.logLr.toFixed(2)}, dropout=${b.dropout.toFixed(2)}; ${distinctLearningRates(trials)} distinct learning rates`;
};

export const stopLine = (s: TuningState, r: TuningResult) =>
  `patience ${s.patience}: best epoch ${r.stop.bestEpoch} (loss ${r.curve[r.stop.bestEpoch - 1]!.toFixed(4)}), stopped after epoch ${r.stop.stopped}`;

function readout(s: TuningState, r: TuningResult): ReadoutItem[] {
  const saved = EPOCHS - r.stop.stopped;
  const missed = r.stop.bestEpoch !== r.trueBestEpoch;
  return [
    { label: 'Grid search prints', value: searchLine('grid', r.grid) },
    { label: 'Random search prints', value: searchLine('random', r.random) },
    { label: 'Early stopping prints', value: stopLine(s, r) },
    {
      label: 'Epochs saved by stopping',
      value: `${saved} of ${EPOCHS} (${Math.round((100 * saved) / EPOCHS)}%)`,
    },
    {
      label: 'Kept the best epoch?',
      value: missed
        ? `no: stopped at ${r.stop.bestEpoch}, the best is epoch ${r.trueBestEpoch} (${r.curve[r.trueBestEpoch - 1]!.toFixed(4)})`
        : `yes, epoch ${r.trueBestEpoch}`,
      status: missed ? 'error' : 'ok',
    },
  ];
}

export function tuningExperiment(id: string, initial: TuningState): ExperimentDef<TuningState, TuningResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'k',
        label: 'Budget: k × k trials, k =',
        min: 2,
        max: 7,
        get: (s) => s.k,
        set: (s, k) => ({ ...s, k }),
      },
      {
        kind: 'slider',
        id: 'seed',
        label: 'Seed (random search and noise)',
        min: 0,
        max: 9,
        get: (s) => s.seed,
        set: (s, seed) => ({ ...s, seed }),
      },
      {
        kind: 'slider',
        id: 'patience',
        label: 'Early-stopping patience (epochs)',
        min: 1,
        max: 15,
        get: (s) => s.patience,
        set: (s, patience) => ({ ...s, patience }),
      },
    ],
    compute: computeTuning,
    readout,
  };
}
