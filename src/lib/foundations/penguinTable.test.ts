import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NUMERIC_COLUMNS, SPECIES } from '../classical/penguins';
import { hasModule, runPython } from './pythonOracle';
import {
  GROUPS,
  ISLANDS,
  STATS,
  computeTable,
  filterText,
  formatValue,
  summaryText,
  type TableState,
} from './penguinTable';

const base: TableState = {
  species: 'all',
  island: 'all',
  by: 'species',
  column: 'body_mass_g',
  stat: 'mean',
};

describe('penguin table explorer', () => {
  it('works through the hand-checked examples', () => {
    const r = computeTable(base);
    expect(r.rows).toHaveLength(344);
    expect(r.groups.map((g) => [g.key, formatValue(g.value, 'mean')])).toEqual([
      ['Adelie', '3700.7'],
      ['Chinstrap', '3733.1'],
      ['Gentoo', '5076.0'],
    ]);
    expect(computeTable({ ...base, by: 'sex', stat: 'count' }).droppedKeys).toBe(11);
    expect(filterText({ ...base, species: 'Gentoo', island: 'Biscoe' })).toBe(
      'penguins[(penguins["species"] == "Gentoo") & (penguins["island"] == "Biscoe")]',
    );
    expect(summaryText(base)).toBe('df.groupby("species")["body_mass_g"].mean()');
  });
});

describe.skipIf(!hasModule('pandas'))('penguin table explorer against pandas', () => {
  it('gives the same rows, groups and values as pandas for every combination of controls', () => {
    const states: TableState[] = (['all', ...SPECIES] as const).flatMap((species) =>
      (['all', ...ISLANDS] as const).flatMap((island) =>
        GROUPS.flatMap((by) =>
          NUMERIC_COLUMNS.flatMap((column) => STATS.map((stat) => ({ species, island, by, column, stat }))),
        ),
      ),
    );
    const csv = path.resolve(__dirname, '../classical/data/penguins.csv');
    const program = `import json, math
import pandas as pd
penguins = pd.read_csv(${JSON.stringify(csv)})
def clean(v):
    v = float(v)
    return None if math.isnan(v) else v
out = []
${states
  .map(
    (s) => `df = ${filterText(s)}
r = ${summaryText(s)}
out.append([len(df), [[None, clean(r)]] if ${s.by === 'none' ? 'True' : 'False'} else [[str(k), clean(v)] for k, v in r.items()], [f"{v:.1f}" if v == v else "NaN" for v in ([r] if ${s.by === 'none' ? 'True' : 'False'} else list(r.values))]])`,
  )
  .join('\n')}
print(json.dumps(out))`;
    const out = JSON.parse(runPython(program)) as [number, [string | null, number | null][], string[]][];
    expect(out).toHaveLength(states.length);
    states.forEach((s, k) => {
      const r = computeTable(s);
      const [n, groups, fixed] = out[k]!;
      const label = `${filterText(s)} then ${summaryText(s)}`;
      expect(r.rows.length, label).toBe(n);
      expect(
        r.groups.map((g) => g.key),
        label,
      ).toEqual(groups.map((g) => g[0]));
      r.groups.forEach((g, i) => {
        const want = groups[i]![1];
        if (want === null) expect(g.value, label).toBeNull();
        else expect(Math.abs(g.value! - want), label).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(want)));
        if (s.stat === 'mean') expect(formatValue(g.value, 'mean'), label).toBe(fixed[i]);
      });
    });
  });
});
