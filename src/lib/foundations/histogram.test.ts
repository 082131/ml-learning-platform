import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NUMERIC_COLUMNS } from '../classical/penguins';
import { computeHist, histogram, linspace } from './histogram';
import { hasModule, runPython } from './pythonOracle';

describe('np.histogram in TypeScript', () => {
  it('works through a hand-checked example', () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    // The last bin includes its right edge; the others do not.
    expect(histogram([0, 0.5, 1, 1, 2], 2)).toEqual({ counts: [2, 3], edges: [0, 1, 2] });
  });
});

describe.skipIf(!hasModule('numpy') || !hasModule('pandas'))('histograms against NumPy', () => {
  it('gives the same counts and edges for every column and bin count the explorer offers', () => {
    const csv = path.resolve(__dirname, '../classical/data/penguins.csv');
    const cases = NUMERIC_COLUMNS.flatMap((c) =>
      Array.from({ length: 39 }, (_, k) => ({ column: c, bins: k + 2 })),
    );
    const out = JSON.parse(
      runPython(`import json
import numpy as np, pandas as pd
p = pd.read_csv(${JSON.stringify(csv)})
out = []
for column, bins in ${JSON.stringify(cases.map((c) => [c.column, c.bins]))}:
    counts, edges = np.histogram(p[column].dropna(), bins=bins)
    out.append([counts.tolist(), edges.tolist()])
print(json.dumps(out))`),
    ) as [number[], number[]][];
    cases.forEach((c, k) => {
      const r = computeHist(c);
      expect(r.counts, `${c.column}, bins=${c.bins}`).toEqual(out[k]![0]);
      expect(r.edges, `${c.column}, bins=${c.bins}`).toEqual(out[k]![1]);
    });
  });
});
