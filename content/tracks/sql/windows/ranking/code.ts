// Code for "Window functions and ranking". SqlRunner examples run in SQLite 3.54 (sql.js 1.16) against the shop
// tables and the order_totals view; sql-outputs.test.ts checks the quoted values. The window explorer
// (src/lib/sql/window.ts) is checked against SQLite for every function, partition and frame.
import { windowExperiment } from '@/lib/sql/experiments';
import type { SqlExample } from '@/lib/sql/types';

export const rankingLab = windowExperiment('sql-window-ranking', 'ranking');

export const groupVsWindow: SqlExample = {
  id: 'group-vs-window',
  dataset: 'shop',
  source: `-- GROUP BY: 12 orders collapse into 3 month rows.
SELECT month, COUNT(*) AS orders, SUM(total) AS revenue
FROM order_totals
GROUP BY month;

-- Window: all 12 orders stay, and each one also sees its month's total.
SELECT id, month, total,
       SUM(total) OVER (PARTITION BY month) AS month_revenue,
       ROUND(100.0 * total / SUM(total) OVER (PARTITION BY month), 1) AS pct_of_month
FROM order_totals
ORDER BY month, id;`,
};

export const threeRanks: SqlExample = {
  id: 'three-ranks',
  dataset: 'shop',
  source: `-- Orders 102 and 106 both total 59.00: watch how each function treats the tie.
SELECT id, total,
       ROW_NUMBER() OVER (ORDER BY total DESC) AS row_number,
       RANK()       OVER (ORDER BY total DESC) AS rank,
       DENSE_RANK() OVER (ORDER BY total DESC) AS dense_rank
FROM order_totals
ORDER BY total DESC, id;`,
};

export const topTwoPerCategory: SqlExample = {
  id: 'top-two-per-category',
  dataset: 'shop',
  source: `-- Top 2 products by price in each category.
-- Window functions cannot go in WHERE, so number the rows in a CTE and filter outside.
WITH ranked AS (
  SELECT category, name, price,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
  FROM products
)
SELECT category, name, price
FROM ranked
WHERE rn <= 2
ORDER BY category, rn;`,
};

export const windowInWhere: SqlExample = {
  id: 'window-in-where',
  dataset: 'shop',
  source: `-- Window functions are computed in the SELECT stage, after WHERE.
SELECT name, price
FROM products
WHERE ROW_NUMBER() OVER (ORDER BY price DESC) <= 2;`,
  expectError: 'misuse of window function ROW_NUMBER()',
};

export const firstOrders: SqlExample = {
  id: 'first-orders',
  dataset: 'shop',
  source: `-- Each customer's first order: number their orders by date, keep number 1.
WITH numbered AS (
  SELECT customer_id, id, order_date,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, id) AS nth
  FROM orders
  WHERE customer_id IS NOT NULL
)
SELECT customer_id, id AS first_order, order_date
FROM numbered
WHERE nth = 1
ORDER BY customer_id;`,
};

export const quartiles: SqlExample = {
  id: 'quartiles',
  dataset: 'shop',
  source: `-- NTILE(4) splits the ordered rows into 4 buckets of (nearly) equal size.
SELECT id, total,
       NTILE(4) OVER (ORDER BY total DESC) AS quartile
FROM order_totals
ORDER BY total DESC, id;`,
};
