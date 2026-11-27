import { describe, expect, it } from 'vitest';
import { hasColumns, orderIs, rowCount, sameRows } from './checks';
import { gradeScript } from './engine';
import { openTestDb } from './testdb';

const ref = "SELECT name, category, price FROM products WHERE category IN ('home', 'stationery') AND price BETWEEN 5 AND 15";
const checks = [rowCount(3), hasColumns(['name', 'category', 'price']), sameRows(['name', 'price'], ref), orderIs('name', ['Poster', 'Mug', 'Pen set'])];
const grade = async (sql: string) => gradeScript(await openTestDb('shop'), '', sql, checks).checks.map((c) => (c.ok ? 'ok' : c.why));

describe('check builders', () => {
  it('pass the reference answer', async () => {
    expect(await grade(`${ref} ORDER BY price DESC;`)).toEqual(['ok', 'ok', 'ok', 'ok']);
  });
  it('explain what is wrong', async () => {
    expect(await grade(`${ref} ORDER BY price;`)).toEqual(['ok', 'ok', 'ok', 'expected name in the order Poster, Mug, Pen set, got Pen set, Mug, Poster']);
    expect(await grade('SELECT name FROM products ORDER BY price DESC;')).toEqual([
      'expected 3 rows, got 7',
      'the result needs the columns name, category, price (name them with AS)',
      'expected 3 rows, got 7',
      'expected name in the order Poster, Mug, Pen set, got Headphones, Desk lamp, Charger, Poster, Mug, Pen set, Notebook',
    ]);
    const wrongRows = await grade("SELECT name, category, price FROM products WHERE price BETWEEN 5 AND 32 ORDER BY price DESC LIMIT 3;");
    expect(wrongRows[2]).toBe('some rows are not in the expected answer');
  });
  it('compare numbers rounded', async () => {
    const r = gradeScript(await openTestDb('shop'), '', 'SELECT 17.666666 AS x;', [sameRows(['x'], 'SELECT 17.67 AS x')]);
    expect(r.checks[0]!.ok).toBe(true);
  });
});

describe('someRowLike', () => {
  it('passes when a plan row matches and fails with the reason otherwise', async () => {
    const { someRowLike } = await import('./checks');
    const db = await openTestDb('shop');
    const covering = someRowLike('detail', '%COVERING INDEX%', 'no covering index', 'covering');
    const noSort = someRowLike('detail', '%TEMP B-TREE%', 'still sorts', 'no sort', false);
    const plan = 'CREATE INDEX i ON orders (customer_id, order_date);\nEXPLAIN QUERY PLAN SELECT order_date FROM orders WHERE customer_id = 1 ORDER BY order_date;';
    const r = gradeScript(db, '', plan, [covering, noSort]);
    expect(r.checks.map((c) => c.ok)).toEqual([true, true]);
    const bad = gradeScript(await openTestDb('shop'), '', 'EXPLAIN QUERY PLAN SELECT order_date FROM orders WHERE customer_id = 1 ORDER BY order_date;', [covering, noSort]);
    expect(bad.checks.map((c) => c.why)).toEqual(['no covering index', 'still sorts']);
  });
});
