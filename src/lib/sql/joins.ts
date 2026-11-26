// Join semantics computed in TypeScript for the join explorer: customers joined to orders on
// orders.customer_id = customers.id, with an optional status filter placed in ON or in WHERE.
// joins.test.ts checks every combination against SQLite.

export type JoinKind = 'inner' | 'left' | 'right' | 'full';
export type FilterPlace = 'none' | 'on' | 'where';

export interface JCustomer {
  id: number;
  name: string;
}
export interface JOrder {
  id: number;
  customerId: number | null;
  status: string;
}

export const J_CUSTOMERS: JCustomer[] = ['Ada', 'Ben', 'Chen', 'Dana', 'Eli', 'Fay', 'Gus', 'Hana'].map((name, i) => ({ id: i + 1, name }));
export const J_ORDERS: JOrder[] = [
  [101, 1, 'shipped'],
  [102, 2, 'shipped'],
  [103, 1, 'shipped'],
  [104, 3, 'cancelled'],
  [105, 4, 'shipped'],
  [106, 2, 'returned'],
  [107, 5, 'shipped'],
  [108, 1, 'shipped'],
  [109, null, 'shipped'],
  [110, 3, 'shipped'],
  [111, 6, 'pending'],
  [112, 4, 'shipped'],
].map(([id, customerId, status]) => ({ id: id as number, customerId: customerId as number | null, status: status as string }));

export interface JoinRow {
  name: string | null;
  orderId: number | null;
  status: string | null;
  /** Which side was padded with NULLs because it had no match. */
  padded?: 'customer' | 'order';
}

export interface JoinResult {
  rows: JoinRow[];
  matchedPairs: number;
  /** Customers that appear only because of an outer join (no matching order). */
  keptCustomersWithoutMatch: number;
  keptOrdersWithoutMatch: number;
  /** Rows the outer join produced that WHERE then removed. */
  removedByWhere: number;
  sql: string;
}

export const STATUS = 'shipped';

const KEYWORD: Record<JoinKind, string> = { inner: 'JOIN', left: 'LEFT JOIN', right: 'RIGHT JOIN', full: 'FULL JOIN' };

export function joinSql(kind: JoinKind, place: FilterPlace): string {
  const on = `ON o.customer_id = c.id${place === 'on' ? ` AND o.status = '${STATUS}'` : ''}`;
  const where = place === 'where' ? `\nWHERE o.status = '${STATUS}'` : '';
  return `SELECT c.name, o.id AS order_id, o.status\nFROM customers AS c\n${KEYWORD[kind]} orders AS o\n  ${on}${where}\nORDER BY c.id, o.id;`;
}

/** SQL's ORDER BY c.id, o.id with NULLs first (SQLite's default for ascending order). */
const byIds = (custId: (r: JoinRow) => number | null) => (a: JoinRow, b: JoinRow) => {
  const ca = custId(a);
  const cb = custId(b);
  if (ca !== cb) return ca === null ? -1 : cb === null ? 1 : ca - cb;
  if (a.orderId === b.orderId) return 0;
  return a.orderId === null ? -1 : b.orderId === null ? 1 : a.orderId - b.orderId;
};

export function joinTables(kind: JoinKind, place: FilterPlace, customers = J_CUSTOMERS, orders = J_ORDERS): JoinResult {
  const onMatch = (c: JCustomer, o: JOrder) => o.customerId === c.id && (place !== 'on' || o.status === STATUS);
  const rows: (JoinRow & { cid: number | null })[] = [];
  for (const c of customers)
    for (const o of orders) if (onMatch(c, o)) rows.push({ name: c.name, orderId: o.id, status: o.status, cid: c.id });
  const matchedPairs = rows.length;
  let keptCustomersWithoutMatch = 0;
  let keptOrdersWithoutMatch = 0;
  if (kind === 'left' || kind === 'full')
    for (const c of customers)
      if (!orders.some((o) => onMatch(c, o))) {
        rows.push({ name: c.name, orderId: null, status: null, padded: 'order', cid: c.id });
        keptCustomersWithoutMatch++;
      }
  if (kind === 'right' || kind === 'full')
    for (const o of orders)
      if (!customers.some((c) => onMatch(c, o))) {
        rows.push({ name: null, orderId: o.id, status: o.status, padded: 'customer', cid: null });
        keptOrdersWithoutMatch++;
      }
  const filtered = place === 'where' ? rows.filter((r) => r.status === STATUS) : rows;
  const sorted = filtered.sort(byIds((r) => (r as JoinRow & { cid: number | null }).cid)).map(({ cid: _cid, ...r }) => r);
  return {
    rows: sorted,
    matchedPairs,
    keptCustomersWithoutMatch,
    keptOrdersWithoutMatch,
    removedByWhere: rows.length - filtered.length,
    sql: joinSql(kind, place),
  };
}
