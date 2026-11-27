// Code for "Indexes and query plans". Examples run on the shop-big dataset (big_orders, 200,000 generated rows)
// in SQLite 3.54 (sql.js 1.16); sql-outputs.test.ts checks every plan line quoted in the lesson. The index
// explorer's stored plans are rebuilt in SQLite by src/lib/sql/indexlab.test.ts.
import { indexExperiment } from '@/lib/sql/experiments';
import type { SqlExample } from '@/lib/sql/types';

export const indexLab = indexExperiment('sql-index-plans');

export const bigTable: SqlExample = {
  id: 'big-orders-peek',
  dataset: 'shop-big',
  source: `SELECT COUNT(*) AS orders,
       COUNT(DISTINCT customer_id) AS customers,
       MIN(order_date) AS first_day,
       MAX(order_date) AS last_day
FROM big_orders;

SELECT * FROM big_orders LIMIT 5;`,
};

export const scanThenSearch: SqlExample = {
  id: 'scan-then-search',
  dataset: 'shop-big',
  source: `-- 1. No index on customer_id: the plan reads the whole table.
EXPLAIN QUERY PLAN
SELECT * FROM big_orders WHERE customer_id = 4242;

-- 2. Build the index (a sorted copy of customer_id, each entry pointing at its row).
CREATE INDEX idx_customer ON big_orders (customer_id);

-- 3. Same query, new plan.
EXPLAIN QUERY PLAN
SELECT * FROM big_orders WHERE customer_id = 4242;

SELECT * FROM big_orders WHERE customer_id = 4242;`,
};

export const compositeIndex: SqlExample = {
  id: 'composite-index',
  dataset: 'shop-big',
  source: `CREATE INDEX idx_country_date ON big_orders (country, order_date);

-- Both columns, equality first: one contiguous range of the index.
EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM big_orders
WHERE country = 'DE' AND order_date >= '2026-12-01';

-- Only the second column: the index cannot be searched.
EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM big_orders
WHERE order_date >= '2026-12-01';`,
};

export const functionOnColumn: SqlExample = {
  id: 'function-on-column',
  dataset: 'shop-big',
  source: `CREATE INDEX idx_date ON big_orders (order_date);

-- A function wrapped around the indexed column hides it from the index.
EXPLAIN QUERY PLAN
SELECT SUM(amount) FROM big_orders WHERE substr(order_date, 1, 7) = '2026-12';

-- The same rows, asked as a range on the column itself.
EXPLAIN QUERY PLAN
SELECT SUM(amount) FROM big_orders
WHERE order_date >= '2026-12-01' AND order_date < '2027-01-01';

-- Same answer both ways.
SELECT (SELECT SUM(amount) FROM big_orders WHERE substr(order_date, 1, 7) = '2026-12') AS with_substr,
       (SELECT SUM(amount) FROM big_orders
        WHERE order_date >= '2026-12-01' AND order_date < '2027-01-01') AS with_range;`,
};

export const orderByLimit: SqlExample = {
  id: 'order-by-limit',
  dataset: 'shop-big',
  source: `-- Latest 5 orders, without an index: read all, sort all, keep 5.
EXPLAIN QUERY PLAN
SELECT id, order_date, amount FROM big_orders ORDER BY order_date DESC LIMIT 5;

CREATE INDEX idx_date ON big_orders (order_date);

-- With it: walk the index from the end and stop after 5.
EXPLAIN QUERY PLAN
SELECT id, order_date, amount FROM big_orders ORDER BY order_date DESC LIMIT 5;`,
};
