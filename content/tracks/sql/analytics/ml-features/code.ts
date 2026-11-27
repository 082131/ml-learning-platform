// Code for "SQL for ML: point-in-time features and splits". SqlRunner and CteSteps examples run in SQLite 3.54
// (sql.js 1.16); sql-outputs.test.ts checks the quoted values. The training-table explorer
// (src/lib/sql/mlfeatures.ts) is checked against SQLite for every cutoff and feature mode.
import { trainingExperiment } from '@/lib/sql/experiments';
import type { SqlCteExample, SqlExample } from '@/lib/sql/types';

export const trainingLab = trainingExperiment('sql-training-table');

export const naiveTable: SqlExample = {
  id: 'naive-training-table',
  dataset: 'shop',
  source: `-- "Will the customer order in February?" with features from the whole orders table.
SELECT c.name,
       COUNT(o.id)                 AS total_orders,
       COALESCE(SUM(o.total), 0)   AS total_spend,
       MAX(o.order_date)           AS last_order,
       EXISTS (SELECT 1 FROM orders AS f
               WHERE f.customer_id = c.id
                 AND f.order_date BETWEEN '2026-02-01' AND '2026-02-28') AS label
FROM customers AS c
LEFT JOIN order_totals AS o ON o.customer_id = c.id
GROUP BY c.id
ORDER BY c.id;`,
};

export const trainingTable: SqlCteExample = {
  id: 'training-table',
  dataset: 'shop',
  steps: [
    {
      name: 'cutoffs',
      sql: `SELECT '2026-01-15' AS cutoff
UNION ALL SELECT '2026-02-01'
UNION ALL SELECT '2026-02-15'
UNION ALL SELECT '2026-03-01'`,
      note: 'The moments at which we pretend to make a prediction. 4 rows.',
    },
    {
      name: 'spine',
      sql: `SELECT c.id AS customer_id, k.cutoff
FROM customers AS c
CROSS JOIN cutoffs AS k
WHERE c.signup_date < k.cutoff`,
      note: 'Grain: one (customer, cutoff), only for customers who existed at that cutoff. 2 + 3 + 5 + 6 = 16 rows. This is the shape of the final table, decided before any feature.',
    },
    {
      name: 'features',
      sql: `SELECT s.customer_id, s.cutoff,
       COUNT(o.id)               AS orders_before,
       COALESCE(SUM(o.total), 0) AS spend_before,
       CAST(julianday(s.cutoff) - julianday(MAX(o.order_date)) AS INTEGER) AS days_since_last
FROM spine AS s
LEFT JOIN order_totals AS o
       ON o.customer_id = s.customer_id
      AND o.order_date < s.cutoff
GROUP BY s.customer_id, s.cutoff`,
      note: 'Everything strictly before the cutoff, and nothing else. The date condition is in ON, so customers with no past orders keep their row with 0 and NULL. Still 16 rows.',
    },
    {
      name: 'labels',
      sql: `SELECT s.customer_id, s.cutoff,
       COUNT(o.id) > 0 AS label,
       date(s.cutoff, '+30 days') AS label_known_on
FROM spine AS s
LEFT JOIN orders AS o
       ON o.customer_id = s.customer_id
      AND o.order_date >= s.cutoff
      AND o.order_date <  date(s.cutoff, '+30 days')
GROUP BY s.customer_id, s.cutoff`,
      note: 'The 30 days from the cutoff on. label_known_on is the first day on which the label is final. 16 rows.',
    },
  ],
  final: `SELECT f.cutoff, f.customer_id, f.orders_before, f.spend_before, f.days_since_last,
       l.label, l.label_known_on
FROM features AS f
JOIN labels AS l USING (customer_id, cutoff)
ORDER BY f.cutoff, f.customer_id`,
};

export const timeSplit: SqlExample = {
  id: 'time-split',
  dataset: 'shop',
  source: `-- Evaluate as if training on 2026-03-01: test on that cutoff, train only on labels known by then.
WITH cutoffs AS (
  SELECT '2026-01-15' AS cutoff UNION ALL SELECT '2026-02-01'
  UNION ALL SELECT '2026-02-15' UNION ALL SELECT '2026-03-01'
),
rows AS (
  SELECT k.cutoff, date(k.cutoff, '+30 days') AS label_known_on
  FROM customers AS c CROSS JOIN cutoffs AS k
  WHERE c.signup_date < k.cutoff
)
SELECT cutoff, label_known_on,
       CASE WHEN cutoff = '2026-03-01'                THEN 'test'
            WHEN label_known_on <= '2026-03-01'       THEN 'train'
            ELSE 'drop: label not known on 2026-03-01' END AS split,
       COUNT(*) AS training_rows
FROM rows
GROUP BY cutoff
ORDER BY cutoff;`,
};

export const perOrderFeatures: SqlExample = {
  id: 'per-order-features',
  dataset: 'shop',
  source: `-- Features as of each order: what we knew about the customer just before it.
SELECT customer_id, id, order_date, total,
       COUNT(*)   OVER before_me AS previous_orders,
       SUM(total) OVER before_me AS previous_spend,
       COUNT(*)   OVER (PARTITION BY customer_id ORDER BY order_date) AS wrong_includes_me
FROM order_totals
WHERE customer_id IS NOT NULL
WINDOW before_me AS (PARTITION BY customer_id ORDER BY order_date
                     ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)
ORDER BY customer_id, order_date;`,
};
