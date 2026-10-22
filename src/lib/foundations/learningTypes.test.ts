import { describe, expect, it } from 'vitest';
import { hasModule, runPython } from './pythonOracle';
import { BILLS, CENTROIDS, computeTypes, kmeans, nearest, predictSpecies, spreadInit } from './learningTypes';

describe('learning types: supervised nearest centroid and unsupervised k-means', () => {
  it('uses the 342 penguins with both bill measurements', () => {
    expect(BILLS).toHaveLength(342);
  });

  it('learns each species’ average bill', () => {
    expect(CENTROIDS.Adelie.x).toBeCloseTo(38.791391, 5);
    expect(CENTROIDS.Gentoo.y).toBeCloseTo(14.982114, 5);
    expect(predictSpecies({ x: 39, y: 18.5 }, CENTROIDS)).toBe('Adelie');
    expect(predictSpecies({ x: 48, y: 15 }, CENTROIDS)).toBe('Gentoo');
    expect(predictSpecies({ x: 50, y: 19 }, CENTROIDS)).toBe('Chinstrap');
  });

  it('clusters a hand-worked example', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 10, y: 0 },
      { x: 10, y: 1 },
    ];
    // Mean (5, 0.5); ties go to the first point: (0, 0). Farthest from it: (10, 1).
    expect(spreadInit(pts, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 1 },
    ]);
    const r = kmeans(pts, 2);
    expect(r.labels).toEqual([0, 0, 1, 1]);
    expect(r.centers).toEqual([
      { x: 0, y: 0.5 },
      { x: 10, y: 0.5 },
    ]);
    expect(nearest({ x: 5, y: 0.5 }, r.centers)).toBe(0);
  });

  it('computes the experiment for both setups', () => {
    const r = computeTypes({ setup: 'unsupervised', bill: { x: 39, y: 18.5 }, k: 3 });
    expect(r.summary.reduce((s, c) => s + c.size, 0)).toBe(342);
    expect(r.prediction).toBe('Adelie');
  });
});

describe.skipIf(!hasModule('numpy'))('k-means against NumPy', () => {
  it('finds the same clusters as the same algorithm written in NumPy', () => {
    const out = runPython(`
import json, numpy as np
X = np.array(${JSON.stringify(BILLS.map((p) => [p.x, p.y]))})
def nearest(p, C): return int(np.argmin(((C - p) ** 2).sum(axis=1)))
for k in (2, 3, 4):
    C = [X[nearest(X.mean(axis=0), X)]]
    while len(C) < k:
        d = np.min([((X - c) ** 2).sum(axis=1) for c in C], axis=0)
        C.append(X[int(np.argmax(d))])
    C = np.array(C)
    labels = np.array([nearest(p, C) for p in X])
    while True:
        C = np.array([X[labels == j].mean(axis=0) if (labels == j).any() else C[j] for j in range(k)])
        new = np.array([nearest(p, C) for p in X])
        if (new == labels).all(): break
        labels = new
    print(json.dumps(labels.tolist()))
`);
    const lines = out.trim().split('\n');
    [2, 3, 4].forEach((k, i) => expect(kmeans(BILLS, k).labels).toEqual(JSON.parse(lines[i]!)));
  });
});
