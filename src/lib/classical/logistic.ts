/**
 * Logistic regression trained with batch gradient descent on mean log loss, plus the penguin
 * binary-classification data used by ml/classical/logistic-regression and metrics-error-analysis.
 */
import { complete, PENGUINS, type NumericColumn, type Penguin, type Species } from './penguins';

/** σ(z) = 1 / (1 + e^(−z)), written as NumPy's `1 / (1 + np.exp(-z))`. */
export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Mean log loss: −mean(y·log p + (1 − y)·log(1 − p)), in the order the lesson's NumPy line uses. */
export function logLoss(p: readonly number[], y: readonly number[]): number {
  if (p.length === 0 || p.length !== y.length) throw new Error('logLoss needs equal, non-empty lists');
  let s = 0;
  p.forEach((pi, i) => {
    s += y[i]! * Math.log(pi) + (1 - y[i]!) * Math.log(1 - pi);
  });
  return -(s / p.length);
}

/** Share of examples where (p ≥ threshold) equals the label. */
export function accuracy(p: readonly number[], y: readonly number[], threshold = 0.5): number {
  return p.filter((pi, i) => (pi >= threshold ? 1 : 0) === y[i]).length / p.length;
}

export interface Scaler {
  mean: number[];
  std: number[];
}

/** Per-column mean and standard deviation (ddof = 0, as `X.mean(axis=0)` and `X.std(axis=0)`). */
export function fitScaler(X: readonly (readonly number[])[]): Scaler {
  const d = X[0]!.length;
  const n = X.length;
  const mean = Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[j]!, 0) / n);
  const std = mean.map((m, j) => Math.sqrt(X.reduce((s, r) => s + (r[j]! - m) ** 2, 0) / n));
  return { mean, std };
}

export const scale = (sc: Scaler, row: readonly number[]) =>
  row.map((v, j) => (v - sc.mean[j]!) / sc.std[j]!);

export interface LogisticModel {
  w: number[];
  b: number;
}

export const score = (m: LogisticModel, z: readonly number[]) =>
  z.reduce((s, v, j) => s + v * m.w[j]!, 0) + m.b;
export const predictProba = (m: LogisticModel, z: readonly number[]) => sigmoid(score(m, z));

export interface LogisticRun {
  model: LogisticModel;
  /** Log loss and accuracy on the training data after each step (index 0 is the start). */
  history: { step: number; loss: number; acc: number }[];
}

/**
 * Batch gradient descent from w = 0, b = 0, mirroring the lesson's NumPy loop:
 * p = σ(Zw + b); w ← w − η·Zᵀ(p − y)/n; b ← b − η·mean(p − y).
 */
export function trainLogistic(
  Z: readonly (readonly number[])[],
  y: readonly number[],
  opts: { lr: number; steps: number },
): LogisticRun {
  const n = Z.length;
  const d = Z[0]!.length;
  let model: LogisticModel = { w: Array<number>(d).fill(0), b: 0 };
  const probs = (m: LogisticModel) => Z.map((z) => predictProba(m, z));
  const record = (step: number, p: number[]) => ({ step, loss: logLoss(p, y), acc: accuracy(p, y) });
  let p = probs(model);
  const history = [record(0, p)];
  for (let k = 1; k <= opts.steps; k++) {
    const gw = Array<number>(d).fill(0);
    let gb = 0;
    Z.forEach((z, i) => {
      const e = p[i]! - y[i]!;
      z.forEach((v, j) => (gw[j]! += v * e));
      gb += e;
    });
    model = { w: model.w.map((wj, j) => wj - (opts.lr * gw[j]!) / n), b: model.b - opts.lr * (gb / n) };
    p = probs(model);
    history.push(record(k, p));
  }
  return { model, history };
}

/** One penguin of a two-species task. */
export interface BinaryPenguin {
  /** 0-based row of penguins.csv. */
  row: number;
  species: Species;
  /** 1 for the positive species. */
  label: 0 | 1;
  /** Raw feature values, in the order of `features`. */
  x: number[];
  split: 'train' | 'test';
}

export interface BinaryTask {
  negative: Species;
  positive: Species;
  features: readonly NumericColumn[];
  all: BinaryPenguin[];
  train: BinaryPenguin[];
  test: BinaryPenguin[];
}

/**
 * Two species, rows with every listed feature present, in file order. Every 4th of those rows
 * (positions 3, 7, 11, …, as `pair.iloc[3::4]` in pandas) is held out as the test set.
 */
export function binaryTask(
  negative: Species,
  positive: Species,
  features: readonly NumericColumn[],
): BinaryTask {
  const rows = complete(
    PENGUINS.filter((p) => p.species === negative || p.species === positive),
    features as readonly (keyof Penguin)[],
  );
  const all = rows.map((p, i) => ({
    row: p.row,
    species: p.species,
    label: (p.species === positive ? 1 : 0) as 0 | 1,
    x: features.map((f) => p[f]!),
    split: (i % 4 === 3 ? 'test' : 'train') as 'train' | 'test',
  }));
  return {
    negative,
    positive,
    features,
    all,
    train: all.filter((p) => p.split === 'train'),
    test: all.filter((p) => p.split === 'test'),
  };
}

/** The decision boundary w·z + b = 0 in raw units: a1·x1 + a2·x2 + c = 0. */
export function boundaryInUnits(m: LogisticModel, sc: Scaler): { a1: number; a2: number; c: number } {
  const [w1, w2] = m.w as [number, number];
  const a1 = w1 / sc.std[0]!;
  const a2 = w2 / sc.std[1]!;
  return { a1, a2, c: m.b - a1 * sc.mean[0]! - a2 * sc.mean[1]! };
}

/**
 * The part of the line a1·x + a2·y + c = 0 inside the box [x0, x1] × [y0, y1], or undefined when
 * the line misses the box (or is not a line because a1 = a2 = 0).
 */
export function clipLine(
  { a1, a2, c }: { a1: number; a2: number; c: number },
  [x0, x1]: readonly [number, number],
  [y0, y1]: readonly [number, number],
): [[number, number], [number, number]] | undefined {
  const pts: [number, number][] = [];
  const eps = 1e-9;
  const inX = (x: number) => x >= x0 - eps && x <= x1 + eps;
  const inY = (y: number) => y >= y0 - eps && y <= y1 + eps;
  if (a2 !== 0)
    for (const x of [x0, x1]) {
      const y = -(a1 * x + c) / a2 + 0; // + 0 turns −0 into 0
      if (inY(y)) pts.push([x, y]);
    }
  if (a1 !== 0)
    for (const y of [y0, y1]) {
      const x = -(a2 * y + c) / a1 + 0;
      if (inX(x)) pts.push([x, y]);
    }
  const unique = pts.filter(
    (p, i) => pts.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6) === i,
  );
  return unique.length >= 2 ? [unique[0]!, unique[1]!] : undefined;
}
