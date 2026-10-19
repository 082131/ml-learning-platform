/**
 * SQL joins over two small in-memory tables, with the provenance of every result row, so the join
 * visualizer can show which input rows produced each output row. The semantics follow SQL: NULL
 * never equals anything (not even NULL), and outer joins pad the missing side with NULLs. Results
 * are checked against SQLite 3.45 in join.test.ts.
 */

export type JoinKind = 'inner' | 'left' | 'full';

export const JOIN_KINDS: readonly JoinKind[] = ['inner', 'left', 'full'];

/** The SQL keyword for each join kind. */
export const JOIN_SQL: Record<JoinKind, string> = {
  inner: 'INNER JOIN',
  left: 'LEFT JOIN',
  full: 'FULL OUTER JOIN',
};

export interface Customer {
  id: number;
  name: string;
  city: string;
}

export interface Order {
  id: number;
  /** NULL (a guest checkout) is allowed: the column is a nullable foreign key. */
  customerId: number | null;
  amount: number;
}

/** One output row and the input rows it came from (an index into each table, or null for padding). */
export interface JoinRow {
  customer: number | null;
  order: number | null;
}

const matches = (c: Customer, o: Order) => o.customerId !== null && o.customerId === c.id;

/** `NULLS LAST` ordering for nullable numbers, as in `ORDER BY c.id NULLS LAST`. */
function compareNullsLast(a: number | null, b: number | null): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  return a - b;
}

/**
 * `SELECT ... FROM customers c <kind> orders o ON o.customer_id = c.id
 *  ORDER BY c.id NULLS LAST, o.id NULLS LAST`, returned as provenance pairs.
 */
export function joinTables(
  customers: readonly Customer[],
  orders: readonly Order[],
  kind: JoinKind,
): JoinRow[] {
  const rows: JoinRow[] = [];
  const matchedOrders = new Set<number>();
  customers.forEach((c, ci) => {
    let matched = false;
    orders.forEach((o, oi) => {
      if (!matches(c, o)) return;
      matched = true;
      matchedOrders.add(oi);
      rows.push({ customer: ci, order: oi });
    });
    if (!matched && kind !== 'inner') rows.push({ customer: ci, order: null });
  });
  if (kind === 'full')
    orders.forEach((_, oi) => {
      if (!matchedOrders.has(oi)) rows.push({ customer: null, order: oi });
    });
  const cid = (r: JoinRow) => (r.customer === null ? null : customers[r.customer]!.id);
  const oid = (r: JoinRow) => (r.order === null ? null : orders[r.order]!.id);
  return rows.sort((a, b) => compareNullsLast(cid(a), cid(b)) || compareNullsLast(oid(a), oid(b)));
}

/** The selected columns of a result row: c.id, c.name, o.id, o.amount (null where padded). */
export function joinValues(customers: readonly Customer[], orders: readonly Order[], row: JoinRow) {
  const c = row.customer === null ? null : customers[row.customer]!;
  const o = row.order === null ? null : orders[row.order]!;
  return [c?.id ?? null, c?.name ?? null, o?.id ?? null, o?.amount ?? null] as const;
}

/** A result row as Python's sqlite3 module prints it, for example `(4, 'Margaret', None, None)`. */
export function pythonRow(values: readonly (string | number | null)[]): string {
  const item = (v: string | number | null) =>
    v === null ? 'None' : typeof v === 'string' ? `'${v}'` : String(v);
  return `(${values.map(item).join(', ')})`;
}

/** How many result rows have padding on each side: customers without orders, orders without a customer. */
export function joinCounts(rows: readonly JoinRow[]) {
  return {
    rows: rows.length,
    matched: rows.filter((r) => r.customer !== null && r.order !== null).length,
    customersWithoutOrder: rows.filter((r) => r.order === null).length,
    ordersWithoutCustomer: rows.filter((r) => r.customer === null).length,
  };
}

/** Why a result row exists, in words, for the visualizer's explanation line. */
export function explainJoinRow(
  customers: readonly Customer[],
  orders: readonly Order[],
  row: JoinRow,
  kind: JoinKind,
): string {
  const c = row.customer === null ? null : customers[row.customer]!;
  const o = row.order === null ? null : orders[row.order]!;
  if (c && o)
    return `Order ${o.id} has customer_id = ${o.customerId}, which equals ${c.name}'s id ${c.id}: the ON condition is true, so the pair is joined.`;
  if (c)
    return `No order has customer_id = ${c.id}, so ${c.name} has no match. ${JOIN_SQL[kind]} keeps every customer, so this row has NULL in the order columns.`;
  const why =
    o!.customerId === null
      ? 'customer_id is NULL, and NULL equals nothing'
      : `no customer has id ${o!.customerId}`;
  return `Order ${o!.id} matches no customer (${why}). FULL OUTER JOIN keeps unmatched rows from both sides, so the customer columns are NULL.`;
}

/** Input rows that appear in no result row: what this join type drops. */
export function droppedRows(
  customers: readonly Customer[],
  orders: readonly Order[],
  rows: readonly JoinRow[],
) {
  const usedC = new Set(rows.map((r) => r.customer));
  const usedO = new Set(rows.map((r) => r.order));
  return {
    customers: customers.map((_, i) => i).filter((i) => !usedC.has(i)),
    orders: orders.map((_, i) => i).filter((i) => !usedO.has(i)),
  };
}
