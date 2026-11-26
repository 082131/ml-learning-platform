import { describe, expect, it } from 'vitest';
import { runScript } from './engine';
import { finalRows, groupedPipeline, groupedSql, plainPipeline, plainSql } from './pipeline';
import { openTestDb } from './testdb';

describe('query pipeline', () => {
  it('works through the lesson example by hand', () => {
    const st = plainPipeline({ minPrice: 10, limit: 2, minCount: 1 });
    expect(st.map((x) => x.out)).toEqual([7, 4, 4, 4, 2]);
    expect(finalRows(st)).toEqual([['Headphones', 59], ['Desk lamp', 32]]);
    const g = groupedPipeline({ minPrice: 5, limit: 1, minCount: 2 });
    expect(g.map((x) => x.out)).toEqual([7, 6, 3, 2, 2, 2]);
    expect(finalRows(g)).toEqual([['home', 3, 17.67], ['electronics', 2, 39]]);
  });
  it('matches SQLite for every control setting', async () => {
    const db = await openTestDb('shop');
    for (let minPrice = 0; minPrice <= 60; minPrice += 1)
      for (let k = 1; k <= 7; k++) {
        const s = { minPrice, limit: k, minCount: Math.min(k, 3) };
        const plain = runScript(db, plainSql(s)).statements[0]!.rows;
        expect(finalRows(plainPipeline(s)), plainSql(s)).toEqual(plain);
        const grouped = runScript(db, groupedSql(s)).statements[0]!.rows.map((r) => [r[0], r[1], Math.round((r[2] as number) * 100) / 100]);
        expect(finalRows(groupedPipeline(s)), groupedSql(s)).toEqual(grouped);
      }
  });
});
