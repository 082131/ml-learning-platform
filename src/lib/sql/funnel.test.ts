import { describe, expect, it } from 'vitest';
import { EVENTS, formatOffset, funnel, funnelSql, type FunnelWindow } from './funnel';
import { openTestDb } from './testdb';

const WINDOWS: FunnelWindow[] = ['1h', '1d', '7d', '30d', 'any'];

describe('funnel explorer', () => {
  it('reads all 74 events from the shop dataset', async () => {
    expect(EVENTS).toHaveLength(74);
    const db = await openTestDb('shop');
    expect(db.exec('SELECT id, user_id, event_time, event FROM events ORDER BY id')[0]!.values).toEqual(EVENTS.map((e) => [e.id, e.userId, e.time, e.event]));
  });
  it('gives the numbers quoted in the lesson', () => {
    const v = (w: FunnelWindow) => funnel({ window: w, count: 'users' }).steps.map((s) => s.value);
    expect(v('1h')).toEqual([8, 7, 5, 3, 3]);
    expect(v('1d')).toEqual([8, 7, 5, 3, 3]);
    expect(v('7d')).toEqual([8, 7, 5, 4, 4]);
    expect(v('any')).toEqual([8, 8, 7, 6, 6]);
    expect(funnel({ window: 'any', count: 'events' }).steps.map((s) => s.value)).toEqual([21, 17, 14, 11, 11]);
    const eli = funnel({ window: '1d', count: 'users' }).users.find((u) => u.name === 'Eli')!;
    expect(eli.reached.slice(2)).toEqual([2, null, null]);
    expect(formatOffset(eli.reachedAnyTime[3]!)).toBe('+34 h');
  });
  it('matches SQLite for every window and count', async () => {
    const db = await openTestDb('shop');
    for (const count of ['users', 'events'] as const)
      for (const window of WINDOWS) {
        const s = { window, count };
        const sqlite = db.exec(funnelSql(s))[0]!.values;
        expect(funnel(s).steps.map((x) => [x.step, x.value, x.pctPrevious, x.pctFirst]), funnelSql(s)).toEqual(sqlite.map((r) => r.slice(1)));
      }
  });
});
