// What SQLite 3.54 does with five queries on big_orders (200,000 rows) under six index choices: the
// EXPLAIN QUERY PLAN line and how many index entries and table rows the plan has to read. Computed once and
// stored here so the explorer needs no 200,000-row database; indexlab.test.ts rebuilds every entry in SQLite.

export const INDEX_QUERIES = {
  customer: { label: "one customer: customer_id = 4242", sql: 'SELECT * FROM big_orders\nWHERE customer_id = 4242;' },
  country_recent: { label: "count DE orders since 1 Dec 2026", sql: "SELECT COUNT(*) FROM big_orders\nWHERE country = 'DE' AND order_date >= '2026-12-01';" },
  month_range: { label: 'December 2026 revenue, as a date range', sql: "SELECT SUM(amount) FROM big_orders\nWHERE order_date >= '2026-12-01' AND order_date < '2027-01-01';" },
  month_fn: { label: 'December 2026 revenue, with substr()', sql: "SELECT SUM(amount) FROM big_orders\nWHERE substr(order_date, 1, 7) = '2026-12';" },
  country: { label: "revenue of one country: country = 'DE'", sql: "SELECT SUM(amount) FROM big_orders\nWHERE country = 'DE';" },
} as const;
export type IndexQuery = keyof typeof INDEX_QUERIES;

export const INDEX_CHOICES = {
  none: { label: 'no index', columns: null },
  customer: { label: '(customer_id)', columns: '(customer_id)' },
  country: { label: '(country)', columns: '(country)' },
  date: { label: '(order_date)', columns: '(order_date)' },
  country_date: { label: '(country, order_date)', columns: '(country, order_date)' },
  date_country: { label: '(order_date, country)', columns: '(order_date, country)' },
} as const;
export type IndexChoice = keyof typeof INDEX_CHOICES;

export interface PlanFacts {
  /** The detail column of EXPLAIN QUERY PLAN (the index is named idx). */
  plan: string;
  /** Index entries read (or table rows, for a SCAN). */
  entries: number;
  /** Table rows looked up (0 when the index covers the query). */
  fetched: number;
  /** Rows that satisfy the whole WHERE clause. */
  matching: number;
}

const S = 'SCAN big_orders';
const scan = (matching: number): PlanFacts => ({ plan: S, entries: 200_000, fetched: 200_000, matching });
const search = (detail: string, entries: number, matching: number, covering = false): PlanFacts => ({
  plan: `SEARCH big_orders USING ${covering ? 'COVERING ' : ''}INDEX idx (${detail})`,
  entries,
  fetched: covering ? 0 : entries,
  matching,
});

export const PLANS: Record<IndexQuery, Record<IndexChoice, PlanFacts>> = {
  customer: { none: scan(10), customer: search('customer_id=?', 10, 10), country: scan(10), date: scan(10), country_date: scan(10), date_country: scan(10) },
  country_recent: {
    none: scan(1644),
    customer: scan(1644),
    country: search('country=?', 40_000, 1644),
    date: search('order_date>?', 8493, 1644),
    country_date: search('country=? AND order_date>?', 1644, 1644, true),
    date_country: search('order_date>?', 8493, 1644, true),
  },
  month_range: {
    none: scan(8493),
    customer: scan(8493),
    country: scan(8493),
    date: search('order_date>? AND order_date<?', 8493, 8493),
    country_date: scan(8493),
    date_country: search('order_date>? AND order_date<?', 8493, 8493),
  },
  month_fn: { none: scan(8493), customer: scan(8493), country: scan(8493), date: scan(8493), country_date: scan(8493), date_country: scan(8493) },
  country: {
    none: scan(40_000),
    customer: scan(40_000),
    country: search('country=?', 40_000, 40_000),
    date: scan(40_000),
    country_date: search('country=?', 40_000, 40_000),
    date_country: scan(40_000),
  },
};

export interface IndexLabState {
  query: IndexQuery;
  index: IndexChoice;
}

export const indexLabSql = (s: IndexLabState) => {
  const cols = INDEX_CHOICES[s.index].columns;
  return `${cols ? `CREATE INDEX idx ON big_orders ${cols};\n\n` : '-- no index\n\n'}EXPLAIN QUERY PLAN\n${INDEX_QUERIES[s.query].sql}`;
};

/** One sentence on why the plan came out this way, for the explorer. */
export function whyPlan(s: IndexLabState): string {
  const p = PLANS[s.query][s.index];
  if (s.index === 'none') return 'No index exists, so the only way to find matching rows is to read every row of the table.';
  if (s.query === 'month_fn') return 'The WHERE clause wraps order_date in substr(). The index is sorted by order_date itself, not by substr(order_date, 1, 7), so it cannot be searched. Rewrite the condition as a date range.';
  if (p.plan === S) {
    if (s.index === 'country_date' && s.query === 'month_range') return 'The index is sorted by country first. Rows for December are spread across all five countries, so without a country condition there is no single range to read: the leftmost-prefix rule.';
    if (s.index === 'date_country' && s.query === 'country') return 'The index is sorted by order_date first; DE rows are scattered through it. A condition on the second column alone cannot use the index.';
    return 'The index is on a column the WHERE clause does not test, so it cannot narrow anything down.';
  }
  if (p.fetched === 0 && p.entries > p.matching) return 'The index covers the query (it holds every column needed), so no table rows are read. But only order_date can be used to search: the index reads all December rows of every country and checks country on each entry. Equality columns first, range column last.';
  if (p.fetched === 0) return 'Equality on the first column and a range on the second: the matching entries sit next to each other in the index, and since the index holds every column the query needs, the table is never touched.';
  if (p.entries > p.matching) return `The index narrows the search to ${p.entries.toLocaleString('en')} entries, but only ${p.matching.toLocaleString('en')} match the whole WHERE clause; the rest are fetched from the table and thrown away.`;
  if (p.matching > 20_000) return 'The index is used, but one row in five matches. Reading 40,000 index entries and then jumping to 40,000 table rows one by one is not much better than one pass over the table, and on disk it can be worse. Indexes pay off when they are selective.';
  return 'The index finds exactly the matching entries and fetches only those rows from the table.';
}
