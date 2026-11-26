import { describe, expect, it } from 'vitest';
import { fanout, fanoutSql } from './fanout';
import { openTestDb } from './testdb';

describe('fan-out', () => {
  it('multiplies each sum by the size of the other side', () => {
    const r = fanout({ items: 2, payments: 3, method: 'join-both' });
    expect([r.pairs.length, r.trueItems, r.reportedItems, r.truePaid, r.reportedPaid]).toEqual([6, 40, 120, 40, 80]);
  });
  it('matches SQLite for every setting', async () => {
    for (let k = 1; k <= 4; k++)
      for (let m = 1; m <= 4; m++)
        for (const method of ['join-both', 'pre-aggregate'] as const) {
          const r = fanout({ items: k, payments: m, method });
          const db = await openTestDb();
          db.exec('CREATE TABLE orders (id INTEGER); INSERT INTO orders VALUES (1); CREATE TABLE items (order_id, value); CREATE TABLE payments (order_id, amount);');
          r.itemValues.forEach((v) => db.run('INSERT INTO items VALUES (1, ?)', [v]));
          r.paymentValues.forEach((v) => db.run('INSERT INTO payments VALUES (1, ?)', [v]));
          const row = db.exec(fanoutSql({ items: k, payments: m, method }))[0]!.values[0]!;
          expect([row[1], row[2], Math.round((row[3] as number) * 100) / 100]).toEqual([r.pairs.length, r.reportedItems, r.reportedPaid]);
        }
  });
});
