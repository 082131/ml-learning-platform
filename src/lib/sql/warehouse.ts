// A simulated columnar warehouse table, to show what a query is billed for: the bytes of the columns it reads,
// in the partitions it cannot skip. The sizes and the price are illustrative assumptions, not measurements
// of any product; the lesson labels them as such.

export const WH_ROWS = 2_000_000_000;
export const WH_DAYS = 730;
/** Assumed average stored (compressed) bytes per value, per column. */
export const WH_COLUMNS = { id: 8, customer_id: 4, country: 1, order_date: 2, amount: 4, user_agent: 120 } as const;
export type WhColumn = keyof typeof WH_COLUMNS;
export const NEEDED: WhColumn[] = ['order_date', 'country', 'amount'];
/** Illustrative on-demand price, US dollars per TiB scanned. */
export const PRICE_PER_TIB = 6;
const TIB = 1024 ** 4;
/** The daily summary table: one row per (day, country). */
export const SUMMARY_ROWS = WH_DAYS * 5;
const SUMMARY_BYTES_PER_ROW = 2 + 1 + 8 + 8; // order_date, country, orders, revenue

export interface WarehouseSpec {
  columns: 'all' | 'needed';
  filter: 'none' | 'year' | 'month' | 'month-fn';
  source: 'raw' | 'summary';
}

export interface WarehouseResult {
  partitionsRead: number;
  rowsRead: number;
  bytesRead: number;
  cost: number;
  sql: string;
}

const DAYS: Record<WarehouseSpec['filter'], number> = { none: WH_DAYS, year: 365, month: 30, 'month-fn': WH_DAYS };

export function warehouse(s: WarehouseSpec): WarehouseResult {
  const days = DAYS[s.filter];
  const partitionsRead = days;
  if (s.source === 'summary') {
    const rowsRead = (SUMMARY_ROWS * days) / WH_DAYS;
    const bytesRead = rowsRead * SUMMARY_BYTES_PER_ROW;
    return { partitionsRead, rowsRead, bytesRead, cost: (bytesRead / TIB) * PRICE_PER_TIB, sql: warehouseSql(s) };
  }
  const cols = s.columns === 'all' ? (Object.keys(WH_COLUMNS) as WhColumn[]) : NEEDED;
  const bytesPerRow = cols.reduce((a, c) => a + WH_COLUMNS[c], 0);
  const rowsRead = (WH_ROWS * days) / WH_DAYS;
  const bytesRead = rowsRead * bytesPerRow;
  return { partitionsRead, rowsRead, bytesRead, cost: (bytesRead / TIB) * PRICE_PER_TIB, sql: warehouseSql(s) };
}

const WHERE: Record<WarehouseSpec['filter'], string> = {
  none: '',
  year: "\nWHERE order_date >= '2026-01-01'",
  month: "\nWHERE order_date >= '2026-12-02'",
  'month-fn': "\nWHERE substr(CAST(order_date AS TEXT), 1, 7) = '2026-12'",
};

export function warehouseSql(s: WarehouseSpec): string {
  if (s.source === 'summary') return `SELECT country, SUM(revenue) AS revenue\nFROM daily_country_revenue  -- ${SUMMARY_ROWS.toLocaleString('en')} rows${WHERE[s.filter]}\nGROUP BY country;`;
  const select = s.columns === 'all' ? 'SELECT *' : 'SELECT order_date, country, amount';
  return `${select}\nFROM orders_wh  -- partitioned by order_date${WHERE[s.filter]};`;
}

/** 1.2 TB, 340 GB, 75 KB ... in decimal units, as warehouses usually display them. */
export function formatBytes(b: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (b >= 1000 && i < units.length - 1) {
    b /= 1000;
    i++;
  }
  return `${b >= 100 ? Math.round(b) : Math.round(b * 10) / 10} ${units[i]}`;
}
