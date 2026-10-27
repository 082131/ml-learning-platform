/**
 * A tiny MLP trained with mini-batch SGD on a seeded 2-D dataset, for the training-loop lesson.
 * Everything is deterministic: the same settings and seed always give the same run.
 */
import { initNetwork, lossAndGrads, loss, predict, sgdStep, type Network } from './mlp';
import { mulberry32, normalSampler, permutation } from './rng';

export type DatasetId = 'moons' | 'circles';

export interface Dataset {
  X: number[][];
  /** Labels 0 or 1, as a column: shape (n, 1). */
  y: number[][];
}

export interface SplitData {
  train: Dataset;
  val: Dataset;
}

/**
 * Two interleaving half circles ("two moons"), half the points per class, with Gaussian noise of
 * standard deviation `noise`. Class 0: (cos t, sin t); class 1: (1 − cos t, 0.5 − sin t), t in [0, π].
 */
export function makeMoons(n: number, noise: number, rand: () => number): Dataset {
  const normal = normalSampler(rand);
  const X: number[][] = [];
  const y: number[][] = [];
  for (let i = 0; i < n; i++) {
    const cls = i % 2;
    const t = Math.PI * rand();
    const [a, b] = cls === 0 ? [Math.cos(t), Math.sin(t)] : [1 - Math.cos(t), 0.5 - Math.sin(t)];
    X.push([a + noise * normal(), b + noise * normal()]);
    y.push([cls]);
  }
  return { X, y };
}

/** Two concentric circles: class 0 on radius 1, class 1 on radius 0.5, with Gaussian noise. */
export function makeCircles(n: number, noise: number, rand: () => number): Dataset {
  const normal = normalSampler(rand);
  const X: number[][] = [];
  const y: number[][] = [];
  for (let i = 0; i < n; i++) {
    const cls = i % 2;
    const t = 2 * Math.PI * rand();
    const r = cls === 0 ? 1 : 0.5;
    X.push([r * Math.cos(t) + noise * normal(), r * Math.sin(t) + noise * normal()]);
    y.push([cls]);
  }
  return { X, y };
}

export const N_TRAIN = 100;
export const N_VAL = 50;
export const DATA_NOISE = { moons: 0.2, circles: 0.1 } as const;

/** The lesson's data: N_TRAIN training and N_VAL validation points drawn from one seeded generator. */
export function makeSplit(kind: DatasetId, seed: number): SplitData {
  const rand = mulberry32(seed);
  const make = kind === 'moons' ? makeMoons : makeCircles;
  const all = make(N_TRAIN + N_VAL, DATA_NOISE[kind], rand);
  const take = (from: number, to: number) => ({ X: all.X.slice(from, to), y: all.y.slice(from, to) });
  return { train: take(0, N_TRAIN), val: take(N_TRAIN, N_TRAIN + N_VAL) };
}

/** Iterations in one epoch: ceil(N / B). The last batch holds the remainder when B does not divide N. */
export const stepsPerEpoch = (n: number, batch: number) => Math.ceil(n / batch);

/** Fraction of predictions on the right side of 0.5. */
export function accuracy(net: Network, d: Dataset): number {
  const p = predict(net, d.X);
  return p.filter((row, i) => (row[0]! >= 0.5 ? 1 : 0) === d.y[i]![0]).length / p.length;
}

export interface TrainConfig {
  data: SplitData;
  hidden: number;
  lr: number;
  batch: number;
  epochs: number;
  seed: number;
}

export interface IterRecord {
  /** 1-based iteration number across the whole run. */
  iter: number;
  epoch: number;
  /** 0-based step inside the epoch. */
  step: number;
  /** The loss of this mini-batch, before the update. */
  loss: number;
  size: number;
  /** The training indices in this batch (kept for the first epoch only). */
  idx?: number[];
}

export interface EpochRecord {
  /** 0 is before training. */
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAcc: number;
  valAcc: number;
}

export interface TrainRun {
  initial: Network;
  net: Network;
  iters: IterRecord[];
  epochs: EpochRecord[];
  stepsPerEpoch: number;
}

/** Seeds for the two random processes, so initialization and shuffling don't share a stream. */
export const SHUFFLE_SEED_OFFSET = 1;

const evaluate = (net: Network, d: SplitData, epoch: number): EpochRecord => ({
  epoch,
  trainLoss: loss('bce', predict(net, d.train.X), d.train.y),
  valLoss: loss('bce', predict(net, d.val.X), d.val.y),
  trainAcc: accuracy(net, d.train),
  valAcc: accuracy(net, d.val),
});

/**
 * Mini-batch SGD on a 2-hidden-1 network (tanh hidden layer, sigmoid output, binary cross-entropy).
 * Each epoch shuffles the training set, then takes ceil(N / B) steps on consecutive slices.
 */
export function train(cfg: TrainConfig): TrainRun {
  const { data, lr, batch, epochs } = cfg;
  const initial = initNetwork([2, cfg.hidden, 1], 'tanh', 'sigmoid', cfg.seed);
  const shuffle = mulberry32(cfg.seed + SHUFFLE_SEED_OFFSET);
  const n = data.train.X.length;
  const spe = stepsPerEpoch(n, batch);
  let net = initial;
  const iters: IterRecord[] = [];
  const records: EpochRecord[] = [evaluate(net, data, 0)];
  for (let e = 1; e <= epochs; e++) {
    const order = permutation(n, shuffle);
    for (let s = 0; s < spe; s++) {
      const idx = order.slice(s * batch, (s + 1) * batch);
      const xb = idx.map((i) => data.train.X[i]!);
      const yb = idx.map((i) => data.train.y[i]!);
      const r = lossAndGrads(net, xb, yb, 'bce');
      iters.push({
        iter: iters.length + 1,
        epoch: e,
        step: s,
        loss: r.loss,
        size: idx.length,
        idx: e === 1 ? idx : undefined,
      });
      net = sgdStep(net, r.grads, lr);
    }
    records.push(evaluate(net, data, e));
  }
  return { initial, net, iters, epochs: records, stepsPerEpoch: spe };
}
