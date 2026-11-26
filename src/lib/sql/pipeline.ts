// The logical order in which SQL evaluates a SELECT (FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT),
// computed stage by stage over the shop's products table. pipeline.test.ts checks every final result against
// SQLite for every control setting.

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
}

/** The products table of the shop dataset (src/lib/sql/datasets.ts). */
export const PRODUCTS: Product[] = [
  { id: 1, name: 'Notebook', category: 'stationery', price: 4 },
  { id: 2, name: 'Pen set', category: 'stationery', price: 6.5 },
  { id: 3, name: 'Desk lamp', category: 'home', price: 32 },
  { id: 4, name: 'Mug', category: 'home', price: 9 },
  { id: 5, name: 'Headphones', category: 'electronics', price: 59 },
  { id: 6, name: 'Charger', category: 'electronics', price: 19 },
  { id: 7, name: 'Poster', category: 'home', price: 12 },
];

export type Cell = string | number;

export interface StageRow {
  cells: Cell[];
  /** Removed by this stage (shown crossed out, then gone in the next stage). */
  dropped?: boolean;
  /** The group this row belongs to, after GROUP BY. */
  group?: string;
}

export interface Stage {
  clause: 'FROM' | 'WHERE' | 'GROUP BY' | 'HAVING' | 'SELECT' | 'ORDER BY' | 'LIMIT';
  sql: string;
  columns: string[];
  rows: StageRow[];
  /** Rows that leave this stage. */
  out: number;
  note: string;
}

export interface PipelineState {
  minPrice: number;
  /** LIMIT for the plain query. */
  limit: number;
  /** HAVING COUNT(*) >= this, for the grouped query. */
  minCount: number;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const keep = (rows: StageRow[]) => rows.filter((r) => !r.dropped).map(({ cells, group }) => ({ cells, group }));
const all = (p: Product): Cell[] => [p.id, p.name, p.category, p.price];
const COLS = ['id', 'name', 'category', 'price'];

function fromWhere(s: PipelineState, products: Product[]): Stage[] {
  const from: Stage = {
    clause: 'FROM',
    sql: 'FROM products',
    columns: COLS,
    rows: products.map((p) => ({ cells: all(p) })),
    out: products.length,
    note: `Start with every row of the table: ${products.length} products, all columns.`,
  };
  const whereRows = products.map((p) => ({ cells: all(p), dropped: !(p.price >= s.minPrice) }));
  const kept = whereRows.filter((r) => !r.dropped).length;
  const where: Stage = {
    clause: 'WHERE',
    sql: `WHERE price >= ${s.minPrice}`,
    columns: COLS,
    rows: whereRows,
    out: kept,
    note: `Test each row on its own. ${kept} of ${products.length} rows have price >= ${s.minPrice}; the other ${products.length - kept} are thrown away before anything else happens.`,
  };
  return [from, where];
}

/** SELECT name, price FROM products WHERE price >= :min ORDER BY price DESC LIMIT :n */
export function plainPipeline(s: PipelineState, products: Product[] = PRODUCTS): Stage[] {
  const [from, where] = fromWhere(s, products);
  const picked = keep(where!.rows).map((r) => ({ cells: [r.cells[1]!, r.cells[3]!] }));
  const select: Stage = {
    clause: 'SELECT',
    sql: 'SELECT name, price',
    columns: ['name', 'price'],
    rows: picked,
    out: picked.length,
    note: 'Keep only the columns we asked for. The rows are still in table order: SQL promises no order without ORDER BY.',
  };
  const sorted = [...picked].sort((a, b) => (b.cells[1] as number) - (a.cells[1] as number));
  const order: Stage = {
    clause: 'ORDER BY',
    sql: 'ORDER BY price DESC',
    columns: ['name', 'price'],
    rows: sorted,
    out: sorted.length,
    note: 'Sort what is left, most expensive first. Only now does "first" mean anything.',
  };
  const limited = sorted.map((r, i) => ({ ...r, dropped: i >= s.limit }));
  const out = Math.min(s.limit, sorted.length);
  const limit: Stage = {
    clause: 'LIMIT',
    sql: `LIMIT ${s.limit}`,
    columns: ['name', 'price'],
    rows: limited,
    out,
    note: `Keep the first ${s.limit} rows of the sorted result${sorted.length < s.limit ? ` (only ${sorted.length} exist)` : ''}. LIMIT runs last, so it always cuts the sorted list.`,
  };
  return [from!, where!, select, order, limit];
}

/** SELECT category, COUNT(*) AS n, AVG(price) AS avg_price FROM products WHERE price >= :min
 *  GROUP BY category HAVING COUNT(*) >= :k ORDER BY n DESC, category */
export function groupedPipeline(s: PipelineState, products: Product[] = PRODUCTS): Stage[] {
  const [from, where] = fromWhere(s, products);
  const rows = keep(where!.rows);
  const cats = [...new Set(rows.map((r) => r.cells[2] as string))].sort();
  const grouped = cats.flatMap((c) => rows.filter((r) => r.cells[2] === c).map((r) => ({ cells: r.cells, group: c })));
  const groupBy: Stage = {
    clause: 'GROUP BY',
    sql: 'GROUP BY category',
    columns: COLS,
    rows: grouped,
    out: cats.length,
    note: `Collect the surviving rows into one bucket per category: ${cats.length} bucket${cats.length === 1 ? '' : 's'}. From here on, each bucket becomes one output row.`,
  };
  const summary = cats.map((c) => {
    const prices = rows.filter((r) => r.cells[2] === c).map((r) => r.cells[3] as number);
    return { c, n: prices.length, avg: round2(prices.reduce((a, b) => a + b, 0) / prices.length) };
  });
  const havingRows = summary.map((g) => ({ cells: [g.c, g.n, g.avg], dropped: g.n < s.minCount }));
  const kept = havingRows.filter((r) => !r.dropped).length;
  const having: Stage = {
    clause: 'HAVING',
    sql: `HAVING COUNT(*) >= ${s.minCount}`,
    columns: ['category', 'COUNT(*)', 'AVG(price)'],
    rows: havingRows,
    out: kept,
    note: `Test each bucket, not each row: ${kept} of ${cats.length} have at least ${s.minCount} product${s.minCount === 1 ? '' : 's'}. HAVING can use COUNT(*) because the buckets exist now.`,
  };
  const picked = keep(havingRows);
  const select: Stage = {
    clause: 'SELECT',
    sql: 'SELECT category, COUNT(*) AS n, AVG(price) AS avg_price',
    columns: ['category', 'n', 'avg_price'],
    rows: picked,
    out: picked.length,
    note: 'Compute the output columns for each bucket and give them names. The alias n exists only from this stage on.',
  };
  const sorted = [...picked].sort((a, b) => (b.cells[1] as number) - (a.cells[1] as number) || String(a.cells[0]).localeCompare(String(b.cells[0])));
  const order: Stage = {
    clause: 'ORDER BY',
    sql: 'ORDER BY n DESC, category',
    columns: ['category', 'n', 'avg_price'],
    rows: sorted,
    out: sorted.length,
    note: 'Sort the finished rows. ORDER BY may use the alias n because SELECT has already run.',
  };
  return [from!, where!, groupBy, having, select, order];
}

/** The SQL each pipeline evaluates, as the learner would write it. */
export const plainSql = (s: PipelineState) =>
  `SELECT name, price\nFROM products\nWHERE price >= ${s.minPrice}\nORDER BY price DESC\nLIMIT ${s.limit};`;
export const groupedSql = (s: PipelineState) =>
  `SELECT category, COUNT(*) AS n, AVG(price) AS avg_price\nFROM products\nWHERE price >= ${s.minPrice}\nGROUP BY category\nHAVING COUNT(*) >= ${s.minCount}\nORDER BY n DESC, category;`;

/** Rows of the final stage, without the dropped ones: what the database returns. */
export const finalRows = (stages: Stage[]) => keep(stages.at(-1)!.rows).map((r) => r.cells);
