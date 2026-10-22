/**
 * The ETL vs ELT lesson's pipeline, computed in the browser. ETL validates and transforms in Python
 * before loading; ELT loads raw text into the warehouse (SQLite) and validates and transforms there in
 * SQL. The helpers reproduce the Python and SQLite behaviors the pipeline depends on (float(),
 * datetime.fromisoformat, CAST(... AS REAL), datetime(), a PRIMARY KEY), and etl.test.ts checks every
 * mode, injected record and validation setting against fixtures/etl.py run with CPython 3.13 and
 * SQLite 3.45.1.
 */

export type EtlMode = 'etl' | 'elt';
export const FIELDS = ['order_id', 'email', 'amount', 'country', 'ordered_at'] as const;
export type RawRow = Record<(typeof FIELDS)[number], string>;

export const COUNTRIES = ['GB', 'US', 'NO', 'DE', 'FR'];
export const MAX_AMOUNT = 1000;

export const GOOD_ROWS: RawRow[] = [
  {
    order_id: '1001',
    email: 'ada@example.com',
    amount: '30.00',
    country: 'GB',
    ordered_at: '2026-10-01T09:15:00Z',
  },
  {
    order_id: '1002',
    email: 'grace@example.com',
    amount: '45.50',
    country: 'US',
    ordered_at: '2026-10-01T10:02:00Z',
  },
  {
    order_id: '1003',
    email: 'linus@example.com',
    amount: '12.00',
    country: 'NO',
    ordered_at: '2026-10-01T11:40:00Z',
  },
  {
    order_id: '1004',
    email: 'margaret@example.com',
    amount: '8.25',
    country: 'US',
    ordered_at: '2026-10-01T12:05:00Z',
  },
  {
    order_id: '1005',
    email: 'alan@example.com',
    amount: '20.00',
    country: 'GB',
    ordered_at: '2026-10-01T13:30:00Z',
  },
];
/** The sixth record, before anything is injected into it. */
export const BASE_ROW: RawRow = {
  order_id: '1006',
  email: 'edsger@example.com',
  amount: '15.00',
  country: 'NO',
  ordered_at: '2026-10-01T14:10:00Z',
};

export const BAD_RECORDS = {
  none: { label: 'Nothing: record 1006 is valid', change: {} },
  'missing-email': { label: 'Empty email', change: { email: '' } },
  negative: { label: 'Negative amount: -20.00', change: { amount: '-20.00' } },
  comma: { label: 'Decimal comma: 12,50', change: { amount: '12,50' } },
  cents: { label: 'Amount in cents: 4550', change: { amount: '4550' } },
  country: { label: 'Country "UK" (the ISO code is GB)', change: { country: 'UK' } },
  date: { label: 'Month 13 in ordered_at', change: { ordered_at: '2026-13-01T14:10:00Z' } },
  duplicate: { label: 'Duplicate order_id 1002', change: { order_id: '1002' } },
} satisfies Record<string, { label: string; change: Partial<RawRow> }>;
export type BadRecord = keyof typeof BAD_RECORDS;

export const rowsWith = (bad: BadRecord): RawRow[] => [
  ...GOOD_ROWS,
  { ...BASE_ROW, ...BAD_RECORDS[bad].change },
];

/** Python's repr of a str without quotes inside it: 'text'. */
const pyRepr = (s: string) => `'${s}'`;

const PY_FLOAT = /^[+-]?((\d(_?\d)*)(\.(\d(_?\d)*)?)?|\.\d(_?\d)*)([eE][+-]?\d(_?\d)*)?$/;

/** Python's float(text) for decimal strings: raises like Python on anything else. */
export function pyFloat(text: string): number {
  const t = text.trim();
  if (!PY_FLOAT.test(t)) throw new Error(`ValueError: could not convert string to float: ${pyRepr(text)}`);
  return Number(t.replaceAll('_', ''));
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Python 3.11+'s datetime.fromisoformat for the date-time form the lesson uses. Returns the
 * isoformat() of the result, or throws Python's message.
 */
export function pyFromIsoformat(text: string): string {
  const m = ISO.exec(text);
  if (!m) throw new Error(`ValueError: Invalid isoformat string: ${pyRepr(text)}`);
  const [y, mo, d, h, mi, s = '00', tz] = [m[1]!, m[2]!, m[3]!, m[4]!, m[5]!, m[6], m[7]];
  if (+mo < 1 || +mo > 12) throw new Error('ValueError: month must be in 1..12');
  if (+d < 1 || +d > daysIn(+y, +mo)) throw new Error('ValueError: day is out of range for month');
  if (+h > 23 || +mi > 59 || +s > 59)
    throw new Error(`ValueError: Invalid isoformat string: ${pyRepr(text)}`);
  const offset = tz === undefined ? '' : tz === 'Z' ? '+00:00' : tz;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}${offset}`;
}

/** SQLite's CAST(text AS REAL): the longest numeric prefix, or 0.0 when there is none. */
export function sqliteCastReal(text: string): number {
  const m = /^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/.exec(text);
  return m ? Number(m[0]) : 0;
}

/** Is datetime(text) non-NULL in SQLite, for the ISO-8601 forms the lesson uses? (Days up to 31 pass.) */
export function sqliteDatetimeValid(text: string): boolean {
  const m = ISO.exec(text);
  if (!m) return false;
  const [mo, d, h, mi, s = '00'] = [m[2]!, m[3]!, m[4]!, m[5]!, m[6]];
  return +mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31 && +h <= 24 && +mi <= 59 && +s <= 59;
}

const DECIMAL = /^[0-9]+(\.[0-9]+)?$/;

/**
 * The first rule a row breaks, in the order of the lesson's `problem()` function and the SQL CASE,
 * or null. `idCounts` counts every order_id in the batch, so both copies of a duplicate fail.
 */
export function problem(row: RawRow, idCounts: Map<string, number>, sql = false): string | null {
  if (FIELDS.some((f) => row[f] === '')) return 'missing field';
  if (!DECIMAL.test(row.amount)) return 'amount is not a decimal number';
  if (Number(row.amount) > MAX_AMOUNT) return 'amount above 1000';
  if (!COUNTRIES.includes(row.country)) return 'unknown country code';
  if (!/^.+@.+$/s.test(row.email)) return 'email is not an address';
  const timestampOk = sql
    ? sqliteDatetimeValid(row.ordered_at)
    : tryOk(() => pyFromIsoformat(row.ordered_at));
  if (!timestampOk) return 'ordered_at is not a valid timestamp';
  if ((idCounts.get(row.order_id) ?? 0) > 1) return 'duplicate order_id';
  return null;
}

function tryOk(fn: () => unknown) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

export const countIds = (rows: readonly RawRow[]) => {
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r.order_id, (counts.get(r.order_id) ?? 0) + 1));
  return counts;
};

export type Stage = 'transform' | 'load';

export interface PipelineRun {
  mode: EtlMode;
  validation: boolean;
  extracted: number;
  /** Rows in raw_orders (ELT only). */
  raw: number;
  quarantine: { orderId: string; reason: string }[];
  /** The step that raised, and Python's or SQLite's error message. Nothing is loaded into orders then. */
  failure: { stage: Stage; error: string } | null;
  /** (order_id, amount) of every row in orders. */
  stored: [number, number][];
  /** SELECT country, ROUND(SUM(amount), 2) FROM orders GROUP BY country ORDER BY country */
  revenue: [string, number][];
}

const UNIQUE_ERROR = 'IntegrityError: UNIQUE constraint failed: orders.order_id';

/** Inserting into orders, whose order_id is the PRIMARY KEY: all rows or, on a duplicate, none. */
function load(rows: [number, number, string][]): [number, number, string][] {
  const ids = new Set<number>();
  for (const [id] of rows) {
    if (ids.has(id)) throw new Error(UNIQUE_ERROR);
    ids.add(id);
  }
  return rows;
}

function revenueOf(rows: [number, number, string][]): [string, number][] {
  const sums = new Map<string, number>();
  rows.forEach(([, amount, country]) => sums.set(country, (sums.get(country) ?? 0) + amount));
  return [...sums.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([c, v]) => [c, Math.round(v * 100) / 100]);
}

/** Runs the lesson's pipeline on the five good rows plus record 1006 with `bad` injected. */
export function runPipeline(mode: EtlMode, bad: BadRecord, validation: boolean): PipelineRun {
  const rows = rowsWith(bad);
  const counts = countIds(rows);
  const checked = rows.map((r) => ({
    row: r,
    reason: validation ? problem(r, counts, mode === 'elt') : null,
  }));
  const quarantine = checked
    .filter((c) => c.reason)
    .map((c) => ({ orderId: c.row.order_id, reason: c.reason! }));
  const passing = checked.filter((c) => !c.reason).map((c) => c.row);
  const run = { mode, validation, extracted: rows.length, raw: mode === 'elt' ? rows.length : 0, quarantine };
  let stage: Stage = 'transform';
  try {
    // Same order as transform() in the lesson: int(order_id), float(amount), then fromisoformat(ordered_at).
    const transformed = passing.map((r): [number, number, string] => {
      const id = Number.parseInt(r.order_id, 10);
      if (mode === 'elt') return [id, sqliteCastReal(r.amount), r.country];
      const amount = pyFloat(r.amount);
      pyFromIsoformat(r.ordered_at);
      return [id, amount, r.country];
    });
    if (mode === 'etl') stage = 'load';
    const stored = load(transformed);
    return {
      ...run,
      failure: null,
      stored: stored.map(([id, amount]): [number, number] => [id, amount]).sort((a, b) => a[0] - b[0]),
      revenue: revenueOf(stored),
    };
  } catch (e) {
    return { ...run, failure: { stage, error: (e as Error).message }, stored: [], revenue: [] };
  }
}

/** Python's repr of a float, for the amounts and totals the lesson shows: 50.0, 53.75, -8.0. */
export const pyFloatRepr = (x: number) => (Number.isInteger(x) ? `${x}.0` : String(x));

export type Fate = 'clean' | 'quarantined' | 'failed' | 'loaded-wrong';

/** What happened to record 1006 (or to the duplicate), in one word and one sentence. */
export function fateOf(r: PipelineRun, bad: BadRecord): { fate: Fate; text: string } {
  const id = bad === 'duplicate' ? '1002' : '1006';
  const q = r.quarantine.find((x) => x.orderId === id);
  if (q)
    return {
      fate: 'quarantined',
      text: `Record ${id} was quarantined: ${q.reason}. The rest of the batch loaded.`,
    };
  if (r.failure) {
    const where =
      r.failure.stage === 'load'
        ? 'loading into orders'
        : r.mode === 'etl'
          ? 'the Python transform'
          : 'the SQL transform';
    return {
      fate: 'failed',
      text: `${where[0]!.toUpperCase()}${where.slice(1)} raised ${r.failure.error}. The whole batch stopped: orders received no rows.`,
    };
  }
  if (bad === 'none') return { fate: 'clean', text: 'All 6 records are valid and reached orders.' };
  const amount = r.stored.find(([o]) => o === 1006)?.[1];
  const shown = amount === undefined ? '' : ` with amount ${pyFloatRepr(amount)}`;
  return {
    fate: 'loaded-wrong',
    text: `Record ${id} reached orders${shown} with no error: the bad value is now in the warehouse and in every report built on it.`,
  };
}
