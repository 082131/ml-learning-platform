import { describe, expect, it } from 'vitest';
import { EMPLOYEES, recurse, recursionSql, type Direction } from './recursion';
import { openTestDb } from './testdb';

describe('recursive CTE trace', () => {
  it('walks Rosa’s organisation in 4 productive iterations and one empty one', () => {
    const r = recurse('Rosa', 'down');
    expect(r.iterations.map((it) => it.map((x) => x.name))).toEqual([['Rosa'], ['Sam', 'Tara'], ['Uma', 'Vic', 'Wen'], ['Xia'], []]);
  });
  it('matches SQLite for every start and direction', async () => {
    const db = await openTestDb('shop');
    for (const p of EMPLOYEES)
      for (const dir of ['down', 'up'] as Direction[]) {
        const sqlite = db.exec(recursionSql(p.name, dir))[0]!.values.map((r) => `${r[0]}:${r[1]}`).sort();
        const mine = recurse(p.name, dir).iterations.flat().map((x) => `${x.name}:${x.level}`).sort();
        expect(mine, `${p.name} ${dir}`).toEqual(sqlite);
      }
  });
});
