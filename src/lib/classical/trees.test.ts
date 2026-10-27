import { describe, expect, it } from 'vitest';
import {
  boostPredict,
  fitStump,
  forestVotes,
  gradientBoost,
  growForest,
  majority,
  outOfBag,
} from './ensembles';
import fixture from './fixtures/trees.json';
import { complete, PENGUINS } from './penguins';
import {
  bestIndex,
  candidateThresholds,
  gini,
  growTree,
  leafOf,
  nodesOf,
  scoreSplit,
  splitScores,
  treeDepth,
  type TreeNode,
} from './trees';

// fixtures/trees.json was printed by fixtures/gen_trees.py (CPython 3.13, NumPy 2.4.6, pandas 3.0.2,
// scikit-learn 1.8.0): DecisionTreeClassifier and GradientBoostingRegressor on the same penguins.

const CLASSES = ['Adelie', 'Chinstrap', 'Gentoo'] as const;
const FEATURES = ['bill_length_mm', 'flipper_length_mm'] as const;

interface SkTree {
  feature: number[];
  threshold: number[];
  impurity: number[];
  n: number[];
  counts: number[][];
}

/** scikit-learn numbers nodes depth first, left child first: the same order as nodesOf. */
function expectSameTree(ours: TreeNode, sk: SkTree) {
  const nodes = nodesOf(ours);
  expect(nodes.length).toBe(sk.n.length);
  nodes.forEach((node, i) => {
    expect(node.n).toBe(sk.n[i]);
    expect(node.counts).toEqual(sk.counts[i]);
    expect(node.gini).toBeCloseTo(sk.impurity[i]!, 12);
    expect(node.split?.feature ?? -2).toBe(sk.feature[i]);
    // scikit-learn stores thresholds as float32, so 41.95 comes back as 41.94999885559082.
    if (node.split) expect(node.split.threshold).toBeCloseTo(sk.threshold[i]!, 5);
  });
}

const data = (rows: readonly number[]) => {
  const ps = rows.map((r) => PENGUINS[r]!);
  return {
    X: ps.map((p) => FEATURES.map((f) => p[f]!)),
    y: ps.map((p) => CLASSES.indexOf(p.species)),
    ps,
  };
};

describe('gini', () => {
  it('matches hand-worked values', () => {
    expect(gini([5, 5])).toBe(0.5); // 1 − (0.25 + 0.25)
    expect(gini([4, 0])).toBe(0);
    // 14 toy penguins: 6, 4, 4 → 1 − (36 + 16 + 16)/196 = 128/196
    expect(gini([6, 4, 4])).toBeCloseTo(128 / 196, 15);
    expect(gini([1, 1, 1])).toBeCloseTo(2 / 3, 15);
    expect(gini([0, 0])).toBe(0);
  });
});

describe('split search', () => {
  it('uses midpoints between sorted unique values', () => {
    expect(candidateThresholds([3, 1, 2, 2])).toEqual([1.5, 2.5]);
    expect(candidateThresholds([7, 7])).toEqual([]);
  });

  it('scores a split as the size-weighted Gini of both sides', () => {
    // x: 1 2 3 4, y: 0 0 1 1. t = 2.5 separates perfectly; t = 1.5 leaves [0] | [0, 1, 1].
    const s = scoreSplit([1, 2, 3, 4], [0, 0, 1, 1], 2, 2.5);
    expect(s.left).toEqual([2, 0]);
    expect(s.weighted).toBe(0);
    const t = scoreSplit([1, 2, 3, 4], [0, 0, 1, 1], 2, 1.5);
    // right gini = 1 − (1/9 + 4/9) = 4/9, weighted by 3/4 → 1/3
    expect(t.weighted).toBeCloseTo(1 / 3, 15);
    const all = splitScores([1, 2, 3, 4], [0, 0, 1, 1], 2);
    expect(all.map((x) => x.threshold)).toEqual([1.5, 2.5, 3.5]);
    expect(bestIndex(all)).toBe(1);
  });

  it('keeps the first of tied thresholds', () => {
    // [0] | [1, 0, 1] and [0, 1, 0] | [1] tie at 1/3
    const all = splitScores([1, 2, 3, 4], [0, 1, 0, 1], 2);
    expect(all[0]!.weighted).toBeCloseTo(all[2]!.weighted, 15);
    expect(bestIndex(all)).toBe(0);
  });
});

describe('growTree matches scikit-learn DecisionTreeClassifier', () => {
  const { X, y } = data(fixture.toy_rows);

  it('on the 14 toy penguins, fully grown', () => {
    const tree = growTree(X, y, 3);
    expectSameTree(tree, fixture.toy_tree);
    expect(treeDepth(tree)).toBe(3);
    // Root: bill ≤ 41.95 with weighted Gini 6/14·0 + 8/14·0.5 = 0.2857
    expect(tree.split!.weighted).toBeCloseTo(4 / 14, 15);
  });

  it('on the toy penguins with max_depth=2', () => {
    expectSameTree(growTree(X, y, 3, { maxDepth: 2 }), fixture.toy_tree_depth2);
  });

  it('on all 342 complete rows with max_depth=3', () => {
    const rows = complete(PENGUINS, [...FEATURES]).map((p) => p.row);
    const full = data(rows);
    expectSameTree(growTree(full.X, full.y, 3, { maxDepth: 3 }), fixture.full_tree_depth3);
  });

  it('sends a sample down to its leaf', () => {
    const tree = growTree(X, y, 3);
    expect(leafOf(tree, [52.8, 205]).prediction).toBe(1); // row 305, the Chinstrap with long flippers
    expect(leafOf(tree, [40, 200]).prediction).toBe(0);
  });
});

describe('random forest', () => {
  const rows = complete(PENGUINS, [...FEATURES]).map((p) => p.row);
  const { X, y } = data(rows);

  it('is reproducible from its seed and votes with every tree', () => {
    const a = growForest(X, y, 3, 5, 7, 1);
    const b = growForest(X, y, 3, 5, 7, 1);
    expect(a.samples).toEqual(b.samples);
    const votes = forestVotes(a, X[0]!, 3);
    expect(votes.reduce((s, v) => s + v, 0)).toBe(5);
    expect(forestVotes(a, X[0]!, 3, 2).reduce((s, v) => s + v, 0)).toBe(2);
  });

  it('grows each tree on a bootstrap sample of n rows', () => {
    const f = growForest(X, y, 3, 2, 1, 1);
    expect(f.samples[0]!.length).toBe(X.length);
    expect(f.trees[0]!.n).toBe(X.length);
    const oob = outOfBag(f.samples[0]!, X.length);
    expect(oob.length + new Set(f.samples[0]).size).toBe(X.length);
  });

  it('picks the majority, lowest class on a tie', () => {
    expect(majority([1, 3, 2])).toBe(1);
    expect(majority([2, 2, 0])).toBe(0);
  });
});

describe('gradient boosting matches scikit-learn GradientBoostingRegressor(max_depth=1)', () => {
  const ps = fixture.toy_rows.map((r) => PENGUINS[r]!);
  const xs = ps.map((p) => p.flipper_length_mm!);
  const ys = ps.map((p) => p.body_mass_g!);

  it('fits a stump by squared error (hand-worked)', () => {
    // x 1 2 3 4, targets 1 1 5 5: the split at 2.5 has zero error
    expect(fitStump([1, 2, 3, 4], [1, 1, 5, 5])).toEqual({ threshold: 2.5, left: 1, right: 5 });
    expect(fitStump([2, 2], [1, 3])).toEqual({ threshold: Infinity, left: 2, right: 2 });
  });

  it.each(Object.entries(fixture.boost))('learning rate %s', (lr, sk) => {
    const run = gradientBoost(xs, ys, Number(lr), 30);
    // staged_predict starts after stage 1, so scikit-learn's mse[i] is our mse[i + 1]
    sk.mse.forEach((m, i) => expect(run.mse[i + 1]! / m).toBeCloseTo(1, 10));
    sk.thresholds.forEach((t, i) => expect(run.stages[i]!.stump.threshold).toBeCloseTo(t, 5));
    sk.stage5.forEach((p, i) => expect(run.stages[4]!.prediction[i]).toBeCloseTo(p, 6));
    expect(boostPredict(run, Number(lr), 5, xs[3]!)).toBeCloseTo(sk.stage5[3]!, 6);
  });

  it('starts from the mean and never increases the training error', () => {
    const run = gradientBoost(xs, ys, 0.3, 20);
    expect(run.init).toBeCloseTo(ys.reduce((a, b) => a + b, 0) / ys.length, 10);
    run.mse.slice(1).forEach((m, i) => expect(m).toBeLessThanOrEqual(run.mse[i]! + 1e-9));
  });
});
