/** Ensembles of trees: a random forest (bagging + random features) and gradient boosting with stumps. */
import { bootstrapIndices, seededRandom } from './random';
import { candidateThresholds, classCounts, growTree, predictTree, type TreeNode } from './trees';

export interface Forest {
  trees: TreeNode[];
  /** The bootstrap sample (row indices into the training set, with repeats) each tree was grown on. */
  samples: number[][];
}

/**
 * A random forest: each tree is grown to full depth on a bootstrap sample of the training rows,
 * trying `maxFeatures` randomly chosen features at each split. One seeded generator drives every
 * draw, so a seed always gives the same forest (not the same one scikit-learn grows: its generator differs).
 */
export function growForest(
  X: readonly number[][],
  y: readonly number[],
  k: number,
  nTrees: number,
  seed: number,
  maxFeatures: number,
): Forest {
  const rand = seededRandom(seed);
  const trees: TreeNode[] = [];
  const samples: number[][] = [];
  for (let t = 0; t < nTrees; t++) {
    const idx = bootstrapIndices(X.length, X.length, rand);
    samples.push(idx);
    trees.push(
      growTree(
        idx.map((i) => X[i]!),
        idx.map((i) => y[i]!),
        k,
        { maxFeatures, rand },
      ),
    );
  }
  return { trees, samples };
}

/** How many of the first `nTrees` trees vote for each class. */
export function forestVotes(
  forest: Forest,
  x: readonly number[],
  k: number,
  nTrees = forest.trees.length,
): number[] {
  return classCounts(
    forest.trees.slice(0, nTrees).map((t) => predictTree(t, x)),
    k,
  );
}

/** The majority vote (lowest class index on a tie). */
export const majority = (votes: readonly number[]) =>
  votes.reduce((best, v, i) => (v > votes[best]! ? i : best), 0);

/** Rows of 0..n−1 that a bootstrap sample never drew ("out of bag"). */
export function outOfBag(sample: readonly number[], n: number): number[] {
  const seen = new Set(sample);
  return Array.from({ length: n }, (_, i) => i).filter((i) => !seen.has(i));
}

/** A depth-1 regression tree: x ≤ threshold predicts `left`, otherwise `right`. */
export interface Stump {
  threshold: number;
  left: number;
  right: number;
}

const meanOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sse = (xs: readonly number[]) => {
  const m = meanOf(xs);
  return xs.reduce((a, v) => a + (v - m) ** 2, 0);
};

/**
 * The stump that best fits `targets` by squared error: try every midpoint threshold and keep the one
 * with the lowest total squared error around the two side means (the first wins a tie). Each side
 * predicts its mean. With a constant x it can't split, so both sides predict the overall mean.
 */
export function fitStump(xs: readonly number[], targets: readonly number[]): Stump {
  let best: (Stump & { err: number }) | undefined;
  for (const t of candidateThresholds(xs)) {
    const l = targets.filter((_, i) => xs[i]! <= t);
    const r = targets.filter((_, i) => xs[i]! > t);
    const err = sse(l) + sse(r);
    if (!best || err < best.err) best = { threshold: t, left: meanOf(l), right: meanOf(r), err };
  }
  if (!best) {
    const m = meanOf(targets);
    return { threshold: Infinity, left: m, right: m };
  }
  return { threshold: best.threshold, left: best.left, right: best.right };
}

export const predictStump = (s: Stump, x: number) => (x <= s.threshold ? s.left : s.right);

export interface BoostStage {
  /** Stage m = 1, 2, …: the residuals it was fit to, the stump, and the prediction after adding it. */
  m: number;
  residuals: number[];
  stump: Stump;
  prediction: number[];
  mse: number;
}

export interface BoostRun {
  /** The starting prediction F₀: the mean of y (scikit-learn's default for squared error). */
  init: number;
  /** MSE of F₀ … F_M on the training rows. */
  mse: number[];
  stages: BoostStage[];
}

export const meanSquaredError = (pred: readonly number[], y: readonly number[]) =>
  pred.reduce((a, p, i) => a + (y[i]! - p) ** 2, 0) / y.length;

/**
 * Gradient boosting for squared error with stumps: F₀ = mean(y); at stage m, fit a stump h to the
 * residuals y − F_{m−1}(x), then F_m = F_{m−1} + learningRate · h. For squared error the residuals
 * are the negative gradient, which is where the name comes from.
 */
export function gradientBoost(
  xs: readonly number[],
  y: readonly number[],
  learningRate: number,
  nStages: number,
): BoostRun {
  const init = meanOf(y);
  let pred = y.map(() => init);
  const mse = [meanSquaredError(pred, y)];
  const stages: BoostStage[] = [];
  for (let m = 1; m <= nStages; m++) {
    const residuals = y.map((v, i) => v - pred[i]!);
    const stump = fitStump(xs, residuals);
    pred = pred.map((p, i) => p + learningRate * predictStump(stump, xs[i]!));
    mse.push(meanSquaredError(pred, y));
    stages.push({ m, residuals, stump, prediction: pred, mse: mse[m]! });
  }
  return { init, mse, stages };
}

/** The boosted model's prediction at any x after `m` stages. */
export function boostPredict(run: BoostRun, learningRate: number, m: number, x: number): number {
  return run.stages.slice(0, m).reduce((p, st) => p + learningRate * predictStump(st.stump, x), run.init);
}
