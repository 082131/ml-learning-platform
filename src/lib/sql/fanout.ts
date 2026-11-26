// What happens to sums when one order is joined to its items AND its payments (two one-to-many tables).
// fanout.test.ts checks the arithmetic against SQLite.

export const FANOUT_ITEM_VALUES = [30, 10, 20, 40];

export interface FanoutState {
  items: number;
  payments: number;
  method: 'join-both' | 'pre-aggregate';
}

export interface FanoutResult {
  itemValues: number[];
  paymentValues: number[];
  /** Rows the join produces: one per (item, payment) pair, or 1 after pre-aggregating. */
  pairs: { item: number; payment: number }[];
  trueItems: number;
  truePaid: number;
  reportedItems: number;
  reportedPaid: number;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function fanout(s: FanoutState): FanoutResult {
  const itemValues = FANOUT_ITEM_VALUES.slice(0, s.items);
  const trueItems = itemValues.reduce((a, b) => a + b, 0);
  // The order is paid in instalments of equal size; the last one absorbs the rounding so they add up exactly.
  const share = round2(trueItems / s.payments);
  const paymentValues = Array.from({ length: s.payments }, (_, j) => (j < s.payments - 1 ? share : round2(trueItems - share * (s.payments - 1))));
  const truePaid = round2(paymentValues.reduce((a, b) => a + b, 0));
  if (s.method === 'pre-aggregate')
    return { itemValues, paymentValues, pairs: [{ item: -1, payment: -1 }], trueItems, truePaid, reportedItems: trueItems, reportedPaid: truePaid };
  const pairs = itemValues.flatMap((_, i) => paymentValues.map((_, j) => ({ item: i, payment: j })));
  return {
    itemValues,
    paymentValues,
    pairs,
    trueItems,
    truePaid,
    reportedItems: round2(pairs.reduce((a, p) => a + itemValues[p.item]!, 0)),
    reportedPaid: round2(pairs.reduce((a, p) => a + paymentValues[p.payment]!, 0)),
  };
}

/** The SQL the explorer models, for a database holding one order with these items and payments. */
export const fanoutSql = (s: FanoutState) =>
  s.method === 'join-both'
    ? `SELECT o.id,\n       COUNT(*)      AS joined_rows,\n       SUM(i.value)  AS items_total,\n       SUM(p.amount) AS paid\nFROM orders o\nJOIN items    i ON i.order_id = o.id\nJOIN payments p ON p.order_id = o.id\nGROUP BY o.id;`
    : `SELECT o.id, 1 AS joined_rows, i.items_total, p.paid\nFROM orders o\nJOIN (SELECT order_id, SUM(value) AS items_total FROM items GROUP BY order_id) i\n  ON i.order_id = o.id\nJOIN (SELECT order_id, SUM(amount) AS paid FROM payments GROUP BY order_id) p\n  ON p.order_id = o.id;`;
