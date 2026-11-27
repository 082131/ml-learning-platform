// Code for "Running totals, frames, LAG and LEAD". SqlRunner examples run in SQLite 3.54 (sql.js 1.16);
// sql-outputs.test.ts checks the quoted values. The window explorer (src/lib/sql/window.ts) is checked against
// SQLite for every function, order and frame.
import { windowExperiment } from '@/lib/sql/experiments';
import type { SqlExample } from '@/lib/sql/types';

export const framesLab = windowExperiment('sql-window-frames', 'frames');

export const runningTotal: SqlExample = {
  id: 'running-total',
  dataset: 'shop',
  source: `SELECT id, order_date, total,
       SUM(total) OVER (ORDER BY order_date) AS running_total
FROM order_totals
ORDER BY order_date;`,
};

export const rangeVsRows: SqlExample = {
  id: 'range-vs-rows',
  dataset: 'shop',
  source: `-- Ordering by month gives ties: 3 orders share 2026-01, 6 share 2026-02.
SELECT id, month, total,
       SUM(total) OVER (ORDER BY month)            AS range_default,
       SUM(total) OVER (ORDER BY month
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_frame
FROM order_totals
ORDER BY month, id;`,
};

export const movingAverage: SqlExample = {
  id: 'moving-average',
  dataset: 'shop',
  source: `-- The average of this order and the 2 before it.
SELECT id, order_date, total,
       ROUND(AVG(total) OVER (ORDER BY order_date
                              ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3
FROM order_totals
ORDER BY order_date;`,
};

export const monthOverMonth: SqlExample = {
  id: 'month-over-month',
  dataset: 'shop',
  source: `WITH monthly AS (
  SELECT month, SUM(total) AS revenue
  FROM order_totals
  GROUP BY month
)
SELECT month,
       revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS growth_pct
FROM monthly
ORDER BY month;`,
};

export const daysToNext: SqlExample = {
  id: 'days-to-next',
  dataset: 'shop',
  source: `-- For each order, the same customer's next order and the gap in days.
SELECT customer_id, id, order_date,
       LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS next_order,
       julianday(LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date))
         - julianday(order_date) AS days_to_next
FROM orders
WHERE customer_id IS NOT NULL
ORDER BY customer_id, order_date;`,
};
