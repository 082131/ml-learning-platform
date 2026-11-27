import { describe, expect, it } from 'vitest';
import { INDEX_CHOICES, INDEX_QUERIES, PLANS, type IndexChoice, type IndexQuery } from './indexlab';
import { openTestDb } from './testdb';

const PRED: Record<string, string> = {
  'customer_id=?': 'customer_id = 4242',
  'country=?': "country = 'DE'",
  'order_date>?': "order_date >= '2026-12-01'",
  'order_date<?': "order_date < '2027-01-01'",
};

describe('index explorer data', () => {
  it('matches SQLite for every query and index', async () => {
    for (const index of Object.keys(INDEX_CHOICES) as IndexChoice[]) {
      const db = await openTestDb('shop-big');
      const cols = INDEX_CHOICES[index].columns;
      if (cols) db.exec(`CREATE INDEX idx ON big_orders ${cols}`);
      for (const query of Object.keys(INDEX_QUERIES) as IndexQuery[]) {
        const sql = INDEX_QUERIES[query].sql;
        const plan = db.exec(`EXPLAIN QUERY PLAN ${sql}`)[0]!.values.map((r) => r[3]).join(' | ');
        const constraint = plan.match(/\(([^)]*)\)$/);
        const entries = plan.startsWith('SCAN') ? 200_000 : (db.exec(`SELECT COUNT(*) FROM big_orders WHERE ${constraint![1]!.split(' AND ').map((c) => PRED[c]).join(' AND ')}`)[0]!.values[0]![0] as number);
        const where = sql.slice(sql.indexOf('WHERE'));
        const matching = db.exec(`SELECT COUNT(*) FROM big_orders ${where}`)[0]!.values[0]![0];
        expect(PLANS[query][index], `${query} with ${index}`).toEqual({ plan, entries, fetched: plan.includes('COVERING') ? 0 : entries, matching });
      }
      db.close();
    }
  }, 60_000);
});
