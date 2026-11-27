// Code for "Tuning queries and warehouse costs". SqlRunner examples run on the shop-big dataset in SQLite 3.54
// (sql.js 1.16); sql-outputs.test.ts checks the plans and results quoted in the lesson. The warehouse explorer is
// a labelled simulation (src/lib/sql/warehouse.ts) with hand-checked numbers.
import { warehouseExperiment } from '@/lib/sql/experiments';
import type { SqlExample } from '@/lib/sql/types';

export const warehouseLab = warehouseExperiment('sql-warehouse-cost');

export const correlatedSlow: SqlExample = {
  id: 'correlated-slow',
  dataset: 'shop-big',
  source: `-- Each recent DE order's share of its customer's lifetime spend.
EXPLAIN QUERY PLAN
SELECT b.id,
       b.amount / (SELECT SUM(b2.amount) FROM big_orders AS b2
                   WHERE b2.customer_id = b.customer_id) AS share
FROM big_orders AS b
WHERE b.country = 'DE' AND b.order_date >= '2026-12-28';

SELECT COUNT(*) AS orders, ROUND(SUM(share), 2) AS total_share
FROM (
  SELECT b.amount / (SELECT SUM(b2.amount) FROM big_orders AS b2
                     WHERE b2.customer_id = b.customer_id) AS share
  FROM big_orders AS b
  WHERE b.country = 'DE' AND b.order_date >= '2026-12-28'
);`,
};

export const aggregateThenJoin: SqlExample = {
  id: 'aggregate-then-join',
  dataset: 'shop-big',
  source: `-- Same question: total each customer once, then join.
EXPLAIN QUERY PLAN
WITH customer_total AS (
  SELECT customer_id, SUM(amount) AS total
  FROM big_orders
  GROUP BY customer_id
)
SELECT b.id, b.amount / t.total AS share
FROM big_orders AS b
JOIN customer_total AS t ON t.customer_id = b.customer_id
WHERE b.country = 'DE' AND b.order_date >= '2026-12-28';

WITH customer_total AS (
  SELECT customer_id, SUM(amount) AS total
  FROM big_orders
  GROUP BY customer_id
)
SELECT COUNT(*) AS orders, ROUND(SUM(b.amount / t.total), 2) AS total_share
FROM big_orders AS b
JOIN customer_total AS t ON t.customer_id = b.customer_id
WHERE b.country = 'DE' AND b.order_date >= '2026-12-28';`,
};

export const indexFixesCorrelated: SqlExample = {
  id: 'index-fixes-correlated',
  dataset: 'shop-big',
  source: `-- Or keep the subquery and give it an index to search.
CREATE INDEX idx_customer_amount ON big_orders (customer_id, amount);

EXPLAIN QUERY PLAN
SELECT b.id,
       b.amount / (SELECT SUM(b2.amount) FROM big_orders AS b2
                   WHERE b2.customer_id = b.customer_id) AS share
FROM big_orders AS b
WHERE b.country = 'DE' AND b.order_date >= '2026-12-28';

SELECT COUNT(*) AS orders, ROUND(SUM(share), 2) AS total_share
FROM (
  SELECT b.amount / (SELECT SUM(b2.amount) FROM big_orders AS b2
                     WHERE b2.customer_id = b.customer_id) AS share
  FROM big_orders AS b
  WHERE b.country = 'DE' AND b.order_date >= '2026-12-28'
);`,
};

export const summaryTable: SqlExample = {
  id: 'summary-table',
  dataset: 'shop-big',
  source: `-- Build once: one row per day and country.
CREATE TABLE daily_country_revenue AS
SELECT order_date, country, COUNT(*) AS orders, SUM(amount) AS revenue
FROM big_orders
GROUP BY order_date, country;

SELECT (SELECT COUNT(*) FROM big_orders)            AS raw_rows,
       (SELECT COUNT(*) FROM daily_country_revenue) AS summary_rows;

-- Monthly revenue per country, from either table: the answers must reconcile.
SELECT substr(order_date, 1, 7) AS month, country, ROUND(SUM(revenue), 2) AS revenue
FROM daily_country_revenue
WHERE order_date >= '2026-10-01'
GROUP BY month, country
EXCEPT
SELECT substr(order_date, 1, 7), country, ROUND(SUM(amount), 2)
FROM big_orders
WHERE order_date >= '2026-10-01'
GROUP BY 1, 2;`,
};
