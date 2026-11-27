import { describe, expect, it } from 'vitest';
import { sessionize, sessionsSql } from './sessions';
import { openTestDb } from './testdb';

describe('session explorer', () => {
  it('gives the numbers quoted in the lesson', () => {
    const t = (m: number) => sessionize(m);
    expect([1, 2, 3, 5, 30, 45].map((m) => t(m).totalSessions)).toEqual([41, 32, 27, 22, 22, 21]);
    expect(t(30).purchaseSessions).toBe(11);
    expect(t(30).conversion).toBe(50);
    expect(t(45).conversion).toBe(52.4);
    const adaFeb = t(30).sessions.filter((x) => x.name === 'Ada' && x.start.startsWith('2026-02-22'));
    expect(adaFeb.map((x) => [x.events, x.carted, x.purchased])).toEqual([[3, true, false], [3, false, true]]);
    expect(t(45).sessions.filter((x) => x.name === 'Ada' && x.start.startsWith('2026-02-22'))).toHaveLength(1);
  });
  it('matches SQLite for every timeout from 1 to 60 minutes', async () => {
    const db = await openTestDb('shop');
    for (let m = 1; m <= 60; m++) {
      const sqlite = db.exec(sessionsSql(m))[0]!.values;
      const mine = sessionize(m).sessions.map((x) => [x.userId, x.sessionNo, x.start, x.end, x.events, Number(x.purchased), Number(x.carted)]);
      expect(mine, `timeout ${m}`).toEqual(sqlite);
    }
  });
});
