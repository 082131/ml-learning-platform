// Runs every SQL example, CTE walk-through and exercise of the SQL track in SQLite (sql.js, the engine the
// browser uses) and checks the numbers the lessons quote. Exercise solutions must pass every check and starters
// must fail at least one.
import { describe, expect, it } from 'vitest';
import { composeCte } from '@/lib/sql/cte';
import { gradeScript, runScript } from '@/lib/sql/engine';
import { openTestDb } from '@/lib/sql/testdb';
import type { SqlCteExample, SqlExample, SqlExerciseDef, SqlValue } from '@/lib/sql/types';

const code = import.meta.glob<Record<string, unknown>>('./*/*/code.ts', { eager: true });
const quiz = import.meta.glob<Record<string, unknown>>('./*/*/quiz.ts', { eager: true });
const values = (mods: Record<string, Record<string, unknown>>) =>
  Object.entries(mods).flatMap(([file, m]) => Object.values(m).map((v) => [file.split('/').slice(1, 3).join('/'), v] as const));
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const examples = values(code).filter((e): e is [string, SqlExample] => isObj(e[1]) && 'dataset' in e[1] && typeof e[1].source === 'string');
const ctes = values(code).filter((e): e is [string, SqlCteExample] => isObj(e[1]) && 'dataset' in e[1] && Array.isArray(e[1].steps));
const exercises = values({ ...quiz, ...code }).filter((e): e is [string, SqlExerciseDef] => isObj(e[1]) && 'dataset' in e[1] && Array.isArray(e[1].checks));

/** The result sets of one example, keyed for the claims below. */
const results = new Map<string, SqlValue[][][]>();
const runExample = async (ex: SqlExample) => {
  const r = runScript(await openTestDb(ex.dataset), ex.source, 1000);
  results.set(ex.id, r.statements.filter((s) => s.columns.length > 0).map((s) => s.rows));
  return r;
};

describe('SQL track examples run in SQLite', () => {
  it('found the examples', () => expect(examples.length).toBeGreaterThan(5));
  for (const [file, ex] of examples)
    it(`${file}: ${ex.id}`, async () => {
      const r = await runExample(ex);
      expect(r.message ?? '', ex.source).toBe(ex.expectError ?? '');
    }, 30_000);
  for (const [file, ex] of ctes)
    it(`${file}: ${ex.id} (every step)`, async () => {
      const db = await openTestDb(ex.dataset);
      for (let i = 0; i <= ex.steps.length; i++) {
        const sql = composeCte(ex, i === ex.steps.length ? undefined : i);
        expect(runScript(db, sql).message ?? '', sql).toBe('');
      }
    });
  it('example ids are unique', () => {
    const ids = [...examples, ...ctes].map(([, e]) => e.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

describe('SQL exercises', () => {
  for (const [file, ex] of exercises)
    it(`${file}: ${ex.id}: the solution passes and the starter does not`, async () => {
      const sol = gradeScript(await openTestDb(ex.dataset), '', ex.solution, ex.checks);
      expect(sol.checks.filter((c) => !c.ok)).toEqual([]);
      const start = gradeScript(await openTestDb(ex.dataset), '', ex.starter, ex.checks);
      expect(start.checks.some((c) => !c.ok)).toBe(true);
    });
});

/** Numbers the prose states, checked against the real results. */
const claims: Record<string, (sets: SqlValue[][][]) => void> = {
  'select-star': ([rows]) => expect(rows!.length).toBe(8),
  londoners: ([rows]) => expect(rows!.map((r) => r[0])).toEqual(['Ada', 'Chen', 'Hana']),
  'vat-prices': ([rows]) => expect(rows).toEqual([['Desk lamp', 32, 38.4], ['Poster', 12, 14.4], ['Mug', 9, 10.8]]),
  'february-orders': ([rows]) => expect(rows!.map((r) => r[0])).toEqual([105, 106, 107, 108, 109]),
  'distinct-cities': ([rows]) => expect(rows).toEqual([[null], ['Berlin'], ['London'], ['Paris']]),
  'alias-in-where': ([top, where]) => {
    expect(top!.map((r) => r[0])).toEqual(['Headphones', 'Desk lamp', 'Charger']);
    expect(where!.map((r) => r[0])).toEqual(['Desk lamp', 'Headphones']);
  },
  'null-arithmetic': ([rows]) => expect(rows).toEqual([[null, null, 1, null, null]]),
  'city-counts': ([rows]) => expect(rows).toEqual([[3, 4, 1, 8]]),
  'not-london': ([rows]) => expect(rows!.map((r) => r[0])).toEqual(['Ben', 'Dana', 'Eli', 'Fay', 'Gus']),
  'price-bands': ([rows]) => expect(rows!.map((r) => r[2])).toEqual(['premium', 'premium', 'mid', 'mid', 'budget', 'budget', 'budget']),
  'case-order': ([rows]) => expect(rows!.slice(0, 2).map((r) => r[2])).toEqual(['mid', 'mid']),
  'case-null': ([rows]) => expect(rows![5]).toEqual(['Fay', 'EU', 'missing']),
  'number-traps': ([rows]) => expect(rows).toEqual([[3, 3.5, 3.5, null, null, 1, 0]]),
  'order-totals': ([rows]) => {
    expect(rows![0]).toEqual([101, 2, 3, 14.5]);
    expect(rows!.length).toBe(12);
  },
  'count-kinds': ([rows]) => expect(rows).toEqual([[8, 7, 3]]),
  'avg-and-null': ([rows]) => expect(rows).toEqual([[20, 15, 3, 4]]),
  'orders-per-customer': ([rows]) => expect(rows![0]).toEqual([null, 1]),
  'where-vs-having': ([rows]) => expect(rows).toEqual([[1, 3], [4, 2]]),
  'monthly-pivot': ([rows]) => expect(rows![1]).toEqual(['2026-02', 6, 4, 66.7]),
  'bare-column': ([, fixed]) => expect(fixed![0]).toEqual([1, '2026-01-06', '2026-02-22', 3]),
  'inner-join': ([rows]) => expect(rows!.length).toBe(11),
  'left-join': ([rows]) => {
    expect(rows!.length).toBe(13);
    expect(rows!.slice(-2)).toEqual([['Gus', null], ['Hana', null]]);
  },
  'filter-placement': ([wrong, right]) => {
    expect(wrong!.map((r) => r[0])).toEqual(['Ada', 'Ben', 'Chen', 'Dana', 'Eli']);
    expect(right!.slice(-3)).toEqual([['Fay', 0], ['Gus', 0], ['Hana', 0]]);
  },
  'three-tables': ([rows]) => expect(rows).toEqual([['electronics', 3, 152], ['home', 4, 100], ['stationery', 4, 46]]),
  'self-join': ([rows]) => expect(rows![0]).toEqual(['Rosa', 'exec', null]),
  'cross-join': ([rows]) => expect(rows!.length).toBe(9),
  'full-join': ([rows]) => expect(rows).toEqual([['Gus', null], ['Hana', null], [null, 109]]),
  'fanout-bug': ([rows]) => expect(rows).toEqual([[105, 2, 31, 62], [107, 4, 82, 82], [110, 4, 148, 148]]),
  'fanout-fix': ([rows]) => expect(rows).toEqual([[105, 31, 31], [107, 41, 41], [110, 74, 74]]),
  'join-duplicates': ([rows]) => expect(rows!.map((r) => r[0])).toEqual(['Ben', 'Ben', 'Chen', 'Chen', 'Dana']),
  'semi-join': ([rows]) => expect(rows!.map((r) => r[0])).toEqual(['Ben', 'Chen', 'Dana']),
  'anti-join': ([noOrders, neverSold]) => {
    expect(noOrders!.map((r) => r[0])).toEqual(['Gus', 'Hana']);
    expect(neverSold).toEqual([['Poster']]);
  },
  'not-in-trap': ([count, fixed]) => {
    expect(count).toEqual([[0]]);
    expect(fixed!.map((r) => r[0])).toEqual(['Gus', 'Hana']);
  },
  'scalar-subquery': ([rows]) => expect(rows).toEqual([['Headphones', 59, 20.21], ['Desk lamp', 32, 20.21]]),
  'correlated-subquery': ([rows]) => expect(rows!.map((r) => [r[0], r[3]])).toEqual([['Headphones', 39], ['Desk lamp', 17.67], ['Pen set', 5.25]]),
  'per-row-count': ([rows]) => expect(rows!.slice(-2)).toEqual([['Gus', 0], ['Hana', 0]]),
  'count-to-five': ([rows]) => expect(rows).toEqual([[1], [2], [3], [4], [5]]),
  'org-chart': ([rows]) => expect(rows!.map((r) => r[0])).toEqual(['Rosa', 'Sam', 'Uma', 'Xia', 'Vic', 'Tara', 'Wen']),
  'chain-up': ([rows]) => expect(rows!.map((r) => r[0])).toEqual(['Xia', 'Uma', 'Sam', 'Rosa']),
  'team-size': ([rows]) => expect(rows).toEqual([[3, 460]]),
  'date-spine': ([rows]) => {
    expect(rows!.length).toBe(28);
    expect(rows!.filter((r) => r[1] !== 0).length).toBe(6);
  },
  'runaway-guard': ([rows]) => expect(rows).toEqual([[1000, 1000]]),
  'group-vs-window': ([grouped, windowed]) => {
    expect(grouped).toEqual([['2026-01', 3, 91.5], ['2026-02', 6, 185], ['2026-03', 3, 132.5]]);
    expect(windowed!.length).toBe(12);
    expect(windowed![1]).toEqual([102, '2026-01', 59, 91.5, 64.5]);
  },
  'three-ranks': ([rows]) => expect(rows!.slice(0, 4).map((r) => r.slice(2))).toEqual([[1, 1, 1], [2, 2, 2], [3, 2, 2], [4, 4, 3]]),
  'top-two-per-category': ([rows]) => expect(rows!.map((r) => r[1])).toEqual(['Headphones', 'Charger', 'Desk lamp', 'Poster', 'Pen set', 'Notebook']),
  'first-orders': ([rows]) => expect(rows!.map((r) => r[1])).toEqual([101, 102, 104, 105, 107, 111]),
  'quartiles': ([rows]) => expect(rows!.map((r) => r[2])).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]),
  'running-total': ([rows]) => {
    expect(rows!.map((r) => r[3]).slice(0, 3)).toEqual([14.5, 73.5, 91.5]);
    expect(rows![5]![3]).toBe(213.5);
    expect(rows![11]![3]).toBe(409);
  },
  'range-vs-rows': ([rows]) => {
    expect(rows!.slice(0, 3).map((r) => [r[3], r[4]])).toEqual([[91.5, 14.5], [91.5, 73.5], [91.5, 91.5]]);
    expect(rows!.slice(3, 9).map((r) => r[3])).toEqual([276.5, 276.5, 276.5, 276.5, 276.5, 276.5]);
    expect(rows!.slice(3, 6).map((r) => r[4])).toEqual([123.5, 154.5, 213.5]);
  },
  'moving-average': ([rows]) => expect(rows!.map((r) => r[3])).toEqual([14.5, 36.75, 30.5, 36.33, 27, 40.67, 43.67, 37.67, 21, 32, 34.33, 44.17]),
  'month-over-month': ([rows]) => expect(rows).toEqual([['2026-01', 91.5, null, null], ['2026-02', 185, 91.5, 102.2], ['2026-03', 132.5, 185, -28.4]]),
  'days-to-next': ([rows]) => {
    expect(rows!.filter((r) => r[0] === 1).map((r) => r[4])).toEqual([22, 25, null]);
    expect(rows!.length).toBe(11);
  },
};

describe('CTE walk-through claims', () => {
  it('above-average spenders: 13 lines, 5 customers, average 57.80, three above it', async () => {
    const ex = ctes.find(([, e]) => e.id === 'above-average-spenders')![1];
    const db = await openTestDb('shop');
    const rows = (i?: number) => runScript(db, composeCte(ex, i)).statements[0]!.rows;
    expect(rows(0).length).toBe(13);
    expect(rows(1).length).toBe(5);
    expect(rows(2)).toEqual([[57.8]]);
    expect(rows()).toEqual([['Chen', 74, 57.8], ['Dana', 69.5, 57.8], ['Ben', 59, 57.8]]);
  });
});

describe('claims in the lesson prose', () => {
  for (const [id, check] of Object.entries(claims))
    it(id, async () => {
      const ex = examples.find(([, e]) => e.id === id)?.[1];
      expect(ex, `no example ${id}`).toBeDefined();
      if (!results.has(id)) await runExample(ex!);
      check(results.get(id)!);
    });
});
