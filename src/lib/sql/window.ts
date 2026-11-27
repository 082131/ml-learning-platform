// Window functions computed in TypeScript for the window explorer, over the 12 orders of the shop with their
// totals. window.test.ts checks every function, partition and frame against SQLite.

export interface WOrder {
  id: number;
  customer: string;
  month: string;
  orderDate: string;
  total: number;
}

/** Each order of the shop dataset with its total (sum of its lines). */
export const W_ORDERS: WOrder[] = [
  [101, 'Ada', '2026-01-06', 14.5],
  [102, 'Ben', '2026-01-15', 59],
  [103, 'Ada', '2026-01-28', 18],
  [104, 'Chen', '2026-02-03', 32],
  [105, 'Dana', '2026-02-05', 31],
  [106, 'Ben', '2026-02-11', 59],
  [107, 'Eli', '2026-02-16', 41],
  [108, 'Ada', '2026-02-22', 13],
  [109, 'guest', '2026-02-25', 9],
  [110, 'Chen', '2026-03-02', 74],
  [111, 'Fay', '2026-03-04', 20],
  [112, 'Dana', '2026-03-09', 38.5],
].map(([id, customer, orderDate, total]) => ({
  id: id as number,
  customer: customer as string,
  orderDate: orderDate as string,
  month: (orderDate as string).slice(0, 7),
  total: total as number,
}));

export type WindowFn = 'row_number' | 'rank' | 'dense_rank' | 'partition_sum' | 'running_sum' | 'moving_avg' | 'lag' | 'lead';

export interface WindowSpec {
  fn: WindowFn;
  partition: 'none' | 'month';
  /** Ranking functions order by total DESC; the others by order_date or by month (which has ties). */
  orderKey: 'total' | 'order_date' | 'month';
  frame: 'rows' | 'range';
  /** For moving_avg: ROWS n PRECEDING. */
  preceding: number;
}

export interface WindowRow extends WOrder {
  value: number | null;
  /** Ids of the rows in this row's window frame (or partition, for functions that ignore frames). */
  frame: number[];
  partitionKey: string;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const keyOf = (o: WOrder, k: WindowSpec['orderKey']) => (k === 'total' ? o.total : k === 'month' ? o.month : o.orderDate);
const cmp = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0);

export function windowSql(s: WindowSpec): string {
  const part = s.partition === 'month' ? 'PARTITION BY month ' : '';
  const order = s.orderKey === 'total' ? 'ORDER BY total DESC' : `ORDER BY ${s.orderKey}`;
  const expr: Record<WindowFn, string> = {
    row_number: `ROW_NUMBER() OVER (${part}${order})`,
    rank: `RANK() OVER (${part}${order})`,
    dense_rank: `DENSE_RANK() OVER (${part}${order})`,
    partition_sum: `SUM(total) OVER (${part.trim()})`,
    running_sum: `SUM(total) OVER (${part}${order}\n                    ${s.frame.toUpperCase()} BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`,
    moving_avg: `ROUND(AVG(total) OVER (${part}${order}\n                    ROWS BETWEEN ${s.preceding} PRECEDING AND CURRENT ROW), 2)`,
    lag: `LAG(total) OVER (${part}${order})`,
    lead: `LEAD(total) OVER (${part}${order})`,
  };
  return `SELECT id, month, order_date, total,\n       ${expr[s.fn]} AS value\nFROM order_totals\nORDER BY ${s.partition === 'month' ? 'month, ' : ''}${s.orderKey === 'total' ? 'total DESC' : s.orderKey}, id;`;
}

export function computeWindow(s: WindowSpec, orders: WOrder[] = W_ORDERS): WindowRow[] {
  const desc = s.orderKey === 'total';
  const sorted = [...orders].sort(
    (a, b) =>
      (s.partition === 'month' ? cmp(a.month, b.month) : 0) ||
      (desc ? -cmp(a.total, b.total) : cmp(keyOf(a, s.orderKey), keyOf(b, s.orderKey))) ||
      a.id - b.id,
  );
  const partKey = (o: WOrder) => (s.partition === 'month' ? o.month : 'all');
  return sorted.map((o) => {
    const part = sorted.filter((p) => partKey(p) === partKey(o));
    const i = part.indexOf(o);
    const k = keyOf(o, s.orderKey);
    const peersBefore = part.filter((p) => (desc ? keyOf(p, s.orderKey) > k : keyOf(p, s.orderKey) < k)).length;
    const lastPeer = part.length - 1 - [...part].reverse().findIndex((p) => keyOf(p, s.orderKey) === k);
    let value: number | null;
    let frame: WOrder[];
    switch (s.fn) {
      case 'row_number':
        value = i + 1;
        frame = part;
        break;
      case 'rank':
        value = peersBefore + 1;
        frame = part;
        break;
      case 'dense_rank':
        value = new Set(part.filter((p) => (desc ? keyOf(p, s.orderKey) > k : keyOf(p, s.orderKey) < k)).map((p) => keyOf(p, s.orderKey))).size + 1;
        frame = part;
        break;
      case 'partition_sum':
        frame = part;
        value = round2(part.reduce((a, p) => a + p.total, 0));
        break;
      case 'running_sum':
        frame = part.slice(0, (s.frame === 'rows' ? i : lastPeer) + 1);
        value = round2(frame.reduce((a, p) => a + p.total, 0));
        break;
      case 'moving_avg':
        frame = part.slice(Math.max(0, i - s.preceding), i + 1);
        value = round2(frame.reduce((a, p) => a + p.total, 0) / frame.length);
        break;
      case 'lag':
        frame = i > 0 ? [part[i - 1]!] : [];
        value = i > 0 ? part[i - 1]!.total : null;
        break;
      case 'lead':
        frame = i < part.length - 1 ? [part[i + 1]!] : [];
        value = i < part.length - 1 ? part[i + 1]!.total : null;
        break;
    }
    return { ...o, value, frame: frame.map((p) => p.id), partitionKey: partKey(o) };
  });
}
