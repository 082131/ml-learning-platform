// Code for "Subqueries and CTEs". SqlRunner and CteSteps examples run in SQLite 3.54 (sql.js 1.16);
// sql-outputs.test.ts runs every step and checks the quoted values.
import type { SqlCteExample, SqlExample } from '@/lib/sql/types';

export const scalarSubquery: SqlExample = {
  id: 'scalar-subquery',
  dataset: 'shop',
  source: `-- The inner SELECT returns one value: the average price of all products.
SELECT name,
       price,
       ROUND((SELECT AVG(price) FROM products), 2) AS avg_price
FROM products
WHERE price > (SELECT AVG(price) FROM products)
ORDER BY price DESC;`,
};

export const correlated: SqlExample = {
  id: 'correlated-subquery',
  dataset: 'shop',
  source: `-- The inner SELECT reads p.category from the OUTER row,
-- so it is "the average of this product's category".
SELECT p.name,
       p.category,
       p.price,
       ROUND((SELECT AVG(q.price) FROM products AS q
              WHERE q.category = p.category), 2) AS category_avg
FROM products AS p
WHERE p.price > (SELECT AVG(q.price) FROM products AS q
                 WHERE q.category = p.category)
ORDER BY p.category;`,
};

export const derivedTable: SqlExample = {
  id: 'derived-table',
  dataset: 'shop',
  source: `-- A subquery in FROM is a table you build on the spot (a "derived table").
SELECT category, ROUND(AVG(line_value), 2) AS avg_line
FROM (
  SELECT p.category, oi.quantity * oi.unit_price AS line_value
  FROM order_items AS oi
  JOIN products AS p ON p.id = oi.product_id
) AS lines
GROUP BY category
ORDER BY category;`,
};

export const aboveAverage: SqlCteExample = {
  id: 'above-average-spenders',
  dataset: 'shop',
  steps: [
    {
      name: 'shipped_lines',
      sql: `SELECT o.customer_id,
       oi.quantity * oi.unit_price AS amount
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status = 'shipped'
  AND o.customer_id IS NOT NULL`,
      note: 'Grain: one shipped order line of a known customer. 13 lines; the guest order is left out because it belongs to nobody.',
    },
    {
      name: 'customer_spend',
      sql: `SELECT customer_id, SUM(amount) AS spend
FROM shipped_lines
GROUP BY customer_id`,
      note: 'Grain: one customer. Reads the previous step like a table. 5 customers have shipped orders.',
    },
    {
      name: 'average',
      sql: 'SELECT AVG(spend) AS avg_spend FROM customer_spend',
      note: 'Grain: one row for the whole shop. The average customer spend is 289 / 5 = 57.80.',
    },
  ],
  final: `SELECT c.name, s.spend, ROUND(a.avg_spend, 2) AS avg_spend
FROM customer_spend AS s
JOIN average AS a ON s.spend > a.avg_spend
JOIN customers AS c ON c.id = s.customer_id
ORDER BY s.spend DESC`,
};

export const perRowCount: SqlExample = {
  id: 'per-row-count',
  dataset: 'shop',
  source: `-- A correlated subquery in SELECT: one small query per customer.
-- Unlike a LEFT JOIN + GROUP BY, it cannot fan out, and Gus and Hana get 0.
SELECT c.name,
       (SELECT COUNT(*) FROM orders AS o WHERE o.customer_id = c.id) AS orders
FROM customers AS c
ORDER BY c.id;`,
};
