import { describe, expect, it } from 'vitest';
import { CUSTOMER_CITIES, NULL_CONDITIONS, nullFilter, tvAnd, tvOr } from './nulls';
import { openTestDb } from './testdb';

describe('three-valued logic', () => {
  it('follows the SQL truth tables', () => {
    expect([tvAnd(null, 0), tvAnd(null, 1), tvOr(null, 1), tvOr(null, 0)]).toEqual([0, null, 1, null]);
  });
  it('drops UNKNOWN rows: = and <> together miss Fay', () => {
    expect(nullFilter('eq').kept + nullFilter('ne').kept).toBe(7);
    expect(nullFilter('distinct').kept).toBe(5);
    expect(nullFilter('not-in').kept).toBe(0);
  });
  it('matches SQLite for every condition and customer', async () => {
    const db = await openTestDb('shop');
    const names = db.exec('SELECT name, city FROM customers ORDER BY id')[0]!.values;
    expect(names).toEqual(CUSTOMER_CITIES.map((c) => [c.name, c.city]));
    for (const c of NULL_CONDITIONS) {
      const sqlite = db.exec(`SELECT ${c.sql} FROM customers ORDER BY id`)[0]!.values.map((r) => r[0]);
      expect(nullFilter(c.id).rows.map((r) => r.value), c.sql).toEqual(sqlite);
    }
  });
});
