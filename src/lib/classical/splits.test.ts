import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import {
  centroids,
  leakageCurve,
  leakageRun,
  noiseDataset,
  NOISE_DATA_SEED,
  predictNearest,
  rankFeatures,
  selectionRows,
} from './leakage';
import { seededRandom, shuffled } from './random';
import { assignSplits, rowsIn, splitCounts } from './splits';
import {
  computeSplits,
  CURVE_SEEDS,
  formatScore,
  K_MAX,
  noiseData,
  splitsExperiment,
} from './splitsExperiment';

describe('splits', () => {
  it('rounds held-out shares to whole rows and gives training the rest', () => {
    // 60 · 15 / 100 = 9 and 60 · 30 / 100 = 18, so training gets 60 − 9 − 18 = 33
    expect(splitCounts(60, 15, 30)).toEqual({ train: 33, validation: 9, test: 18 });
    // 10 · 25 / 100 = 2.5 rounds to 3
    expect(splitCounts(10, 25, 10)).toEqual({ train: 6, validation: 3, test: 1 });
    expect(() => splitCounts(10, 50, 50)).toThrow('leave rows for training');
  });

  it('matches the counts scikit-learn 1.8 gives for the two-step train_test_split', () => {
    // Produced with ~/pyenv/bin/python (scikit-learn 1.8.0): rows = np.arange(60);
    // train_val, test = train_test_split(rows, test_size=n_test, random_state=seed);
    // train, val = train_test_split(train_val, test_size=n_val, random_state=seed);
    // print(len(train), len(val), len(test)) for (n_val, n_test, seed) = (9, 18, 1), (3, 6, 0), (18, 24, 7), (12, 12, 42)
    const python = ['33 9 18', '51 3 6', '18 18 24', '36 12 12'];
    const ours = [
      [15, 30],
      [5, 10],
      [30, 40],
      [20, 20],
    ].map(([v, t]) => {
      const c = splitCounts(60, v!, t!);
      return `${c.train} ${c.validation} ${c.test}`;
    });
    expect(ours).toEqual(python);
  });

  it('assigns shuffled positions in order: train, then validation, then test', () => {
    const counts = { train: 3, validation: 1, test: 2 };
    const order = shuffled([0, 1, 2, 3, 4, 5], seededRandom(5));
    const a = assignSplits(counts, 5);
    expect(order.slice(0, 3).map((r) => a[r])).toEqual(['train', 'train', 'train']);
    expect(a[order[3]!]).toBe('validation');
    expect(order.slice(4).map((r) => a[r])).toEqual(['test', 'test']);
    expect(assignSplits(counts, 5)).toEqual(a);
    expect(rowsIn(a, 'test')).toEqual([...order.slice(4)].sort((x, y) => x - y));
  });
});

describe('leakage', () => {
  // Feature 0 rises with the label (r = 0.894), feature 1 alternates and is uncorrelated (r = 0).
  const tiny = {
    X: [
      [1, 0],
      [2, 1],
      [3, 0],
      [4, 1],
    ],
    y: [0, 0, 1, 1],
  };

  it('ranks features by |correlation| on the given rows', () => {
    const ranked = rankFeatures(tiny, [0, 1, 2, 3]);
    expect(ranked.map((f) => f.feature)).toEqual([0, 1]);
    // r = Σdx·dy / √(Σdx²·Σdy²) = 2 / √(5 · 1) = 0.8944
    expect(ranked[0]!.r).toBeCloseTo(2 / Math.sqrt(5), 12);
    expect(ranked[1]!.r).toBeCloseTo(0, 12);
  });

  it('predicts the class of the nearest centroid', () => {
    // Class 0 rows 0, 1: feature 0 mean (1 + 2)/2 = 1.5. Class 1 rows 2, 3: (3 + 4)/2 = 3.5.
    const c = centroids(tiny, [0, 1, 2, 3], [0]);
    expect(c).toEqual([[1.5], [3.5]]);
    // x = 2.6: (2.6 − 1.5)² = 1.21 vs (2.6 − 3.5)² = 0.81, so class 1
    expect(predictNearest([2.6, 0], [0], c)).toBe(1);
    expect(predictNearest([2.4, 0], [0], c)).toBe(0);
  });

  it('builds a balanced noise dataset of the requested shape', () => {
    const d = noiseDataset(3, 10, 4);
    expect(d.X).toHaveLength(10);
    expect(d.X[0]).toHaveLength(4);
    expect(d.y.filter((v) => v === 1)).toHaveLength(5);
  });

  it('selects on training rows only, or on every row when leaking', () => {
    const a = assignSplits({ train: 3, validation: 1, test: 2 }, 1);
    expect(selectionRows(a, false)).toEqual(rowsIn(a, 'train'));
    expect(selectionRows(a, true)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('gives the same accuracies in the averaged curve as in single runs', () => {
    const data = noiseDataset(NOISE_DATA_SEED);
    const counts = splitCounts(60, 15, 30);
    const curve = leakageCurve(data, counts, [4, 9], 12);
    for (const k of [1, 5, 12]) {
      const runs = [4, 9].map((s) => leakageRun(data, assignSplits(counts, s), k));
      expect(curve[k - 1]!.honest).toBeCloseTo((runs[0]!.honest.accuracy + runs[1]!.honest.accuracy) / 2, 12);
      expect(curve[k - 1]!.leaked).toBeCloseTo((runs[0]!.leaked.accuracy + runs[1]!.leaked.accuracy) / 2, 12);
    }
  });

  it('on pure noise, honest accuracy hovers near 50% across seeds while the leak inflates it', () => {
    // A new dataset and split for every seed: 100 independent experiments, 18 test rows each.
    const counts = splitCounts(60, 15, 30);
    let honest = 0;
    let leaked = 0;
    const SEEDS = 100;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = leakageRun(noiseDataset(seed), assignSplits(counts, seed), 10);
      honest += r.honest.accuracy;
      leaked += r.leaked.accuracy;
    }
    expect(honest / SEEDS).toBeGreaterThan(0.44);
    expect(honest / SEEDS).toBeLessThan(0.56);
    expect(leaked / SEEDS).toBeGreaterThan(0.72);
  });

  it('shows the same gap on the lesson’s fixed dataset for every k', () => {
    const r = computeSplits(splitsExperiment('t').initial);
    expect(r.curve).toHaveLength(K_MAX);
    for (const p of r.curve) {
      expect(p.honest).toBeGreaterThan(0.42);
      expect(p.honest).toBeLessThan(0.58);
    }
    for (const p of r.curve.slice(4)) expect(p.leaked).toBeGreaterThan(0.72);
    expect(CURVE_SEEDS).toHaveLength(50);
  });
});

describe('splits experiment', () => {
  it('is valid and its readout uses the computed scores', () => {
    const def = splitsExperiment('splits');
    expect(validateExperiment(def)).toEqual([]);
    const r = def.compute(def.initial);
    expect(r.counts).toEqual({ train: 33, validation: 9, test: 18 });
    expect(r.selection).toHaveLength(33);
    const leakOn = { ...def.initial, leak: 'on' as const };
    expect(def.compute(leakOn).selection).toHaveLength(60);
    const items = def.readout!(def.initial, r);
    expect(items[0]!.value).toBe('33 9 18');
    expect(items[2]!.value).toBe(formatScore(r.honest));
    expect(noiseData().X).toHaveLength(60);
  });

  it('formats a score with its arithmetic', () => {
    expect(formatScore({ correct: 9, total: 18 })).toBe('9 / 18 = 50.0%');
    expect(formatScore({ correct: 16, total: 18 })).toBe('16 / 18 = 88.9%');
  });
});
