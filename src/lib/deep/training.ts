/**
 * A tiny MLP trained with mini-batch SGD on a seeded 2-D dataset, for the training-loop lesson.
 * Everything is deterministic: the same settings and seed always give the same run.
 */
import { BCE_EPS, initNetwork, predict, type Network } from './mlp';
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

/**
 * The 2-H-1 network as flat arrays, so a whole run fits in a few milliseconds on a phone.
 * W1[k * H + j] is the weight from input k to hidden unit j (the (in, out) layout of mlp.ts).
 */
interface Flat {
  H: number;
  W1: Float64Array;
  b1: Float64Array;
  W2: Float64Array;
  b2: number;
}

const toFlat = (net: Network): Flat => ({
  H: net[0]!.b.length,
  W1: Float64Array.from(net[0]!.W.flat()),
  b1: Float64Array.from(net[0]!.b),
  W2: Float64Array.from(net[1]!.W.map((r) => r[0]!)),
  b2: net[1]!.b[0]!,
});

const toNetwork = (f: Flat): Network => [
  {
    activation: 'tanh',
    W: [Array.from(f.W1.subarray(0, f.H)), Array.from(f.W1.subarray(f.H, 2 * f.H))],
    b: Array.from(f.b1),
  },
  { activation: 'sigmoid', W: Array.from(f.W2, (w) => [w]), b: [f.b2] },
];

const clipP = (p: number) => Math.min(1 - BCE_EPS, Math.max(BCE_EPS, p));

/** p = σ(tanh(x·W1 + b1)·W2 + b2) for one point; fills `h` with the hidden activations. */
function forwardOne(f: Flat, x0: number, x1: number, h: Float64Array): number {
  let z2 = 0;
  for (let j = 0; j < f.H; j++) {
    const z = 0 + x0 * f.W1[j]! + x1 * f.W1[f.H + j]! + f.b1[j]!;
    h[j] = Math.tanh(z);
    z2 += h[j]! * f.W2[j]!;
  }
  return 1 / (1 + Math.exp(-(z2 + f.b2)));
}

/** Predicted probabilities of class 1 for every row of X. */
export function predictProba(net: Network, X: number[][]): number[] {
  const f = toFlat(net);
  const h = new Float64Array(f.H);
  return X.map((x) => forwardOne(f, x[0]!, x[1]!, h));
}

function evaluateFlat(f: Flat, d: Dataset): { loss: number; acc: number } {
  const h = new Float64Array(f.H);
  let total = 0;
  let right = 0;
  d.X.forEach((x, i) => {
    const p = forwardOne(f, x[0]!, x[1]!, h);
    const y = d.y[i]![0]!;
    total += -(y * Math.log(clipP(p)) + (1 - y) * Math.log(1 - clipP(p)));
    if ((p >= 0.5 ? 1 : 0) === y) right++;
  });
  return { loss: total / d.X.length, acc: right / d.X.length };
}

/**
 * One SGD step on a batch, in place. The same arithmetic as lossAndGrads + sgdStep in mlp.ts
 * (BCE on a sigmoid output, so dZ₂ = (p − y) / B), in the same summation order. Returns the batch loss.
 */
function stepFlat(f: Flat, X: number[][], Y: number[][], idx: number[], lr: number): number {
  const B = idx.length;
  const H = f.H;
  const hs = idx.map(() => new Float64Array(H));
  const dz2 = new Float64Array(B);
  let total = 0;
  idx.forEach((r, i) => {
    const p = forwardOne(f, X[r]![0]!, X[r]![1]!, hs[i]!);
    const y = Y[r]![0]!;
    total += -(y * Math.log(clipP(p)) + (1 - y) * Math.log(1 - clipP(p)));
    dz2[i] = (p - y) / B;
  });
  const gW1 = new Float64Array(2 * H);
  const gb1 = new Float64Array(H);
  const gW2 = new Float64Array(H);
  let gb2 = 0;
  for (let j = 0; j < H; j++) {
    let sW2 = 0;
    let sW10 = 0;
    let sW11 = 0;
    let sb1 = 0;
    for (let i = 0; i < B; i++) {
      const h = hs[i]![j]!;
      sW2 += h * dz2[i]!;
      const dz1 = (0 + dz2[i]! * f.W2[j]!) * (1 - h * h);
      sW10 += X[idx[i]!]![0]! * dz1;
      sW11 += X[idx[i]!]![1]! * dz1;
      sb1 += dz1;
    }
    gW2[j] = sW2;
    gW1[j] = sW10;
    gW1[H + j] = sW11;
    gb1[j] = sb1;
  }
  for (let i = 0; i < B; i++) gb2 += dz2[i]!;
  for (let k = 0; k < 2 * H; k++) f.W1[k] = f.W1[k]! - lr * gW1[k]!;
  for (let j = 0; j < H; j++) {
    f.b1[j] = f.b1[j]! - lr * gb1[j]!;
    f.W2[j] = f.W2[j]! - lr * gW2[j]!;
  }
  f.b2 = f.b2 - lr * gb2;
  return total / B;
}

const evaluate = (f: Flat, d: SplitData, epoch: number): EpochRecord => {
  const tr = evaluateFlat(f, d.train);
  const va = evaluateFlat(f, d.val);
  return { epoch, trainLoss: tr.loss, valLoss: va.loss, trainAcc: tr.acc, valAcc: va.acc };
};

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
  const f = toFlat(initial);
  const iters: IterRecord[] = [];
  const records: EpochRecord[] = [evaluate(f, data, 0)];
  for (let e = 1; e <= epochs; e++) {
    const order = permutation(n, shuffle);
    for (let s = 0; s < spe; s++) {
      const idx = order.slice(s * batch, (s + 1) * batch);
      const l = stepFlat(f, data.train.X, data.train.y, idx, lr);
      iters.push({ iter: iters.length + 1, epoch: e, step: s, loss: l, size: idx.length, idx: e === 1 ? idx : undefined });
    }
    records.push(evaluate(f, data, e));
  }
  return { initial, net: toNetwork(f), iters, epochs: records, stepsPerEpoch: spe };
}
