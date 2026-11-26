// Code for "Join types and where filters go". SqlRunner examples run in SQLite 3.54 (sql.js 1.16; RIGHT and FULL
// joins need SQLite 3.39+); sql-outputs.test.ts checks the quoted values. The join explorer
// (src/lib/sql/joins.ts) is checked against SQLite for every join type and filter placement.
import { joinExperimentSql } from '@/lib/sql/experiments';
import type { SqlExample } from '@/lib/sql/types';

export const joinLab = joinExperimentSql('sql-join-lab');

export const innerJoin: SqlExample = {
  id: 'inner-join',
  dataset: 'shop',
  source: `-- Who placed each order? Match orders.customer_id to customers.id.
SELECT c.name, o.id AS order_id, o.order_date
FROM orders AS o
JOIN customers AS c
  ON c.id = o.customer_id
ORDER BY o.id;`,
};

export const leftJoin: SqlExample = {
  id: 'left-join',
  dataset: 'shop',
  source: `-- Every customer, with their orders if they have any.
SELECT c.name, o.id AS order_id
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.id
ORDER BY c.id, o.id;`,
};

export const filterPlacement: SqlExample = {
  id: 'filter-placement',
  dataset: 'shop',
  source: `-- Shipped orders per customer, keeping customers with none.
-- Wrong: the filter in WHERE removes the NULL-padded rows, so Fay, Gus and Hana vanish.
SELECT c.name, COUNT(o.id) AS shipped_orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'shipped'
GROUP BY c.id
ORDER BY c.id;

-- Right: the filter in ON decides which orders match; every customer stays.
SELECT c.name, COUNT(o.id) AS shipped_orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'shipped'
GROUP BY c.id
ORDER BY c.id;`,
};

export const threeTables: SqlExample = {
  id: 'three-tables',
  dataset: 'shop',
  source: `-- Revenue of shipped orders by product category:
-- orders -> order_items (one row per product in an order) -> products (for the category).
SELECT p.category,
       COUNT(DISTINCT o.id)             AS orders,
       SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products    AS p  ON p.id = oi.product_id
WHERE o.status = 'shipped'
GROUP BY p.category
ORDER BY revenue DESC;`,
};

export const selfJoin: SqlExample = {
  id: 'self-join',
  dataset: 'shop',
  source: `-- employees.manager_id points at another row of the same table.
SELECT e.name, e.dept, m.name AS manager
FROM employees AS e
LEFT JOIN employees AS m
  ON m.id = e.manager_id
ORDER BY e.id;`,
};

export const crossJoin: SqlExample = {
  id: 'cross-join',
  dataset: 'shop',
  source: `-- Every (city, category) pair: the skeleton of a report that must show zeros too.
SELECT ci.city, ca.category
FROM (SELECT DISTINCT city FROM customers WHERE city IS NOT NULL) AS ci
CROSS JOIN (SELECT DISTINCT category FROM products) AS ca
ORDER BY ci.city, ca.category;`,
};

export const fullJoin: SqlExample = {
  id: 'full-join',
  dataset: 'shop',
  source: `-- Rows with no partner on either side: a quick data-quality check.
SELECT c.name, o.id AS order_id
FROM customers AS c
FULL JOIN orders AS o ON o.customer_id = c.id
WHERE c.id IS NULL OR o.id IS NULL;`,
};
