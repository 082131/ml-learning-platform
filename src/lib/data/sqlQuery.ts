/**
 * The SQL intro lesson's query builder: one small `sales` table, a WHERE filter, an optional GROUP BY
 * with COUNT and SUM, and an ORDER BY, evaluated in TypeScript. sqlQuery.test.ts checks every
 * combination against the lesson's Python run with CPython 3.13 and SQLite 3.53 (fixtures/sql_query.py).
 */
import type { ExperimentDef } from '../types';

export interface Sale {
  id: number;
  city: string;
  product: string;
  amount: number;
}

export const SALES: Sale[] = [
  { id: 1, city: 'Oslo', product: 'tea', amount: 12 },
  { id: 2, city: 'Leeds', product: 'coffee', amount: 30 },
  { id: 3, city: 'Oslo', product: 'coffee', amount: 25 },
  { id: 4, city: 'Austin', product: 'tea', amount: 8 },
  { id: 5, city: 'Leeds', product: 'tea', amount: 15 },
  { id: 6, city: 'Oslo', product: 'cake', amount: 20 },
  { id: 7, city: 'Austin', product: 'coffee', amount: 40 },
  { id: 8, city: 'Leeds', product: 'cake', amount: 9 },
];

export type WhereKey = 'none' | 'oslo' | 'min15' | 'tea';
export type GroupKey = 'none' | 'city' | 'product';
export type OrderKey = 'none' | 'big' | 'name';

export interface SqlState {
  where: WhereKey;
  group: GroupKey;
  order: OrderKey;
}

export const WHERE: Record<WhereKey, { sql: string; label: string; test: (s: Sale) => boolean }> = {
  none: { sql: '', label: 'No filter', test: () => true },
  oslo: { sql: "WHERE city = 'Oslo'", label: "city = 'Oslo'", test: (s) => s.city === 'Oslo' },
  min15: { sql: 'WHERE amount >= 15', label: 'amount >= 15', test: (s) => s.amount >= 15 },
  tea: { sql: "WHERE product = 'tea'", label: "product = 'tea'", test: (s) => s.product === 'tea' },
};

/** The query exactly as the lesson's Python runs it (fixtures/sql_query.py builds the same text). */
export function buildQuery({ where, group, order }: SqlState): string {
  const parts = [
    group === 'none'
      ? 'SELECT id, city, product, amount FROM sales'
      : `SELECT ${group}, COUNT(*) AS orders, SUM(amount) AS total FROM sales`,
  ];
  if (WHERE[where].sql) parts.push(WHERE[where].sql);
  if (group !== 'none') parts.push(`GROUP BY ${group}`);
  if (order === 'big')
    parts.push(group === 'none' ? 'ORDER BY amount DESC' : `ORDER BY total DESC, ${group}`);
  else if (order === 'name') parts.push(group === 'none' ? 'ORDER BY city, id' : `ORDER BY ${group}`);
  return parts.join(' ');
}

export interface GroupRow {
  key: string;
  orders: number;
  total: number;
  ids: number[];
}

export interface SqlResult {
  query: string;
  /** Ids of the rows that pass WHERE, in table order. */
  kept: number[];
  /** Ungrouped: the kept rows in output order. */
  rows: Sale[];
  /** Grouped: one row per group in output order (empty when not grouped). */
  groups: GroupRow[];
}

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function runQuery(state: SqlState, table: Sale[] = SALES): SqlResult {
  const kept = table.filter(WHERE[state.where].test);
  const query = buildQuery(state);
  if (state.group === 'none') {
    const rows = [...kept];
    if (state.order === 'big') rows.sort((a, b) => b.amount - a.amount);
    if (state.order === 'name') rows.sort((a, b) => byText(a.city, b.city) || a.id - b.id);
    return { query, kept: kept.map((r) => r.id), rows, groups: [] };
  }
  const key = state.group;
  const map = new Map<string, GroupRow>();
  for (const r of kept) {
    const g = map.get(r[key]) ?? { key: r[key], orders: 0, total: 0, ids: [] };
    g.orders += 1;
    g.total += r.amount;
    g.ids.push(r.id);
    map.set(r[key], g);
  }
  // SQLite groups with a sorted temporary index, so without ORDER BY the groups come out sorted by key.
  // That is an implementation detail: SQL guarantees no order without ORDER BY.
  const groups = [...map.values()].sort((a, b) => byText(a.key, b.key));
  if (state.order === 'big') groups.sort((a, b) => b.total - a.total || byText(a.key, b.key));
  return { query, kept: kept.map((r) => r.id), rows: [], groups };
}

/** What `print(row)` shows for each result row: Python tuples with single-quoted strings. */
export function pythonPrintout(r: SqlResult): string {
  const lines =
    r.groups.length || r.rows.length === 0
      ? r.groups.map((g) => `('${g.key}', ${g.orders}, ${g.total})`)
      : r.rows.map((s) => `(${s.id}, '${s.city}', '${s.product}', ${s.amount})`);
  return lines.join('\n');
}

export const SQL_SOURCE = `import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE sales (id INTEGER PRIMARY KEY, city TEXT, product TEXT, amount INTEGER)")
conn.executemany("INSERT INTO sales VALUES (?, ?, ?, ?)", [
    (1, "Oslo", "tea", 12), (2, "Leeds", "coffee", 30), (3, "Oslo", "coffee", 25),
    (4, "Austin", "tea", 8), (5, "Leeds", "tea", 15), (6, "Oslo", "cake", 20),
    (7, "Austin", "coffee", 40), (8, "Leeds", "cake", 9),
])

query = "{{query}}"
for row in conn.execute(query):
    print(row)`;

export const sqlSlots = (s: SqlState) => ({ query: buildQuery(s) });

export function sqlExperiment(id: string): ExperimentDef<SqlState, SqlResult> {
  return {
    id,
    initial: { where: 'min15', group: 'none', order: 'none' },
    controls: [
      {
        kind: 'select',
        id: 'where',
        label: 'WHERE (filter rows)',
        options: (Object.keys(WHERE) as WhereKey[]).map((k) => ({ value: k, label: WHERE[k].label })),
        get: (s) => s.where,
        set: (s, v) => ({ ...s, where: v as WhereKey }),
      },
      {
        kind: 'select',
        id: 'group',
        label: 'GROUP BY (one row per group)',
        options: [
          { value: 'none', label: 'No grouping' },
          { value: 'city', label: 'city' },
          { value: 'product', label: 'product' },
        ],
        get: (s) => s.group,
        set: (s, v) => ({ ...s, group: v as GroupKey }),
      },
      {
        kind: 'select',
        id: 'order',
        label: 'ORDER BY (sort the result)',
        options: [
          { value: 'none', label: 'No ORDER BY' },
          { value: 'big', label: 'Largest amount or total first' },
          { value: 'name', label: 'City or group name, A to Z' },
        ],
        get: (s) => s.order,
        set: (s, v) => ({ ...s, order: v as OrderKey }),
      },
    ],
    compute: runQuery,
    readout: (s, r) => [
      { label: 'Python: what the loop prints', value: pythonPrintout(r) || '(no rows)' },
      {
        label: 'Rows',
        value:
          s.group === 'none'
            ? `${r.kept.length} of ${SALES.length} rows pass the filter`
            : `${r.kept.length} rows pass the filter and collapse into ${r.groups.length} group${r.groups.length === 1 ? '' : 's'}`,
      },
    ],
  };
}
