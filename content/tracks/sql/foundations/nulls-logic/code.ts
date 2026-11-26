// Code for "NULL, CASE and three-valued logic". SqlRunner examples run in SQLite 3.54 (sql.js 1.16);
// sql-outputs.test.ts checks the values the prose quotes. The NULL explorer (src/lib/sql/nulls.ts) is checked
// against SQLite for every condition and customer.
import { nullExperiment } from '@/lib/sql/experiments';
import type { SqlExample } from '@/lib/sql/types';

export const nullLab = nullExperiment('sql-nulls');

export const nullArithmetic: SqlExample = {
  id: 'null-arithmetic',
  dataset: 'none',
  source: `-- 1 means TRUE, 0 means FALSE, NULL means UNKNOWN.
SELECT NULL = NULL       AS null_equals_null,
       NULL <> 1         AS null_not_1,
       NULL IS NULL      AS is_null,
       1 + NULL          AS plus,
       'Fay lives in ' || NULL AS text;`,
};

export const cityCounts: SqlExample = {
  id: 'city-counts',
  dataset: 'shop',
  source: `SELECT (SELECT COUNT(*) FROM customers WHERE city =  'London') AS london,
       (SELECT COUNT(*) FROM customers WHERE city <> 'London') AS not_london,
       (SELECT COUNT(*) FROM customers WHERE city IS NULL)     AS no_city,
       (SELECT COUNT(*) FROM customers)                        AS total;`,
};

export const notLondon: SqlExample = {
  id: 'not-london',
  dataset: 'shop',
  source: `-- Everyone who is not known to be in London, including Fay.
SELECT name,
       COALESCE(city, 'unknown') AS city
FROM customers
WHERE city IS DISTINCT FROM 'London';`,
};

export const priceBands: SqlExample = {
  id: 'price-bands',
  dataset: 'shop',
  source: `SELECT name,
       price,
       CASE
         WHEN price >= 30 THEN 'premium'
         WHEN price >= 10 THEN 'mid'
         ELSE 'budget'
       END AS band
FROM products
ORDER BY price DESC;`,
};

export const caseOrder: SqlExample = {
  id: 'case-order',
  dataset: 'shop',
  source: `-- The same branches in the wrong order: price >= 10 is tried first
-- and is already TRUE for 59 and 32, so 'premium' is never reached.
SELECT name,
       price,
       CASE
         WHEN price >= 10 THEN 'mid'
         WHEN price >= 30 THEN 'premium'
         ELSE 'budget'
       END AS band
FROM products
ORDER BY price DESC;`,
};

export const caseNull: SqlExample = {
  id: 'case-null',
  dataset: 'shop',
  source: `-- "CASE city WHEN NULL" tests city = NULL, which is never TRUE.
SELECT name,
       CASE city WHEN 'London' THEN 'UK' WHEN NULL THEN 'missing' ELSE 'EU' END AS simple_case,
       CASE WHEN city IS NULL THEN 'missing'
            WHEN city = 'London' THEN 'UK'
            ELSE 'EU' END AS searched_case
FROM customers;`,
};

export const numberTraps: SqlExample = {
  id: 'number-traps',
  dataset: 'none',
  source: `SELECT 7 / 2            AS integer_division,
       7 / 2.0          AS real_division,
       CAST(7 AS REAL) / 2 AS cast_first,
       1 / 0            AS divide_by_zero,
       10 / NULLIF(0, 0) AS nullif_guard,
       '10' < '9'       AS text_compare,
       10 < 9           AS number_compare;`,
};
