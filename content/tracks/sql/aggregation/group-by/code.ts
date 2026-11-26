// Code for "GROUP BY, aggregates and HAVING". SqlRunner examples run in SQLite 3.54 (sql.js 1.16);
// sql-outputs.test.ts checks the values the prose quotes. The grouped pipeline (src/lib/sql/pipeline.ts) is
// checked against SQLite for every slider setting.
import { pipelineExperiment } from '@/lib/sql/experiments';
import type { PipelineState } from '@/lib/sql/pipeline';
import type { SqlExample } from '@/lib/sql/types';
import type { CodeExample } from '@/lib/types';

export const grouped = pipelineExperiment('sql-grouped-pipeline', true);

export const groupedSql: CodeExample = {
  id: 'grouped-sql',
  language: 'sql',
  source: `-- Evaluated as: 1 FROM, 2 WHERE, 3 GROUP BY, 4 HAVING, 5 SELECT, 6 ORDER BY
SELECT category, COUNT(*) AS n, AVG(price) AS avg_price
FROM products
WHERE price >= {{min}}
GROUP BY category
HAVING COUNT(*) >= {{k}}
ORDER BY n DESC, category;`,
  slots: {
    min: (s) => String((s as PipelineState).minPrice),
    k: (s) => String((s as PipelineState).minCount),
  },
  annotations: [
    {
      id: 'aggregates',
      range: { line: 2, startCol: 17, endCol: 25 },
      match: 'COUNT(*)',
      kind: 'function',
      title: 'An aggregate per group',
      what: 'COUNT(*) counts the rows in each group; AVG(price) averages their prices.',
      why: 'After GROUP BY, each output row stands for a whole group, so per-row columns must be summarised into one value.',
    },
    {
      id: 'where',
      range: { line: 4, startCol: 0, endCol: 5 },
      match: 'WHERE',
      kind: 'syntax',
      title: 'WHERE: before grouping',
      what: 'Drops individual products before any group is formed.',
      why: 'It cannot mention COUNT(*): when WHERE runs, there are no groups to count yet.',
    },
    {
      id: 'group',
      range: { line: 5, startCol: 0, endCol: 8 },
      match: 'GROUP BY',
      kind: 'syntax',
      title: 'GROUP BY: one bucket per value',
      what: 'Puts rows with the same category into the same bucket.',
      why: 'Each bucket becomes exactly one output row, so the number of result rows is the number of distinct categories that survived WHERE.',
    },
    {
      id: 'having',
      range: { line: 6, startCol: 0, endCol: 6 },
      match: 'HAVING',
      kind: 'syntax',
      title: 'HAVING: after grouping',
      what: 'Keeps a group only if the condition is true for the group.',
      why: 'Runs after GROUP BY, so aggregates exist and can be tested.',
    },
  ],
};

export const orderTotals: SqlExample = {
  id: 'order-totals',
  dataset: 'shop',
  source: `-- order_items has one row per product in an order.
-- GROUP BY order_id turns it into one row per order.
SELECT order_id,
       COUNT(*)                 AS lines,
       SUM(quantity)            AS units,
       SUM(quantity * unit_price) AS total
FROM order_items
GROUP BY order_id
ORDER BY order_id;`,
};

export const countKinds: SqlExample = {
  id: 'count-kinds',
  dataset: 'shop',
  source: `SELECT COUNT(*)             AS all_rows,
       COUNT(city)          AS with_city,
       COUNT(DISTINCT city) AS cities
FROM customers;`,
};

export const avgAndNull: SqlExample = {
  id: 'avg-and-null',
  dataset: 'none',
  source: `-- Four ratings, one of them missing.
WITH ratings(x) AS (VALUES (10), (20), (NULL), (30))
SELECT AVG(x)                  AS avg_skips_null,
       SUM(x) * 1.0 / COUNT(*) AS avg_null_as_zero,
       COUNT(x)                AS counted,
       COUNT(*)                AS all_rows
FROM ratings;`,
};

export const ordersPerCustomer: SqlExample = {
  id: 'orders-per-customer',
  dataset: 'shop',
  source: `SELECT customer_id, COUNT(*) AS orders
FROM orders
GROUP BY customer_id
ORDER BY customer_id;`,
};

export const whereVsHaving: SqlExample = {
  id: 'where-vs-having',
  dataset: 'shop',
  source: `-- Customers with at least 2 SHIPPED orders.
SELECT customer_id, COUNT(*) AS shipped_orders
FROM orders
WHERE status = 'shipped'        -- row filter: before grouping
GROUP BY customer_id
HAVING COUNT(*) >= 2            -- group filter: after grouping
ORDER BY customer_id;`,
};

export const monthlyPivot: SqlExample = {
  id: 'monthly-pivot',
  dataset: 'shop',
  source: `SELECT substr(order_date, 1, 7) AS month,
       COUNT(*) AS orders,
       SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
       ROUND(100.0 * SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_shipped
FROM orders
GROUP BY month
ORDER BY month;`,
};

export const bareColumn: SqlExample = {
  id: 'bare-column',
  dataset: 'shop',
  source: `-- order_date is neither grouped nor aggregated. PostgreSQL rejects this
-- ("must appear in the GROUP BY clause or be used in an aggregate function").
-- SQLite runs it and shows the date of some row in each group.
SELECT customer_id, order_date, COUNT(*) AS orders
FROM orders
GROUP BY customer_id
ORDER BY customer_id;

-- Say which date you mean:
SELECT customer_id,
       MIN(order_date) AS first_order,
       MAX(order_date) AS last_order,
       COUNT(*)        AS orders
FROM orders
WHERE customer_id IS NOT NULL
GROUP BY customer_id
ORDER BY customer_id;`,
};
