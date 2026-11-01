import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/sql-query-python.json';
import {
  buildQuery,
  pythonPrintout,
  runQuery,
  SQL_SOURCE,
  sqlExperiment,
  sqlSlots,
  WHERE,
  type GroupKey,
  type OrderKey,
  type WhereKey,
} from './sqlQuery';

describe('runQuery', () => {
  it('works through a hand-checked GROUP BY: totals per city', () => {
    const r = runQuery({ where: 'none', group: 'city', order: 'big' });
    // Oslo 12 + 25 + 20 = 57, Leeds 30 + 15 + 9 = 54, Austin 8 + 40 = 48.
    expect(r.groups.map((g) => [g.key, g.orders, g.total])).toEqual([
      ['Oslo', 3, 57],
      ['Leeds', 3, 54],
      ['Austin', 2, 48],
    ]);
  });

  it('filters before grouping', () => {
    const r = runQuery({ where: 'min15', group: 'city', order: 'name' });
    // amount >= 15 keeps 30, 25, 15, 20, 40: Austin 40, Leeds 30 + 15, Oslo 25 + 20.
    expect(r.kept).toEqual([2, 3, 5, 6, 7]);
    expect(r.groups.map((g) => [g.key, g.total])).toEqual([
      ['Austin', 40],
      ['Leeds', 45],
      ['Oslo', 45],
    ]);
  });

  it('prints exactly what the lesson’s Python prints, for every combination', () => {
    const table = python as Record<string, { query: string; printed: string }>;
    let n = 0;
    for (const where of Object.keys(WHERE) as WhereKey[])
      for (const group of ['none', 'city', 'product'] as GroupKey[])
        for (const order of ['none', 'big', 'name'] as OrderKey[]) {
          const want = table[`${where},${group},${order}`]!;
          const state = { where, group, order };
          expect(buildQuery(state)).toBe(want.query);
          expect(pythonPrintout(runQuery(state))).toBe(want.printed);
          n++;
        }
    expect(n).toBe(36);
  });
});

describe('sqlExperiment', () => {
  it('is valid, and the slot fills the query line', () => {
    const def = sqlExperiment('sql');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(SQL_SOURCE, [], sqlSlots(def.initial));
    expect(source).toContain('query = "SELECT id, city, product, amount FROM sales WHERE amount >= 15"');
  });

  it('embeds SQL_SOURCE verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/sql_query.py?raw')).default;
    expect(script).toContain(`SOURCE = """${SQL_SOURCE}"""`);
  });
});
