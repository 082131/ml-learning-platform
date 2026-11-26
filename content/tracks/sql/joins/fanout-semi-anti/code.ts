// Code for "Fan-out, semi-joins and anti-joins". SqlRunner examples run in SQLite 3.54 (sql.js 1.16);
// sql-outputs.test.ts checks the quoted values. The fan-out explorer (src/lib/sql/fanout.ts) is checked against
// SQLite for every setting.
import { fanoutExperiment } from '@/lib/sql/experiments';
import type { SqlExample } from '@/lib/sql/types';

export const fanoutLab = fanoutExperiment('sql-fanout');

export const fanoutBug: SqlExample = {
  id: 'fanout-bug',
  dataset: 'shop',
  source: `-- Order 105 has 2 items and 1 payment; 107 and 110 have 2 items and 2 payments.
SELECT o.id,
       COUNT(*)                         AS joined_rows,
       SUM(oi.quantity * oi.unit_price) AS items_total,
       SUM(p.amount)                    AS paid
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN payments    AS p  ON p.order_id = o.id
WHERE o.id IN (105, 107, 110)
GROUP BY o.id;`,
};

export const fanoutFix: SqlExample = {
  id: 'fanout-fix',
  dataset: 'shop',
  source: `-- Bring each side to one row per order first, then join one-to-one.
SELECT o.id, i.items_total, p.paid
FROM orders AS o
JOIN (SELECT order_id, SUM(quantity * unit_price) AS items_total
      FROM order_items GROUP BY order_id) AS i ON i.order_id = o.id
JOIN (SELECT order_id, SUM(amount) AS paid
      FROM payments GROUP BY order_id) AS p ON p.order_id = o.id
WHERE o.id IN (105, 107, 110)
ORDER BY o.id;`,
};

export const joinDuplicates: SqlExample = {
  id: 'join-duplicates',
  dataset: 'shop',
  source: `-- "Which customers bought electronics?" written as a join repeats them.
SELECT c.name
FROM customers AS c
JOIN orders      AS o  ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products    AS p  ON p.id = oi.product_id
WHERE p.category = 'electronics'
ORDER BY c.name;`,
};

export const semiJoin: SqlExample = {
  id: 'semi-join',
  dataset: 'shop',
  source: `-- EXISTS asks "is there at least one?" and returns each customer once.
SELECT c.name
FROM customers AS c
WHERE EXISTS (
  SELECT 1
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN products    AS p  ON p.id = oi.product_id
  WHERE o.customer_id = c.id
    AND p.category = 'electronics'
)
ORDER BY c.name;`,
};

export const antiJoin: SqlExample = {
  id: 'anti-join',
  dataset: 'shop',
  source: `-- Customers with no orders at all.
SELECT c.name
FROM customers AS c
WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id)
ORDER BY c.id;

-- The same idea with LEFT JOIN: keep the rows whose partner is missing.
SELECT p.name AS never_sold
FROM products AS p
LEFT JOIN order_items AS oi ON oi.product_id = p.id
WHERE oi.product_id IS NULL;`,
};

export const notInTrap: SqlExample = {
  id: 'not-in-trap',
  dataset: 'shop',
  source: `-- Looks like "customers who never ordered". The guest order 109 has
-- customer_id NULL, so the list contains a NULL and NOT IN returns nothing.
SELECT COUNT(*) AS customers_found
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);

-- Filtering out the NULL makes NOT IN work, but NOT EXISTS needs no such care.
SELECT name
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);`,
};
