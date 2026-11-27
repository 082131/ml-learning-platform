import { describe, expect, it } from 'vitest';
import { CUTOFFS, SIGNUPS, trainingRows, trainingSql } from './mlfeatures';
import { openTestDb } from './testdb';

describe('training table explorer', () => {
  it('uses the shop signup dates', async () => {
    const db = await openTestDb('shop');
    expect(db.exec('SELECT id, signup_date FROM customers ORDER BY id')[0]!.values).toEqual(Object.entries(SIGNUPS).map(([id, d]) => [Number(id), d]));
  });
  it('gives the numbers quoted in the lesson', () => {
    const leaky = trainingRows({ cutoff: '2026-02-01', features: 'leaky' });
    expect(leaky.map((r) => [r.name, r.ordersBefore, r.daysSinceLast, r.label, r.labelInFeatures])).toEqual([
      ['Ada', 3, -21, 1, true],
      ['Ben', 2, -10, 1, true],
      ['Chen', 2, -29, 1, true],
    ]);
    const pit = trainingRows({ cutoff: '2026-03-01', features: 'point-in-time' });
    expect(pit.map((r) => r.label)).toEqual([0, 0, 1, 1, 0, 1]);
    expect(pit.some((r) => r.labelInFeatures)).toBe(false);
  });
  it('matches SQLite for every cutoff and feature mode', async () => {
    const db = await openTestDb('shop');
    for (const cutoff of CUTOFFS)
      for (const features of ['point-in-time', 'leaky'] as const) {
        const s = { cutoff, features };
        const sqlite = db.exec(trainingSql(s))[0]!.values;
        expect(trainingRows(s).map((r) => [r.customerId, r.ordersBefore, r.spendBefore, r.daysSinceLast, r.label]), trainingSql(s)).toEqual(sqlite);
      }
  });
});
