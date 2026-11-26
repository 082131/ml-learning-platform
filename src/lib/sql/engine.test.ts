import { describe, expect, it } from 'vitest';
import { checkVerdict, formatValue, gradeScript, runScript, uniqueColumns } from './engine';
import { BIG_ORDERS } from './datasets';
import { openTestDb } from './testdb';

describe('runScript', () => {
  it('keeps every statement, with result sets and row counts', async () => {
    const db = await openTestDb();
    const r = runScript(db, 'CREATE TABLE t (x); INSERT INTO t VALUES (1), (2), (3); SELECT x * 2 AS y FROM t;');
    expect(r.status).toBe('ok');
    expect(r.statements.map((s) => s.changes)).toEqual([0, 3, undefined]);
    expect(r.statements[2]).toMatchObject({ columns: ['y'], rows: [[2], [4], [6]] });
  });
  it('stops at a syntax error and names the statement', async () => {
    const db = await openTestDb();
    const r = runScript(db, 'SELECT 1;\nSELEC 2;\nSELECT 3;');
    expect(r.status).toBe('error');
    expect(r.statements).toHaveLength(1);
    expect(r.message).toBe('near "SELEC": syntax error');
    expect(r.failedSql).toBe('SELEC 2;');
  });
  it('reports runtime errors on the statement that raised them', async () => {
    const db = await openTestDb('shop');
    const r = runScript(db, 'SELECT nam FROM customers;');
    expect(r.message).toBe('no such column: nam');
  });
  it('cuts long results but runs them to the end', async () => {
    const db = await openTestDb();
    const r = runScript(db, 'WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 500) SELECT i FROM n;', 10);
    expect(r.statements[0]!.rows).toHaveLength(10);
    expect(r.statements[0]!.truncated).toBe(true);
  });
});

describe('grading', () => {
  const checks = [
    { name: 'three rows', tests: "SELECT CASE WHEN COUNT(*) = 3 THEN 'ok' ELSE 'expected 3 rows, got ' || COUNT(*) END FROM answer" },
    { name: 'London first', tests: "SELECT name = 'Ada' FROM answer WHERE _row = 1" },
  ];
  it('passes a correct query and explains a wrong one', async () => {
    const good = gradeScript(await openTestDb('shop'), '', "SELECT name FROM customers WHERE city = 'London' ORDER BY id;", checks);
    expect(good.checks.map((c) => c.ok)).toEqual([true, true]);
    const bad = gradeScript(await openTestDb('shop'), '', 'SELECT name FROM customers ORDER BY id DESC;', checks);
    expect(bad.checks).toEqual([
      { name: 'three rows', ok: false, why: 'expected 3 rows, got 8' },
      { name: 'London first', ok: false },
    ]);
  });
  it('fails every check when the SQL does not run', async () => {
    const r = gradeScript(await openTestDb('shop'), '', 'SELECT FROM;', checks);
    expect(r.status).toBe('error');
    expect(r.checks.every((c) => !c.ok && c.why?.startsWith('Your SQL failed'))).toBe(true);
  });
  it('stores repeated column names under unique names', () => {
    expect(uniqueColumns(['id', 'name', 'id', 'ID'])).toEqual(['id', 'name', 'id_2', 'ID_3']);
  });
  it('reads verdicts', () => {
    expect(checkVerdict(1)).toEqual({ ok: true });
    expect(checkVerdict('ok')).toEqual({ ok: true });
    expect(checkVerdict(0)).toEqual({ ok: false });
    expect(checkVerdict('wrong total')).toEqual({ ok: false, why: 'wrong total' });
  });
});

describe('datasets', () => {
  it('loads the shop with the row counts the lessons quote', async () => {
    const db = await openTestDb('shop');
    const counts = db.exec(
      `SELECT (SELECT COUNT(*) FROM customers), (SELECT COUNT(*) FROM products), (SELECT COUNT(*) FROM orders),
              (SELECT COUNT(*) FROM order_items), (SELECT COUNT(*) FROM payments), (SELECT COUNT(*) FROM employees),
              (SELECT COUNT(*) FROM events), (SELECT COUNT(*) FROM customer_updates), (SELECT COUNT(*) FROM logins)`,
    )[0]!.values[0];
    expect(counts).toEqual([8, 7, 12, 17, 12, 7, 74, 7, 12]);
  });
  it('payments match the order totals of paid orders', async () => {
    const db = await openTestDb('shop');
    const rows = db.exec(`SELECT o.id FROM orders o
      JOIN (SELECT order_id, SUM(quantity * unit_price) t FROM order_items GROUP BY order_id) i ON i.order_id = o.id
      LEFT JOIN (SELECT order_id, SUM(amount) p FROM payments GROUP BY order_id) p ON p.order_id = o.id
      WHERE p.p IS NOT i.t`)[0]?.values.flat();
    expect(rows).toEqual([104, 111]); // cancelled and pending orders were never paid
  });
  it('generates big_orders deterministically', async () => {
    const db = await openTestDb('shop-big');
    const [n, min, max] = db.exec('SELECT COUNT(*), MIN(order_date), MAX(order_date) FROM big_orders')[0]!.values[0]!;
    expect([n, min, max]).toEqual([BIG_ORDERS, '2025-01-01', '2026-12-31']);
  }, 30_000);
  it('runs SQLite 3.54', async () => {
    expect(formatValue((await openTestDb()).exec('SELECT sqlite_version()')[0]!.values[0]![0]!)).toBe('3.54.1');
  });
});

describe('formatValue', () => {
  it('spells out NULL and trims float noise', () => {
    expect([formatValue(null), formatValue(0.1 + 0.2), formatValue(3), formatValue('a')]).toEqual(['NULL', '0.3', '3', 'a']);
  });
});
