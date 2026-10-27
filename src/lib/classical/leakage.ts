import { normal, seededRandom, shuffled } from './random';
import { assignSplits, rowsIn, type SplitCounts, type SplitName } from './splits';
import { mean } from './stats';

/**
 * A data-leakage demonstration on pure noise: every feature is an independent standard normal draw
 * and the labels are a balanced, random 0/1 assignment, so no model can do better than 50% on new
 * rows. Choosing features with the test rows in view (leak) makes the test score look much better.
 */
export interface NoiseData {
  /** rows × features */
  X: number[][];
  /** 0 or 1 per row, half of each */
  y: number[];
}

export const NOISE_ROWS = 60;
export const NOISE_FEATURES = 300;
/** The dataset is fixed; the experiment's seed only changes how rows are split. */
export const NOISE_DATA_SEED = 2024;

/** `rows` × `features` standard normal values and balanced random labels, from one seed. */
export function noiseDataset(seed: number, rows = NOISE_ROWS, features = NOISE_FEATURES): NoiseData {
  const rand = seededRandom(seed);
  const X = Array.from({ length: rows }, () => Array.from({ length: features }, () => normal(rand)));
  const y = shuffled(
    Array.from({ length: rows }, (_, i) => (i < rows / 2 ? 0 : 1)),
    rand,
  );
  return { X, y };
}

/** The feature's values on the given rows. */
const columnOn = (X: number[][], j: number, rows: readonly number[]) => rows.map((i) => X[i]![j]!);

/**
 * Feature indices sorted by |Pearson correlation with the label|, strongest first, computed on the
 * given rows only. Ties keep the lower index first.
 */
export function rankFeatures(data: NoiseData, rows: readonly number[]): { feature: number; r: number }[] {
  const labels = rows.map((i) => data.y[i]!);
  const features = data.X[0]!.length;
  // pearson() from stats.ts, unrolled to avoid building a column array per feature (this runs
  // 100 times per slider change in leakageCurve).
  const my = mean(labels);
  const dy = labels.map((v) => v - my);
  const syy = dy.reduce((s, v) => s + v * v, 0);
  const scored = Array.from({ length: features }, (_, j) => {
    let mx = 0;
    for (const i of rows) mx += data.X[i]![j]!;
    mx /= rows.length;
    let sxy = 0;
    let sxx = 0;
    rows.forEach((i, t) => {
      const dx = data.X[i]![j]! - mx;
      sxy += dx * dy[t]!;
      sxx += dx * dx;
    });
    return { feature: j, r: sxy / Math.sqrt(sxx * syy) };
  });
  return scored.sort((a, b) => Math.abs(b.r) - Math.abs(a.r) || a.feature - b.feature);
}

/** Per-class mean of each chosen feature over the training rows: centroids[c][t] for feature features[t]. */
export function centroids(data: NoiseData, trainRows: readonly number[], features: readonly number[]) {
  return [0, 1].map((c) => {
    const rows = trainRows.filter((i) => data.y[i] === c);
    return features.map((j) => mean(columnOn(data.X, j, rows)));
  });
}

/** Nearest-centroid prediction: the class whose centroid is closest (squared Euclidean). Ties go to 0. */
export function predictNearest(
  row: readonly number[],
  features: readonly number[],
  cents: number[][],
): number {
  const d = cents.map((c) => features.reduce((s, j, t) => s + (row[j]! - c[t]!) ** 2, 0));
  return d[1]! < d[0]! ? 1 : 0;
}

export interface LeakScore {
  /** The k chosen features, strongest first. */
  features: number[];
  correct: number;
  total: number;
  accuracy: number;
}

/** Fit centroids on training rows with these features and score them on the test rows. */
export function scoreOnTest(
  data: NoiseData,
  assignment: readonly SplitName[],
  features: readonly number[],
): LeakScore {
  const train = rowsIn(assignment, 'train');
  const test = rowsIn(assignment, 'test');
  const cents = centroids(data, train, features);
  const correct = test.filter((i) => predictNearest(data.X[i]!, features, cents) === data.y[i]).length;
  return { features: [...features], correct, total: test.length, accuracy: correct / test.length };
}

/** Rows the feature selection looks at: training rows only (honest) or every row (leak). */
export function selectionRows(assignment: readonly SplitName[], leak: boolean): number[] {
  return leak ? assignment.map((_, i) => i) : rowsIn(assignment, 'train');
}

/** Both pipelines on one split: the honest one (select on train) and the leaky one (select on all rows). */
export function leakageRun(data: NoiseData, assignment: readonly SplitName[], k: number) {
  const pick = (leak: boolean) =>
    rankFeatures(data, selectionRows(assignment, leak))
      .slice(0, k)
      .map((f) => f.feature);
  return {
    honest: scoreOnTest(data, assignment, pick(false)),
    leaked: scoreOnTest(data, assignment, pick(true)),
  };
}

export interface CurvePoint {
  k: number;
  honest: number;
  leaked: number;
}

/**
 * Mean test accuracy of both pipelines over split seeds `seeds`, for every k from 1 to kMax. One
 * ranking per seed and pipeline serves every k, because the top-k features are a prefix of it.
 * Gives the same accuracies as leakageRun for each k (tested).
 */
export function leakageCurve(
  data: NoiseData,
  counts: SplitCounts,
  seeds: readonly number[],
  kMax: number,
): CurvePoint[] {
  const sums = Array.from({ length: kMax }, () => ({ honest: 0, leaked: 0 }));
  for (const seed of seeds) {
    const assignment = assignSplits(counts, seed);
    const train = rowsIn(assignment, 'train');
    const test = rowsIn(assignment, 'test');
    for (const leak of [false, true]) {
      const top = rankFeatures(data, selectionRows(assignment, leak))
        .slice(0, kMax)
        .map((f) => f.feature);
      const cents = centroids(data, train, top);
      // Distances grow one feature at a time, so the prediction with the top k features is read off
      // the running sums after k terms (the same rule as predictNearest).
      const correct = Array<number>(kMax).fill(0);
      for (const i of test) {
        let d0 = 0;
        let d1 = 0;
        top.forEach((j, t) => {
          d0 += (data.X[i]![j]! - cents[0]![t]!) ** 2;
          d1 += (data.X[i]![j]! - cents[1]![t]!) ** 2;
          if ((d1 < d0 ? 1 : 0) === data.y[i]) correct[t]! += 1;
        });
      }
      correct.forEach((c, t) => (sums[t]![leak ? 'leaked' : 'honest'] += c / test.length));
    }
  }
  return sums.map((s, i) => ({ k: i + 1, honest: s.honest / seeds.length, leaked: s.leaked / seeds.length }));
}
