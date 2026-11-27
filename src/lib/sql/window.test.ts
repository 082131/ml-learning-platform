import { describe, expect, it } from 'vitest';
import { computeWindow, W_ORDERS, windowSql, type WindowFn, type WindowSpec } from './window';
import { openTestDb } from './testdb';

const base: WindowSpec = { fn: 'rank', partition: 'none', orderKey: 'total', frame: 'range', preceding: 2 };

describe('window explorer', () => {
  it('works through the lesson examples by hand', () => {
    const rank = computeWindow(base);
    expect(rank.slice(0, 4).map((r) => [r.id, r.value])).toEqual([[110, 1], [102, 2], [106, 2], [107, 4]]);
    const dense = computeWindow({ ...base, fn: 'dense_rank' });
    expect(dense[3]!.value).toBe(3);
    const range = computeWindow({ ...base, fn: 'running_sum', orderKey: 'month', frame: 'range' });
    const rows = computeWindow({ ...base, fn: 'running_sum', orderKey: 'month', frame: 'rows' });
    expect(range.slice(0, 3).map((r) => r.value)).toEqual([91.5, 91.5, 91.5]);
    expect(rows.slice(0, 3).map((r) => r.value)).toEqual([14.5, 73.5, 91.5]);
  });
  it('totals match the shop tables', async () => {
    const db = await openTestDb('shop');
    expect(db.exec('SELECT id, order_date, total FROM order_totals ORDER BY id')[0]!.values).toEqual(W_ORDERS.map((o) => [o.id, o.orderDate, o.total]));
  });
  it('matches SQLite for every function, partition, order and frame', async () => {
    const db = await openTestDb('shop');
    const fns: WindowFn[] = ['row_number', 'rank', 'dense_rank', 'partition_sum', 'running_sum', 'moving_avg', 'lag', 'lead'];
    for (const fn of fns)
      for (const partition of ['none', 'month'] as const)
        for (const orderKey of ['total', 'order_date', 'month'] as const)
          for (const frame of ['rows', 'range'] as const)
            for (const preceding of [1, 2, 3]) {
              const s = { fn, partition, orderKey, frame, preceding };
              const sqlite = db.exec(windowSql(s))[0]!.values;
              const mine = computeWindow(s);
              // ROW_NUMBER, LAG and LEAD number tied rows in an unspecified order; compare those per tie group.
              const tieSensitive = ['row_number', 'lag', 'lead', 'moving_avg'].includes(fn) || (fn === 'running_sum' && frame === 'rows');
              if (tieSensitive && orderKey !== 'order_date') {
                const group = (rows: { key: string; v: unknown }[]) => {
                  const m = new Map<string, unknown[]>();
                  for (const r of rows) m.set(r.key, [...(m.get(r.key) ?? []), r.v]);
                  return [...m.entries()].map(([k, v]) => [k, v.map(String).sort()]).sort();
                };
                const k = (month: unknown, date: unknown, total: unknown) => `${partition === 'month' ? month : ''}|${orderKey === 'total' ? total : orderKey === 'month' ? month : date}`;
                expect(group(mine.map((r) => ({ key: k(r.month, r.orderDate, r.total), v: r.value }))), windowSql(s)).toEqual(
                  group(sqlite.map((r) => ({ key: k(r[1], r[2], r[3]), v: r[4] }))),
                );
              } else expect(mine.map((r) => [r.id, r.value]), windowSql(s)).toEqual(sqlite.map((r) => [r[0], r[4]]));
            }
  });
});
