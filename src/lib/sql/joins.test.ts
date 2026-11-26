import { describe, expect, it } from 'vitest';
import { joinSql, joinTables, type FilterPlace, type JoinKind } from './joins';
import { openTestDb } from './testdb';

describe('join explorer', () => {
  it('counts rows as worked out in the lesson', () => {
    expect((['inner', 'left', 'right', 'full'] as JoinKind[]).map((k) => joinTables(k, 'none').rows.length)).toEqual([11, 13, 12, 14]);
    expect(joinTables('left', 'where').rows.length).toBe(8);
    expect(joinTables('left', 'on').rows.length).toBe(11);
    expect(joinTables('left', 'where').removedByWhere).toBe(5);
  });
  it('matches SQLite for every join type and filter placement', async () => {
    const db = await openTestDb('shop');
    for (const kind of ['inner', 'left', 'right', 'full'] as JoinKind[])
      for (const place of ['none', 'on', 'where'] as FilterPlace[]) {
        const sqlite = db.exec(joinSql(kind, place))[0]?.values ?? [];
        const mine = joinTables(kind, place).rows.map((r) => [r.name, r.orderId, r.status]);
        expect(mine, joinSql(kind, place)).toEqual(sqlite);
      }
  });
});
