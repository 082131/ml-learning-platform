// A training table for "will this customer order in the next 30 days?", built at a cutoff date, with features
// either point-in-time (orders before the cutoff only) or leaky (all orders). mlfeatures.test.ts checks every
// setting against SQLite running trainingSql.
import { USER_NAMES } from './funnel';
import { W_ORDERS } from './window';

export const SIGNUPS: Record<number, string> = {
  1: '2026-01-05',
  2: '2026-01-12',
  3: '2026-01-20',
  4: '2026-02-02',
  5: '2026-02-14',
  6: '2026-02-20',
  7: '2026-03-01',
  8: '2026-03-03',
};

export const CUTOFFS = ['2026-02-01', '2026-02-15', '2026-03-01'] as const;
export type Cutoff = (typeof CUTOFFS)[number];

export interface TrainingSpec {
  cutoff: Cutoff;
  features: 'point-in-time' | 'leaky';
}

export interface TrainingRow {
  customerId: number;
  name: string;
  ordersBefore: number;
  spendBefore: number;
  daysSinceLast: number | null;
  label: 0 | 1;
  /** Which feature values differ from the point-in-time ones. */
  leaked: { orders: boolean; spend: boolean; days: boolean };
  /** True if an order counted in the features is also an order the label is about. */
  labelInFeatures: boolean;
}

const idOf = Object.fromEntries(Object.entries(USER_NAMES).map(([id, n]) => [n, Number(id)]));
const ORDERS = W_ORDERS.map((o) => ({ ...o, customerId: idOf[o.customer] ?? null }));
const day = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;
const addDays = (d: string, n: number) => new Date((day(d) + n) * 86_400_000).toISOString().slice(0, 10);
const round2 = (x: number) => Math.round(x * 100) / 100;

function features(customerId: number, cutoff: string, pointInTime: boolean) {
  const own = ORDERS.filter((o) => o.customerId === customerId && (!pointInTime || o.orderDate < cutoff));
  const last = own.reduce<string | null>((m, o) => (m === null || o.orderDate > m ? o.orderDate : m), null);
  return { ids: own.map((o) => o.id), orders: own.length, spend: round2(own.reduce((a, o) => a + o.total, 0)), days: last === null ? null : Math.trunc(day(cutoff) - day(last)) };
}

export function trainingRows(s: TrainingSpec): TrainingRow[] {
  const end = addDays(s.cutoff, 30);
  return Object.keys(SIGNUPS)
    .map(Number)
    .filter((id) => SIGNUPS[id]! < s.cutoff)
    .map((customerId) => {
      const pit = features(customerId, s.cutoff, true);
      const f = s.features === 'leaky' ? features(customerId, s.cutoff, false) : pit;
      const labelIds = ORDERS.filter((o) => o.customerId === customerId && o.orderDate >= s.cutoff && o.orderDate < end).map((o) => o.id);
      return {
        customerId,
        name: USER_NAMES[customerId]!,
        ordersBefore: f.orders,
        spendBefore: f.spend,
        daysSinceLast: f.days,
        label: labelIds.length > 0 ? 1 : 0,
        leaked: { orders: f.orders !== pit.orders, spend: f.spend !== pit.spend, days: f.days !== pit.days },
        labelInFeatures: f.ids.some((id) => labelIds.includes(id)),
      };
    });
}

/** The SQL the explorer models. */
export const trainingSql = (s: TrainingSpec) => `WITH spine AS (
  -- one row per customer who existed at the cutoff
  SELECT id AS customer_id, '${s.cutoff}' AS cutoff
  FROM customers
  WHERE signup_date < '${s.cutoff}'
)
SELECT s.customer_id,
       COUNT(o.id)                 AS orders_before,
       COALESCE(SUM(o.total), 0)   AS spend_before,
       CAST(julianday(s.cutoff) - julianday(MAX(o.order_date)) AS INTEGER) AS days_since_last,
       EXISTS (SELECT 1 FROM orders AS f
               WHERE f.customer_id = s.customer_id
                 AND f.order_date >= s.cutoff
                 AND f.order_date <  date(s.cutoff, '+30 days')) AS label
FROM spine AS s
LEFT JOIN order_totals AS o
       ON o.customer_id = s.customer_id${s.features === 'point-in-time' ? '\n      AND o.order_date < s.cutoff     -- only what was known at the cutoff' : '                -- every order, past and future'}
GROUP BY s.customer_id, s.cutoff
ORDER BY s.customer_id;`;
