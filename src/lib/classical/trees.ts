/**
 * Classification and regression trees (CART) for the trees-ensembles lesson: Gini impurity, the
 * threshold search, greedy tree growing, a random forest and gradient boosting with stumps.
 * Thresholds and tie-breaking follow scikit-learn 1.8's best splitter (checked in trees.test.ts).
 */

/** Gini impurity of a node with these class counts: 1 − Σ pₖ², where pₖ = countₖ / n. 0 when empty. */
export function gini(counts: readonly number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return 0;
  return 1 - counts.reduce((acc, c) => acc + (c / n) ** 2, 0);
}

/** How many labels fall in each class 0..k−1. */
export function classCounts(labels: readonly number[], k: number): number[] {
  const out = Array<number>(k).fill(0);
  for (const y of labels) out[y]! += 1;
  return out;
}

/**
 * Candidate thresholds: the midpoints between consecutive sorted unique values, as scikit-learn's
 * splitter computes them (a/2 + b/2, falling back to a if rounding lands on b).
 */
export function candidateThresholds(values: readonly number[]): number[] {
  const u = [...new Set(values)].sort((a, b) => a - b);
  return u.slice(1).map((b, i) => {
    const a = u[i]!;
    const t = a / 2 + b / 2;
    return t === b || !Number.isFinite(t) ? a : t;
  });
}

export interface SplitScore {
  threshold: number;
  /** Class counts with x ≤ threshold, and with x > threshold. */
  left: number[];
  right: number[];
  giniLeft: number;
  giniRight: number;
  /** (nL/n)·gini(left) + (nR/n)·gini(right): the quantity the split search minimizes. */
  weighted: number;
}

/** Scores one split `x ≤ threshold` of labels `ys` (class indices 0..k−1). */
export function scoreSplit(
  xs: readonly number[],
  ys: readonly number[],
  k: number,
  threshold: number,
): SplitScore {
  const l: number[] = [];
  const r: number[] = [];
  xs.forEach((x, i) => (x <= threshold ? l : r).push(ys[i]!));
  const left = classCounts(l, k);
  const right = classCounts(r, k);
  const n = xs.length;
  const giniLeft = gini(left);
  const giniRight = gini(right);
  return {
    threshold,
    left,
    right,
    giniLeft,
    giniRight,
    weighted: (l.length / n) * giniLeft + (r.length / n) * giniRight,
  };
}

/** Every candidate split on one feature, in increasing threshold order. */
export function splitScores(xs: readonly number[], ys: readonly number[], k: number): SplitScore[] {
  return candidateThresholds(xs).map((t) => scoreSplit(xs, ys, k, t));
}

/** Index of the lowest score; the first one wins a tie (scikit-learn keeps a split only if it is strictly better). */
export function bestIndex(scores: readonly SplitScore[]): number {
  let best = -1;
  scores.forEach((s, i) => {
    if (best < 0 || s.weighted < scores[best]!.weighted) best = i;
  });
  return best;
}

export interface TreeNode {
  /** Path from the root: '' for the root, then 'L' or 'R' per level. */
  id: string;
  depth: number;
  n: number;
  counts: number[];
  gini: number;
  /** Majority class (lowest index on a tie, as numpy.argmax). */
  prediction: number;
  split?: { feature: number; threshold: number; weighted: number };
  left?: TreeNode;
  right?: TreeNode;
}

export interface GrowOptions {
  maxDepth?: number;
  /** Features drawn at random for each split (a random forest's max_features). All when left out. */
  maxFeatures?: number;
  rand?: () => number;
}

const argmax = (xs: readonly number[]) => xs.reduce((best, v, i) => (v > xs[best]! ? i : best), 0);

/** All feature indices in a random order (Fisher–Yates), or in order 0..d−1 without `rand`. */
function featureOrder(d: number, rand: (() => number) | undefined): number[] {
  const all = Array.from({ length: d }, (_, j) => j);
  if (!rand) return all;
  for (let i = d - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}

/**
 * Grows a classification tree greedily: at each node, try every candidate threshold of the chosen
 * features and keep the split with the lowest weighted Gini. A node becomes a leaf when it is pure,
 * when `maxDepth` is reached, or when the drawn features are constant. Like scikit-learn, a forest
 * tree that draws only constant features keeps drawing from the rest.
 */
export function growTree(
  X: readonly number[][],
  y: readonly number[],
  k: number,
  opts: GrowOptions = {},
): TreeNode {
  const d = X[0]?.length ?? 0;
  const grow = (idx: number[], id: string, depth: number): TreeNode => {
    const labels = idx.map((i) => y[i]!);
    const counts = classCounts(labels, k);
    const node: TreeNode = {
      id,
      depth,
      n: idx.length,
      counts,
      gini: gini(counts),
      prediction: argmax(counts),
    };
    if (node.gini === 0 || idx.length < 2 || (opts.maxDepth !== undefined && depth >= opts.maxDepth))
      return node;
    let best: { feature: number; s: SplitScore } | undefined;
    const m = opts.maxFeatures ?? d;
    if (m < d && !opts.rand) throw new Error('maxFeatures needs a random source');
    // Visit features in random order; constant ones (no threshold) don't count towards the m tried.
    let tried = 0;
    for (const j of featureOrder(d, m < d ? opts.rand : undefined)) {
      if (tried >= m) break;
      const xs = idx.map((i) => X[i]![j]!);
      const scores = splitScores(xs, labels, k);
      if (scores.length === 0) continue;
      tried += 1;
      const s = scores[bestIndex(scores)]!;
      if (!best || s.weighted < best.s.weighted) best = { feature: j, s };
    }
    if (!best) return node;
    const { feature, s } = best;
    node.split = { feature, threshold: s.threshold, weighted: s.weighted };
    node.left = grow(
      idx.filter((i) => X[i]![feature]! <= s.threshold),
      `${id}L`,
      depth + 1,
    );
    node.right = grow(
      idx.filter((i) => X[i]![feature]! > s.threshold),
      `${id}R`,
      depth + 1,
    );
    return node;
  };
  return grow(
    X.map((_, i) => i),
    '',
    0,
  );
}

/** The leaf a sample lands in, following x[feature] ≤ threshold to the left. */
export function leafOf(node: TreeNode, x: readonly number[]): TreeNode {
  let cur = node;
  while (cur.split) cur = x[cur.split.feature]! <= cur.split.threshold ? cur.left! : cur.right!;
  return cur;
}

export const predictTree = (node: TreeNode, x: readonly number[]) => leafOf(node, x).prediction;

/** Every node, root first (preorder). */
export function nodesOf(node: TreeNode): TreeNode[] {
  return [node, ...(node.left ? nodesOf(node.left) : []), ...(node.right ? nodesOf(node.right) : [])];
}

export function treeDepth(node: TreeNode): number {
  return node.split ? 1 + Math.max(treeDepth(node.left!), treeDepth(node.right!)) : 0;
}

export const accuracy = (predicted: readonly number[], actual: readonly number[]) =>
  predicted.filter((p, i) => p === actual[i]).length / actual.length;
